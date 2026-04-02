// fetch-journal.cjs
// Uses Puppeteer page.on('response') to capture journal-api.un.org/api/allnew/
// This method was confirmed working in a previous run (25287 bytes captured).

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
    ny_date: todayInNewYork(), source: "journal-api.un.org",
    note: note || null, chambers, meetings,
  }, null, 2));
  console.log(`✅ Saved — ${meetings.length} meetings | ${note || "ok"}`);
}

// Parse the allnew API response
// Structure: { officialMeetings: { groups: [{ groupNameTitle, sessions: [{ name, session, meetings: [{ title, time, room, cancelled }] }] }] } }
function parseJournalData(data) {
  const allMeetings = [];
  const chamberMap  = {};

  // Log raw top-level keys
  console.log("\n📊 Top-level keys:", Object.keys(data).join(", "));

  function processMeetingItem(item, bodyLabel) {
    if (!item || typeof item !== "object") return;
    if (item.cancelled || item.isCancelled) return;

    // Try every possible field name for the meeting title
    const rawTitle = item.title || item.Title || item.name || item.Name
                   || item.subject || item.Subject || item.description || "";
    // Time
    const rawTime  = item.time  || item.Time  || item.startTime || item.start_time
                   || item.hour || item.Hour  || item.startHour || "";
    // Room
    const rawRoom  = item.room  || item.Room  || item.location  || item.Location
                   || item.venue || item.Venue || item.roomName  || item.RoomName
                   || item.place || item.chamber || "";

    // Build display title
    const meetingTitle = rawTitle.trim();
    const fullTitle = bodyLabel && meetingTitle
      ? `${bodyLabel} — ${meetingTitle}`
      : meetingTitle || bodyLabel || "";

    if (!fullTitle || fullTitle.length < 3) return;

    const normTime    = normalizeTime(rawTime);
    const normChamber = chamberForRoom(rawRoom);

    allMeetings.push({ title: fullTitle, time: normTime, room: rawRoom || null });

    if (normChamber) {
      if (!chamberMap[normChamber]) chamberMap[normChamber] = [];
      chamberMap[normChamber].push({ time: normTime, title: fullTitle });
    }
  }

  function processSection(section, sectionLabel) {
    if (!section) return;
    const groups = section.groups || section.items || (Array.isArray(section) ? section : []);

    groups.forEach(group => {
      const organName = group.groupNameTitle || group.name || group.title || sectionLabel;
      const sessions  = group.sessions || group.items || group.bodies || [];

      sessions.forEach(session => {
        const sessionName = session.name || session.title || organName;
        const sessionNum  = session.session || session.sessionNumber || "";
        const bodyLabel   = sessionNum ? `${sessionName}, ${sessionNum}` : sessionName;

        const meetings = session.meetings || session.items || session.events || [];

        if (Array.isArray(meetings) && meetings.length > 0) {
          // Log first session structure for debugging
          if (allMeetings.length === 0) {
            console.log(`\nFirst session "${bodyLabel}" meetings[0]:`, JSON.stringify(meetings[0]).slice(0, 300));
          }
          meetings.forEach(m => processMeetingItem(m, bodyLabel));
        } else {
          // Session itself is the meeting entry
          processMeetingItem(session, organName);
        }
      });

      // Groups sometimes have meetings directly
      const directMeetings = group.meetings || [];
      directMeetings.forEach(m => processMeetingItem(m, organName));
    });
  }

  processSection(data.officialMeetings, "Official Meetings");
  processSection(data.informalConsultations, "Informal Consultations");
  processSection(data.otherMeetings, "Other Meetings");

  return { allMeetings, chamberMap };
}

async function main() {
  const dateStr = todayInNewYork();
  const dow = new Date(dateStr + "T12:00:00").toLocaleDateString("en-US",
    { timeZone: "America/New_York", weekday: "long" });

  console.log(`\n📅 NY date: ${dateStr} (${dow}) | UTC: ${new Date().toISOString()}`);

  if (dow === "Saturday" || dow === "Sunday") {
    saveResult(dateStr, emptyChambers(), [], "Weekend — no meetings");
    return;
  }

  const url = `https://journal.un.org/en/new-york/all/${dateStr}`;
  console.log(`\nOpening: ${url}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu"],
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    // Capture the allnew response via network interception
    let journalData = null;

    page.on("response", async response => {
      const respUrl = response.url();
      if (!respUrl.includes("allnew")) return;

      try {
        const buf  = await response.buffer();
        const text = buf.toString("utf8");
        console.log(`\n📡 Captured: ${respUrl} | ${buf.length}b`);
        console.log(`   Preview: ${text.slice(0, 200)}`);
        journalData = JSON.parse(text);
        console.log(`   ✅ Parsed JSON successfully`);
      } catch (e) {
        console.log(`   ⚠️ Parse error: ${e.message}`);
      }
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    console.log(`\nPage: ${await page.title()}`);

    // Wait for any lazy-loaded data
    await new Promise(r => setTimeout(r, 5000));
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 2000));

    await browser.close();

    if (!journalData) {
      saveResult(dateStr, emptyChambers(), [], "No allnew data captured — page may not have loaded meeting data");
      return;
    }

    const { allMeetings, chamberMap } = parseJournalData(journalData);

    console.log(`\n🏛️  Chambers:`);
    ["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"].forEach(c => {
      const ms = chamberMap[c] || [];
      console.log(`  ${c}: ${ms.length > 0 ? ms.map(m=>`${m.time} — ${m.title}`).join(" | ") : "none"}`);
    });

    const titles = [...new Set(allMeetings.map(m=>m.title).filter(t=>t&&t.length>3))].slice(0,30);
    console.log(`\n📋 ${titles.length} meetings:`);
    titles.forEach(t => console.log(`  - ${t}`));

    const chambers = ["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"]
      .map(name => ({ room: name, meetings: (chamberMap[name]||[]).map(m=>({time:m.time,title:m.title})) }));

    saveResult(dateStr, chambers, titles,
      titles.length > 0
        ? `Live from journal-api.un.org — ${titles.length} meetings`
        : `API data received but 0 meetings parsed — check structure log`
    );

  } catch (err) {
    if (browser) await browser.close().catch(()=>{});
    console.error("Error:", err.message);
    saveResult(todayInNewYork(), emptyChambers(), [], `Error: ${err.message}`);
  }
}

main();
