// fetch-journal.cjs
const { writeFileSync, mkdirSync } = require("fs");
const puppeteer = require("puppeteer");

const API_KEY = process.env.VITE_ANTHROPIC_KEY || "";
const SB_URL  = process.env.VITE_SUPABASE_URL || "";
const SB_KEY  = process.env.VITE_SUPABASE_ANON_KEY || "";

// Physical room -> chamber (for subsidiary body meetings)
const ROOM_TO_CHAMBER = {
  "general assembly hall":              "General Assembly Hall",
  "security council chamber":           "Security Council",
  "security council consultations room":"Security Council",
  "trusteeship council chamber":        "Trusteeship Council",
  "economic and social council chamber":"Economic and Social Council",
};

// Organ group name -> chamber (for main organ meetings in specialGroups)
const ORGAN_TO_CHAMBER = {
  "general assembly":          "General Assembly Hall",
  "security council":          "Security Council",
  "trusteeship council":       "Trusteeship Council",
  "economic and social council":"Economic and Social Council",
};

function chamberForRoom(raw) {
  if (!raw) return null;
  const l = raw.toLowerCase().trim();
  for (const [k, v] of Object.entries(ROOM_TO_CHAMBER)) {
    if (l.includes(k)) return v;
  }
  return null;
}

function chamberForOrgan(groupName) {
  if (!groupName) return null;
  const l = groupName.toLowerCase().trim();
  for (const [k, v] of Object.entries(ORGAN_TO_CHAMBER)) {
    if (l.includes(k)) return v;
  }
  return null;
}

function stripHtml(str) {
  if (!str || typeof str !== "string") return "";
  return str.replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();
}

function getText(f) {
  if (!f) return "";
  if (typeof f === "string") return stripHtml(f);
  if (typeof f === "object") return stripHtml((f.en || f.En || Object.values(f)[0] || "").toString());
  return "";
}

function getRoom(item) {
  if (Array.isArray(item.rooms) && item.rooms[0]) return item.rooms[0].value || "";
  return getText(item.room) || getText(item.location) || "";
}

function normalizeTime(raw) {
  if (!raw) return "TBD";
  const m = raw.toString().match(/(\d{1,2}):(\d{2})/);
  if (!m) return raw.toString().trim();
  let h = parseInt(m[1]); const min = m[2];
  const p = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12; if (h === 0) h = 12;
  return h + ":" + min + " " + p;
}

function getTime(item) {
  return (item.timeFrom || item.startTime || item.scheduledStartTime || item.time || item.hour || "").toString();
}

function todayInNewYork() {
  const parts = new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const p = {}; parts.forEach(function(x){p[x.type]=x.value;});
  return p.year+"-"+p.month+"-"+p.day;
}

function emptyChambers() {
  return [
    {room:"General Assembly Hall",meetings:[]},
    {room:"Security Council",meetings:[]},
    {room:"Trusteeship Council",meetings:[]},
    {room:"Economic and Social Council",meetings:[]},
  ];
}

function saveResult(dateStr, chambers, meetings, note) {
  mkdirSync("public",{recursive:true});
  writeFileSync("public/journal.json", JSON.stringify({
    date:dateStr, fetched_at:new Date().toISOString(),
    ny_date:todayInNewYork(), source:"journal-api.un.org",
    note:note||null, chambers:chambers, meetings:meetings,
  },null,2));
  console.log("Saved "+meetings.length+" meetings | "+(note||"ok"));
}

function parseAgendaItems(data) {
  const items = Array.isArray(data)?data:(data.items||data.agendaItems||data.program||[]);
  const out = [];
  items.forEach(function(item){
    const t = getText(item.description||item.title||item.text||item.name||item);
    if (t && t.length>2) out.push(t);
  });
  return out;
}

function parseJournalData(data, agendaById) {
  const allMeetings = [];
  const chamberMap  = {};
  agendaById = agendaById || {};

  function addToChamber(chamber, entry) {
    if (!chamberMap[chamber]) chamberMap[chamber] = [];
    chamberMap[chamber].push(entry);
  }

  // Process SUBSIDIARY BODY groups (officialMeetings.groups)
  // These go into chambers ONLY based on physical room name
  function processSubsidiaryGroups(groups) {
    if (!Array.isArray(groups)) return;
    groups.forEach(function(group) {
      const organName = stripHtml(group.groupNameTitle || getText(group.name) || "");
      (group.sessions || []).forEach(function(session) {
        const sessionName = stripHtml(session.name || getText(session.title) || organName);
        const sessionNum  = stripHtml(session.session || "");
        const bodyLabel   = sessionNum ? sessionName+", "+sessionNum : sessionName;
        const sessionTime = session.startTime || session.time || "";
        (session.meetings || []).forEach(function(m) {
          if (m.cancelled || m.isCancelled) return;
          const num   = getText(m.meetingNumber);
          const ttl   = getText(m.title)||getText(m.name)||getText(m.subject);
          const rawTitle = num||ttl; if (!rawTitle) return;
          const agenda = agendaById[m.id]||[];
          const fullTitle = bodyLabel ? bodyLabel+" -- "+rawTitle : rawTitle;
          const time = normalizeTime(getTime(m) || sessionTime);
          const rawRoom = getRoom(m);
          const chamber = chamberForRoom(rawRoom); // room only, no organ fallback

          allMeetings.push({title:fullTitle, time:time, room:rawRoom||null});
          if (chamber) {
            addToChamber(chamber, {time:time, title:fullTitle, agenda:agenda, id:m.id||null});
          }
        });
      });
    });
  }

  // Process MAIN ORGAN groups (officialMeetings.specialGroups)
  // Chamber determined by organ/group name, NOT by physical room
  function processMainOrgans(specialGroups) {
    if (!Array.isArray(specialGroups)) return;
    specialGroups.forEach(function(group) {
      const organName = stripHtml(group.groupNameTitle || getText(group.name) || "");
      const organ     = chamberForOrgan(organName); // organ name -> chamber

      (group.sessions || []).forEach(function(session) {
        const sessionName = stripHtml(session.name || getText(session.title) || organName);
        const sessionNum  = stripHtml(session.session || "");
        const bodyLabel   = sessionNum ? sessionName+", "+sessionNum : sessionName;
        const sessionTime = session.startTime || session.time || "";

        (session.meetings || []).forEach(function(m) {
          if (m.cancelled || m.isCancelled) return;
          const num   = getText(m.meetingNumber);
          const ttl   = getText(m.title)||getText(m.name)||getText(m.subject);
          const rawTitle = num||ttl; if (!rawTitle) return;
          const agenda   = agendaById[m.id]||[];
          const shortTitle = organName ? organName+" -- "+rawTitle : rawTitle;
          const time     = normalizeTime(getTime(m) || sessionTime);
          const rawRoom  = getRoom(m);
          const isClosed = !!(m.isClosed || m.closed || m.isPrivate);

          allMeetings.push({title:shortTitle+(isClosed?" [Closed]":""), time:time, room:rawRoom||null});

          // Use organ name for chamber, regardless of physical room
          if (organ) {
            addToChamber(organ, {
              time:time,
              title:rawTitle+(isClosed?" [Closed]":""),
              agenda:agenda,
              id:m.id||null,
            });
            console.log("ORGAN MTG: "+organ+" | "+time+" | "+rawTitle+" (room: "+rawRoom+")");
          }
        });
      });
    });
  }

  // Process informal/other meetings (add to allMeetings only, not chambers)
  function processOther(section) {
    if (!section) return;
    const groups = Array.isArray(section) ? section : (section.groups || []);
    groups.forEach(function(group) {
      const organName = stripHtml(group.groupNameTitle || getText(group.name) || "");
      (group.sessions || []).forEach(function(session) {
        const sessionName = stripHtml(session.name || getText(session.title) || organName);
        const sessionNum  = stripHtml(session.session || "");
        const bodyLabel   = sessionNum ? sessionName+", "+sessionNum : sessionName;
        const sessionTime = session.startTime || session.time || "";
        (session.meetings || []).forEach(function(m) {
          if (m.cancelled || m.isCancelled) return;
          const num   = getText(m.meetingNumber);
          const ttl   = getText(m.title)||getText(m.name)||getText(m.subject);
          const rawTitle = num||ttl; if (!rawTitle) return;
          const fullTitle = bodyLabel ? bodyLabel+" -- "+rawTitle : rawTitle;
          const time  = normalizeTime(getTime(m)||sessionTime);
          const rawRoom = getRoom(m);
          allMeetings.push({title:fullTitle, time:time, room:rawRoom||null});
        });
      });
    });
  }

  const om = data.officialMeetings || {};
  processSubsidiaryGroups(om.groups || []);
  processMainOrgans(om.specialGroups || []);
  processOther(data.informalMeetings || data.informalConsultations);
  processOther(data.otherMeetings);

  return {allMeetings:allMeetings, chamberMap:chamberMap};
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
  const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const d=new Date(dateStr+"T12:00:00");
  const month=d.getMonth(), day=String(d.getDate()).padStart(2,"0");
  const mmdd=String(month+1).padStart(2,"0")+"-"+day;
  const humanDate=MONTHS[month]+" "+parseInt(day)+", "+d.getFullYear();
  const dow=d.toLocaleDateString("en-US",{timeZone:"America/New_York",weekday:"long"});
  const intlDay=UN_OBSERVANCES[mmdd]||"";
  const meetingsList=meetings.length>0?"\n\nToday's UN meetings:\n"+meetings.slice(0,15).map(function(m){return"- "+m;}).join("\n"):"";
  const intlContext=intlDay?"\n\nToday's UN International Day: "+intlDay:"";
  const prompt="Today is "+dow+", "+humanDate+"."+intlContext+meetingsList+"\n\nGenerate exactly 5 briefing topics for UN tour guides. For each topic name the most relevant UN entity and link to an SDG.\n\nReturn ONLY this JSON:\n{\"topics\":[{\"title\":\"Max 8 words\",\"sdg\":\"SDG X: Name\",\"un_entity\":\"Entity\",\"tag\":\"UN Meeting OR International Day OR Global Crisis OR Diplomacy OR Humanitarian\",\"bullets\":[\"Fact 1\",\"Fact 2\",\"Fact 3\",\"Fact 4\"],\"detail\":\"80-120 words context.\"}]}";
  console.log("Generating topics...");
  const res=await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"Content-Type":"application/json","x-api-key":API_KEY,"anthropic-version":"2023-06-01"},
    body:JSON.stringify({model:"claude-haiku-4-5-20251001",max_tokens:3000,messages:[{role:"user",content:prompt}]}),
  });
  const data=await res.json();
  if (!res.ok) throw new Error(data?.error?.message||"API error "+res.status);
  let raw=(data.content||[]).filter(function(b){return b.type==="text";}).map(function(b){return b.text;}).join("");
  raw=raw.replace(/```json|```/g,"").trim();
  const start=raw.indexOf("{"),end=raw.lastIndexOf("}");
  if (start===-1) throw new Error("No JSON");
  return JSON.parse(raw.slice(start,end+1)).topics||[];
}

async function saveTopicsToSupabase(dateStr, topics) {
  if (!SB_URL||!SB_KEY) { console.log("No Supabase"); return; }
  await fetch(SB_URL+"/rest/v1/daily_topics?date=eq."+dateStr,{method:"DELETE",headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});
  const res=await fetch(SB_URL+"/rest/v1/daily_topics",{
    method:"POST",
    headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Prefer":"return=minimal"},
    body:JSON.stringify({date:dateStr,topics:JSON.stringify(topics)}),
  });
  if (res.ok) console.log("Topics saved for "+dateStr);
  else { const t=await res.text(); console.log("Supabase failed: "+t); }
}

async function main() {
  const dateStr=todayInNewYork();
  const dow=new Date(dateStr+"T12:00:00").toLocaleDateString("en-US",{timeZone:"America/New_York",weekday:"long"});
  console.log("NY date: "+dateStr+" ("+dow+")");
  if (dow==="Saturday"||dow==="Sunday") { saveResult(dateStr,emptyChambers(),[],"Weekend -- no meetings"); return; }

  const url="https://journal.un.org/en/new-york/all/"+dateStr;
  console.log("Opening: "+url);
  let browser;
  try {
    browser=await puppeteer.launch({
      headless:"new",
      args:["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu"],
    });
    const page=await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({"Accept-Language":"en-US,en;q=0.9"});

    let journalData=null;
    const agendaById={};

    page.on("response",async function(response){
      const url=response.url();
      if (!url.includes("journal-api.un.org")) return;
      try {
        const buf=await response.buffer();
        const text=buf.toString("utf8");
        if (!text.trim().startsWith("{")&&!text.trim().startsWith("[")) return;
        const parsed=JSON.parse(text);
        if (url.includes("/allnew/")) {
          console.log("Captured allnew: "+buf.length+"b");
          journalData=parsed;
        } else if (url.includes("/agendatext")||url.includes("/agenda")||url.includes("/program")) {
          const idM=url.match(/\/([a-f0-9-]{36})\//i)||url.match(/\/([a-f0-9-]{36})$/i);
          const id=idM?idM[1]:null;
          const items=parseAgendaItems(parsed);
          if (id&&items.length>0) { agendaById[id]=items; console.log("Agenda "+id.slice(0,8)+": "+items.join(" | ")); }
        }
      } catch(e){}
    });

    await page.goto(url,{waitUntil:"networkidle2",timeout:45000});
    await new Promise(function(r){setTimeout(r,5000);});

    // Navigate to SC meeting page to capture agenda
    if (journalData) {
      const sg=(journalData.officialMeetings||{}).specialGroups||[];
      for (const group of sg) {
        if ((group.groupNameTitle||"").toLowerCase().includes("security council")) {
          for (const session of (group.sessions||[])) {
            for (const m of (session.meetings||[])) {
              if (m.id&&!m.isCancelled) {
                const mUrl="https://journal.un.org/en/meeting/Officials/"+m.id+"/"+dateStr;
                try { await page.goto(mUrl,{waitUntil:"networkidle2",timeout:20000}); await new Promise(function(r){setTimeout(r,3000);}); } catch(e){}
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
    if (!journalData) { saveResult(dateStr,emptyChambers(),[],"No data captured"); return; }

    const result=parseJournalData(journalData,agendaById);
    const chamberMap=result.chamberMap;

    console.log("Chambers:");
    ["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"].forEach(function(c){
      const ms=chamberMap[c]||[];
      if (ms.length>0) ms.forEach(function(m){console.log("  "+c+": "+m.time+" -- "+m.title);});
      else console.log("  "+c+": none");
    });

    const seen={}, titles=[];
    result.allMeetings.forEach(function(m){
      if (m.title&&m.title.length>3&&!seen[m.title]) { seen[m.title]=true; titles.push(m.title); }
    });
    const finalTitles=titles.slice(0,30);
    console.log("Total meetings: "+finalTitles.length);

    const chambers=["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"]
      .map(function(name){
        const ms=chamberMap[name]||[];
        return {room:name, meetings:ms.map(function(m){return {time:m.time,title:m.title,agenda:m.agenda||[],id:m.id||null};})};
      });

    saveResult(dateStr,chambers,finalTitles,
      finalTitles.length>0?"Live from journal-api.un.org -- "+finalTitles.length+" meetings":"0 meetings parsed");

    try {
      const topics=await generateTopics(finalTitles,dateStr);
      if (topics&&topics.length>0) { await saveTopicsToSupabase(dateStr,topics); console.log("Topics saved: "+topics.length); }
    } catch(e) { console.log("Topics failed: "+e.message); }

  } catch(err) {
    if (browser) { try{await browser.close();}catch(e){} }
    console.error("Error: "+err.message);
    saveResult(todayInNewYork(),emptyChambers(),[],"Error: "+err.message);
  }
}

main();
