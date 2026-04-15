// fetch-journal.cjs
const { writeFileSync, mkdirSync } = require("fs");
const puppeteer = require("puppeteer");

const API_KEY  = process.env.VITE_ANTHROPIC_KEY || "";
const SB_URL   = process.env.VITE_SUPABASE_URL || "";
const SB_KEY   = process.env.VITE_SUPABASE_ANON_KEY || "";

// Room name -> display chamber
const CHAMBER_MAP = {
  "general assembly hall": "General Assembly Hall",
  "security council chamber": "Security Council",
  "security council consultations room": "Security Council",
  "trusteeship council chamber": "Trusteeship Council",
  "economic and social council chamber": "Economic and Social Council",
};

// Group name -> display chamber (fallback when room = "New York" or unknown)
const GROUP_CHAMBER_MAP = {
  "security council": "Security Council",
  "general assembly": "General Assembly Hall",
  "trusteeship council": "Trusteeship Council",
  "economic and social council": "Economic and Social Council",
};

function chamberForRoom(raw) {
  if (!raw) return null;
  const lower = (raw || "").toString().toLowerCase().trim();
  for (const [key, val] of Object.entries(CHAMBER_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

function chamberForGroup(groupName) {
  if (!groupName) return null;
  const lower = (groupName || "").toString().toLowerCase().trim();
  for (const [key, val] of Object.entries(GROUP_CHAMBER_MAP)) {
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
  if (Array.isArray(item.rooms) && item.rooms.length > 0) {
    return item.rooms[0].value || "";
  }
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

  function processMeeting(item, organLabel, groupName) {
    if (!item || typeof item !== "object") return;
    if (item.cancelled || item.isCancelled) return;
    const meetingNum = getText(item.meetingNumber);
    const titleText  = getText(item.title) || getText(item.name) || getText(item.subject);
    const rawTitle   = meetingNum || titleText || "";
    if (!rawTitle) return;

    const agenda       = agendaByMeetingId[item.id] || [];
    const agendaSuffix = agenda.length > 0 ? " [" + agenda.join(" / ") + "]" : "";
    const fullTitle    = (organLabel ? organLabel + " -- " + rawTitle : rawTitle) + agendaSuffix;
    const shortTitle   = organLabel ? organLabel + " -- " + rawTitle : rawTitle;
    const rawTime      = getTime(item);
    const normTime     = normalizeTime(rawTime);
    const rawRoom      = getRoom(item);

    // Primary: map by room name
    // Fallback: map by group name (handles "New York" room after API change)
    const chamber = chamberForRoom(rawRoom) || chamberForGroup(groupName);

    console.log("MTG: [" + rawRoom + "] group=[" + groupName + "] -> " + (chamber || "none") + " | " + shortTitle.slice(0, 50));

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
      const organName = stripHtml(group.groupNameTitle || getText(group.name) || "");
      const sessions  = group.sessions || group.items || [];
      sessions.forEach(function(session) {
        const sessionName = stripHtml(session.name || getText(session.title) || organName);
        const sessionNum  = stripHtml(session.session || session.sessionNumber || "");
        const bodyLabel   = sessionNum ? sessionName + ", " + sessionNum : sessionName;
        const sessionTime = session.startTime || session.time || session.hour || "";
        const meetings    = session.meetings || session.items || session.events || [];
        if (Array.isArray(meetings) && meetings.length > 0) {
          meetings.forEach(function(m) {
            if (sessionTime && !m.startTime && !m.time && !m.hour) {
              m = Object.assign({}, m, { startTime: sessionTime });
            }
            processMeeting(m, bodyLabel, organName);
          });
        } else {
          var sw = sessionTime ? Object.assign({}, session, { startTime: sessionTime }) : session;
          processMeeting(sw, organName, organName);
        }
      });
    });
  }

  processSection(data.officialMeetings);
  processSection(data.informalMeetings || data.informalConsultations);
  processSection(data.otherMeetings);
  return { allMeetings: allMeetings, chamberMap: chamberMap };
}

const UN_OBSERVANCES = {
  "01-04":"World Braille Day","01-24":"International Day of Education","02-02":"World Wetlands Day",
  "02-21":"International Mother Language Day","03-03":"World Wildlife Day","03-08":"International Women's Day",
  "03-21":"International Day for the Elimination of Racial Discrimination","03-22":"World Water Day",
  "04-02":"World Autism Awareness Day","04-07":"World Health Day","04-22":"International Mother Earth Day",
  "04-25":"World Malaria Day","05-03":"World Press Freedom Day","05-22":"International Day for Biological Diversity",
  "05-29":"International Day of UN Peacekeepers","06-05":"World Environment Day","06-08":"World Oceans Day",
  "06-20":"World Refugee Day","06-21":"International Day of Yoga","07-11":"World Population Day",
  "07-18":"Nelson Mandela International Day","08-12":"International Youth Day","08-19":"World Humanitarian Day",
  "09-15":"International Day of Democracy","09-21":"International Day of Peace","10-02":"International Day of Non-Violence",
  "10-05":"World Teachers Day","10-11":"International Day of the Girl Child","10-16":"World Food Day",
  "10-24":"United Nations Day","11-20":"World Children's Day","12-01":"World AIDS Day",
  "12-03":"International Day of Persons with Disabilities","12-10":"Human Rights Day",
};

async function generateTopics(meetings, dateStr) {
  if (!API_KEY) { console.log("No API key -- skipping topics"); return null; }
  const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const d = new Date(dateStr + "T12:00:00");
  const month = d.getMonth();
  const day   = String(d.getDate()).padStart(2, "0");
  const mmdd  = String(month + 1).padStart(2, "0") + "-" + day;
  const humanDate = MONTHS[month] + " " + parseInt(day) + ", " + d.getFullYear();
  const dow = d.toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long" });
  const intlDay = UN_OBSERVANCES[mmdd] || "";
  const meetingsList = meetings.length > 0
    ? "\n\nToday's UN meetings:\n" + meetings.slice(0, 15).map(function(m) { return "- " + m; }).join("\n")
    : "";
  const intlContext = intlDay ? "\n\nToday's UN International Day: " + intlDay : "";
  const prompt = "Today is " + dow + ", " + humanDate + "." + intlContext + meetingsList + "\n\nGenerate exactly 5 briefing topics for UN tour guides. For each topic name the most relevant UN entity and link to an SDG.\n\nReturn ONLY this JSON:\n{\"topics\":[{\"title\":\"Max 8 words\",\"sdg\":\"SDG X: Name\",\"un_entity\":\"Entity\",\"tag\":\"UN Meeting OR International Day OR Global Crisis OR Diplomacy OR Humanitarian\",\"bullets\":[\"Fact 1\",\"Fact 2\",\"Fact 3\",\"Fact 4\"],\"detail\":\"80-120 words context.\"}]}";
  console.log("Generating topics with Claude Haiku...");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 3000, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "API error " + res.status);
  let raw = (data.content || []).filter(function(b) { return b.type === "text"; }).map(function(b) { return b.text; }).join("");
  raw = raw.replace(/```json|```/g, "").trim();
  const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
  if (start === -1) throw new Error("No JSON");
  const parsed = JSON.parse(raw.slice(start, end + 1));
  return parsed.topics || [];
}

async function saveTopicsToSupabase(dateStr, topics) {
  if (!SB_URL || !SB_KEY) { console.log("No Supabase -- skipping"); return; }
  await fetch(SB_URL + "/rest/v1/daily_topics?date=eq." + dateStr, {
    method: "DELETE",
    headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY },
  });
  const res = await fetch(SB_URL + "/rest/v1/daily_topics", {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY, "Prefer": "return=minimal" },
    body: JSON.stringify({ date: dateStr, topics: JSON.stringify(topics) }),
  });
  if (res.ok) { console.log("Topics saved to Supabase for " + dateStr); }
  else { const t = await res.text(); console.log("Supabase save failed: " + t); }
}

async function main() {
  const dateStr = todayInNewYork();
  const dow = new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long" });
  console.log("NY date: " + dateStr + " (" + dow + ")");
  if (dow === "Saturday" || dow === "Sunday") { saveResult(dateStr, emptyChambers(), [], "Weekend -- no meetings"); return; }

  const url = "https://journal.un.org/en/new-york/all/" + dateStr;
  console.log("Opening: " + url);
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    let journalData = null;
    const agendaByMeetingId = {};

    page.on("response", async function(response) {
      const respUrl = response.url();
      if (!respUrl.includes("journal-api.un.org")) return;
      try {
        const buf  = await response.buffer();
        const text = buf.toString("utf8");
        if (!text.trim().startsWith("{") && !text.trim().startsWith("[")) return;
        const parsed = JSON.parse(text);
        if (respUrl.includes("/allnew/")) {
          console.log("Captured allnew: " + buf.length + "b");
          journalData = parsed;
        } else if (respUrl.includes("/agendatext") || respUrl.includes("/agenda") || respUrl.includes("/program")) {
          const idMatch = respUrl.match(/\/([a-f0-9-]{36})\//i) || respUrl.match(/\/([a-f0-9-]{36})$/i);
          const meetingId = idMatch ? idMatch[1] : null;
          const items = parseAgendaItems(parsed);
          if (meetingId && items.length > 0) {
            agendaByMeetingId[meetingId] = items;
            console.log("Agenda " + meetingId.slice(0,8) + ": " + items.join(" | "));
          }
        }
      } catch (e) {}
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise(function(r) { setTimeout(r, 5000); });

    if (journalData) {
      const scGroups = (journalData.officialMeetings || {}).groups || [];
      for (const group of scGroups) {
        if ((group.groupNameTitle || "").includes("Security Council")) {
          for (const session of (group.sessions || [])) {
            for (const meeting of (session.meetings || [])) {
              if (meeting.id && !meeting.isCancelled) {
                const meetingUrl = "https://journal.un.org/en/meeting/Officials/" + meeting.id + "/" + dateStr;
                try {
                  await page.goto(meetingUrl, { waitUntil: "networkidle2", timeout: 20000 });
                  await new Promise(function(r) { setTimeout(r, 3000); });
                } catch(e) { console.log("Meeting nav error: " + e.message); }
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
    if (!journalData) { saveResult(dateStr, emptyChambers(), [], "No allnew data captured"); return; }

    const result    = parseJournalData(journalData, agendaByMeetingId);
    const chamberMap = result.chamberMap;

    console.log("Chambers:");
    ["General Assembly Hall", "Security Council", "Trusteeship Council", "Economic and Social Council"].forEach(function(c) {
      const ms = chamberMap[c] || [];
      if (ms.length > 0) {
        ms.forEach(function(m) { console.log("  " + c + ": " + m.time + " -- " + m.title); });
      } else { console.log("  " + c + ": none"); }
    });

    const seen = {};
    const titles = [];
    result.allMeetings.forEach(function(m) {
      if (m.title && m.title.length > 3 && !seen[m.title]) { seen[m.title] = true; titles.push(m.title); }
    });
    const finalTitles = titles.slice(0, 30);
    console.log("Total meetings: " + finalTitles.length);

    const chambers = ["General Assembly Hall", "Security Council", "Trusteeship Council", "Economic and Social Council"]
      .map(function(name) {
        const ms = chamberMap[name] || [];
        return { room: name, meetings: ms.map(function(m) { return { time: m.time, title: m.title, agenda: m.agenda || [], id: m.id || null }; }) };
      });

    saveResult(dateStr, chambers, finalTitles,
      finalTitles.length > 0 ? "Live from journal-api.un.org -- " + finalTitles.length + " meetings" : "Data received but 0 meetings parsed"
    );

    try {
      const topics = await generateTopics(finalTitles, dateStr);
      if (topics && topics.length > 0) { await saveTopicsToSupabase(dateStr, topics); console.log("Topics saved: " + topics.length); }
    } catch (e) { console.log("Topic generation failed: " + e.message); }

  } catch (err) {
    if (browser) { try { await browser.close(); } catch(e) {} }
    console.error("Error: " + err.message);
    saveResult(todayInNewYork(), emptyChambers(), [], "Error: " + err.message);
  }
}

main();
