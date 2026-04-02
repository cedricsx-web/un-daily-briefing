// fetch-journal.cjs
// Fetches today's UN Journal using New York time.

const { writeFileSync, mkdirSync } = require("fs");

const ROOM_MAP = {
  "general assembly hall": "General Assembly Hall",
  "general assembly": "General Assembly Hall",
  "security council": "Security Council",
  "trusteeship council": "Trusteeship Council",
  "economic and social council": "Economic and Social Council",
  "ecosoc chamber": "Economic and Social Council",
  "ecosoc": "Economic and Social Council",
};

function normalizeRoom(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  for (const [key, val] of Object.entries(ROOM_MAP)) {
    if (lower.includes(key)) return val;
  }
  return raw.trim();
}

function normalizeTime(raw) {
  if (!raw) return "TBD";
  const clean = raw.toString().trim()
    .replace(/a\.m\./gi, "AM").replace(/p\.m\./gi, "PM")
    .replace(/noon/gi, "12:00 PM")
    .replace(/\s+/g, " ");
  if (/\d{1,2}:\d{2}\s*(AM|PM)/i.test(clean)) return clean.toUpperCase();
  const m24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    let h = parseInt(m24[1]);
    const min = m24[2];
    const period = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${min} ${period}`;
  }
  return clean;
}

function todayInNewYork() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
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
  const output = {
    date: dateStr,
    fetched_at: new Date().toISOString(),
    ny_date: todayInNewYork(),
    source: "journal.un.org",
    note: note || null,
    chambers,
    meetings,
  };
  writeFileSync("public/journal.json", JSON.stringify(output, null, 2));
  console.log(`✅ Saved — ${meetings.length} meetings | ${note || "ok"}`);
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
  "Accept": "application/json, text/html, */*",
  "Accept-Language": "en-US,en;q=0.9",
};

function walkForMeetings(obj, meetings, chamberMap) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    obj.forEach(item => {
      if (item && typeof item === "object") {
        const title = item.title || item.meeting_title || item.name || item.subject;
        const time = item.time || item.startTime || item.start_time || item.hour;
        const room = item.room || item.location || item.venue || item.chamber;
        if (title && typeof title === "string" && title.length > 10) {
          const normRoom = normalizeRoom(room);
          const normTime = normalizeTime(time);
          meetings.push({ title, time: normTime, room: normRoom });
          if (normRoom) {
            if (!chamberMap[normRoom]) chamberMap[normRoom] = [];
            chamberMap[normRoom].push({ time: normTime, title });
          }
        }
        walkForMeetings(item, meetings, chamberMap);
      }
    });
  } else {
    Object.values(obj).forEach(v => walkForMeetings(v, meetings, chamberMap));
  }
}

async function tryJournalAPI(dateStr) {
  // Try known and guessed UN Journal API endpoint patterns
  const apiUrls = [
    `https://journal.un.org/api/en/new-york/all/${dateStr}`,
    `https://journal.un.org/api/meetings?date=${dateStr}&location=new-york&lang=en`,
    `https://journal.un.org/api/en/meetings?date=${dateStr}`,
    `https://journal.un.org/api/meeting?date=${dateStr}&lang=en`,
    `https://journal.un.org/en/new-york/all/${dateStr}.json`,
    `https://journal.un.org/en/meeting/${dateStr}.json`,
  ];

  for (const url of apiUrls) {
    try {
      console.log(`Trying: ${url}`);
      const res = await fetch(url, { headers: HEADERS });
      console.log(`  → ${res.status} ${res.headers.get("content-type") || ""}`);
      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("json")) {
        // Try parsing as JSON anyway — some APIs return without content-type
        const text = await res.text();
        if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) continue;
        try {
          const data = JSON.parse(text);
          const meetings = [], chamberMap = {};
          walkForMeetings(data, meetings, chamberMap);
          if (meetings.length > 0) {
            console.log(`  ✅ ${meetings.length} meetings`);
            return { meetings, chamberMap, url };
          }
        } catch (_) { continue; }
      } else {
        const data = await res.json();
        const meetings = [], chamberMap = {};
        walkForMeetings(data, meetings, chamberMap);
        if (meetings.length > 0) {
          console.log(`  ✅ ${meetings.length} meetings`);
          return { meetings, chamberMap, url };
        }
        console.log(`  → JSON ok but no meetings found. Keys: ${Object.keys(data).join(", ")}`);
      }
    } catch (e) {
      console.log(`  → Error: ${e.message}`);
    }
  }
  return null;
}

async function main() {
  const dateStr = todayInNewYork();
  console.log(`\n📅 New York date: ${dateStr}`);
  console.log(`🕐 UTC time: ${new Date().toISOString()}\n`);

  const result = await tryJournalAPI(dateStr);

  if (result && result.meetings.length > 0) {
    const chambers = [
      "General Assembly Hall",
      "Security Council",
      "Trusteeship Council",
      "Economic and Social Council",
    ].map(name => ({ room: name, meetings: result.chamberMap[name] || [] }));

    const titles = [...new Set(result.meetings.map(m => m.title))].slice(0, 30);
    saveResult(dateStr, chambers, titles, `Live data from: ${result.url}`);
  } else {
    console.log("⚠️ No live data from journal.un.org — saving empty for AI fallback");
    saveResult(dateStr, emptyChambers(), [], "journal.un.org requires JS rendering — AI fallback active");
  }
}

main().catch(err => {
  console.error("Fatal:", err.message);
  saveResult(todayInNewYork(), emptyChambers(), [], `Fatal: ${err.message}`);
});
