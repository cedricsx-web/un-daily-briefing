// fetch-journal.cjs — Puppeteer, captures ALL network traffic to find meeting data

const { writeFileSync, mkdirSync } = require("fs");
const puppeteer = require("puppeteer");

const CHAMBER_ROOM_MAP = {
  "general assembly hall": "General Assembly Hall",
  "security council chamber": "Security Council",
  "security council consultations room": "Security Council",
  "trusteeship council chamber": "Trusteeship Council",
  "economic and social council chamber": "Economic and Social Council",
};

function chamberForRoom(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  for (const [key, val] of Object.entries(CHAMBER_ROOM_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

function normalizeTime(raw) {
  if (!raw) return "TBD";
  const clean = raw.toString().trim().replace(/\s*-\s*\d{1,2}:\d{2}$/, "");
  const m = clean.match(/(\d{1,2}):(\d{2})/);
  if (!m) return raw.toString().trim();
  let h = parseInt(m[1]);
  const min = m[2];
  const period = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${period}`;
}

function todayInNewYork() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const p = {};
  parts.forEach(({ type, value }) => { p[type] = value; });
  return `${p.year}-${p.month}-${p.day}`;
}

function emptyChambers() {
  return [
    { room: "General Assembly Hall", meetings: [] },
    { room: "Security Council", meetings: [] },
    { room: "Trusteeship Council", meetings: [] },
    { room: "Economic and Social Council", meetings: [] },
  ];
}

function saveResult(dateStr, chambers, meetings, note) {
  mkdirSync("public", { recursive: true });
  writeFileSync("public/journal.json", JSON.stringify({
    date: dateStr,
    fetched_at: new Date().toISOString(),
    ny_date: todayInNewYork(),
    source: "journal.un.org",
    note: note || null,
    chambers,
    meetings,
  }, null, 2));
  console.log(`✅ Saved — ${meetings.length} meetings | ${note || "ok"}`);
}

function extractMeetings(obj, meetings, chamberMap) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    obj.forEach(item => extractMeetings(item, meetings, chamberMap));
    return;
  }
  const title = obj.title || obj.meeting_title || obj.name || obj.subject || obj.meetingTitle || obj.MeetingTitle;
  const time  = obj.time  || obj.startTime   || obj.start_time || obj.hour || obj.startHour || obj.Time;
  const room  = obj.room  || obj.location    || obj.venue || obj.chamber || obj.roomName || obj.Room || obj.Location;

  if (title && typeof title === "string" && title.length > 8) {
    const normTime    = normalizeTime(time);
    const normChamber = chamberForRoom(room);
    meetings.push({ title: title.trim(), time: normTime, room: room || null });
    if (normChamber) {
      if (!chamberMap[normChamber]) chamberMap[normChamber] = [];
      chamberMap[normChamber].push({ time: normTime, title: title.trim() });
    }
  }
  Object.values(obj).forEach(v => {
    if (v && typeof v === "object") extractMeetings(v, meetings, chamberMap);
  });
}

async function main() {
  const dateStr = todayInNewYork();
  console.log(`\n📅 NY date: ${dateStr} | UTC: ${new Date().toISOString()}\n`);

  const url = `https://journal.un.org/en/new-york/all/${dateStr}`;
  console.log(`Navigating to: ${url}\n`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu"],
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36");

    // Capture ALL responses — log every single one
    const captured = [];
    page.on("response", async response => {
      const respUrl  = response.url();
      const ct       = response.headers()["content-type"] || "";
      const status   = response.status();

      // Log everything from journal.un.org
      if (respUrl.includes("journal.un.org")) {
        const shortUrl = respUrl.replace("https://journal.un.org", "");
        try {
          const buffer = await response.buffer();
          console.log(`  [${status}] ${shortUrl} | ${ct} | ${buffer.length} bytes`);

          // Try JSON parse on everything
          try {
            const data = JSON.parse(buffer.toString());
            captured.push({ url: respUrl, data });
          } catch (_) {
            // Not JSON — log first 200 chars if it looks interesting
            const text = buffer.toString().slice(0, 200);
            if (!respUrl.includes(".js") && !respUrl.includes(".css")) {
              console.log(`    → text: ${text.replace(/\s+/g, " ")}`);
            }
          }
        } catch (_) {}
      }
    });

    // Navigate and wait for load
    await page.goto(url, { waitUntil: "load", timeout: 45000 });

    // Wait extra time for lazy-loaded content
    console.log("\nWaiting 8 seconds for lazy content...");
    await new Promise(r => setTimeout(r, 8000));

    // Scroll to trigger any scroll-based loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 3000));

    console.log(`\nPage title: ${await page.title()}`);
    console.log(`Total captured: ${captured.length} JSON responses`);

    const meetings   = [];
    const chamberMap = {};

    // Check config.json for API base URL
    const configResponse = captured.find(c => c.url.includes("config.json"));
    if (configResponse) {
      console.log("\n📋 config.json:", JSON.stringify(configResponse.data).slice(0, 500));
    }

    // Try all captured JSON responses for meeting data
    for (const { url: apiUrl, data } of captured) {
      const before = meetings.length;
      extractMeetings(data, meetings, chamberMap);
      if (meetings.length > before) {
        console.log(`✅ ${meetings.length - before} meetings from: ${apiUrl}`);
      }
    }

    // If still nothing, try reading from page JS state
    if (meetings.length === 0) {
      console.log("\nChecking page JS state...");
      const jsState = await page.evaluate(() => {
        // Try common state containers
        const candidates = [
          window.__INITIAL_STATE__,
          window.__STATE__,
          window.__NUXT__,
          window.__NEXT_DATA__,
          window.store?.state,
          window.app?.$store?.state,
        ];
        for (const c of candidates) {
          if (c) return JSON.stringify(c).slice(0, 2000);
        }

        // Try reading all script tags for embedded data
        const scripts = [...document.querySelectorAll("script:not([src])")];
        for (const s of scripts) {
          const t = s.textContent || "";
          if (t.includes("meeting") || t.includes("Meeting")) {
            return t.slice(0, 2000);
          }
        }
        return null;
      });

      if (jsState) {
        console.log("Found JS state:", jsState.slice(0, 500));
        try {
          extractMeetings(JSON.parse(jsState), meetings, chamberMap);
        } catch (_) {}
      }
    }

    // Final fallback: read all visible text and look for API base URL
    if (meetings.length === 0) {
      console.log("\nReading page source for API clues...");
      const pageSource = await page.content();
      // Look for API base URL patterns
      const apiPatterns = pageSource.match(/["'](https?:\/\/[^"']*api[^"']*)['"]/g) || [];
      apiPatterns.slice(0, 10).forEach(p => console.log("  API hint:", p));

      // Also look for any URL with "meeting" in it
      const meetingUrls = pageSource.match(/["'](https?:\/\/[^"']*meeting[^"']*)['"]/g) || [];
      meetingUrls.slice(0, 10).forEach(p => console.log("  Meeting URL hint:", p));
    }

    await browser.close();

    // Log chambers
    console.log("\n🏛️  Chambers:");
    ["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"].forEach(c => {
      const ms = chamberMap[c] || [];
      console.log(`  ${c}: ${ms.length > 0 ? ms.map(m => `${m.time} — ${m.title}`).join(" | ") : "none"}`);
    });

    const chambers = ["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"]
      .map(name => ({ room: name, meetings: (chamberMap[name] || []).map(m => ({ time: m.time, title: m.title })) }));

    const titles = [...new Set(meetings.map(m => m.title).filter(t => t && t.length > 4))].slice(0, 30);

    saveResult(dateStr, chambers, titles,
      titles.length > 0 ? `Live — ${titles.length} meetings` : "No meetings found — check Actions log for API hints"
    );

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error("Error:", err.message);
    saveResult(todayInNewYork(), emptyChambers(), [], `Error: ${err.message}`);
  }
}

main();
