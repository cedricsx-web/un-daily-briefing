// fetch-journal.cjs
// Puppeteer opens journal.un.org and intercepts ALL API calls including journal-api.un.org

const { writeFileSync, mkdirSync } = require("fs");
const puppeteer = require("puppeteer");

const CHAMBER_MAP = {
  "general assembly hall": "General Assembly Hall",
  "security council chamber": "Security Council",
  "security council consultations room": "Security Council",
  "trusteeship council chamber": "Trusteeship Council",
  "economic and social council chamber": "Economic and Social Council",
};

function chamberForRoom(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  for (const [key, val] of Object.entries(CHAMBER_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

function normalizeTime(raw) {
  if (!raw) return "TBD";
  const clean = raw.toString().trim().replace(/\s*-\s*\d{1,2}:\d{2}$/, "");
  const m = clean.match(/(\d{1,2}):(\d{2})/);
  if (!m) return raw.toString().trim();
  let h = parseInt(m[1]), min = m[2];
  const p = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${p}`;
}

function todayInNewYork() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
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
    date: dateStr, fetched_at: new Date().toISOString(),
    ny_date: todayInNewYork(), source: "journal.un.org",
    note: note || null, chambers, meetings,
  }, null, 2));
  console.log(`✅ Saved — ${meetings.length} meetings | ${note || "ok"}`);
}

// Recursively walk JSON looking for meeting objects
function extractMeetings(obj, results, chamberMap) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    obj.forEach(item => extractMeetings(item, results, chamberMap));
    return;
  }
  // Try every plausible field name combo
  const title = obj.title || obj.Title || obj.meeting_title || obj.MeetingTitle
              || obj.name  || obj.Name  || obj.subject     || obj.Subject;
  const time  = obj.time  || obj.Time  || obj.startTime   || obj.StartTime
              || obj.start_time || obj.hour || obj.Hour    || obj.startHour;
  const room  = obj.room  || obj.Room  || obj.location    || obj.Location
              || obj.venue || obj.Venue || obj.chamber     || obj.Chamber
              || obj.roomName || obj.RoomName;

  if (title && typeof title === "string" && title.trim().length > 8) {
    const normTime    = normalizeTime(time);
    const normChamber = chamberForRoom(room);
    results.push({ title: title.trim(), time: normTime, room: room || null });
    if (normChamber) {
      if (!chamberMap[normChamber]) chamberMap[normChamber] = [];
      chamberMap[normChamber].push({ time: normTime, title: title.trim() });
    }
    return; // don't recurse into meeting objects to avoid duplicates
  }
  Object.values(obj).forEach(v => {
    if (v && typeof v === "object") extractMeetings(v, results, chamberMap);
  });
}

async function main() {
  const dateStr = todayInNewYork();
  console.log(`\n📅 NY date: ${dateStr} | UTC: ${new Date().toISOString()}\n`);

  const url = `https://journal.un.org/en/new-york/all/${dateStr}`;
  console.log(`Opening: ${url}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu"],
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36");

    // ── Intercept ALL JSON responses from ANY domain ──────────────────────
    const captured = [];
    page.on("response", async response => {
      const respUrl = response.url();
      const ct      = response.headers()["content-type"] || "";
      const status  = response.status();

      // Log every non-asset response for debugging
      if (!respUrl.match(/\.(js|css|png|jpg|svg|ico|woff|woff2)(\?|$)/)) {
        try {
          const buf = await response.buffer();
          const text = buf.toString("utf8");
          console.log(`[${status}] ${respUrl.slice(0, 100)} | ${ct.slice(0, 40)} | ${buf.length}b`);

          // Try to parse as JSON
          if (text.trim().startsWith("{") || text.trim().startsWith("[")) {
            try {
              const data = JSON.parse(text);
              console.log(`  → JSON! Keys: ${Array.isArray(data) ? `array[${data.length}]` : Object.keys(data).slice(0,5).join(", ")}`);
              captured.push({ url: respUrl, data });
            } catch (_) {}
          } else if (text.length < 500) {
            console.log(`  → text: ${text.replace(/\s+/g," ").slice(0,100)}`);
          }
        } catch (_) {}
      }
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    console.log(`\nPage title: ${await page.title()}`);
    console.log(`Waiting 5s for lazy content...`);
    await new Promise(r => setTimeout(r, 5000));

    // Scroll to trigger any lazy loading
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await new Promise(r => setTimeout(r, 2000));
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 2000));

    console.log(`\nTotal JSON responses captured: ${captured.length}`);

    const meetings   = [];
    const chamberMap = {};

    for (const { url: apiUrl, data } of captured) {
      const before = meetings.length;
      extractMeetings(data, meetings, chamberMap);
      if (meetings.length > before) {
        console.log(`✅ +${meetings.length - before} meetings from: ${apiUrl}`);
      }
    }

    // If still empty, dump all captured data for debugging
    if (meetings.length === 0 && captured.length > 0) {
      console.log("\n⚠️  No meetings found. Captured JSON previews:");
      captured.forEach(({ url: u, data }) => {
        console.log(`  ${u.slice(0,80)}: ${JSON.stringify(data).slice(0,200)}`);
      });
    }

    await browser.close();

    console.log("\n🏛️  Chambers:");
    ["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"].forEach(c => {
      const ms = chamberMap[c] || [];
      console.log(`  ${c}: ${ms.length > 0 ? ms.map(m=>`${m.time} — ${m.title}`).join(" | ") : "none"}`);
    });

    const chambers = ["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"]
      .map(name => ({ room: name, meetings: (chamberMap[name]||[]).map(m=>({time:m.time,title:m.title})) }));
    const titles = [...new Set(meetings.map(m=>m.title).filter(t=>t&&t.length>4))].slice(0,30);

    saveResult(dateStr, chambers, titles,
      titles.length > 0 ? `Live — ${titles.length} meetings from journal.un.org` : "Page loaded but no meetings parsed — see log"
    );

  } catch (err) {
    if (browser) await browser.close().catch(()=>{});
    console.error("Error:", err.message);
    saveResult(todayInNewYork(), emptyChambers(), [], `Error: ${err.message}`);
  }
}

main();
