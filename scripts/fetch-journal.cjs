// fetch-journal.cjs
// Calls journal-api.un.org/api/allnew/{date} directly.
// Falls back to Puppeteer if direct call fails.

const { writeFileSync, mkdirSync } = require("fs");

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
    ny_date: todayInNewYork(), source: "journal-api.un.org",
    note: note || null, chambers, meetings,
  }, null, 2));
  console.log(`✅ Saved — ${meetings.length} meetings | ${note || "ok"}`);
}

// Parse the allnew API response structure
// Structure: { officialMeetings: { groups: [{ groupNameTitle, sessions: [{ name, session, meetings: [...] }] }] }, otherMeetings: {...} }
function parseJournalData(data) {
  const allMeetings = [];
  const chamberMap  = {};

  function addMeeting(meetingObj, parentName) {
    // Fields from the API (try multiple possible names)
    const time  = meetingObj.time  || meetingObj.Time  || meetingObj.startTime || meetingObj.hour || "";
    const room  = meetingObj.room  || meetingObj.Room  || meetingObj.location  || meetingObj.venue || meetingObj.roomName || "";
    const title = meetingObj.title || meetingObj.Title || meetingObj.name      || meetingObj.subject || "";
    const cancelled = meetingObj.cancelled || meetingObj.isCancelled || false;

    if (cancelled) return;

    // Build a readable title: combine parent organ name + meeting title
    const fullTitle = parentName && title && !title.toLowerCase().includes(parentName.toLowerCase())
      ? `${parentName} — ${title}`
      : title || parentName;

    if (!fullTitle || fullTitle.length < 3) return;

    const normTime    = normalizeTime(time);
    const normChamber = chamberForRoom(room);

    allMeetings.push({ title: fullTitle.trim(), time: normTime, room: room || null });

    if (normChamber) {
      if (!chamberMap[normChamber]) chamberMap[normChamber] = [];
      chamberMap[normChamber].push({ time: normTime, title: fullTitle.trim() });
    }
  }

  function processGroups(groups) {
    if (!Array.isArray(groups)) return;
    groups.forEach(group => {
      const groupName = group.groupNameTitle || group.name || "";
      const sessions  = group.sessions || group.items || [];

      sessions.forEach(session => {
        const sessionName = session.name || session.title || groupName;
        const bodyName    = session.session ? `${sessionName}, ${session.session}` : sessionName;

        // Individual meetings within the session
        const meetings = session.meetings || session.items || session.events || [];
        if (Array.isArray(meetings) && meetings.length > 0) {
          meetings.forEach(m => addMeeting(m, bodyName));
        } else {
          // The session itself might be a meeting
          addMeeting(session, groupName);
        }
      });

      // Sometimes groups have meetings directly
      if (group.meetings) {
        group.meetings.forEach(m => addMeeting(m, groupName));
      }
    });
  }

  // Official meetings
  if (data.officialMeetings?.groups) {
    processGroups(data.officialMeetings.groups);
  }

  // Informal consultations
  if (data.informalConsultations?.groups) {
    processGroups(data.informalConsultations.groups);
  }

  // Other meetings (organized by missions etc.)
  if (data.otherMeetings?.groups) {
    processGroups(data.otherMeetings.groups);
  }

  // Log raw structure for debugging
  console.log("\n📊 Raw structure keys:", Object.keys(data));
  if (data.officialMeetings?.groups?.length > 0) {
    const g = data.officialMeetings.groups[0];
    console.log("First group:", g.groupNameTitle);
    if (g.sessions?.length > 0) {
      const s = g.sessions[0];
      console.log("First session:", JSON.stringify(s).slice(0, 300));
    }
  }

  return { allMeetings, chamberMap };
}

async function fetchDirect(dateStr) {
  const url = `https://journal-api.un.org/api/allnew/${dateStr}`;
  console.log(`\nTrying direct API: ${url}`);

  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
      "Accept": "application/json, */*",
      "Origin": "https://journal.un.org",
      "Referer": "https://journal.un.org/",
    },
  });

  console.log(`  → ${res.status} | ${res.headers.get("content-type")} | ${res.headers.get("content-length") || "?"}b`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const text = await res.text();
  console.log(`  → ${text.length} bytes`);
  console.log(`  → preview: ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

async function fetchViaPuppeteer(dateStr) {
  const puppeteer = require("puppeteer");
  const url = `https://journal.un.org/en/new-york/all/${dateStr}`;
  console.log(`\nFalling back to Puppeteer: ${url}`);

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu"],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36");

    // Intercept fetch calls before the app runs
    await page.evaluateOnNewDocument(() => {
      window._apiData = null;
      const _orig = window.fetch;
      window.fetch = async function(...args) {
        const response = await _orig.apply(this, args);
        const url = (args[0] instanceof Request ? args[0].url : String(args[0]));
        if (url.includes("journal-api.un.org/api/allnew/")) {
          const clone = response.clone();
          clone.text().then(t => { window._apiData = t; }).catch(() => {});
        }
        return response;
      };
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise(r => setTimeout(r, 5000));

    const raw = await page.evaluate(() => window._apiData);
    await browser.close();

    if (!raw) throw new Error("No allnew data captured via Puppeteer");
    console.log(`  → Got ${raw.length} bytes via Puppeteer`);
    return JSON.parse(raw);

  } catch (e) {
    await browser.close().catch(() => {});
    throw e;
  }
}

async function main() {
  const dateStr = todayInNewYork();
  const dow = new Date(dateStr + "T12:00:00").toLocaleDateString("en-US",
    { timeZone: "America/New_York", weekday: "long" });

  console.log(`\n📅 NY date: ${dateStr} (${dow}) | UTC: ${new Date().toISOString()}`);

  if (dow === "Saturday" || dow === "Sunday") {
    console.log("Weekend — no UN meetings.");
    saveResult(dateStr, emptyChambers(), [], "Weekend — no meetings");
    return;
  }

  let data;

  // Try direct API first (faster, no browser needed)
  try {
    data = await fetchDirect(dateStr);
  } catch (e) {
    console.log(`Direct fetch failed: ${e.message}`);
    // Fall back to Puppeteer
    try {
      data = await fetchViaPuppeteer(dateStr);
    } catch (e2) {
      console.error("Both methods failed:", e2.message);
      saveResult(dateStr, emptyChambers(), [], `Error: ${e2.message}`);
      return;
    }
  }

  const { allMeetings, chamberMap } = parseJournalData(data);

  console.log(`\n🏛️  Chambers:`);
  ["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"].forEach(c => {
    const ms = chamberMap[c] || [];
    console.log(`  ${c}: ${ms.length > 0 ? ms.map(m=>`${m.time} — ${m.title}`).join(" | ") : "none"}`);
  });

  const chambers = ["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"]
    .map(name => ({ room: name, meetings: (chamberMap[name]||[]).map(m=>({time:m.time,title:m.title})) }));

  const titles = [...new Set(allMeetings.map(m=>m.title).filter(t=>t&&t.length>3))].slice(0,30);
  console.log(`\n📋 ${titles.length} meetings:`);
  titles.forEach(t => console.log(`  - ${t}`));

  saveResult(dateStr, chambers, titles,
    titles.length > 0
      ? `Live from journal-api.un.org — ${titles.length} meetings`
      : `API returned data but parser found 0 meetings — check structure log`
  );
}

main().catch(err => {
  console.error("Fatal:", err.message);
  saveResult(todayInNewYork(), emptyChambers(), [], `Fatal: ${err.message}`);
});
