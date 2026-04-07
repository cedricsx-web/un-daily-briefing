// fetch-journal.cjs
// Captures allnew + agenda API calls via Puppeteer

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

function getTime(item) {
  const t = item.timeFrom || item.startTime || item.scheduledStartTime || item.time || item.hour || "";
  return t.toString();
}

function getRoom(item) {
  if (Array.isArray(item.rooms) && item.rooms.length > 0) return item.rooms[0].value || "";
  return getText(item.room) || getText(item.location) || "";
}

function normalizeTime(raw) {
  if (!raw) return "TBD";
  const m = raw.toString().trim().match(/(\d{1,2}):(\d{2})/);
  if (!m) return raw.toString().trim();
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

function parseAgendaItems(data) {
  // data can be an array or object with items
  const items = Array.isArray(data) ? data : (data.items || data.agendaItems || data.program || []);
  const results = [];
  items.forEach(function(item) {
    const t = getText(item.description || item.title || item.text || item.name || item);
    if (t && t.length > 2) results.push(t);
  });
  return results;
}

function parseJournalData(data, agendaByMeetingId) {
  const allMeetings = [];
  const chamberMap  = {};
  agendaByMeetingId = agendaByMeetingId || {};

  function processMeeting(item, organLabel) {
    if (!item || typeof item !== "object") return;
    if (item.cancelled || item.isCancelled) return;

    const meetingNum = getText(item.meetingNumber);
    const titleText  = getText(item.title) || getText(item.name) || getText(item.subject);
    const rawTitle   = meetingNum || titleText || "";
    if (!rawTitle) return;

    const agenda = agendaByMeetingId[item.id] || [];
    const agendaSuffix = agenda.length > 0 ? " [" + agenda.join(" / ") + "]" : "";
    const fullTitle = (organLabel ? organLabel + " -- " + rawTitle : rawTitle) + agendaSuffix;
    const shortTitle = organLabel ? organLabel + " -- " + rawTitle : rawTitle;

    const rawTime  = getTime(item);
    const normTime = normalizeTime(rawTime);
    const rawRoom  = getRoom(item);
    const chamber  = chamberForRoom(rawRoom);

    allMeetings.push({ title: fullTitle, time: normTime, room: rawRoom || null });

    if (chamber) {
      if (!chamberMap[chamber]) chamberMap[chamber] = [];
      chamberMap[chamber].push({ time: normTime, title: shortTitle, agenda: agenda, id: item.id || null });
    }
  }

  function processSection(section) {
    if (!section) return;
    const groups = Array.isArray(section) ? section : (section.groups || []);
    groups.forEach(function(group) {
      const organName = group.groupNameTitle || getText(group.name) || "";
      const sessions  = group.sessions || group.items || [];
      sessions.forEach(function(session) {
        const sessionName = session.name || getText(session.title) || organName;
        const sessionNum  = stripHtml(session.session || session.sessionNumber || "");
        const bodyLabel   = sessionNum ? sessionName + ", " + sessionNum : sessionName;
        const sessionTime = session.startTime || session.time || session.hour || "";
        const meetings = session.meetings || session.items || session.events || [];

        if (Array.isArray(meetings) && meetings.length > 0) {
          meetings.forEach(function(m) {
            if (sessionTime && !m.startTime && !m.time && !m.hour) {
              m = Object.assign({}, m, { startTime: sessionTime });
            }
            processMeeting(m, bodyLabel);
          });
        } else {
          var sw = sessionTime ? Object.assign({}, session, { startTime: sessionTime }) : session;
          processMeeting(sw, organName);
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
    const agendaByMeetingId = {};

    // Capture ALL journal-api.un.org responses
    page.on("response", async function(response) {
      const respUrl = response.url();
      if (!respUrl.includes("journal-api.un.org")) return;

      try {
        const buf  = await response.buffer();
        const text = buf.toString("utf8");
        const isJson = text.trim().startsWith("{") || text.trim().startsWith("[");
        if (!isJson) return;

        const parsed = JSON.parse(text);

        if (respUrl.includes("/allnew/")) {
          console.log("Captured allnew: " + buf.length + "b");
          journalData = parsed;
        } else if (respUrl.includes("/agendatext") || respUrl.includes("/agenda") || respUrl.includes("/program")) {
          // Extract meeting ID from URL
          const idMatch = respUrl.match(/\/([a-f0-9-]{36})\//i) || respUrl.match(/\/([a-f0-9-]{36})$/i);
          const meetingId = idMatch ? idMatch[1] : null;
          const items = parseAgendaItems(parsed);
          if (meetingId && items.length > 0) {
            agendaByMeetingId[meetingId] = items;
            console.log("Agenda for " + meetingId + ": " + items.join(" | "));
          } else if (items.length > 0) {
            console.log("Agenda (no ID): " + items.join(" | "));
          }
        } else {
          // Log other API calls so we can discover agenda endpoints
          console.log("API call: " + respUrl.replace("https://journal-api.un.org", "") + " | " + buf.length + "b");
          if (buf.length < 2000) {
            console.log("  Preview: " + text.slice(0, 200));
          }
        }
      } catch (e) {
        // ignore parse errors
      }
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise(function(r) { setTimeout(r, 5000); });

    // If we have SC meetings, navigate to the first one to trigger agenda API calls
    if (journalData) {
      const scGroups = (journalData.officialMeetings || {}).groups || [];
      for (const group of scGroups) {
        if ((group.groupNameTitle || "").includes("Security Council")) {
          for (const session of (group.sessions || [])) {
            for (const meeting of (session.meetings || [])) {
              if (meeting.id && !meeting.isCancelled) {
                const meetingUrl = "https://journal.un.org/en/meeting/Officials/" + meeting.id + "/" + dateStr;
                console.log("Navigating to SC meeting: " + meetingUrl);
                try {
                  await page.goto(meetingUrl, { waitUntil: "networkidle2", timeout: 20000 });
                  await new Promise(function(r) { setTimeout(r, 3000); });
                } catch(e) {
                  console.log("Meeting nav error: " + e.message);
                }
                break;
              }
            }
            break;
          }
          break;
        }
      }
    }

    await browser.close();

    if (!journalData) {
      saveResult(dateStr, emptyChambers(), [], "No allnew data captured");
      return;
    }

    console.log("Agenda captured for " + Object.keys(agendaByMeetingId).length + " meetings");

    const result    = parseJournalData(journalData, agendaByMeetingId);
    const chamberMap = result.chamberMap;

    console.log("Chambers:");
    ["General Assembly Hall", "Security Council", "Trusteeship Council", "Economic and Social Council"].forEach(function(c) {
      const ms = chamberMap[c] || [];
      if (ms.length > 0) {
        ms.forEach(function(m) {
          console.log("  " + c + ": " + m.time + " -- " + m.title);
          if (m.agenda && m.agenda.length > 0) {
            m.agenda.forEach(function(a) { console.log("    - " + a); });
          }
        });
      } else {
        console.log("  " + c + ": none");
      }
    });

    const seen = {};
    const titles = [];
    result.allMeetings.forEach(function(m) {
      if (m.title && m.title.length > 3 && !seen[m.title]) {
        seen[m.title] = true;
        titles.push(m.title);
      }
    });
    const finalTitles = titles.slice(0, 30);
    console.log("Total meetings: " + finalTitles.length);

    const chambers = ["General Assembly Hall", "Security Council", "Trusteeship Council", "Economic and Social Council"]
      .map(function(name) {
        const ms = chamberMap[name] || [];
        return {
          room: name,
          meetings: ms.map(function(m) {
            return { time: m.time, title: m.title, agenda: m.agenda || [], id: m.id || null };
          }),
        };
      });

    saveResult(dateStr, chambers, finalTitles,
      finalTitles.length > 0
        ? "Live from journal-api.un.org -- " + finalTitles.length + " meetings"
        : "Data received but 0 meetings parsed"
    );

  } catch (err) {
    if (browser) { try { await browser.close(); } catch(e) {} }
    console.error("Error: " + err.message);
    saveResult(todayInNewYork(), emptyChambers(), [], "Error: " + err.message);
  }
}

main();
