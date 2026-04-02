// fetch-journal.cjs — Puppeteer-based, intercepts API calls from journal.un.org

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

// Walk any JSON structure looking for meeting-like objects
function extractMeetings(obj, meetings, chamberMap) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    obj.forEach(item => extractMeetings(item, meetings, chamberMap));
    return;
  }

  // Check if this object looks like a meeting
  const title = obj.title || obj.meeting_title || obj.name || obj.subject || obj.meetingTitle;
  const time  = obj.time  || obj.startTime || obj.start_time || obj.hour || obj.startHour;
  const room  = obj.room  || obj.location  || obj.venue || obj.chamber || obj.roomName;

  if (title && typeof title === "string" && title.length > 8) {
    const normTime   = normalizeTime(time);
    const normChamber = chamberForRoom(room);
    meetings.push({ title: title.trim(), time: normTime, room: room || null });
    if (normChamber) {
      if (!chamberMap[normChamber]) chamberMap[normChamber] = [];
      chamberMap[normChamber].push({ time: normTime, title: title.trim() });
    }
  }

  // Recurse into all values
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
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36");

    // Intercept all JSON responses from the journal domain
    const captured = [];
    page.on("response", async response => {
      const respUrl = response.url();
      const ct = response.headers()["content-type"] || "";
      if (!respUrl.includes("journal.un.org")) return;
      if (!ct.includes("json")) return;
      try {
        const text = await response.text();
        const data = JSON.parse(text);
        console.log(`📡 API: ${respUrl.replace("https://journal.un.org", "")} (${text.length} chars)`);
        captured.push({ url: respUrl, data });
      } catch (_) {}
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise(r => setTimeout(r, 4000)); // extra wait for lazy content

    console.log(`\nPage title: ${await page.title()}`);
    console.log(`Captured ${captured.length} API responses`);

    const meetings = [];
    const chamberMap = {};

    // Try API responses first
    for (const { url: apiUrl, data } of captured) {
      const before = meetings.length;
      extractMeetings(data, meetings, chamberMap);
      if (meetings.length > before) {
        console.log(`  → ${meetings.length - before} meetings from ${apiUrl}`);
      }
    }

    // Fallback: extract from rendered DOM text
    if (meetings.length === 0) {
      console.log("\nNo meetings from API — trying DOM text extraction...");

      const domMeetings = await page.evaluate(() => {
        const ROOM_PATTERNS = [
          "General Assembly Hall", "Security Council Chamber",
          "Security Council Consultations Room", "Trusteeship Council Chamber",
          "Economic and Social Council Chamber", "Conference Room",
        ];

        const results = [];
        const timeRe = /^(\d{1,2}:\d{2}(?:\s*-\s*\d{1,2}:\d{2})?)\s+(.+)/;

        // Get all text nodes grouped by visual line
        const lines = [];
        document.querySelectorAll("p, td, li, div, span, h3, h4").forEach(el => {
          const text = (el.textContent || "").replace(/\s+/g, " ").trim();
          if (text.length > 10 && text.length < 400) lines.push(text);
        });

        lines.forEach(line => {
          const m = line.match(timeRe);
          if (!m) return;
          if (/cancelled/i.test(line)) return;

          let title = m[2];
          let room = null;
          for (const rp of ROOM_PATTERNS) {
            const idx = title.indexOf(rp);
            if (idx !== -1) {
              room = title.slice(idx).trim();
              title = title.slice(0, idx).trim();
              break;
            }
          }
          if (title.length > 4) results.push({ title, time: m[1], room });
        });

        return results;
      });

      domMeetings.forEach(m => {
        meetings.push(m);
        const chamber = chamberForRoom(m.room);
        if (chamber) {
          if (!chamberMap[chamber]) chamberMap[chamber] = [];
          chamberMap[chamber].push({ time: normalizeTime(m.time), title: m.title });
        }
      });
      console.log(`DOM extraction: ${domMeetings.length} meetings`);
    }

    await browser.close();

    // Log chamber summary
    console.log("\n🏛️  Chambers:");
    ["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"].forEach(c => {
      const ms = chamberMap[c] || [];
      console.log(`  ${c}: ${ms.length > 0 ? ms.map(m => `${m.time} — ${m.title}`).join(" | ") : "none"}`);
    });

    const chambers = ["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"]
      .map(name => ({ room: name, meetings: (chamberMap[name] || []).map(m => ({ time: m.time, title: m.title })) }));

    const titles = [...new Set(meetings.map(m => m.title).filter(t => t && t.length > 4))].slice(0, 30);

    saveResult(dateStr, chambers, titles,
      titles.length > 0
        ? `Live — ${titles.length} meetings from journal.un.org`
        : "Page loaded but no meetings parsed — site structure may have changed"
    );

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error("Error:", err.message);
    saveResult(todayInNewYork(), emptyChambers(), [], `Error: ${err.message}`);
  }
}

main();
