// fetch-journal.cjs
// 1. Fetches journal via Puppeteer -> saves journal.json
// 2. Fetches UN News RSS -> saves 5 topics to Supabase
// Zero Claude API calls.

const { writeFileSync, mkdirSync } = require("fs");
const puppeteer = require("puppeteer");
const https = require("https");

const SB_URL = process.env.VITE_SUPABASE_URL || "";
const SB_KEY = process.env.VITE_SUPABASE_ANON_KEY || "";

const ROOM_TO_CHAMBER = {
  "general assembly hall":              "General Assembly Hall",
  "security council chamber":           "Security Council",
  "security council consultations room":"Security Council",
  "trusteeship council chamber":        "Trusteeship Council",
  "economic and social council chamber":"Economic and Social Council",
};
const ORGAN_TO_CHAMBER = {
  "general assembly":           "General Assembly Hall",
  "security council":           "Security Council",
  "trusteeship council":        "Trusteeship Council",
  "economic and social council":"Economic and Social Council",
};

function chamberForRoom(raw) {
  const l = (raw||"").toLowerCase();
  for (const [k,v] of Object.entries(ROOM_TO_CHAMBER)) { if (l.includes(k)) return v; }
  return null;
}
function chamberForOrgan(name) {
  const l = (name||"").toLowerCase();
  for (const [k,v] of Object.entries(ORGAN_TO_CHAMBER)) { if (l.includes(k)) return v; }
  return null;
}
function stripHtml(s) {
  return (s||"").replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g," ").trim();
}
function getText(f) {
  if (!f) return "";
  if (typeof f==="string") return stripHtml(f);
  return stripHtml((f.en||f.En||Object.values(f)[0]||"").toString());
}
function getRoom(item) {
  if (Array.isArray(item.rooms)&&item.rooms[0]) return item.rooms[0].value||"";
  return getText(item.room)||getText(item.location)||"";
}
function fmtTime(t) {
  if (!t) return "TBD";
  const m=t.toString().match(/(\d{1,2}):(\d{2})/);
  if (!m) return t.toString().trim();
  let h=parseInt(m[1]); const min=m[2];
  const p=h>=12?"PM":"AM";
  if (h>12) h-=12; if (h===0) h=12;
  return h+":"+min+" "+p;
}
function todayInNewYork() {
  const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const p={}; parts.forEach(function(x){p[x.type]=x.value;});
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
function saveResult(dateStr,chambers,meetings,note) {
  mkdirSync("public",{recursive:true});
  writeFileSync("public/journal.json",JSON.stringify({
    date:dateStr,fetched_at:new Date().toISOString(),
    ny_date:todayInNewYork(),source:"journal-api.un.org",
    note:note||null,chambers:chambers,meetings:meetings,
  },null,2));
  console.log("Saved "+meetings.length+" meetings | "+(note||"ok"));
}
function parseAgendaItems(data) {
  const items=Array.isArray(data)?data:(data.items||data.agendaItems||data.program||[]);
  const out=[];
  items.forEach(function(item){
    const t=getText(item.description||item.title||item.text||item.name||item);
    if (t&&t.length>2) out.push(t);
  });
  return out;
}
function parseJournalData(data,agendaById) {
  const allMeetings=[], chamberMap={};
  agendaById=agendaById||{};
  function add(ch,entry){if(!chamberMap[ch])chamberMap[ch]=[];chamberMap[ch].push(entry);}

  function processSubsidiary(groups) {
    if (!Array.isArray(groups)) return;
    groups.forEach(function(group){
      const organName=stripHtml(group.groupNameTitle||getText(group.name)||"");
      (group.sessions||[]).forEach(function(session){
        const sName=stripHtml(session.name||getText(session.title)||organName);
        const sNum=stripHtml(session.session||"");
        const bodyLabel=sNum?sName+", "+sNum:sName;
        const sTime=session.startTime||session.time||"";
        (session.meetings||[]).forEach(function(m){
          if (m.cancelled||m.isCancelled) return;
          const num=getText(m.meetingNumber);
          const ttl=getText(m.title)||getText(m.name)||getText(m.subject);
          const rawTitle=num||ttl; if (!rawTitle) return;
          const agenda=agendaById[m.id]||[];
          const fullTitle=bodyLabel?bodyLabel+" -- "+rawTitle:rawTitle;
          const time=fmtTime((m.timeFrom||m.startTime||sTime||"").toString());
          const rawRoom=getRoom(m);
          const chamber=chamberForRoom(rawRoom);
          allMeetings.push({title:fullTitle,time,room:rawRoom||null});
          if (chamber) add(chamber,{time,title:fullTitle,agenda,id:m.id||null});
        });
      });
    });
  }

  function processOrgans(specialGroups) {
    if (!Array.isArray(specialGroups)) return;
    specialGroups.forEach(function(group){
      const organName=stripHtml(group.groupNameTitle||getText(group.name)||"");
      const chamber=chamberForOrgan(organName);
      (group.sessions||[]).forEach(function(session){
        const sTime=session.startTime||session.time||"";
        (session.meetings||[]).forEach(function(m){
          if (m.cancelled||m.isCancelled) return;
          const num=getText(m.meetingNumber);
          const ttl=getText(m.title)||getText(m.name)||getText(m.subject);
          const rawTitle=num||ttl; if (!rawTitle) return;
          const isClosed=!!(m.isClosed||m.closed||m.isPrivate);
          const shortTitle=rawTitle+(isClosed?" [Closed]":"");
          const time=fmtTime((m.timeFrom||m.startTime||sTime||"").toString());
          const rawRoom=getRoom(m);
          allMeetings.push({title:(organName?organName+" -- ":"")+shortTitle,time,room:rawRoom||null});
          if (chamber) add(chamber,{time,title:shortTitle,agenda:agendaById[m.id]||[],id:m.id||null});
        });
      });
    });
  }

  function processOther(section) {
    if (!section) return;
    const groups=Array.isArray(section)?section:(section.groups||[]);
    groups.forEach(function(group){
      const organName=stripHtml(group.groupNameTitle||getText(group.name)||"");
      (group.sessions||[]).forEach(function(session){
        const sName=stripHtml(session.name||getText(session.title)||organName);
        const sNum=stripHtml(session.session||"");
        const bodyLabel=sNum?sName+", "+sNum:sName;
        const sTime=session.startTime||session.time||"";
        (session.meetings||[]).forEach(function(m){
          if (m.cancelled||m.isCancelled) return;
          const num=getText(m.meetingNumber);
          const ttl=getText(m.title)||getText(m.name)||getText(m.subject);
          const rawTitle=num||ttl; if (!rawTitle) return;
          const fullTitle=bodyLabel?bodyLabel+" -- "+rawTitle:rawTitle;
          const time=fmtTime((m.timeFrom||m.startTime||sTime||"").toString());
          allMeetings.push({title:fullTitle,time,room:getRoom(m)||null});
        });
      });
    });
  }

  const om=data.officialMeetings||{};
  processSubsidiary(om.groups||[]);
  processOrgans(om.specialGroups||[]);
  processOther(data.informalMeetings||data.informalConsultations);
  processOther(data.otherMeetings);

  return {allMeetings,chamberMap};
}

// -- RSS topic generation (no AI) -------------------------------------
function fetchUrl(url) {
  return new Promise(function(resolve,reject){
    const mod = url.startsWith("https") ? https : require("http");
    const req = mod.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; UN-Briefing-Bot/1.0)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
      },
      timeout: 15000,
    }, function(res) {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchUrl(res.headers.location).then(resolve).catch(reject);
      }
      let body = "";
      res.on("data", function(c) { body += c; });
      res.on("end", function() { resolve(body); });
    });
    req.on("error", reject);
    req.on("timeout", function() { req.destroy(); reject(new Error("timeout")); });
  });
}

function parseRssItems(xml, max) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < max) {
    const block = match[1];
    const title = stripHtml((block.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/s)||block.match(/<title>(.*?)<\/title>/s)||[])[1]||"");
    const desc  = stripHtml((block.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>/s)||block.match(/<description>(.*?)<\/description>/s)||[])[1]||"");
    const link  = ((block.match(/<link>(.*?)<\/link>/s)||[])[1]||"").trim();
    if (title && title.length > 5) items.push({title, desc, link});
  }
  return items;
}

// Map news to SDG and UN entity
function mapToSdg(title, desc) {
  const text = (title+" "+desc).toLowerCase();
  if (text.includes("climate")||text.includes("environment")||text.includes("emission")) return {sdg:"SDG 13: Climate Action",entity:"UNEP"};
  if (text.includes("peace")||text.includes("security council")||text.includes("conflict")||text.includes("ceasefire")) return {sdg:"SDG 16: Peace, Justice and Strong Institutions",entity:"Security Council"};
  if (text.includes("food")||text.includes("hunger")||text.includes("famine")) return {sdg:"SDG 2: Zero Hunger",entity:"WFP"};
  if (text.includes("health")||text.includes("disease")||text.includes("pandemic")||text.includes("who ")) return {sdg:"SDG 3: Good Health and Well-being",entity:"WHO"};
  if (text.includes("refugee")||text.includes("displaced")||text.includes("asylum")) return {sdg:"SDG 10: Reduced Inequalities",entity:"UNHCR"};
  if (text.includes("women")||text.includes("gender")||text.includes("girl")) return {sdg:"SDG 5: Gender Equality",entity:"UN Women"};
  if (text.includes("child")||text.includes("youth")||text.includes("education")) return {sdg:"SDG 4: Quality Education",entity:"UNICEF"};
  if (text.includes("water")||text.includes("ocean")||text.includes("sea")) return {sdg:"SDG 14: Life Below Water",entity:"UNEP"};
  if (text.includes("poverty")||text.includes("economic")||text.includes("development")) return {sdg:"SDG 1: No Poverty",entity:"UNDP"};
  if (text.includes("human rights")||text.includes("rights")) return {sdg:"SDG 16: Peace, Justice and Strong Institutions",entity:"OHCHR"};
  if (text.includes("nuclear")||text.includes("disarmament")||text.includes("weapon")) return {sdg:"SDG 16: Peace, Justice and Strong Institutions",entity:"IAEA"};
  if (text.includes("migrant")||text.includes("migration")) return {sdg:"SDG 10: Reduced Inequalities",entity:"IOM"};
  if (text.includes("trade")||text.includes("economy")||text.includes("finance")) return {sdg:"SDG 8: Decent Work and Economic Growth",entity:"UNCTAD"};
  return {sdg:"SDG 17: Partnerships for the Goals",entity:"UN Secretariat"};
}

function mapToTag(title, desc) {
  const text=(title+" "+desc).toLowerCase();
  if (text.includes("security council")||text.includes("general assembly")||text.includes("meeting")) return "UN Meeting";
  if (text.includes("international day")) return "International Day";
  if (text.includes("crisis")||text.includes("emergency")||text.includes("war")) return "Global Crisis";
  if (text.includes("diplomat")||text.includes("agreement")||text.includes("treaty")) return "Diplomacy";
  return "Humanitarian";
}

async function generateTopicsFromRss(meetings, dateStr) {
  const RSS_FEEDS = [
    "https://news.un.org/feed/subscribe/en/news/all/rss.xml",
    "https://www.un.org/press/en/rss.xml",
  ];

  let items = [];

  for (const feed of RSS_FEEDS) {
    try {
      console.log("Fetching RSS: "+feed);
      const xml = await fetchUrl(feed);
      const parsed = parseRssItems(xml, 10);
      if (parsed.length > 0) {
        console.log("Got "+parsed.length+" RSS items from "+feed);
        items = parsed;
        break;
      }
    } catch(e) {
      console.log("RSS fetch failed ("+feed+"): "+e.message);
    }
  }

  // If RSS failed, fall back to meeting-based topics
  if (items.length === 0) {
    console.log("RSS unavailable - generating topics from meetings list");
    items = meetings.slice(0,5).map(function(m){
      return {title:m, desc:m, link:""};
    });
  }

  // Take top 5 unique items
  const selected = items.slice(0,5);

  // Build topic objects
  const topics = selected.map(function(item) {
    const {sdg, entity} = mapToSdg(item.title, item.desc);
    const tag = mapToTag(item.title, item.desc);
    // Trim description to ~100 words for detail field
    const words = item.desc.split(/\s+/).filter(Boolean);
    const detail = words.slice(0,80).join(" ")+(words.length>80?"...":"");
    // Create 3 bullet points from the description
    const sentences = item.desc.split(/\.\s+/).filter(function(s){return s.length>20;}).slice(0,4);
    const bullets = sentences.length >= 2
      ? sentences.slice(0,3).map(function(s){return s.trim().replace(/\.$/,"");})
      : ["See full story for details","Updated today at the United Nations","Follow developments at un.org/news"];

    return {
      title: item.title.length > 60 ? item.title.slice(0,57)+"..." : item.title,
      sdg,
      un_entity: entity,
      tag,
      bullets,
      detail: detail||item.title,
      link: item.link||null,
    };
  });

  return topics;
}

async function saveTopicsToSupabase(dateStr, topics) {
  if (!SB_URL||!SB_KEY) { console.log("No Supabase -- skipping"); return; }
  await fetch(SB_URL+"/rest/v1/daily_topics?date=eq."+dateStr,{
    method:"DELETE",
    headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY},
  });
  const res=await fetch(SB_URL+"/rest/v1/daily_topics",{
    method:"POST",
    headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Prefer":"return=minimal"},
    body:JSON.stringify({date:dateStr,topics:JSON.stringify(topics)}),
  });
  if (res.ok) console.log("Topics saved to Supabase for "+dateStr);
  else { const t=await res.text(); console.log("Supabase save failed: "+t); }
}

// -- Main -------------------------------------------------------------
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
      const rUrl=response.url();
      if (!rUrl.includes("journal-api.un.org")) return;
      try {
        const buf=await response.buffer();
        const text=buf.toString("utf8");
        if (!text.trim().startsWith("{")&&!text.trim().startsWith("[")) return;
        const parsed=JSON.parse(text);
        if (rUrl.includes("/allnew/")) {
          console.log("Captured allnew: "+buf.length+"b");
          journalData=parsed;
        } else if (rUrl.includes("/agendatext")||rUrl.includes("/agenda")||rUrl.includes("/program")) {
          const idM=rUrl.match(/\/([a-f0-9-]{36})\//i)||rUrl.match(/\/([a-f0-9-]{36})$/i);
          const id=idM?idM[1]:null;
          const items=parseAgendaItems(parsed);
          if (id&&items.length>0) { agendaById[id]=items; console.log("Agenda "+id.slice(0,8)+": "+items.join(" | ")); }
        }
      } catch(e){}
    });

    await page.goto(url,{waitUntil:"networkidle2",timeout:45000});
    await new Promise(function(r){setTimeout(r,5000);});

    // Navigate to first SC meeting to capture agenda
    if (journalData) {
      const sg=(journalData.officialMeetings||{}).specialGroups||[];
      for (const group of sg) {
        if ((group.groupNameTitle||"").toLowerCase().includes("security council")) {
          for (const session of (group.sessions||[])) {
            for (const m of (session.meetings||[])) {
              if (m.id&&!m.isCancelled) {
                try {
                  const mUrl="https://journal.un.org/en/meeting/Officials/"+m.id+"/"+dateStr;
                  await page.goto(mUrl,{waitUntil:"networkidle2",timeout:20000});
                  await new Promise(function(r){setTimeout(r,3000);});
                } catch(e){}
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
    if (!journalData) { saveResult(dateStr,emptyChambers(),[],"No allnew data captured"); return; }

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
      if (m.title&&m.title.length>3&&!seen[m.title]){seen[m.title]=true;titles.push(m.title);}
    });
    const finalTitles=titles.slice(0,30);
    console.log("Total meetings: "+finalTitles.length);

    const chambers=["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"]
      .map(function(name){
        const ms=chamberMap[name]||[];
        return {room:name,meetings:ms.map(function(m){return {time:m.time,title:m.title,agenda:m.agenda||[],id:m.id||null};})};
      });

    saveResult(dateStr,chambers,finalTitles,
      finalTitles.length>0?"Live from journal-api.un.org -- "+finalTitles.length+" meetings":"0 meetings parsed");

    // Generate topics from RSS (no API cost)
    try {
      const topics=await generateTopicsFromRss(finalTitles,dateStr);
      if (topics&&topics.length>0) {
        await saveTopicsToSupabase(dateStr,topics);
        console.log("Topics saved from RSS: "+topics.length);
        topics.forEach(function(t){console.log("  - "+t.title);});
      }
    } catch(e) { console.log("RSS topics failed: "+e.message); }

  } catch(err) {
    if (browser){try{await browser.close();}catch(e){}}
    console.error("Error: "+err.message);
    saveResult(todayInNewYork(),emptyChambers(),[],"Error: "+err.message);
  }
}

main();
