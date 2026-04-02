// fetch-journal.cjs
// Calls journal-api.un.org directly — no browser needed.

const { writeFileSync, mkdirSync } = require("fs");

const API_BASE = "https://journal-api.un.org/api";

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
    source: "journal-api.un.org",
    note: note || null,
    chambers,
    meetings,
  }, null, 2));
  console.log(`✅ Saved — ${meetings.length} meetings | ${note || "ok"}`);
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
  "Accept": "application/json, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Origin": "https://journal.un.org",
  "Referer": "https://journal.un.org/",
};

function extractMeetings(obj, meetings, chamberMap) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    obj.forEach(item => extractMeetings(item, meetings, chamberMap));
    return;
  }

  const title = obj.title || obj.Title || obj.meeting_title || obj.MeetingTitle || obj.name || obj.subject;
  const time  = obj.time  || obj.Time  || obj.startTime || obj.StartTime || obj.start_time || obj.hour || obj.Hour;
  const room  = obj.room  || obj.Room  || obj.location  || obj.Location  || obj.venue || obj.Venue || obj.chamber || obj.Chamber;

  if (title && typeof title === "string" && title.length > 8) {
    const normTime    = normalizeTime(time);
    const normChamber = chamberForRoom(room);
    meetings.push({ title: title.trim(), time: normTime, room: room || null });
    if (normChamber) {
      if (!chamberMap[normChamber]) chamberMap[normChamber] = [];
      chamberMap[normChamber].push({ time: normTime, title: title.trim() });
    }
    return; // don't recurse into meeting objects
  }

  Object.values(obj).forEach(v => {
    if (v && typeof v === "object") extractMeetings(v, meetings, chamberMap);
  });
}

async function tryEndpoint(url) {
  try {
    console.log(`Trying: ${url}`);
    const res = await fetch(url, { headers: HEADERS });
    const ct = res.headers.get("content-type") || "";
    console.log(`  → ${res.status} | ${ct}`);
    if (!res.ok) return null;
    const text = await res.text();
    console.log(`  → ${text.length} bytes | preview: ${text.slice(0, 150).replace(/\s+/g, " ")}`);
    try {
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  } catch (e) {
    console.log(`  → Error: ${e.message}`);
    return null;
  }
}

async function main() {
  const dateStr = todayInNewYork();
  console.log(`\n📅 NY date: ${dateStr} | UTC: ${new Date().toISOString()}\n`);

  // Try every plausible endpoint at journal-api.un.org
  const endpoints = [
    `${API_BASE}/new-york/all/${dateStr}`,
    `${API_BASE}/en/new-york/all/${dateStr}`,
    `${API_BASE}/meetings?date=${dateStr}&location=new-york&lang=en`,
    `${API_BASE}/meetings?date=${dateStr}&location=new-york`,
    `${API_BASE}/meeting?date=${dateStr}&lang=en`,
    `${API_BASE}/meeting/${dateStr}?lang=en`,
    `${API_BASE}/new-york/meetings/${dateStr}`,
    `${API_BASE}/en/meetings/${dateStr}`,
    `${API_BASE}/${dateStr}/new-york`,
    `${API_BASE}/journal/new-york/${dateStr}`,
    `${API_BASE}/journal/${dateStr}`,
  ];

  const meetings   = [];
  const chamberMap = {};
  let   usedUrl    = null;

  for (const url of endpoints) {
    const data = await tryEndpoint(url);
    if (!data) continue;

    const before = meetings.length;
    extractMeetings(data, meetings, chamberMap);

    if (meetings.length > before) {
      console.log(`\n✅ Found ${meetings.length - before} meetings from: ${url}`);
      usedUrl = url;
      break;
    } else {
      console.log(`  → Parsed OK but no meetings. Keys: ${Object.keys(data).join(", ")}`);
    }
  }

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
      ? `Live from ${usedUrl} — ${titles.length} meetings`
      : "No meetings found at journal-api.un.org — check log for response previews"
  );
}

main().catch(err => {
  console.error("Fatal:", err.message);
  saveResult(todayInNewYork(), emptyChambers(), [], `Fatal: ${err.message}`);
});
