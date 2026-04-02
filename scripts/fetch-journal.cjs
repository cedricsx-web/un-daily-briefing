// fetch-journal.js — CommonJS version for GitHub Actions compatibility
const { writeFileSync, mkdirSync } = require("fs");
const { JSDOM } = require("jsdom");

const ROOM_MAP = {
  "general assembly hall": "General Assembly Hall",
  "general assembly": "General Assembly Hall",
  "security council": "Security Council",
  "trusteeship council": "Trusteeship Council",
  "trusteeship": "Trusteeship Council",
  "economic and social council": "Economic and Social Council",
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
  const clean = raw.trim()
    .replace(/a\.m\./gi, "AM").replace(/p\.m\./gi, "PM")
    .replace(/noon/gi, "12:00 PM");
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

function saveResult(dateStr, chambers, meetings, note) {
  // Ensure public dir exists
  mkdirSync("public", { recursive: true });
  const output = {
    date: dateStr,
    fetched_at: new Date().toISOString(),
    source: "journal.un.org",
    note: note || null,
    chambers,
    meetings,
  };
  writeFileSync("public/journal.json", JSON.stringify(output, null, 2));
  console.log(`Saved journal.json — ${meetings.length} meetings, note: ${note || "none"}`);
}

async function main() {
  const today = new Date();
  const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;

  const emptyChambers = [
    { room: "General Assembly Hall", meetings: [] },
    { room: "Security Council", meetings: [] },
    { room: "Trusteeship Council", meetings: [] },
    { room: "Economic and Social Council", meetings: [] },
  ];

  console.log(`Fetching UN Journal for ${dateStr}...`);

  let html;
  try {
    const res = await fetch("https://journal.un.org/en/meeting", {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; UN-Briefing/1.0)",
        "Accept": "text/html",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    html = await res.text();
    console.log(`Fetched ${html.length} bytes`);
  } catch (err) {
    console.error("Fetch failed:", err.message);
    saveResult(dateStr, emptyChambers, [], `Fetch failed: ${err.message}`);
    return;
  }

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const allMeetings = [];
  const chamberMap = {};

  // Try multiple selectors the UN Journal might use
  const trySelectors = [
    ".meeting-item", ".meetingItem", ".views-row",
    "tr", "article", ".field-content",
  ];

  for (const sel of trySelectors) {
    const items = doc.querySelectorAll(sel);
    if (items.length < 3) continue;

    items.forEach(item => {
      const text = item.textContent?.trim() || "";
      if (text.length < 15 || text.length > 400) return;

      // Must look like a meeting title
      const isMeeting = /committee|council|assembly|working group|panel|forum|session|meeting|conference|group of experts/i.test(text);
      if (!isMeeting) return;

      const title = text.replace(/\s+/g, " ").trim();
      const timeEl = item.querySelector("[class*='time'], [class*='hour'], [class*='date']");
      const time = timeEl ? normalizeTime(timeEl.textContent) : "TBD";
      const roomEl = item.querySelector("[class*='room'], [class*='location'], [class*='venue']");
      const room = roomEl ? normalizeRoom(roomEl.textContent) : null;

      allMeetings.push({ title, time, room });

      if (room) {
        if (!chamberMap[room]) chamberMap[room] = [];
        chamberMap[room].push({ time, title });
      }
    });

    if (allMeetings.length > 0) {
      console.log(`Found ${allMeetings.length} meetings via selector: ${sel}`);
      break;
    }
  }

  const chambers = [
    "General Assembly Hall",
    "Security Council",
    "Trusteeship Council",
    "Economic and Social Council",
  ].map(name => ({ room: name, meetings: chamberMap[name] || [] }));

  const meetingTitles = [...new Set(allMeetings.map(m => m.title))].slice(0, 30);
  const note = meetingTitles.length === 0 ? "No meetings parsed — journal.un.org structure may have changed" : null;

  saveResult(dateStr, chambers, meetingTitles, note);
}

main().catch(err => {
  console.error("Unhandled error:", err);
  const dateStr = new Date().toISOString().split("T")[0];
  const emptyChambers = [
    { room: "General Assembly Hall", meetings: [] },
    { room: "Security Council", meetings: [] },
    { room: "Trusteeship Council", meetings: [] },
    { room: "Economic and Social Council", meetings: [] },
  ];
  try {
    mkdirSync("public", { recursive: true });
    writeFileSync("public/journal.json", JSON.stringify({
      date: dateStr, fetched_at: new Date().toISOString(),
      source: "journal.un.org", note: err.message,
      chambers: emptyChambers, meetings: [],
    }, null, 2));
  } catch (_) {}
});
