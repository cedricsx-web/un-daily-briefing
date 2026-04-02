// fetch-journal.cjs
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
  const lower = (raw || "").toString().toLowerCase().trim();
  for (const [key, val] of Object.entries(CHAMBER_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

function stripHtml(str) {
  if (!str || typeof str !== "string") return "";
  return str.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function getText(field) {
  if (!field) return "";
  if (typeof field === "string") return stripHtml(field);
  if (typeof field === "object") {
    const val = field.en || field.En || field.english || Object.values(field)[0] || "";
    return stripHtml(val.toString());
  }
  return "";
}

function normalizeTime(raw) {
  if (!raw) return "TBD";
  const str = raw.toString().trim().replace(/\s*-\s*\d{1,2}:\d{2}$/, "");
  const m = str.match(/(\d{1,2}):(\d{2})/);
  if (!m) return str;
  let h = parseInt(m[1]), min = m[2];
  const p = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return h + ":" + min + " " + p;
}

function todayInNewYork() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const p = {};
  parts.forEach(function(x) { p[x.type] = x.value; });
  return p.year + "-" + p.month + "-" + p.day;
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
    note: note || null, chambers: chambers, meetings: meetings,
  }, null, 2));
  console.log("Saved " + meetings.length + " meetings | " + (note || "ok"));
}

function findTime(obj) {
  if (!obj || typeof obj !== "object") return "";
  const known = ["startTime", "scheduledStartTime", "meetingTime", "time", "Time",
                 "hour", "Hour", "startHour", "StartTime", "scheduledTime",
                 "timeStart", "start", "Start", "beginTime", "openTime"];
  for (const k of known) {
    if (obj[k]) {
      const t = obj[k].toString();
      if (/\d{1,2}:\d{2}/.test(t)) return t;
    }
  }
  for (const k of Object.keys(obj)) {
    if (typeof obj[k] === "string" && /^\d{1,2}:\d{2}/.test(obj[k].trim())) {
      console.log("Found time in field [" + k + "]: " + obj[k]);
      return obj[k];
    }
  }
  return "";
}

function parseJournalData(data) {
  const allMeetings = [];
  const chamberMap  = {};
  let loggedFirst   = false;

  console.log("Top-level keys: " + Object.keys(data).join(", "));

  function processMeeting(item, organLabel, inheritedTime) {
    if (!item || typeof item !== "object") return;
    if (item.cancelled || item.isCancelled) return;

    if (!loggedFirst) {
      loggedFirst = true;
      console.log("=== FULL FIRST MEETING OBJECT ===");
      console.log(JSON.stringify(item, null, 2).slice(0, 2000));
      console.log("=================================");
    }

    const meetingNum = getText(item.meetingNumber);
    const titleText  = getText(item.title) || getText(item.name) || getText(item.subject);
    const rawTitle   = meetingNum || titleText || "";
    if (!rawTitle) return;

    const fullTitle = organLabel ? organLabel + " -- " + rawTitle : rawTitle;
    const itemTime  = findTime(item);
    const rawTime   = itemTime || inheritedTime || "";
    const normTime  = normalizeTime(rawTime);
    const rawRoom   = getText(item.room) || getText(item.location) || getText(item.venue)
                    || (typeof item.roomName === "string" ? item.roomName : "");
    const normChamber = chamberForRoom(rawRoom);

    allMeetings.push({ title: fullTitle, time: normTime, room: rawRoom || null });

    if (normChamber) {
      if (!chamberMap[normChamber]) chamberMap[normChamber] = [];
      chamberMap[normChamber].push({ time: normTime, title: fullTitle });
    }
  }

  function processSection(section) {
    if (!section) return;
    const groups = Array.isArray(section) ? section : (section.groups || []);

    groups.forEach(function(group) {
      const organName  = stripHtml(group.groupNameTitle || getText(group.name) || "");
      const groupTime  = findTime(group);
      const sessions   = group.sessions || group.items || [];

      sessions.forEach(function(session) {
        const sessionName = stripHtml(session.name || getText(session.title) || organName);
        const sessionNum  = stripHtml(session.session || session.sessionNumber || "");
        const bodyLabel   = sessionNum ? sessionName + ", " + sessionNum : sessionName;
        const sessionTime = findTime(session) || groupTime;
        const meetings    = session.meetings || session.items || session.events || [];

        if (Array.isArray(meetings) && meetings.length > 0) {
          meetings.forEach(function(m) {
            processMeeting(m, bodyLabel, sessionTime);
          });
        } else {
          processMeeting(session, organName, groupTime);
        }
      });
    });
  }

  processSection(data.officialMeetings);
  processSection(data.informalMeetings || data.informalConsultations);
  processSection(data.otherMeetings);

  return { allMeetings: allMeetings, chamberMap: chamberMap };
}

async function main() {
  const dateStr = todayInNewYork();
  const dow = new Date(dateStr + "T12:00:00").toLocaleDateString("en-US",
    { timeZone: "America/New_York", weekday: "long" });

  console.log("NY date: " + dateStr + " (" + dow + ")");

  if (dow === "Saturday" || dow === "Sunday") {
    saveResult(dateStr, emptyChambers(), [], "Weekend -- no meetings");
    return;
  }

  const url = "https://journal.un.org/en/new-york/all/" + dateStr;
  console.log("Opening: " + url);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    let journalData = null;

    page.on("response", async function(response) {
      if (!response.url().includes("allnew")) return;
      try {
        const buf  = await response.buffer();
        const text = buf.toString("utf8");
        console.log("Captured: " + response.url() + " | " + buf.length + "b");
        journalData = JSON.parse(text);
        console.log("JSON parsed OK");
      } catch (e) {
        console.log("Parse error: " + e.message);
      }
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise(function(r) { setTimeout(r, 5000); });
    await browser.close();

    if (!journalData) {
      saveResult(dateStr, emptyChambers(), [], "No allnew data captured");
      return;
    }

    const result = parseJournalData(journalData);
    const allMeetings = result.allMeetings;
    const chamberMap  = result.chamberMap;

    console.log("Chambers:");
    ["General Assembly Hall", "Security Council", "Trusteeship Council", "Economic and Social Council"].forEach(function(c) {
      const ms = chamberMap[c] || [];
      if (ms.length > 0) {
        ms.forEach(function(m) { console.log("  " + c + ": " + m.time + " -- " + m.title); });
      } else {
        console.log("  " + c + ": none");
      }
    });

    const seen = {};
    const titles = [];
    allMeetings.forEach(function(m) {
      if (m.title && m.title.length > 3 && !seen[m.title]) {
        seen[m.title] = true;
        titles.push(m.title);
      }
    });
    const finalTitles = titles.slice(0, 30);
    console.log("Total meetings: " + finalTitles.length);

    const chambers = ["General Assembly Hall", "Security Council", "Trusteeship Council", "Economic and Social Council"]
      .map(function(name) {
        return {
          room: name,
          meetings: (chamberMap[name] || []).map(function(m) { return { time: m.time, title: m.title }; })
        };
      });

    saveResult(dateStr, chambers, finalTitles,
      finalTitles.length > 0
        ? "Live from journal-api.un.org -- " + finalTitles.length + " meetings"
        : "Data received but 0 meetings parsed -- check log"
    );

  } catch (err) {
    if (browser) { try { await browser.close(); } catch(e) {} }
    console.error("Error: " + err.message);
    saveResult(todayInNewYork(), emptyChambers(), [], "Error: " + err.message);
  }
}

main();
