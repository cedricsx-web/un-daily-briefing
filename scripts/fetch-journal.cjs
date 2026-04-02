// fetch-journal.cjs
// Fetches today's UN Journal using New York time.
// Since journal.un.org requires JavaScript rendering, we try multiple approaches:
// 1. The UN Journal API endpoint (JSON)
// 2. The papercall/pdf text approach
// 3. The papercall week-ahead page from SG website

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
  const mSimple = clean.match(/^(\d{1,2})\s*(AM|PM)$/i);
  if (mSimple) return `${mSimple[1]}:00 ${mSimple[2].toUpperCase()}`;
  return clean;
}

// Get today's date in New York time (EST/EDT)
function todayInNewYork() {
  const now = new Date();
  // Use Intl to get New York date parts
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
  console.log(`✅ Saved journal.json — ${meetings.length} meetings | ${note || "ok"}`);
}

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
  "Accept": "application/json, text/html, */*",
  "Accept-Language": "en-US,en;q=0.9",
};

async function tryJournalAPI(dateStr) {
  // The UN Journal has internal API endpoints — try common patterns
  const apiUrls = [
    `https://journal.un.org/api/meetings?date=${dateStr}&location=new-york`,
    `https://journal.un.org/api/en/meetings/${dateStr}`,
    `https://journal.un.org/en/api/meetings?date=${dateStr}`,
    `https://journal.un.org/api/meeting?date=${dateStr}`,
  ];

  for (const url of apiUrls) {
    try {
      console.log(`Trying API: ${url}`);
      const res = await fetch(url, { headers: HEADERS });
      if (!res.ok) continue;
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("json")) continue;
      const data = await res.json();
      console.log(`API response keys: ${Object.keys(data).join(", ")}`);

      // Walk the response looking for meeting arrays
      const meetings = [];
      const chamberMap = {};

      function walkData(obj) {
        if (!obj || typeof obj !== "object") return;
        if (Array.isArray(obj)) {
          obj.forEach(item => {
            if (item && typeof item === "object") {
              const title = item.title || item.meeting_title || item.name || item.subject;
              const time = item.time || item.startTime || item.start_time || item.hour;
              const room = item.room || item.location || item.venue || item.chamber;
              if (title && title.length > 10) {
                const normRoom = normalizeRoom(room);
                meetings.push({ title, time: normalizeTime(time), room: normRoom });
                if (normRoom) {
                  if (!chamberMap[normRoom]) chamberMap[normRoom] = [];
                  chamberMap[normRoom].push({ time: normalizeTime(time), title });
                }
              }
              walkData(item);
            }
          });
        } else {
          Object.values(obj).forEach(walkData);
        }
      }
      walkData(data);

      if (meetings.length > 0) {
        console.log(`Found ${meetings.length} meetings via API: ${url}`);
        return { meetings, chamberMap, url };
      }
    } catch (e) {
      console.log(`API ${url} failed: ${e.message}`);
    }
  }
  return null;
}

async function tryWeekAhead() {
  // The SG's "Week Ahead" page has plain text meeting info
  try {
    const url = "https://www.un.org/sg/en/content/the-week-ahead-the-united-nations";
    console.log(`Trying Week Ahead: ${url}`);
    const res = await fetch(url, { headers: HEADERS });
    if (!res.ok) return null;
    const html = await res.text();

    const meetings = [];
    const chamberMap = {};
    const dateStr = todayInNewYork();

    // Find today's section — look for time patterns with meeting info
    const lines = html.replace(/<[^>]+>/g, " ").split(/[\n\r]+/)
      .map(l => l.replace(/\s+/g, " ").trim())
      .filter(l => l.length > 15);

    lines.forEach(line => {
      const isMeeting = /committee|council|assembly|working.?group|panel|forum|session|meeting|conference|special.?meeting|high.?level/i.test(line);
      const isNoise = /cookie|privacy|login|javascript|©|copyright|subscribe|newsletter/i.test(line);
      if (!isMeeting || isNoise) return;

      // Look for time at start: "At 10:00 a.m." or "10 a.m."
      const timeMatch = line.match(/(?:at\s+)?(\d{1,2}(?::\d{2})?\s*(?:a\.m\.|p\.m\.|AM|PM|noon))/i);
      const time = timeMatch ? normalizeTime(timeMatch[1]) : "TBD";

      // Look for room mentions
      let room = null;
      if (/general assembly/i.test(line)) room = "General Assembly Hall";
      else if (/security council/i.test(line)) room = "Security Council";
      else if (/trusteeship/i.test(line)) room = "Trusteeship Council";
      else if (/ecosoc|economic and social/i.test(line)) room = "Economic and Social Council";

      const title = line.replace(/^at\s+\d{1,2}(?::\d{2})?\s*(?:a\.m\.|p\.m\.|AM|PM|noon)[,.]?\s*/i, "")
        .replace(/\s+/g, " ").trim();

      if (title.length > 10) {
        meetings.push({ title, time, room });
        if (room) {
          if (!chamberMap[room]) chamberMap[room] = [];
          chamberMap[room].push({ time, title });
        }
      }
    });

    if (meetings.length > 0) {
      console.log(`Found ${meetings.length} meetings from Week Ahead page`);
      return { meetings, chamberMap, url };
    }
  } catch (e) {
    console.log(`Week Ahead failed: ${e.message}`);
  }
  return null;
}

async function main() {
  const dateStr = todayInNewYork();
  console.log(`\n📅 New York date: ${dateStr}`);
  console.log(`🕐 UTC time: ${new Date().toISOString()}\n`);

  // Try 1: Journal API
  let result = await tryJournalAPI(dateStr);

  // Try 2: Week Ahead page
  if (!result) result = await tryWeekAhead();

  if (result && result.meetings.length > 0) {
    const chambers = [
      "General Assembly Hall",
      "Security Council",
      "Trusteeship Council",
      "Economic and Social Council",
    ].map(name => ({ room: name, meetings: result.chamberMap[name] || [] }));

    const titles = [...new Set(result.meetings.map(m => m.title))].slice(0, 30);
    saveResult(dateStr, chambers, titles, `✅ Live data from: ${result.url}`);
  } else {
    // No live data — save empty with correct NY date so app uses AI fallback
    console.log("⚠️ No live meeting data found — saving empty for AI fallback");
    saveResult(dateStr, emptyChambers(), [], "journal.un.org requires JS rendering — using AI fallback for meetings");
  }
}

main().catch(err => {
  console.error("Fatal:", err.message);
  saveResult(todayInNewYork(), emptyChambers(), [], `Fatal: ${err.message}`);
});
