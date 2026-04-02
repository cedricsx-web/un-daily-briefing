// fetch-journal.cjs
// Downloads the UN Journal PDF and parses it for today's meetings.
// Chambers show what is physically happening in each room.

const { writeFileSync, mkdirSync } = require("fs");
const pdfParse = require("pdf-parse");

// Map PDF room names → our 4 display chambers
const CHAMBER_ROOM_MAP = {
  "general assembly hall": "General Assembly Hall",
  "security council chamber": "Security Council",
  "security council consultations room": "Security Council",
  "trusteeship council chamber": "Trusteeship Council",
  "economic and social council chamber": "Economic and Social Council",
};

// Returns the display chamber name if this room is one of the 4 main chambers
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
  // Strip end time from ranges like "10:00 - 13:00"
  const clean = raw.trim().replace(/\s*-\s*\d{1,2}:\d{2}$/, "");
  const m = clean.match(/(\d{1,2}):(\d{2})/);
  if (!m) return raw.trim();
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
    source: "journal.un.org/pdf",
    note: note || null,
    chambers,
    meetings,
  }, null, 2));
  console.log(`✅ Saved — ${meetings.length} meetings | ${note || "ok"}`);
}

function pdfUrls(dateStr) {
  return [
    `https://journal.un.org/en/new-york/PDF/EN/${dateStr}`,
    `https://journal.un.org/en/new-york/pdf/en/${dateStr}`,
    `https://journal.un.org/resource/pdf/en/${dateStr}`,
    `https://journal.un.org/en/new-york/PDF/${dateStr}`,
  ];
}

async function downloadPDF(dateStr) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
    "Accept": "application/pdf,*/*",
  };
  for (const url of pdfUrls(dateStr)) {
    try {
      console.log(`Trying: ${url}`);
      const res = await fetch(url, { headers });
      console.log(`  → ${res.status} ${res.headers.get("content-type") || ""}`);
      if (!res.ok) continue;
      const ct = res.headers.get("content-type") || "";
      if (!ct.includes("pdf") && !ct.includes("octet-stream")) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      console.log(`  → ${buffer.byteLength} bytes`);
      return { buffer, url };
    } catch (e) {
      console.log(`  → ${e.message}`);
    }
  }
  return null;
}

// All known room name fragments from the UN Journal PDF
const ROOM_PATTERNS = [
  "General Assembly Hall",
  "Security Council Chamber",
  "Security Council Consultations Room",
  "Trusteeship Council Chamber",
  "Economic and Social Council Chamber",
  "Conference Room",
  "Press Briefing Room",
];

function parsePDFText(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const allMeetings = [];   // All meetings for the flat list
  const chamberMap = {};    // Keyed by display chamber name

  let inOfficialMeetings = false;
  let inOtherMeetings = false;

  // Time pattern at start of line
  const timePattern = /^(\d{1,2}:\d{2}(?:\s*-\s*\d{1,2}:\d{2})?)\s+(.+)/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Section tracking
    if (line === "Official Meetings") { inOfficialMeetings = true; inOtherMeetings = false; continue; }
    if (line === "Other Meetings") { inOtherMeetings = true; inOfficialMeetings = false; continue; }
    if (line === "Informal Consultations" || line === "Forthcoming Official Meetings" || line === "Forthcoming Informal Consultations" || line === "Forthcoming Other Meetings") {
      inOfficialMeetings = false; inOtherMeetings = false; continue;
    }

    // Only parse Official Meetings and Other Meetings sections
    if (!inOfficialMeetings && !inOtherMeetings) continue;

    const timeMatch = line.match(timePattern);
    if (!timeMatch) continue;

    const time = normalizeTime(timeMatch[1]);
    const rest = timeMatch[2].trim();

    // Skip cancelled meetings
    if (/^cancelled/i.test(rest)) continue;

    // Find room name at the end of the line
    let title = rest;
    let rawRoom = null;

    for (const rp of ROOM_PATTERNS) {
      const idx = rest.indexOf(rp);
      if (idx !== -1) {
        // Extract room: from pattern start to end of line
        rawRoom = rest.slice(idx).trim();
        title = rest.slice(0, idx).trim();
        break;
      }
    }

    // Clean up title
    title = title.replace(/\s+/g, " ").trim();
    if (title.length < 4) continue;

    // Determine which display chamber this meeting is in (based on physical room)
    const chamber = chamberForRoom(rawRoom);

    allMeetings.push({ title, time, room: rawRoom });

    // Add to chamber map if it's one of the 4 main rooms
    if (chamber) {
      if (!chamberMap[chamber]) chamberMap[chamber] = [];
      chamberMap[chamber].push({ time, title, rawRoom });
    }
  }

  return { allMeetings, chamberMap };
}

async function main() {
  const dateStr = todayInNewYork();
  console.log(`\n📅 NY date: ${dateStr} | UTC: ${new Date().toISOString()}\n`);

  const downloaded = await downloadPDF(dateStr);
  if (!downloaded) {
    console.log("❌ Could not download PDF");
    saveResult(dateStr, emptyChambers(), [], "PDF not available — AI fallback active");
    return;
  }

  let text;
  try {
    const data = await pdfParse(downloaded.buffer);
    text = data.text;
    console.log(`📄 Extracted ${text.length} chars`);
  } catch (e) {
    saveResult(dateStr, emptyChambers(), [], `PDF parse error: ${e.message}`);
    return;
  }

  const { allMeetings, chamberMap } = parsePDFText(text);

  // Log parsed results clearly
  console.log(`\n📋 ${allMeetings.length} total meetings\n`);
  console.log("🏛️  Chamber assignments:");
  ["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"].forEach(c => {
    const ms = chamberMap[c] || [];
    console.log(`  ${c}: ${ms.length > 0 ? ms.map(m => `${m.time} ${m.title}`).join(", ") : "none"}`);
  });

  const chambers = [
    "General Assembly Hall",
    "Security Council",
    "Trusteeship Council",
    "Economic and Social Council",
  ].map(name => ({
    room: name,
    meetings: (chamberMap[name] || []).map(m => ({ time: m.time, title: m.title })),
  }));

  const titles = [...new Set(allMeetings.map(m => m.title).filter(t => t.length > 4))].slice(0, 30);

  saveResult(
    dateStr, chambers, titles,
    titles.length > 0
      ? `PDF parsed — ${titles.length} meetings from ${downloaded.url}`
      : `PDF downloaded but 0 meetings parsed — check log`
  );
}

main().catch(err => {
  console.error("Fatal:", err.message);
  saveResult(todayInNewYork(), emptyChambers(), [], `Fatal: ${err.message}`);
});
