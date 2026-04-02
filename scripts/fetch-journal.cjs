// fetch-journal.cjs
// Fetches today's UN Journal from the date-specific URL and extracts meetings.
const { writeFileSync, mkdirSync } = require("fs");
const { JSDOM } = require("jsdom");

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
  const clean = raw.trim()
    .replace(/a\.m\./gi, "AM").replace(/p\.m\./gi, "PM")
    .replace(/noon/gi, "12:00 PM")
    .replace(/\s+/g, " ");
  // Already formatted like "10:00 AM"
  if (/\d{1,2}:\d{2}\s*(AM|PM)/i.test(clean)) return clean.toUpperCase();
  // 24h format
  const m24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    let h = parseInt(m24[1]);
    const min = m24[2];
    const period = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${min} ${period}`;
  }
  // "10 AM" style
  const mSimple = clean.match(/^(\d{1,2})\s*(AM|PM)$/i);
  if (mSimple) return `${mSimple[1]}:00 ${mSimple[2].toUpperCase()}`;
  return clean;
}

function todayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
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
    source: "journal.un.org",
    note: note || null,
    chambers,
    meetings,
  };
  writeFileSync("public/journal.json", JSON.stringify(output, null, 2));
  console.log(`✅ Saved journal.json — ${meetings.length} meetings${note ? " | note: " + note : ""}`);
}

async function fetchWithRetry(url) {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

async function main() {
  const dateStr = todayDateStr();
  console.log(`Fetching UN Journal for ${dateStr}...`);

  // Try multiple URL patterns the UN Journal uses
  const urls = [
    `https://journal.un.org/en/new-york/all/${dateStr}`,
    `https://journal.un.org/en/meeting/${dateStr}`,
    `https://journal.un.org/en/new-york/official/${dateStr}`,
    `https://journal.un.org/en/meeting`,
  ];

  let html = null;
  let usedUrl = null;

  for (const url of urls) {
    try {
      console.log(`Trying: ${url}`);
      html = await fetchWithRetry(url);
      if (html && html.length > 5000) {
        usedUrl = url;
        console.log(`Got ${html.length} bytes from ${url}`);
        break;
      } else {
        console.log(`Too small (${html?.length} bytes), trying next...`);
      }
    } catch (e) {
      console.log(`Failed: ${e.message}`);
    }
  }

  if (!html || html.length < 5000) {
    saveResult(dateStr, emptyChambers(), [], "Could not fetch journal.un.org — site may require JavaScript rendering");
    return;
  }

  const dom = new JSDOM(html);
  const doc = dom.window.document;

  const allMeetings = [];
  const chamberMap = {};

  // Strategy 1: Look for JSON data embedded in <script> tags (common in React/Next.js apps)
  const scripts = doc.querySelectorAll("script");
  let foundJson = false;
  scripts.forEach(script => {
    if (foundJson) return;
    const text = script.textContent || "";
    // Look for meeting data patterns in embedded JSON
    if (text.includes("meetingTitle") || text.includes("meeting_title") || text.includes('"title"') && text.includes('"room"')) {
      try {
        // Try to extract JSON objects
        const jsonMatches = text.match(/\{[^{}]{100,}\}/g) || [];
        jsonMatches.forEach(match => {
          try {
            const obj = JSON.parse(match);
            if (obj.title && (obj.room || obj.location || obj.time)) {
              allMeetings.push({
                title: obj.title,
                time: normalizeTime(obj.time || obj.startTime || ""),
                room: normalizeRoom(obj.room || obj.location || obj.venue || ""),
              });
              foundJson = true;
            }
          } catch (_) {}
        });
      } catch (_) {}
    }

    // Look for window.__INITIAL_STATE__ or similar
    if (text.includes("__NEXT_DATA__") || text.includes("__INITIAL_STATE__") || text.includes("initialData")) {
      const match = text.match(/({.+})/s);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          // Walk the object looking for arrays of meetings
          JSON.stringify(data, (key, val) => {
            if (Array.isArray(val) && val.length > 0 && val[0]?.title) {
              val.forEach(item => {
                if (item.title && item.title.length > 10) {
                  allMeetings.push({
                    title: item.title,
                    time: normalizeTime(item.time || item.startTime || item.start || ""),
                    room: normalizeRoom(item.room || item.location || item.venue || ""),
                  });
                  foundJson = true;
                }
              });
            }
            return val;
          });
        } catch (_) {}
      }
    }
  });

  console.log(`JSON strategy: ${allMeetings.length} meetings`);

  // Strategy 2: Parse HTML structure — try many selectors
  if (allMeetings.length === 0) {
    const selectors = [
      ".meeting", ".meeting-item", ".meetingItem",
      ".views-row", ".meeting-row", "[class*='meeting']",
      "tr", "li", "article",
    ];

    for (const sel of selectors) {
      const items = doc.querySelectorAll(sel);
      if (items.length < 2) continue;

      let found = 0;
      items.forEach(item => {
        const text = (item.textContent || "").replace(/\s+/g, " ").trim();
        if (text.length < 15 || text.length > 500) return;

        const isMeeting = /committee|council|assembly|working.?group|panel|forum|session|meeting|conference|group of experts|special.?rapporteur/i.test(text);
        if (!isMeeting) return;

        // Try to find time in the element or nearby
        const timeEl = item.querySelector("[class*='time'], [class*='hour'], time");
        const roomEl = item.querySelector("[class*='room'], [class*='location'], [class*='venue'], [class*='place']");
        const titleEl = item.querySelector("h1,h2,h3,h4,a,[class*='title']") || item;

        const title = (titleEl.textContent || text).replace(/\s+/g, " ").trim();
        const time = timeEl ? normalizeTime(timeEl.textContent) : "TBD";
        const room = roomEl ? normalizeRoom(roomEl.textContent) : null;

        if (title.length > 10) {
          allMeetings.push({ title, time, room });
          found++;
        }
      });

      if (found > 0) {
        console.log(`HTML selector "${sel}": ${found} meetings`);
        break;
      }
    }
  }

  // Strategy 3: Scan all text lines for meeting-like content
  if (allMeetings.length === 0) {
    console.log("Falling back to text line scanning...");
    const body = doc.body?.textContent || "";
    const lines = body.split(/[\n\r]+/).map(l => l.replace(/\s+/g, " ").trim()).filter(l => l.length > 20 && l.length < 300);

    lines.forEach(line => {
      const isMeeting = /committee|council|assembly|working group|panel|forum|session|meeting|conference/i.test(line);
      const isNoise = /cookie|privacy|login|search|menu|home|about|contact|©|copyright|javascript/i.test(line);
      if (isMeeting && !isNoise) {
        // Try to detect time pattern at start of line
        const timeMatch = line.match(/^(\d{1,2}(?::\d{2})?\s*(?:a\.m\.|p\.m\.|AM|PM))\s+(.+)/i);
        if (timeMatch) {
          allMeetings.push({ title: timeMatch[2], time: normalizeTime(timeMatch[1]), room: null });
        } else {
          allMeetings.push({ title: line, time: "TBD", room: null });
        }
      }
    });
    console.log(`Text scan: ${allMeetings.length} meetings`);
  }

  // Build chambers
  allMeetings.forEach(m => {
    if (m.room) {
      if (!chamberMap[m.room]) chamberMap[m.room] = [];
      chamberMap[m.room].push({ time: m.time, title: m.title });
    }
  });

  const chambers = [
    "General Assembly Hall",
    "Security Council",
    "Trusteeship Council",
    "Economic and Social Council",
  ].map(name => ({ room: name, meetings: chamberMap[name] || [] }));

  const meetingTitles = [...new Set(allMeetings.map(m => m.title).filter(t => t && t.length > 10))].slice(0, 30);

  const note = meetingTitles.length === 0
    ? `Parsed 0 meetings from ${usedUrl} — site may require JS rendering`
    : `Parsed from ${usedUrl}`;

  saveResult(dateStr, chambers, meetingTitles, note);
}

main().catch(err => {
  console.error("Fatal:", err.message);
  const dateStr = todayDateStr();
  saveResult(dateStr, emptyChambers(), [], `Fatal error: ${err.message}`);
});
