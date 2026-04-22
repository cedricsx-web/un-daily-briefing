import { useState, useEffect, useRef } from "react";

// No API key in browser - topics served from Supabase, SC recap uses key only when tapped
const BASE    = import.meta.env.BASE_URL || "/";
const SB_URL  = import.meta.env.VITE_SUPABASE_URL || "";
const SB_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const SC_KEY  = import.meta.env.VITE_ANTHROPIC_KEY || "";

const SDG_COLORS = {
  1:"#E5243B",2:"#DDA63A",3:"#4C9F38",4:"#C5192D",5:"#FF3A21",
  6:"#26BDE2",7:"#FCC30B",8:"#A21942",9:"#FD6925",10:"#DD1367",
  11:"#FD9D24",12:"#BF8B2E",13:"#3F7E44",14:"#0A97D9",15:"#56C02B",
  16:"#00689D",17:"#19486A",
};

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// UN International Observances
const UN_OBSERVANCES = [
  {date:"01-04",name:"World Braille Day",url:"https://www.un.org/en/observances/braille-day"},
  {date:"01-24",name:"International Day of Education",url:"https://www.un.org/en/observances/education-day"},
  {date:"01-26",name:"International Day of Clean Energy",url:"https://www.un.org/en/observances/clean-energy-day"},
  {date:"01-27",name:"International Holocaust Remembrance Day",url:"https://www.un.org/en/observances/holocaust-remembrance-day"},
  {date:"02-02",name:"World Wetlands Day",url:"https://www.un.org/en/observances/wetlands-day"},
  {date:"02-04",name:"World Cancer Day",url:"https://www.un.org/en/observances/cancer-day"},
  {date:"02-13",name:"World Radio Day",url:"https://www.un.org/en/observances/radio-day"},
  {date:"02-20",name:"World Day of Social Justice",url:"https://www.un.org/en/observances/social-justice-day"},
  {date:"02-21",name:"International Mother Language Day",url:"https://www.un.org/en/observances/mother-language-day"},
  {date:"03-03",name:"World Wildlife Day",url:"https://www.un.org/en/observances/world-wildlife-day"},
  {date:"03-08",name:"International Women's Day",url:"https://www.un.org/en/observances/international-womens-day"},
  {date:"03-20",name:"International Day of Happiness",url:"https://www.un.org/en/observances/happiness-day"},
  {date:"03-21",name:"International Day for the Elimination of Racial Discrimination",url:"https://www.un.org/en/observances/end-racism-day"},
  {date:"03-22",name:"World Water Day",url:"https://www.un.org/en/observances/water-day"},
  {date:"03-24",name:"World Tuberculosis Day",url:"https://www.un.org/en/observances/tuberculosis-day"},
  {date:"04-02",name:"World Autism Awareness Day",url:"https://www.un.org/en/observances/autism-day"},
  {date:"04-05",name:"International Day of Conscience",url:"https://www.un.org/en/observances/conscience-day"},
  {date:"04-06",name:"International Day of Sport for Development and Peace",url:"https://www.un.org/en/observances/sport-day"},
  {date:"04-07",name:"World Health Day",url:"https://www.un.org/en/observances/world-health-day"},
  {date:"04-22",name:"International Mother Earth Day",url:"https://www.un.org/en/observances/earth-day"},
  {date:"04-23",name:"World Book and Copyright Day",url:"https://www.un.org/en/observances/book-and-copyright-day"},
  {date:"04-25",name:"World Malaria Day",url:"https://www.un.org/en/observances/malaria-day"},
  {date:"04-28",name:"World Day for Safety and Health at Work",url:"https://www.un.org/en/observances/work-safety-day"},
  {date:"05-01",name:"World Press Freedom Day",url:"https://www.un.org/en/observances/press-freedom-day"},
  {date:"05-03",name:"World Press Freedom Day",url:"https://www.un.org/en/observances/press-freedom-day"},
  {date:"05-15",name:"International Day of Families",url:"https://www.un.org/en/observances/international-day-of-families"},
  {date:"05-17",name:"World Telecommunication and Information Society Day",url:"https://www.un.org/en/observances/telecommunication-day"},
  {date:"05-22",name:"International Day for Biological Diversity",url:"https://www.un.org/en/observances/biological-diversity-day"},
  {date:"05-29",name:"International Day of UN Peacekeepers",url:"https://www.un.org/en/observances/peacekeepers-day"},
  {date:"05-31",name:"World No-Tobacco Day",url:"https://www.un.org/en/observances/no-tobacco-day"},
  {date:"06-05",name:"World Environment Day",url:"https://www.un.org/en/observances/environment-day"},
  {date:"06-08",name:"World Oceans Day",url:"https://www.un.org/en/observances/oceans-day"},
  {date:"06-12",name:"World Day Against Child Labour",url:"https://www.un.org/en/observances/world-day-against-child-labour"},
  {date:"06-17",name:"World Day to Combat Desertification and Drought",url:"https://www.un.org/en/observances/desertification-day"},
  {date:"06-20",name:"World Refugee Day",url:"https://www.un.org/en/observances/refugee-day"},
  {date:"06-21",name:"International Day of Yoga",url:"https://www.un.org/en/observances/yoga-day"},
  {date:"07-11",name:"World Population Day",url:"https://www.un.org/en/observances/world-population-day"},
  {date:"07-18",name:"Nelson Mandela International Day",url:"https://www.un.org/en/observances/mandela-day"},
  {date:"07-30",name:"World Day Against Trafficking in Persons",url:"https://www.un.org/en/observances/end-human-trafficking-day"},
  {date:"08-12",name:"International Youth Day",url:"https://www.un.org/en/observances/youth-day"},
  {date:"08-19",name:"World Humanitarian Day",url:"https://www.un.org/en/observances/humanitarian-day"},
  {date:"09-05",name:"International Day of Charity",url:"https://www.un.org/en/observances/charity-day"},
  {date:"09-08",name:"International Literacy Day",url:"https://www.un.org/en/observances/literacy-day"},
  {date:"09-15",name:"International Day of Democracy",url:"https://www.un.org/en/observances/democracy-day"},
  {date:"09-16",name:"International Day for the Preservation of the Ozone Layer",url:"https://www.un.org/en/observances/ozone-day"},
  {date:"09-21",name:"International Day of Peace",url:"https://www.un.org/en/observances/international-day-of-peace"},
  {date:"09-27",name:"World Tourism Day",url:"https://www.un.org/en/observances/world-tourism-day"},
  {date:"10-01",name:"International Day of Older Persons",url:"https://www.un.org/en/observances/older-persons-day"},
  {date:"10-02",name:"International Day of Non-Violence",url:"https://www.un.org/en/observances/non-violence-day"},
  {date:"10-05",name:"World Teachers Day",url:"https://www.un.org/en/observances/world-teachers-day"},
  {date:"10-10",name:"World Mental Health Day",url:"https://www.un.org/en/observances/world-mental-health-day"},
  {date:"10-11",name:"International Day of the Girl Child",url:"https://www.un.org/en/observances/girl-child-day"},
  {date:"10-13",name:"International Day for Disaster Risk Reduction",url:"https://www.un.org/en/observances/disaster-reduction-day"},
  {date:"10-16",name:"World Food Day",url:"https://www.un.org/en/observances/food-day"},
  {date:"10-17",name:"International Day for the Eradication of Poverty",url:"https://www.un.org/en/observances/day-for-eradicating-poverty"},
  {date:"10-24",name:"United Nations Day",url:"https://www.un.org/en/observances/united-nations-day"},
  {date:"11-06",name:"International Day for Preventing the Exploitation of the Environment in War",url:"https://www.un.org/en/observances/environment-in-war-day"},
  {date:"11-16",name:"International Day for Tolerance",url:"https://www.un.org/en/observances/tolerance-day"},
  {date:"11-19",name:"World Toilet Day",url:"https://www.un.org/en/observances/toilet-day"},
  {date:"11-20",name:"World Children's Day",url:"https://www.un.org/en/observances/world-childrens-day"},
  {date:"11-25",name:"International Day for the Elimination of Violence against Women",url:"https://www.un.org/en/observances/ending-violence-against-women-day"},
  {date:"12-01",name:"World AIDS Day",url:"https://www.un.org/en/observances/world-aids-day"},
  {date:"12-03",name:"International Day of Persons with Disabilities",url:"https://www.un.org/en/observances/day-of-persons-with-disabilities"},
  {date:"12-05",name:"World Soil Day",url:"https://www.un.org/en/observances/world-soil-day"},
  {date:"12-10",name:"Human Rights Day",url:"https://www.un.org/en/observances/human-rights-day"},
  {date:"12-11",name:"International Mountain Day",url:"https://www.un.org/en/observances/mountain-day"},
  {date:"12-18",name:"International Migrants Day",url:"https://www.un.org/en/observances/migrants-day"},
];

function todayNY() {
  const p = new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const o={}; p.forEach(x=>{o[x.type]=x.value;});
  return o.year+"-"+o.month+"-"+o.day;
}
function todayKey() { return "un-briefing-"+todayNY(); }
function mmdd() {
  const p = new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const o={}; p.forEach(x=>{o[x.type]=x.value;});
  return o.month+"-"+o.day;
}
function getTodayObservance() { return UN_OBSERVANCES.find(o=>o.date===mmdd())||null; }
function getWeekendObservances() {
  const now = new Date(new Date().toLocaleString("en-US",{timeZone:"America/New_York"}));
  const dow = now.getDay();
  const results=[];
  if (dow===5) {
    [1,2].forEach(function(d){
      const dt=new Date(now); dt.setDate(dt.getDate()+d);
      const m=String(dt.getMonth()+1).padStart(2,"0"), day=String(dt.getDate()).padStart(2,"0");
      const obs=UN_OBSERVANCES.find(o=>o.date===m+"-"+day);
      if (obs) results.push({...obs, weekday:d===1?"Saturday":"Sunday"});
    });
  } else if (dow===1) {
    [-2,-1].forEach(function(d){
      const dt=new Date(now); dt.setDate(dt.getDate()+d);
      const m=String(dt.getMonth()+1).padStart(2,"0"), day=String(dt.getDate()).padStart(2,"0");
      const obs=UN_OBSERVANCES.find(o=>o.date===m+"-"+day);
      if (obs) results.push({...obs, weekday:d===-2?"Last Saturday":"Last Sunday", past:true});
    });
  }
  return results;
}
function formatDate(d) {
  const opts={timeZone:"America/New_York",weekday:"long",year:"numeric",month:"long",day:"numeric"};
  return d.toLocaleDateString("en-US",opts);
}

const CHAMBER_ICONS = { "General Assembly Hall":"GA","Security Council":"SC","Trusteeship Council":"TC","Economic and Social Council":"ECOSOC" };

// Room->chamber for subsidiary bodies
const ROOM_TO_CHAMBER = {
  "general assembly hall":"General Assembly Hall",
  "security council chamber":"Security Council",
  "security council consultations room":"Security Council",
  "trusteeship council chamber":"Trusteeship Council",
  "economic and social council chamber":"Economic and Social Council",
};
// Organ group->chamber for main organs (specialGroups)
const ORGAN_TO_CHAMBER = {
  "general assembly":"General Assembly Hall",
  "security council":"Security Council",
  "trusteeship council":"Trusteeship Council",
  "economic and social council":"Economic and Social Council",
};

// -- Chamber Card -------------------------------------------------------
function ChamberCard({ chamber, index }) {
  const icon = CHAMBER_ICONS[chamber.room] || "UN";
  const hasSession = chamber.meetings && chamber.meetings.some(m=>!m.cancelled);
  const isSC = chamber.room === "Security Council";

  const [recap, setRecap] = useState(null);
  const [recapTitle, setRecapTitle] = useState(null);
  const [recapLoading, setRecapLoading] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const fetchedRef = useRef(false);

  const scNums = isSC
    ? (chamber.meetings||[]).filter(m=>!m.cancelled).map(function(m){
        const match = m.title.match(/(\d+)(st|nd|rd|th) meeting/i);
        return match ? match[1]+match[2]+" meeting" : null;
      }).filter(Boolean)
    : [];

  useEffect(function(){
    if (isSC && hasSession && scNums.length>0 && SC_KEY && !fetchedRef.current) {
      fetchedRef.current=true;
      doFetchRecap();
    }
  },[]);

  async function doFetchRecap() {
    if (!SC_KEY || scNums.length===0) return;
    setRecapLoading(true);
    try {
      const meetingRef = scNums.join(" and ");
      const today = new Date().toLocaleDateString("en-US",{timeZone:"America/New_York",month:"long",day:"numeric",year:"numeric"});
      const res = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-api-key":SC_KEY,
          "anthropic-version":"2023-06-01",
          "anthropic-dangerous-direct-browser-access":"true",
        },
        body:JSON.stringify({
          model:"claude-sonnet-4-6",
          max_tokens:800,
          tools:[{type:"web_search_20250305",name:"web_search"}],
          messages:[{role:"user",content:"Today is "+today+". The Security Council holds its "+meetingRef+" today. Search: \""+meetingRef+" Security Council "+today+"\". Also search: \""+meetingRef+" UNMIK OR Kosovo OR Haiti OR Yemen OR Gaza OR Syria OR Congo OR Sudan Security Council\". Return two parts split by ---FULL--- : Part 1 (before ---FULL---) the agenda item title only max 10 words e.g. The situation in Kosovo (UNMIK). Part 2 (after ---FULL---) a 3-5 sentence briefing: agenda item, who is briefing, main issue, expected outcome. Be accurate, use only search results."}],
        }),
      });
      const data=await res.json();
      if (data.error) throw new Error(data.error.message);
      const text=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("").trim();
      const parts=text.split("---FULL---");
      const rawTitle=(parts[0]||"").trim();
      const titleLines=rawTitle.split("\n").map(l=>l.replace(/[*_#\-]/g,"").trim()).filter(l=>l.length>3);
      setRecapTitle(titleLines[titleLines.length-1]||rawTitle||null);
      setRecap((parts[1]||parts[0]||"").trim()||"No information found yet.");
    } catch(e) {
      setRecap("Search failed: "+e.message);
    }
    setRecapLoading(false);
  }

  return (
    <div style={{
      background:hasSession?"rgba(0,150,214,0.08)":"rgba(255,255,255,0.02)",
      border:hasSession?"1px solid rgba(0,150,214,0.25)":"1px solid rgba(255,255,255,0.06)",
      borderRadius:"10px",padding:"14px 16px",
      animation:"fadeSlideIn 0.4s ease both",animationDelay:(index*0.08)+"s",
    }}>
      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:hasSession?"10px":"0"}}>
        <span style={{fontSize:"9px",fontWeight:"800",color:hasSession?"#00A0DC":"rgba(255,255,255,0.3)",background:hasSession?"rgba(0,150,214,0.15)":"rgba(255,255,255,0.06)",borderRadius:"5px",padding:"2px 5px",letterSpacing:"0.5px",flexShrink:0}}>{icon}</span>
        <span style={{flex:1,fontSize:"10px",fontWeight:"700",color:hasSession?"#00A0DC":"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.6px",lineHeight:"1.3"}}>{chamber.room}</span>
        {isSC && (recap||recapLoading) && (
          <button onClick={function(){setRecapOpen(function(o){return !o;});}} style={{
            background:recapOpen?"rgba(0,150,214,0.2)":"rgba(255,255,255,0.06)",
            border:"1px solid rgba(0,150,214,0.3)",color:"#00A0DC",borderRadius:"6px",
            padding:"2px 7px",fontSize:"9px",fontWeight:"700",cursor:"pointer",letterSpacing:"0.5px",flexShrink:0,
          }}>{recapOpen?"HIDE":"DETAILS"}</button>
        )}
      </div>

      {hasSession ? (
        <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          {(chamber.meetings||[]).map(function(m,i){return (
            <div key={i} style={{opacity:m.cancelled?0.45:1}}>
              <div style={{display:"flex",gap:"8px",alignItems:"flex-start"}}>
                <span style={{fontSize:"10px",color:"#FCC30B",fontWeight:"700",whiteSpace:"nowrap",marginTop:"1px",flexShrink:0}}>{m.time}</span>
                <div style={{flex:1}}>
                  <span style={{
                    fontSize:"12px",lineHeight:"1.35",fontWeight:"600",
                    color:m.cancelled?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.9)",
                    textDecoration:m.cancelled?"line-through":"none",
                  }}>{m.title}{m.cancelled&&<span style={{marginLeft:"4px",fontSize:"8px",color:"#ff6b6b",fontWeight:"700"}}>CANC.</span>}</span>
                  {isSC&&recapTitle&&!m.cancelled&&(
                    <div style={{fontSize:"10px",color:"rgba(255,255,255,0.5)",fontStyle:"italic",marginTop:"2px",lineHeight:"1.3"}}>{recapTitle}</div>
                  )}
                  {isSC&&recapLoading&&!recap&&!m.cancelled&&(
                    <div style={{fontSize:"10px",color:"rgba(0,150,214,0.5)",marginTop:"2px"}}>Loading topic...</div>
                  )}
                </div>
              </div>
              {m.agenda&&m.agenda.length>0&&!m.cancelled&&(
                <div style={{marginTop:"3px",paddingLeft:"40px",display:"flex",flexDirection:"column",gap:"2px"}}>
                  {m.agenda.map(function(item,j){return(
                    <span key={j} style={{fontSize:"10px",color:"rgba(255,255,255,0.45)",lineHeight:"1.4",display:"flex",gap:"5px"}}>
                      <span style={{color:"rgba(0,160,220,0.4)",flexShrink:0}}>-</span>{item}
                    </span>
                  );})}
                </div>
              )}
            </div>
          );})}
        </div>
      ):(
        <p style={{margin:0,fontSize:"11px",color:"rgba(255,255,255,0.25)",fontStyle:"italic"}}>No session today</p>
      )}

      {isSC&&recapOpen&&(
        <div style={{marginTop:"12px",paddingTop:"12px",borderTop:"1px solid rgba(0,150,214,0.2)"}}>
          <p style={{margin:0,fontSize:"12px",color:"rgba(255,255,255,0.8)",lineHeight:"1.65"}}>{recap}</p>
        </div>
      )}
    </div>
  );
}

// -- Meetings List -------------------------------------------------------
function MeetingsList({ meetings, onCancel, onDelete, onUncancel }) {
  const [expanded, setExpanded] = useState(false);
  const preview = meetings.slice(0,5);
  const rest = meetings.slice(5);
  const visible = [...preview,...(expanded?rest:[])];
  return (
    <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"10px",padding:"16px",animation:"fadeSlideIn 0.4s ease both",animationDelay:"0.35s"}}>
      {visible.map(function(m,i){
        const title     = typeof m==="string"?m:(m.title||"");
        const isExtra   = typeof m==="string"?false:!!m.isExtra;
        const extraId   = typeof m==="string"?null:m.extraId;
        const cancelKey = typeof m==="string"?m:(m.cancelKey||m.title||m);
        const cancelled = typeof m==="string"?false:!!m.cancelled;
        return (
          <div key={i} style={{display:"flex",alignItems:"center",gap:"8px",paddingBottom:i<visible.length-1?"10px":"0",marginBottom:i<visible.length-1?"10px":"0",borderBottom:i<visible.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
            <span style={{color:cancelled?"rgba(255,100,100,0.4)":"rgba(0,160,220,0.5)",fontSize:"9px",flexShrink:0}}>&#9679;</span>
            <span style={{flex:1,fontSize:"13px",lineHeight:"1.45",color:cancelled?"rgba(255,255,255,0.35)":"rgba(255,255,255,0.8)",textDecoration:cancelled?"line-through":"none"}}>
              {title}
              {isExtra&&!cancelled&&<span style={{marginLeft:"6px",fontSize:"9px",color:"#FCC30B",fontWeight:"700",verticalAlign:"middle"}}>ADDED</span>}
              {cancelled&&<span style={{marginLeft:"6px",fontSize:"9px",color:"#ff6b6b",fontWeight:"700",verticalAlign:"middle"}}>CANCELLED</span>}
            </span>
            {!cancelled?(
              <button onClick={function(e){e.stopPropagation();isExtra?onDelete(extraId):onCancel(cancelKey);}} title={isExtra?"Remove this meeting":"Mark as cancelled"} style={{flexShrink:0,background:"rgba(220,50,50,0.15)",border:"1px solid rgba(220,50,50,0.35)",color:"#ff8080",borderRadius:"6px",width:"24px",height:"24px",fontSize:"13px",fontWeight:"700",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,fontFamily:"inherit",padding:0}}>&#x2715;</button>
            ):!isExtra&&(
              <button onClick={function(e){e.stopPropagation();onUncancel(cancelKey);}} title="Restore this meeting" style={{flexShrink:0,background:"rgba(76,159,56,0.15)",border:"1px solid rgba(76,159,56,0.35)",color:"#56C02B",borderRadius:"6px",width:"24px",height:"24px",fontSize:"13px",fontWeight:"700",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,fontFamily:"inherit",padding:0}}>&#8617;</button>
            )}
          </div>
        );
      })}
      {rest.length>0&&(
        <button onClick={function(){setExpanded(function(e){return !e;});}} style={{background:"transparent",border:"none",color:"#00A0DC",fontSize:"12px",fontWeight:"600",cursor:"pointer",padding:"8px 0 0",fontFamily:"'DM Sans',sans-serif"}}>
          {expanded?"Show less":"Show "+rest.length+" more meetings"}
        </button>
      )}
    </div>
  );
}

// -- Topic Card ---------------------------------------------------------
function TopicCard({ topic, index }) {
  const [expanded, setExpanded] = useState(false);
  const sdgNum = topic.sdg ? parseInt(topic.sdg.replace(/\D/g,"")) : null;
  const sdgColor = sdgNum ? (SDG_COLORS[sdgNum]||"#00A0DC") : "#00A0DC";
  const TAG_COLORS = {"UN Meeting":"#00A0DC","International Day":"#FCC30B","Global Crisis":"#E5243B","Diplomacy":"#4C9F38","Humanitarian":"#FF6B35"};
  const tagColor = TAG_COLORS[topic.tag]||"#00A0DC";
  return (
    <div onClick={function(){setExpanded(function(e){return !e;});}} style={{
      background:expanded?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.03)",
      border:"1px solid "+(expanded?"rgba(255,255,255,0.12)":"rgba(255,255,255,0.07)"),
      borderRadius:"12px",padding:"16px",cursor:"pointer",
      animation:"fadeSlideIn 0.4s ease both",animationDelay:(0.1+index*0.08)+"s",
      transition:"all 0.2s ease",marginBottom:"10px",
    }}>
      <div style={{display:"flex",alignItems:"flex-start",gap:"10px",marginBottom:"10px"}}>
        <div style={{width:"32px",height:"32px",borderRadius:"8px",background:sdgColor,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,fontWeight:"800",fontSize:"11px",color:"#fff"}}>{sdgNum||"?"}</div>
        <div style={{flex:1}}>
          <div style={{display:"flex",gap:"6px",marginBottom:"4px",flexWrap:"wrap"}}>
            <span style={{fontSize:"9px",fontWeight:"700",color:tagColor,background:"rgba(255,255,255,0.06)",borderRadius:"4px",padding:"1px 5px",letterSpacing:"0.5px"}}>{topic.tag}</span>
            {topic.un_entity&&<span style={{fontSize:"9px",fontWeight:"600",color:"rgba(255,255,255,0.4)",background:"rgba(255,255,255,0.04)",borderRadius:"4px",padding:"1px 5px"}}>{topic.un_entity}</span>}
          </div>
          <h3 style={{margin:0,fontSize:"14px",fontWeight:"700",color:"rgba(255,255,255,0.92)",lineHeight:"1.35",fontFamily:"'Playfair Display',serif"}}>{topic.title}</h3>
          <p style={{margin:"2px 0 0",fontSize:"10px",color:sdgColor,fontWeight:"600"}}>{topic.sdg}</p>
        </div>
        <span style={{fontSize:"14px",color:"rgba(255,255,255,0.3)",flexShrink:0,marginTop:"2px"}}>{expanded?"&#9650;":"&#9660;"}</span>
      </div>
      {topic.bullets&&topic.bullets.length>0&&(
        <ul style={{margin:"0 0 0 42px",padding:0,listStyle:"none",display:"flex",flexDirection:"column",gap:"4px"}}>
          {topic.bullets.map(function(b,i){return(
            <li key={i} style={{display:"flex",gap:"6px",alignItems:"flex-start",fontSize:"12px",color:"rgba(255,255,255,0.65)",lineHeight:"1.45"}}>
              <span style={{color:sdgColor,flexShrink:0,marginTop:"2px",fontSize:"11px"}}>&#9670;</span>
              <span>{b}</span>
            </li>
          );})}
        </ul>
      )}
      {expanded&&topic.detail&&(
        <div style={{marginTop:"16px",paddingTop:"16px",borderTop:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.88)",fontSize:"14px",lineHeight:"1.75",animation:"fadeSlideIn 0.3s ease"}}>{topic.detail}</div>
      )}
      {!expanded&&<p style={{margin:"12px 0 0",fontSize:"12px",color:"rgba(255,255,255,0.35)",fontStyle:"italic"}}>Tap for full briefing</p>}
    </div>
  );
}

// -- Section Header -----------------------------------------------------
function SectionHeader({ icon, title, subtitle, badge }) {
  return (
    <div style={{marginBottom:"14px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
        <span style={{fontSize:"14px"}}>{icon}</span>
        <span style={{fontSize:"11px",fontWeight:"700",color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"1.5px"}}>{title}</span>
        {badge&&<span style={{background:"rgba(0,160,220,0.15)",color:"#00A0DC",fontSize:"9px",fontWeight:"700",padding:"2px 6px",borderRadius:"10px",letterSpacing:"0.5px"}}>{badge}</span>}
      </div>
      {subtitle&&<p style={{margin:"4px 0 0 22px",fontSize:"11px",color:"rgba(255,255,255,0.25)"}}>{subtitle}</p>}
    </div>
  );
}

// -- Main App -----------------------------------------------------------
export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateLabel, setDateLabel] = useState("");
  const [journalSource, setJournalSource] = useState("live");
  const [dots, setDots] = useState(".");
  const [loadingMsg, setLoadingMsg] = useState("Fetching UN Journal");
  const fetchedRef = useRef(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [extraMeetings, setExtraMeetings] = useState([]);
  const [deletedExtraIds, setDeletedExtraIds] = useState([]);
  const [cancelledTitles, setCancelledTitles] = useState([]);
  const [formOrgType, setFormOrgType] = useState("mission");
  const [formOrgName, setFormOrgName] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formRoom, setFormRoom] = useState("Trusteeship Council Chamber");
  const [formTimeStart, setFormTimeStart] = useState("15:00");
  const [formTimeEnd, setFormTimeEnd] = useState("");
  const [formClosed, setFormClosed] = useState(false);
  const [formNote, setFormNote] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  const loadingMessages = ["Fetching UN Journal","Parsing chamber schedules","Scanning all meetings","Loading briefing topics","Almost ready"];
  const todayObservance = getTodayObservance();
  const weekendObservances = getWeekendObservances();

  useEffect(function(){
    setDateLabel(formatDate(new Date()));
    setCancelledTitles([]);
    setDeletedExtraIds([]);
    try {
      const cached = sessionStorage.getItem(todayKey());
      if (cached) {
        const parsed = JSON.parse(cached);
        setData(parsed.data);
        setJournalSource(parsed.source||"live");
        // Re-check journal.json in background even when cached
        fetchLiveJournal().then(function(liveData){
          setData(function(prev){
            if (!prev) return prev;
            return Object.assign({},prev,{chambers:liveData.chambers,meetings:liveData.meetings,journalFailed:false});
          });
          setJournalSource("live");
          try {
            const ex=sessionStorage.getItem(todayKey());
            if (ex){const p2=JSON.parse(ex);p2.data.chambers=liveData.chambers;p2.data.meetings=liveData.meetings;p2.data.journalFailed=false;p2.source="live";sessionStorage.setItem(todayKey(),JSON.stringify(p2));}
          } catch(_){}
        }).catch(function(){});
      }
    } catch(_){}
    fetchExtraMeetings();
    fetchCancelledMeetings();
  },[]);

  useEffect(function(){
    if (!loading) return;
    let i=0;
    const msgI=setInterval(function(){i=(i+1)%loadingMessages.length;setLoadingMsg(loadingMessages[i]);},2000);
    const dotI=setInterval(function(){setDots(function(d){return d.length>=3?".":d+".";});},500);
    return function(){clearInterval(msgI);clearInterval(dotI);};
  },[loading]);

  // Supabase helpers
  async function fetchExtraMeetings() {
    if (!SB_URL||!SB_KEY) return;
    try {
      const res=await fetch(SB_URL+"/rest/v1/extra_meetings?date=eq."+todayNY()+"&order=time_start.asc",{headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});
      if (res.ok){const rows=await res.json();setExtraMeetings(rows||[]);}
    } catch(e){console.warn("fetchExtraMeetings:",e.message);}
  }
  async function fetchCancelledMeetings() {
    if (!SB_URL||!SB_KEY) return;
    try {
      const res=await fetch(SB_URL+"/rest/v1/cancelled_meetings?date=eq."+todayNY(),{headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});
      if (res.ok){const rows=await res.json();setCancelledTitles((rows||[]).map(function(r){return r.meeting_title;}));}
    } catch(e){console.warn("fetchCancelledMeetings:",e.message);}
  }
  async function cancelMeeting(key) {
    if (!SB_URL||!SB_KEY) return;
    setCancelledTitles(function(prev){return [...prev,key];});
    try {
      await fetch(SB_URL+"/rest/v1/cancelled_meetings",{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Prefer":"return=minimal"},body:JSON.stringify({date:todayNY(),meeting_title:key})});
    } catch(e){setCancelledTitles(function(prev){return prev.filter(function(t){return t!==key;});});}
  }
  async function uncancelMeeting(key) {
    if (!SB_URL||!SB_KEY) return;
    setCancelledTitles(function(prev){return prev.filter(function(t){return t!==key;});});
    try {
      await fetch(SB_URL+"/rest/v1/cancelled_meetings?date=eq."+todayNY()+"&meeting_title=eq."+encodeURIComponent(key),{method:"DELETE",headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});
    } catch(e){setCancelledTitles(function(prev){return [...prev,key];});}
  }
  async function deleteExtraMeeting(id) {
    if (!SB_URL||!SB_KEY) return;
    setDeletedExtraIds(function(prev){return [...prev,id];});
    try {
      await fetch(SB_URL+"/rest/v1/extra_meetings?id=eq."+id,{method:"DELETE",headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});
    } catch(e){setDeletedExtraIds(function(prev){return prev.filter(function(i2){return i2!==id;});});}
  }
  async function saveExtraMeeting() {
    if (!SB_URL||!SB_KEY){setFormErr("Supabase not configured");return;}
    if (!formOrgName.trim()||!formTitle.trim()){setFormErr("Please fill in all required fields");return;}
    setFormSaving(true);setFormErr("");
    try {
      const res=await fetch(SB_URL+"/rest/v1/extra_meetings",{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Prefer":"return=representation"},body:JSON.stringify({date:todayNY(),organizer_type:formOrgType,organizer_name:formOrgName.trim(),title:formTitle.trim(),room:formRoom,time_start:formTimeStart||null,time_end:formTimeEnd||null,is_closed:formClosed,note:formNote.trim()||null})});
      if (!res.ok){const t=await res.text();throw new Error(t);}
      const rows=await res.json();
      if (rows&&rows[0]){setExtraMeetings(function(prev){return [...prev,rows[0]];});}
      setShowAddForm(false);setFormOrgName("");setFormTitle("");setFormTimeStart("15:00");setFormTimeEnd("");setFormClosed(false);setFormNote("");
    } catch(e){setFormErr("Error saving: "+e.message);}
    setFormSaving(false);
  }

  // Journal parsing
  function stripHtml(s){return (s||"").replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();}
  function getText(f){if(!f)return "";if(typeof f==="string")return stripHtml(f);return stripHtml((f.en||f.En||Object.values(f)[0]||"").toString());}
  function fmtTime(t){if(!t)return "TBD";const m=t.toString().match(/(\d{1,2}):(\d{2})/);if(!m)return t.toString().trim();let h=parseInt(m[1]);const min=m[2];const p=h>=12?"PM":"AM";if(h>12)h-=12;if(h===0)h=12;return h+":"+min+" "+p;}
  function getRoom(item){if(Array.isArray(item.rooms)&&item.rooms[0])return item.rooms[0].value||"";return getText(item.room)||getText(item.location)||"";}

  function parseJournalData(data) {
    const allMeetings=[];
    const chamberMap={};
    function add(ch,entry){if(!chamberMap[ch])chamberMap[ch]=[];chamberMap[ch].push(entry);}

    // Subsidiary bodies: room determines chamber
    function processSubsidiary(groups){
      if (!Array.isArray(groups)) return;
      groups.forEach(function(group){
        const organName=stripHtml(group.groupNameTitle||getText(group.name)||"");
        (group.sessions||[]).forEach(function(session){
          const sessionName=stripHtml(session.name||getText(session.title)||organName);
          const sessionNum=stripHtml(session.session||"");
          const bodyLabel=sessionNum?sessionName+", "+sessionNum:sessionName;
          const sessionTime=session.startTime||session.time||"";
          (session.meetings||[]).forEach(function(m){
            if(m.cancelled||m.isCancelled)return;
            const num=getText(m.meetingNumber);
            const ttl=getText(m.title)||getText(m.name)||getText(m.subject);
            const rawTitle=num||ttl;if(!rawTitle)return;
            const agenda=[];
            const fullTitle=bodyLabel?bodyLabel+" -- "+rawTitle:rawTitle;
            const time=fmtTime((m.timeFrom||m.startTime||sessionTime||"").toString());
            const rawRoom=getRoom(m);
            const lower=(rawRoom||"").toLowerCase();
            let chamber=null;
            for(const [k,v] of Object.entries(ROOM_TO_CHAMBER)){if(lower.includes(k)){chamber=v;break;}}
            allMeetings.push({title:fullTitle,time,room:rawRoom||null});
            if(chamber)add(chamber,{time,title:fullTitle,agenda,id:m.id||null});
          });
        });
      });
    }

    // Main organs (specialGroups): organ name determines chamber
    function processOrgans(specialGroups){
      if(!Array.isArray(specialGroups))return;
      specialGroups.forEach(function(group){
        const organName=stripHtml(group.groupNameTitle||getText(group.name)||"");
        const lower=organName.toLowerCase();
        let chamber=null;
        for(const [k,v] of Object.entries(ORGAN_TO_CHAMBER)){if(lower.includes(k)){chamber=v;break;}}
        (group.sessions||[]).forEach(function(session){
          const sessionTime=session.startTime||session.time||"";
          (session.meetings||[]).forEach(function(m){
            if(m.cancelled||m.isCancelled)return;
            const num=getText(m.meetingNumber);
            const ttl=getText(m.title)||getText(m.name)||getText(m.subject);
            const rawTitle=num||ttl;if(!rawTitle)return;
            const isClosed=!!(m.isClosed||m.closed||m.isPrivate);
            const shortTitle=rawTitle+(isClosed?" [Closed]":"");
            const time=fmtTime((m.timeFrom||m.startTime||sessionTime||"").toString());
            const rawRoom=getRoom(m);
            allMeetings.push({title:(organName?organName+" -- ":"")+shortTitle,time,room:rawRoom||null});
            if(chamber)add(chamber,{time,title:shortTitle,agenda:[],id:m.id||null});
          });
        });
      });
    }

    function processOther(section){
      if(!section)return;
      const groups=Array.isArray(section)?section:(section.groups||[]);
      groups.forEach(function(group){
        const organName=stripHtml(group.groupNameTitle||getText(group.name)||"");
        (group.sessions||[]).forEach(function(session){
          const sessionName=stripHtml(session.name||getText(session.title)||organName);
          const sessionNum=stripHtml(session.session||"");
          const bodyLabel=sessionNum?sessionName+", "+sessionNum:sessionName;
          const sessionTime=session.startTime||session.time||"";
          (session.meetings||[]).forEach(function(m){
            if(m.cancelled||m.isCancelled)return;
            const num=getText(m.meetingNumber);const ttl=getText(m.title)||getText(m.name)||getText(m.subject);
            const rawTitle=num||ttl;if(!rawTitle)return;
            const fullTitle=bodyLabel?bodyLabel+" -- "+rawTitle:rawTitle;
            const time=fmtTime((m.timeFrom||m.startTime||sessionTime||"").toString());
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

    const chambers=["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"]
      .map(function(name){return {room:name,meetings:(chamberMap[name]||[])};});
    const seen={};const titles=[];
    allMeetings.forEach(function(m){if(m.title&&m.title.length>3&&!seen[m.title]){seen[m.title]=true;titles.push(m.title);}});
    return {chambers,meetings:titles.slice(0,30)};
  }

  // Load journal.json (pre-fetched by GitHub Action each morning)
  async function fetchLiveJournal() {
    const res=await fetch(BASE+"journal.json?t="+Date.now());
    if(!res.ok)throw new Error("journal.json not found ("+res.status+")");
    const json=await res.json();
    // Reject if it's not today's data AND it's more than 20 hours old
    if(json.date&&json.date!==todayNY()){
      const fetchedAt=json.fetched_at?new Date(json.fetched_at):null;
      const ageHours=fetchedAt?(Date.now()-fetchedAt.getTime())/3600000:999;
      if(ageHours>20)throw new Error("journal.json is from "+json.date+" ("+Math.round(ageHours)+"h old)");
    }
    if(!json.meetings||json.meetings.length===0)throw new Error("journal.json has 0 meetings");
    return {chambers:json.chambers||[],meetings:json.meetings||[]};
  }

  // Load topics from Supabase (generated each morning by GitHub Action)
  async function fetchTopicsFromSupabase(dateStr) {
    if(!SB_URL||!SB_KEY)throw new Error("Supabase not configured");
    const res=await fetch(SB_URL+"/rest/v1/daily_topics?date=eq."+dateStr+"&limit=1",{headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});
    if(!res.ok)throw new Error("Supabase error "+res.status);
    const rows=await res.json();
    if(!rows||rows.length===0)throw new Error("No topics for "+dateStr);
    const topics=typeof rows[0].topics==="string"?JSON.parse(rows[0].topics):rows[0].topics;
    if(!topics||!topics.length)throw new Error("Empty topics");
    return topics;
  }

  async function fetchBriefing() {
    if(fetchedRef.current)return;
    fetchedRef.current=true;
    setLoading(true);setError(null);
    const EMPTY_CHAMBERS=[
      {room:"General Assembly Hall",meetings:[]},{room:"Security Council",meetings:[]},
      {room:"Trusteeship Council",meetings:[]},{room:"Economic and Social Council",meetings:[]},
    ];
    try {
      const date=todayNY();
      const [liveData,topics]=await Promise.all([
        fetchLiveJournal().catch(function(e){console.warn("journal.json failed:",e.message);return null;}),
        fetchTopicsFromSupabase(date).catch(function(e){console.warn("Topics from Supabase failed:",e.message);return [];}),
      ]);
      if(!topics||topics.length===0){throw new Error("No briefing topics available yet. The daily briefing is generated at 8 AM NY time. Please try again later.");}
      const finalData={chambers:liveData?liveData.chambers:EMPTY_CHAMBERS,meetings:liveData?liveData.meetings:[],topics,journalFailed:!liveData};
      setData(finalData);
      setJournalSource(liveData?"live":"ai");
      try{if(!finalData.journalFailed)sessionStorage.setItem(todayKey(),JSON.stringify({data:finalData,source:"live"}));}catch(_){}
    } catch(err){
      setError(err.message);fetchedRef.current=false;
    } finally{setLoading(false);}
  }

  function extraLabel(e) {
    const org=e.organizer_type==="un_body"?e.organizer_name:e.organizer_type==="mission"?"Mission of "+e.organizer_name:e.organizer_name;
    return org+" -- "+e.title+(e.is_closed?" [Closed]":"");
  }
  const ROOM_TO_CHAMBER_DISPLAY = {"General Assembly Hall":"General Assembly Hall","Security Council Chamber":"Security Council","Trusteeship Council Chamber":"Trusteeship Council","Economic and Social Council Chamber":"Economic and Social Council","Conference Room 1":"Conference Rooms","Conference Room 2":"Conference Rooms","Conference Room 3":"Conference Rooms","Conference Room 4":"Conference Rooms","Conference Room 5":"Conference Rooms","Conference Room 8":"Conference Rooms","Conference Room 10":"Conference Rooms","Conference Room 11":"Conference Rooms","Conference Room 12":"Conference Rooms"};

  return (
    <div style={{minHeight:"100dvh",background:"linear-gradient(160deg,#0a1628 0%,#0d2044 50%,#0a1a38 100%)",fontFamily:"'DM Sans','Segoe UI',sans-serif",color:"#fff",paddingBottom:"env(safe-area-inset-bottom,40px)"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        body{margin:0;overscroll-behavior-y:none;}
      `}</style>

      {/* Header */}
      <div style={{background:"linear-gradient(180deg,rgba(0,80,160,0.45) 0%,transparent 100%)",padding:"calc(env(safe-area-inset-top,0px) + 28px) 24px 22px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{maxWidth:"520px",margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
            <div style={{width:"38px",height:"38px",borderRadius:"50%",background:"rgba(0,160,220,0.2)",border:"2px solid rgba(0,160,220,0.5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px"}}>&#127760;</div>
            <div>
              <div style={{fontSize:"10px",letterSpacing:"2px",color:"rgba(255,255,255,0.5)",fontWeight:"600",textTransform:"uppercase"}}>United Nations</div>
              <div style={{fontSize:"20px",fontWeight:"800",fontFamily:"'Playfair Display',serif",lineHeight:1}}>Daily Briefing</div>
            </div>
          </div>
          {dateLabel&&(
            <div style={{display:"flex",alignItems:"center",gap:"10px",marginTop:"10px"}}>
              <p style={{margin:0,fontSize:"12px",color:"rgba(255,255,255,0.4)",fontWeight:"500"}}>&#128197; {dateLabel}</p>
              {data&&<span style={{fontSize:"9px",fontWeight:"700",padding:"2px 7px",borderRadius:"10px",background:journalSource==="live"?"rgba(76,159,56,0.2)":"rgba(255,255,255,0.08)",color:journalSource==="live"?"#56C02B":"rgba(255,255,255,0.3)",letterSpacing:"0.5px",textTransform:"uppercase"}}>{journalSource==="live"?"Live Journal":"AI Generated"}</span>}
            </div>
          )}
        </div>
      </div>

      {/* International Day Banner */}
      {todayObservance&&(
        <a href={todayObservance.url} target="_blank" rel="noopener noreferrer" style={{display:"block",background:"linear-gradient(90deg,rgba(0,96,214,0.3),rgba(0,150,220,0.15))",borderBottom:"1px solid rgba(0,160,220,0.2)",padding:"10px 24px",textDecoration:"none",cursor:"pointer"}}>
          <div style={{maxWidth:"520px",margin:"0 auto",display:"flex",alignItems:"center",gap:"8px"}}>
            <span style={{fontSize:"16px",flexShrink:0}}>&#127981;</span>
            <div style={{flex:1}}>
              <div style={{fontSize:"9px",letterSpacing:"1.5px",color:"rgba(255,255,255,0.45)",fontWeight:"700",textTransform:"uppercase"}}>International Day</div>
              <div style={{fontSize:"13px",fontWeight:"600",color:"#fff",lineHeight:"1.3"}}>{todayObservance.name}</div>
            </div>
            <span style={{fontSize:"11px",color:"rgba(0,160,220,0.7)",flexShrink:0}}>&#8599;</span>
          </div>
        </a>
      )}
      {weekendObservances.length>0&&weekendObservances.map(function(obs,i){return(
        <a key={i} href={obs.url} target="_blank" rel="noopener noreferrer" style={{display:"block",background:obs.past?"rgba(255,255,255,0.02)":"linear-gradient(90deg,rgba(0,96,214,0.2),rgba(0,150,220,0.08))",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"8px 24px",textDecoration:"none",opacity:obs.past?0.6:1}}>
          <div style={{maxWidth:"520px",margin:"0 auto",display:"flex",alignItems:"center",gap:"8px"}}>
            <span style={{fontSize:"14px",flexShrink:0}}>&#127981;</span>
            <div style={{flex:1}}>
              <div style={{fontSize:"9px",letterSpacing:"1.5px",color:"rgba(255,255,255,0.35)",fontWeight:"700",textTransform:"uppercase"}}>{obs.weekday}</div>
              <div style={{fontSize:"12px",fontWeight:"600",color:"rgba(255,255,255,0.7)",lineHeight:"1.3"}}>{obs.name}</div>
            </div>
          </div>
        </a>
      );})}

      {/* Content */}
      <div style={{maxWidth:"520px",margin:"0 auto",padding:"24px 18px 0"}}>

        {!data&&!loading&&!error&&(
          <div style={{textAlign:"center",padding:"48px 24px",animation:"fadeSlideIn 0.5s ease"}}>
            <div style={{fontSize:"52px",marginBottom:"20px"}}>&#127482;&#127475;</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"22px",fontWeight:"700",margin:"0 0 10px"}}>Your daily UN briefing awaits</h2>
            <p style={{color:"rgba(255,255,255,0.5)",fontSize:"14px",lineHeight:"1.6",marginBottom:"28px"}}>Live chamber schedule, all meetings from the UN Journal, and 5 key briefing topics.</p>
            <button onClick={fetchBriefing} style={{background:"linear-gradient(135deg,#0096D6,#0050A0)",color:"#fff",border:"none",borderRadius:"50px",padding:"14px 36px",fontSize:"15px",fontWeight:"700",cursor:"pointer",boxShadow:"0 8px 24px rgba(0,100,200,0.4)",fontFamily:"'DM Sans',sans-serif"}}>Generate Today's Briefing</button>
          </div>
        )}

        {loading&&(
          <div style={{textAlign:"center",padding:"60px 24px"}}>
            <div style={{width:"52px",height:"52px",border:"3px solid rgba(0,160,220,0.2)",borderTop:"3px solid #00A0DC",borderRadius:"50%",margin:"0 auto 24px",animation:"spin 0.9s linear infinite"}}/>
            <p style={{color:"rgba(255,255,255,0.65)",fontSize:"14px",fontWeight:"500",animation:"pulse 1.5s ease infinite"}}>{loadingMsg}{dots}</p>
          </div>
        )}

        {error&&!loading&&(
          <div style={{background:"rgba(220,50,50,0.1)",border:"1px solid rgba(220,50,50,0.3)",borderRadius:"12px",padding:"20px",textAlign:"center"}}>
            <p style={{color:"#ff6b6b",margin:"0 0 16px",fontSize:"13px",wordBreak:"break-word"}}>{error}</p>
            <button onClick={function(){fetchedRef.current=false;fetchBriefing();}} style={{background:"rgba(255,107,107,0.2)",color:"#ff6b6b",border:"1px solid rgba(255,107,107,0.4)",borderRadius:"8px",padding:"8px 20px",cursor:"pointer",fontSize:"13px",fontWeight:"600"}}>Try Again</button>
          </div>
        )}

        {data&&!loading&&(function(){
          const visibleExtras = extraMeetings.filter(function(e){return !deletedExtraIds.includes(e.id);});

          // Build chamber meetings with cancellation flags
          const mergedChambers=(data.chambers||[]).map(function(chamber){
            const extras=visibleExtras.filter(function(e){return (ROOM_TO_CHAMBER_DISPLAY[e.room]||e.room)===chamber.room;}).map(function(e){
              const org=e.organizer_type==="un_body"?e.organizer_name:e.organizer_type==="mission"?"Mission of "+e.organizer_name:e.organizer_name;
              return {time:e.time_start?fmtTime(e.time_start):"TBD",title:org+" -- "+e.title+(e.is_closed?" [Closed]":""),agenda:[],id:e.id||null};
            });
            const journalMeetings=(chamber.meetings||[]).map(function(m){
              const key=m.title;
              const cancelled=cancelledTitles.some(function(ct){
                const hasTitle=ct.includes(m.title);
                const hasTime=m.time?ct.includes(m.time):true;
                return hasTitle&&hasTime;
              });
              return {...m,cancelled};
            });
            return {...chamber,meetings:[...journalMeetings,...extras]};
          });

          // Build flat meetings list
          const allMeetings=[
            ...(data.meetings||[]).map(function(title){
              const cancelled=cancelledTitles.includes(title);
              return {title,isExtra:false,extraId:null,cancelKey:title,cancelled};
            }),
            ...visibleExtras.map(function(e){return {title:extraLabel(e),isExtra:true,extraId:e.id,cancelKey:null,cancelled:false};})
          ];

          return (
            <div>
              <SectionHeader icon="&#127963;&#65039;" title="Council Chambers" subtitle="Today's session schedule" badge={journalSource==="live"?"LIVE":null}/>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px",marginBottom:"28px"}}>
                {mergedChambers.map(function(c,i){return <ChamberCard key={i} chamber={c} index={i}/>;} )}
              </div>

              {data.journalFailed&&(!data.meetings||data.meetings.length===0)&&(
                <div style={{background:"rgba(255,180,0,0.08)",border:"1px solid rgba(255,180,0,0.2)",borderRadius:"10px",padding:"12px 16px",marginBottom:"16px",display:"flex",alignItems:"center",gap:"10px"}}>
                  <span style={{fontSize:"16px"}}>&#9888;&#65039;</span>
                  <div>
                    <div style={{fontSize:"13px",fontWeight:"600",color:"rgba(255,200,0,0.9)"}}>Journal unavailable</div>
                    <div style={{fontSize:"11px",color:"rgba(255,255,255,0.4)",marginTop:"2px"}}>Could not reach journal.un.org - add meetings manually with the + button.</div>
                  </div>
                </div>
              )}

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <span style={{fontSize:"14px"}}>&#128203;</span>
                    <span style={{fontSize:"11px",fontWeight:"700",color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"1.5px"}}>All Meetings Today</span>
                    {journalSource==="live"&&<span style={{background:"rgba(0,160,220,0.15)",color:"#00A0DC",fontSize:"9px",fontWeight:"700",padding:"2px 6px",borderRadius:"10px"}}>LIVE</span>}
                    {visibleExtras.length>0&&<span style={{background:"rgba(252,195,11,0.15)",color:"#FCC30B",fontSize:"9px",fontWeight:"700",padding:"2px 6px",borderRadius:"10px"}}>+{visibleExtras.length} added</span>}
                  </div>
                  <p style={{margin:"4px 0 0 22px",fontSize:"11px",color:"rgba(255,255,255,0.25)"}}>{allMeetings.length} meetings across the UN</p>
                </div>
                <button onClick={function(){setShowAddForm(true);}} style={{background:"linear-gradient(135deg,#0096D6,#0050A0)",color:"#fff",border:"none",borderRadius:"50%",width:"36px",height:"36px",fontSize:"22px",fontWeight:"700",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(0,100,200,0.4)",lineHeight:1}}>+</button>
              </div>

              {showAddForm&&(
                <div style={{background:"rgba(0,80,160,0.15)",border:"1px solid rgba(0,150,214,0.3)",borderRadius:"12px",padding:"16px",marginBottom:"16px",animation:"fadeSlideIn 0.3s ease"}}>
                  <div style={{fontSize:"12px",fontWeight:"700",color:"#00A0DC",marginBottom:"12px",textTransform:"uppercase",letterSpacing:"1px"}}>Add Meeting</div>
                  <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
                    <select value={formOrgType} onChange={function(e){setFormOrgType(e.target.value);}} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"8px",color:"#fff",padding:"8px 10px",fontSize:"13px",fontFamily:"inherit"}}>
                      <option value="mission">Permanent Mission</option>
                      <option value="un_body">UN Body</option>
                      <option value="joint">Joint Event</option>
                    </select>
                    <input placeholder="Organization name *" value={formOrgName} onChange={function(e){setFormOrgName(e.target.value);}} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"8px",color:"#fff",padding:"8px 10px",fontSize:"13px",fontFamily:"inherit"}}/>
                    <input placeholder="Meeting title *" value={formTitle} onChange={function(e){setFormTitle(e.target.value);}} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"8px",color:"#fff",padding:"8px 10px",fontSize:"13px",fontFamily:"inherit"}}/>
                    <select value={formRoom} onChange={function(e){setFormRoom(e.target.value);}} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"8px",color:"#fff",padding:"8px 10px",fontSize:"13px",fontFamily:"inherit"}}>
                      <option>General Assembly Hall</option>
                      <option>Security Council Chamber</option>
                      <option>Trusteeship Council Chamber</option>
                      <option>Economic and Social Council Chamber</option>
                      <option>Conference Room 1</option>
                      <option>Conference Room 2</option>
                      <option>Conference Room 3</option>
                      <option>Conference Room 4</option>
                      <option>Conference Room 5</option>
                      <option>Conference Room 8</option>
                      <option>Conference Room 10</option>
                      <option>Conference Room 11</option>
                      <option>Conference Room 12</option>
                    </select>
                    <div style={{display:"flex",gap:"8px"}}>
                      <input type="time" value={formTimeStart} onChange={function(e){setFormTimeStart(e.target.value);}} style={{flex:1,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"8px",color:"#fff",padding:"8px 10px",fontSize:"13px",fontFamily:"inherit"}}/>
                      <input type="time" value={formTimeEnd} onChange={function(e){setFormTimeEnd(e.target.value);}} placeholder="End time" style={{flex:1,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"8px",color:"#fff",padding:"8px 10px",fontSize:"13px",fontFamily:"inherit"}}/>
                    </div>
                    <label style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"13px",color:"rgba(255,255,255,0.7)",cursor:"pointer"}}>
                      <input type="checkbox" checked={formClosed} onChange={function(e){setFormClosed(e.target.checked);}} style={{width:"16px",height:"16px"}}/>Closed meeting
                    </label>
                    <input placeholder="Note (optional)" value={formNote} onChange={function(e){setFormNote(e.target.value);}} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"8px",color:"#fff",padding:"8px 10px",fontSize:"13px",fontFamily:"inherit"}}/>
                    {formErr&&<p style={{color:"#ff6b6b",fontSize:"12px",margin:0}}>{formErr}</p>}
                    <div style={{display:"flex",gap:"8px",marginTop:"4px"}}>
                      <button onClick={saveExtraMeeting} disabled={formSaving} style={{flex:1,background:"linear-gradient(135deg,#0096D6,#0050A0)",color:"#fff",border:"none",borderRadius:"8px",padding:"10px",fontSize:"13px",fontWeight:"700",cursor:formSaving?"not-allowed":"pointer",fontFamily:"inherit"}}>{formSaving?"Saving...":"Save Meeting"}</button>
                      <button onClick={function(){setShowAddForm(false);setFormErr("");}} style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.6)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"8px",padding:"10px 16px",fontSize:"13px",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

              <MeetingsList meetings={allMeetings} onCancel={cancelMeeting} onDelete={deleteExtraMeeting} onUncancel={uncancelMeeting}/>

              <div style={{marginTop:"28px"}}>
                <SectionHeader icon="&#128161;" title="Today's Briefing Topics" subtitle="5 key issues at the UN today"/>
                {(data.topics||[]).map(function(t,i){return <TopicCard key={i} topic={t} index={i}/>;} )}
              </div>

              <div style={{height:"40px"}}/>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
