// fetch-journal.js
// Runs daily via GitHub Actions. Fetches journal.un.org, extracts meetings,
// saves to public/journal.json for the React app to consume.

import { writeFileSync } from “fs”;
import { JSDOM } from “jsdom”;

const CHAMBERS = [
“General Assembly Hall”,
“Security Council Chamber”,
“Trusteeship Council Chamber”,
“Economic and Social Council Chamber”,
];

// Normalize room names from the Journal to our standard names
const ROOM_MAP = {
“general assembly”: “General Assembly Hall”,
“general assembly hall”: “General Assembly Hall”,
“security council”: “Security Council”,
“trusteeship council”: “Trusteeship Council”,
“trusteeship”: “Trusteeship Council”,
“economic and social council”: “Economic and Social Council”,
“ecosoc”: “Economic and Social Council”,
“conference room e”: “Conference Room E”,
“conference room 1”: “Conference Room 1”,
“conference room 2”: “Conference Room 2”,
“conference room 3”: “Conference Room 3”,
“conference room 4”: “Conference Room 4”,
};

function normalizeRoom(raw) {
if (!raw) return raw;
const lower = raw.toLowerCase().trim();
for (const [key, val] of Object.entries(ROOM_MAP)) {
if (lower.includes(key)) return val;
}
return raw.trim();
}

function normalizeTime(raw) {
if (!raw) return null;
// Handle formats like “10 a.m.”, “3 p.m.”, “10:00”, “15:00”
const clean = raw.trim().toLowerCase()
.replace(“a.m.”, “AM”).replace(“p.m.”, “PM”)
.replace(“noon”, “12:00 PM”);
const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
if (match24) {
let h = parseInt(match24[1]);
const m = match24[2];
const period = h >= 12 ? “PM” : “AM”;
if (h > 12) h -= 12;
if (h === 0) h = 12;
return `${h}:${m} ${period}`;
}
return clean;
}

async function fetchJournal() {
const today = new Date();
const dateStr = today.toISOString().split(“T”)[0]; // YYYY-MM-DD

console.log(`Fetching UN Journal for ${dateStr}...`);

let html;
try {
const res = await fetch(“https://journal.un.org/en/meeting”, {
headers: {
“User-Agent”: “Mozilla/5.0 (compatible; UN-Briefing-Bot/1.0)”,
“Accept”: “text/html,application/xhtml+xml”,
“Accept-Language”: “en-US,en;q=0.9”,
},
});
if (!res.ok) throw new Error(`HTTP ${res.status}`);
html = await res.text();
console.log(`Fetched ${html.length} bytes`);
} catch (err) {
console.error(“Failed to fetch journal.un.org:”, err.message);
saveEmpty(dateStr, `Fetch failed: ${err.message}`);
process.exit(0);
}

const dom = new JSDOM(html);
const doc = dom.window.document;

const allMeetings = [];
const chamberMap = {};

// Strategy 1: Look for meeting rows in tables or structured lists
// The UN Journal uses various selectors depending on the page version
const selectors = [
“.meeting-item”, “.meetingItem”, “.views-row”,
“tr.meeting”, “.field-name-title”, “.meeting”,
“article”, “.views-field-title”,
];

let found = false;
for (const sel of selectors) {
const items = doc.querySelectorAll(sel);
if (items.length > 2) {
console.log(`Found ${items.length} items with selector: ${sel}`);
items.forEach(item => {
const titleEl = item.querySelector(“h3, h2, .title, .field-content, a”) || item;
const title = titleEl.textContent?.trim();
if (!title || title.length < 10) return;

```
    const timeEl = item.querySelector(".time, .meeting-time, .date-time, [class*='time']");
    const time = timeEl ? normalizeTime(timeEl.textContent) : null;

    const roomEl = item.querySelector(".room, .location, .venue, [class*='room'], [class*='location']");
    const room = roomEl ? normalizeRoom(roomEl.textContent) : null;

    if (title && title.length > 5) {
      allMeetings.push({ title, time, room });
      if (room) {
        if (!chamberMap[room]) chamberMap[room] = [];
        chamberMap[room].push({ time: time || "TBD", title });
      }
    }
  });
  if (allMeetings.length > 0) { found = true; break; }
}
```

}

// Strategy 2: Scan all text for meeting-like patterns
if (!found || allMeetings.length === 0) {
console.log(“Trying text extraction fallback…”);
const bodyText = doc.body?.textContent || “”;
const lines = bodyText.split(”\n”)
.map(l => l.trim())
.filter(l => l.length > 20 && l.length < 300)
.filter(l => !l.match(/^(home|menu|search|login|about|contact|©)/i));

```
// Look for lines that look like meeting titles
const meetingPatterns = [
  /committee/i, /council/i, /assembly/i, /working group/i,
  /panel/i, /forum/i, /session/i, /meeting/i, /conference/i,
];
lines.forEach(line => {
  if (meetingPatterns.some(p => p.test(line))) {
    allMeetings.push({ title: line, time: null, room: null });
  }
});
```

}

// Build chambers array (always include all 4 main chambers)
const mainChambers = [
“General Assembly Hall”,
“Security Council”,
“Trusteeship Council”,
“Economic and Social Council”,
];

const chambers = mainChambers.map(name => ({
room: name,
meetings: chamberMap[name] || [],
}));

// Flat list of all meeting titles (deduplicated)
const meetingTitles = […new Set(
allMeetings
.map(m => m.title)
.filter(t => t && t.length > 10)
)];

const output = {
date: dateStr,
fetched_at: new Date().toISOString(),
source: “journal.un.org”,
chambers,
meetings: meetingTitles.slice(0, 30), // cap at 30
raw_count: allMeetings.length,
};

const path = “public/journal.json”;
writeFileSync(path, JSON.stringify(output, null, 2));
console.log(`✅ Saved ${meetingTitles.length} meetings to ${path}`);
console.log(`   Chambers with sessions: ${chambers.filter(c => c.meetings.length > 0).map(c => c.room).join(", ") || "none detected"}`);
}

function saveEmpty(date, reason) {
const output = {
date,
fetched_at: new Date().toISOString(),
source: “journal.un.org”,
error: reason,
chambers: [
{ room: “General Assembly Hall”, meetings: [] },
{ room: “Security Council”, meetings: [] },
{ room: “Trusteeship Council”, meetings: [] },
{ room: “Economic and Social Council”, meetings: [] },
],
meetings: [],
};
writeFileSync(“public/journal.json”, JSON.stringify(output, null, 2));
console.log(“Saved empty journal.json due to error:”, reason);
}

fetchJournal().catch(err => {
console.error(“Unhandled error:”, err);
saveEmpty(new Date().toISOString().split(“T”)[0], err.message);
process.exit(0); // don’t fail the workflow
});
