import { useState, useEffect, useRef } from "react";

const BASE   = import.meta.env.BASE_URL || "/";
const SB_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const SDG_COLORS = {
  1:"#E5243B",2:"#DDA63A",3:"#4C9F38",4:"#C5192D",5:"#FF3A21",
  6:"#26BDE2",7:"#FCC30B",8:"#A21942",9:"#FD6925",10:"#DD1367",
  11:"#FD9D24",12:"#BF8B2E",13:"#3F7E44",14:"#0A97D9",15:"#56C02B",
  16:"#00689D",17:"#19486A",
};

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
  const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const o={}; p.forEach(function(x){o[x.type]=x.value;});
  return o.year+"-"+o.month+"-"+o.day;
}
function mmddNY() {
  const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",month:"2-digit",day:"2-digit"}).formatToParts(new Date());
  const o={}; p.forEach(function(x){o[x.type]=x.value;});
  return o.month+"-"+o.day;
}
function getTodayObservance() { return UN_OBSERVANCES.find(function(o){return o.date===mmddNY();})||null; }
function getWeekendObservances() {
  const now=new Date(new Date().toLocaleString("en-US",{timeZone:"America/New_York"}));
  const dow=now.getDay(); const results=[];
  const offsets = dow===5?[1,2]:dow===1?[-2,-1]:[];
  const labels  = dow===5?["Saturday","Sunday"]:["Last Saturday","Last Sunday"];
  offsets.forEach(function(d,i){
    const dt=new Date(now); dt.setDate(dt.getDate()+d);
    const m=String(dt.getMonth()+1).padStart(2,"0"), day=String(dt.getDate()).padStart(2,"0");
    const obs=UN_OBSERVANCES.find(function(o){return o.date===m+"-"+day;});
    if (obs) results.push(Object.assign({},obs,{weekday:labels[i],past:dow===1}));
  });
  return results;
}
function formatDate(d) {
  return d.toLocaleDateString("en-US",{timeZone:"America/New_York",weekday:"long",year:"numeric",month:"long",day:"numeric"});
}

const CHAMBER_ICONS={"General Assembly Hall":"GA","Security Council":"SC","Trusteeship Council":"TC","Economic and Social Council":"ECOSOC"};
const ROOM_TO_CHAMBER={"general assembly hall":"General Assembly Hall","security council chamber":"Security Council","security council consultations room":"Security Council","trusteeship council chamber":"Trusteeship Council","economic and social council chamber":"Economic and Social Council"};
const ORGAN_TO_CHAMBER={"general assembly":"General Assembly Hall","security council":"Security Council","trusteeship council":"Trusteeship Council","economic and social council":"Economic and Social Council"};
const ROOM_DISPLAY={"General Assembly Hall":"General Assembly Hall","Security Council Chamber":"Security Council","Trusteeship Council Chamber":"Trusteeship Council","Economic and Social Council Chamber":"Economic and Social Council"};

// -- Meeting Row (tappable to show agenda) --
function MeetingRow({m}) {
  const [open,setOpen]=useState(false);
  const hasAgenda=m.agenda&&m.agenda.length>0&&!m.cancelled;
  return (
    <div style={{opacity:m.cancelled?0.45:1}}>
      <div
        onClick={hasAgenda?function(){setOpen(function(o){return !o;});}:undefined}
        style={{display:"flex",gap:"8px",alignItems:"flex-start",cursor:hasAgenda?"pointer":"default",borderRadius:"6px",padding:"3px 0"}}
      >
        <span style={{fontSize:"10px",color:"#FCC30B",fontWeight:"700",whiteSpace:"nowrap",marginTop:"1px",flexShrink:0}}>{m.time}</span>
        <span style={{flex:1,fontSize:"12px",lineHeight:"1.35",fontWeight:"600",color:m.cancelled?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.9)",textDecoration:m.cancelled?"line-through":"none"}}>
          {m.title}
          {m.cancelled&&<span style={{marginLeft:"4px",fontSize:"8px",color:"#ff6b6b",fontWeight:"700"}}>CANC.</span>}
        </span>
        {hasAgenda&&(
          <span style={{fontSize:"10px",color:"rgba(0,160,220,0.5)",flexShrink:0,marginTop:"2px"}}>{open?"&#9650;":"&#9660;"}</span>
        )}
      </div>
      {hasAgenda&&open&&(
        <div style={{marginTop:"6px",marginLeft:"40px",paddingLeft:"10px",borderLeft:"2px solid rgba(0,150,214,0.3)",display:"flex",flexDirection:"column",gap:"4px",animation:"fadeSlideIn 0.2s ease"}}>
          {m.agenda.map(function(item,j){return(
            <span key={j} style={{fontSize:"11px",color:"rgba(255,255,255,0.7)",lineHeight:"1.5"}}>
              {item}
            </span>
          );})}
        </div>
      )}
    </div>
  );
}

// -- Chamber Card --
function ChamberCard({chamber,index}) {
  const icon=CHAMBER_ICONS[chamber.room]||"UN";
  const hasSession=chamber.meetings&&chamber.meetings.some(function(m){return !m.cancelled;});
  const isSC=chamber.room==="Security Council";
  return (
    <div style={{background:hasSession?"rgba(0,150,214,0.08)":"rgba(255,255,255,0.02)",border:hasSession?"1px solid rgba(0,150,214,0.25)":"1px solid rgba(255,255,255,0.06)",borderRadius:"10px",padding:"14px 16px",animation:"fadeSlideIn 0.4s ease both",animationDelay:(index*0.08)+"s"}}>
      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:hasSession?"10px":"0"}}>
        <span style={{fontSize:"9px",fontWeight:"800",color:hasSession?"#00A0DC":"rgba(255,255,255,0.3)",background:hasSession?"rgba(0,150,214,0.15)":"rgba(255,255,255,0.06)",borderRadius:"5px",padding:"2px 5px",letterSpacing:"0.5px",flexShrink:0}}>{icon}</span>
        <span style={{flex:1,fontSize:"10px",fontWeight:"700",color:hasSession?"#00A0DC":"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.6px",lineHeight:"1.3"}}>{chamber.room}</span>
        {isSC&&hasSession&&(
          <a href="https://press.un.org/en/security-council" target="_blank" rel="noopener noreferrer" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(0,150,214,0.3)",color:"#00A0DC",borderRadius:"6px",padding:"2px 7px",fontSize:"9px",fontWeight:"700",letterSpacing:"0.5px",flexShrink:0,textDecoration:"none"}}>PRESS &#8599;</a>
        )}
      </div>
      {hasSession?(
        <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          {(chamber.meetings||[]).map(function(m,i){return <MeetingRow key={i} m={m}/>;} )}
        </div>
      ):(
        <p style={{margin:0,fontSize:"11px",color:"rgba(255,255,255,0.25)",fontStyle:"italic"}}>No session today</p>
      )}
    </div>
  );
}

// -- Meetings List --
function MeetingsList({meetings,onCancel,onDelete,onUncancel}) {
  const [expanded,setExpanded]=useState(false);
  const visible=[...meetings.slice(0,5),...(expanded?meetings.slice(5):[])];
  return (
    <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:"10px",padding:"16px",animation:"fadeSlideIn 0.4s ease both",animationDelay:"0.35s"}}>
      {visible.map(function(m,i){
        const title=typeof m==="string"?m:(m.title||"");
        const isExtra=typeof m==="string"?false:!!m.isExtra;
        const extraId=typeof m==="string"?null:m.extraId;
        const cancelKey=typeof m==="string"?m:(m.cancelKey||m.title||m);
        const cancelled=typeof m==="string"?false:!!m.cancelled;
        return(
          <div key={i} style={{display:"flex",alignItems:"center",gap:"8px",paddingBottom:i<visible.length-1?"10px":"0",marginBottom:i<visible.length-1?"10px":"0",borderBottom:i<visible.length-1?"1px solid rgba(255,255,255,0.05)":"none"}}>
            <span style={{color:cancelled?"rgba(255,100,100,0.4)":"rgba(0,160,220,0.5)",fontSize:"9px",flexShrink:0}}>&#9679;</span>
            <span style={{flex:1,fontSize:"13px",lineHeight:"1.45",color:cancelled?"rgba(255,255,255,0.35)":"rgba(255,255,255,0.8)",textDecoration:cancelled?"line-through":"none"}}>
              {title}
              {isExtra&&!cancelled&&<span style={{marginLeft:"6px",fontSize:"9px",color:"#FCC30B",fontWeight:"700",verticalAlign:"middle"}}>ADDED</span>}
              {cancelled&&<span style={{marginLeft:"6px",fontSize:"9px",color:"#ff6b6b",fontWeight:"700",verticalAlign:"middle"}}>CANCELLED</span>}
            </span>
            {!cancelled?(
              <button onClick={function(e){e.stopPropagation();isExtra?onDelete(extraId):onCancel(cancelKey);}} style={{flexShrink:0,background:"rgba(220,50,50,0.15)",border:"1px solid rgba(220,50,50,0.35)",color:"#ff8080",borderRadius:"6px",width:"24px",height:"24px",fontSize:"13px",fontWeight:"700",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,fontFamily:"inherit",padding:0}}>&#x2715;</button>
            ):!isExtra&&(
              <button onClick={function(e){e.stopPropagation();onUncancel(cancelKey);}} style={{flexShrink:0,background:"rgba(76,159,56,0.15)",border:"1px solid rgba(76,159,56,0.35)",color:"#56C02B",borderRadius:"6px",width:"24px",height:"24px",fontSize:"13px",fontWeight:"700",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,fontFamily:"inherit",padding:0}}>&#8617;</button>
            )}
          </div>
        );
      })}
      {meetings.length>5&&(
        <button onClick={function(){setExpanded(function(e){return !e;});}} style={{background:"transparent",border:"none",color:"#00A0DC",fontSize:"12px",fontWeight:"600",cursor:"pointer",padding:"8px 0 0",fontFamily:"'DM Sans',sans-serif"}}>
          {expanded?"Show less":"Show "+(meetings.length-5)+" more meetings"}
        </button>
      )}
    </div>
  );
}

// -- Main App --
export default function App() {
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState(null);
  const [dateLabel,setDateLabel]=useState("");
  const [journalSource,setJournalSource]=useState("live");
  const [dots,setDots]=useState(".");
  const [loadingMsg,setLoadingMsg]=useState("Fetching UN Journal");
  const fetchedRef=useRef(false);
  const [showAddForm,setShowAddForm]=useState(false);
  const [extraMeetings,setExtraMeetings]=useState([]);
  const [deletedExtraIds,setDeletedExtraIds]=useState([]);
  const [cancelledTitles,setCancelledTitles]=useState([]);
  const [formOrgType,setFormOrgType]=useState("mission");
  const [formOrgName,setFormOrgName]=useState("");
  const [formTitle,setFormTitle]=useState("");
  const [formRoom,setFormRoom]=useState("Trusteeship Council Chamber");
  const [formTimeStart,setFormTimeStart]=useState("15:00");
  const [formTimeEnd,setFormTimeEnd]=useState("");
  const [formClosed,setFormClosed]=useState(false);
  const [formNote,setFormNote]=useState("");
  const [formSaving,setFormSaving]=useState(false);
  const [formErr,setFormErr]=useState("");

  const todayObservance=getTodayObservance();
  const weekendObservances=getWeekendObservances();
  const loadingMessages=["Fetching UN Journal","Parsing chamber schedules","Scanning all meetings","Almost ready"];

  useEffect(function(){
    setDateLabel(formatDate(new Date()));
    setCancelledTitles([]);
    setDeletedExtraIds([]);
    fetchExtraMeetings();
    fetchCancelledMeetings();
  },[]);

  useEffect(function(){
    if(!loading)return;
    let i=0;
    const msgI=setInterval(function(){i=(i+1)%loadingMessages.length;setLoadingMsg(loadingMessages[i]);},2000);
    const dotI=setInterval(function(){setDots(function(d){return d.length>=3?".":d+".";});},500);
    return function(){clearInterval(msgI);clearInterval(dotI);};
  },[loading]);

  async function fetchExtraMeetings(){
    if(!SB_URL||!SB_KEY)return;
    try{const res=await fetch(SB_URL+"/rest/v1/extra_meetings?date=eq."+todayNY()+"&order=time_start.asc",{headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});if(res.ok){const rows=await res.json();setExtraMeetings(rows||[]);}}catch(e){}
  }
  async function fetchCancelledMeetings(){
    if(!SB_URL||!SB_KEY)return;
    try{const res=await fetch(SB_URL+"/rest/v1/cancelled_meetings?date=eq."+todayNY(),{headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});if(res.ok){const rows=await res.json();setCancelledTitles((rows||[]).map(function(r){return r.meeting_title;}));}}catch(e){}
  }
  async function cancelMeeting(key){
    if(!SB_URL||!SB_KEY)return;
    setCancelledTitles(function(p){return [...p,key];});
    try{await fetch(SB_URL+"/rest/v1/cancelled_meetings",{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Prefer":"return=minimal"},body:JSON.stringify({date:todayNY(),meeting_title:key})});}
    catch(e){setCancelledTitles(function(p){return p.filter(function(t){return t!==key;});});}
  }
  async function uncancelMeeting(key){
    if(!SB_URL||!SB_KEY)return;
    setCancelledTitles(function(p){return p.filter(function(t){return t!==key;});});
    try{await fetch(SB_URL+"/rest/v1/cancelled_meetings?date=eq."+todayNY()+"&meeting_title=eq."+encodeURIComponent(key),{method:"DELETE",headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});}
    catch(e){setCancelledTitles(function(p){return [...p,key];});}
  }
  async function deleteExtraMeeting(id){
    if(!SB_URL||!SB_KEY)return;
    setDeletedExtraIds(function(p){return [...p,id];});
    try{await fetch(SB_URL+"/rest/v1/extra_meetings?id=eq."+id,{method:"DELETE",headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});}
    catch(e){setDeletedExtraIds(function(p){return p.filter(function(i2){return i2!==id;});});}
  }
  async function saveExtraMeeting(){
    if(!SB_URL||!SB_KEY){setFormErr("Supabase not configured");return;}
    if(!formOrgName.trim()||!formTitle.trim()){setFormErr("Please fill required fields");return;}
    setFormSaving(true);setFormErr("");
    try{
      const res=await fetch(SB_URL+"/rest/v1/extra_meetings",{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Prefer":"return=representation"},body:JSON.stringify({date:todayNY(),organizer_type:formOrgType,organizer_name:formOrgName.trim(),title:formTitle.trim(),room:formRoom,time_start:formTimeStart||null,time_end:formTimeEnd||null,is_closed:formClosed,note:formNote.trim()||null})});
      if(!res.ok){const t=await res.text();throw new Error(t);}
      const rows=await res.json();
      if(rows&&rows[0])setExtraMeetings(function(p){return [...p,rows[0]];});
      setShowAddForm(false);setFormOrgName("");setFormTitle("");setFormTimeStart("15:00");setFormTimeEnd("");setFormClosed(false);setFormNote("");
    }catch(e){setFormErr("Error: "+e.message);}
    setFormSaving(false);
  }

  function stripHtml(s){return (s||"").replace(/<[^>]+>/g,"").replace(/&amp;/g,"&").replace(/&nbsp;/g," ").replace(/\s+/g," ").trim();}
  function getText(f){if(!f)return "";if(typeof f==="string")return stripHtml(f);return stripHtml((f.en||f.En||Object.values(f)[0]||"").toString());}
  function fmtTime(t){if(!t)return "TBD";const m=t.toString().match(/(\d{1,2}):(\d{2})/);if(!m)return t.toString().trim();let h=parseInt(m[1]);const min=m[2];const p=h>=12?"PM":"AM";if(h>12)h-=12;if(h===0)h=12;return h+":"+min+" "+p;}
  function getRoom(item){if(Array.isArray(item.rooms)&&item.rooms[0])return item.rooms[0].value||"";return getText(item.room)||getText(item.location)||"";}

  function parseJournalData(jdata){
    const allMeetings=[],chamberMap={};
    function add(ch,e){if(!chamberMap[ch])chamberMap[ch]=[];chamberMap[ch].push(e);}
    function chamberRoom(raw){const l=(raw||"").toLowerCase();for(const [k,v] of Object.entries(ROOM_TO_CHAMBER)){if(l.includes(k))return v;}return null;}
    function chamberOrgan(name){const l=(name||"").toLowerCase();for(const [k,v] of Object.entries(ORGAN_TO_CHAMBER)){if(l.includes(k))return v;}return null;}

    function processSubsidiary(groups){
      if(!Array.isArray(groups))return;
      groups.forEach(function(group){
        const organName=stripHtml(group.groupNameTitle||getText(group.name)||"");
        (group.sessions||[]).forEach(function(session){
          const sName=stripHtml(session.name||getText(session.title)||organName);
          const sNum=stripHtml(session.session||"");
          const bodyLabel=sNum?sName+", "+sNum:sName;
          const sTime=session.startTime||session.time||"";
          (session.meetings||[]).forEach(function(m){
            if(m.cancelled||m.isCancelled)return;
            const rawTitle=getText(m.meetingNumber)||getText(m.title)||getText(m.name)||getText(m.subject);
            if(!rawTitle)return;
            const fullTitle=bodyLabel?bodyLabel+" -- "+rawTitle:rawTitle;
            const time=fmtTime((m.timeFrom||m.startTime||sTime||"").toString());
            const rawRoom=getRoom(m);
            const chamber=chamberRoom(rawRoom);
            allMeetings.push({title:fullTitle,time,room:rawRoom||null});
            if(chamber)add(chamber,{time,title:fullTitle,agenda:[],id:m.id||null});
          });
        });
      });
    }

    function processOrgans(specialGroups){
      if(!Array.isArray(specialGroups))return;
      specialGroups.forEach(function(group){
        const organName=stripHtml(group.groupNameTitle||getText(group.name)||"");
        const chamber=chamberOrgan(organName);
        (group.sessions||[]).forEach(function(session){
          const sTime=session.startTime||session.time||"";
          (session.meetings||[]).forEach(function(m){
            if(m.cancelled||m.isCancelled)return;
            const rawTitle=getText(m.meetingNumber)||getText(m.title)||getText(m.name)||getText(m.subject);
            if(!rawTitle)return;
            const isClosed=!!(m.isClosed||m.closed||m.isPrivate);
            const shortTitle=rawTitle+(isClosed?" [Closed]":"");
            const time=fmtTime((m.timeFrom||m.startTime||sTime||"").toString());
            allMeetings.push({title:(organName?organName+" -- ":"")+shortTitle,time,room:getRoom(m)||null});
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
          const sName=stripHtml(session.name||getText(session.title)||organName);
          const sNum=stripHtml(session.session||"");
          const bodyLabel=sNum?sName+", "+sNum:sName;
          const sTime=session.startTime||session.time||"";
          (session.meetings||[]).forEach(function(m){
            if(m.cancelled||m.isCancelled)return;
            const rawTitle=getText(m.meetingNumber)||getText(m.title)||getText(m.name)||getText(m.subject);
            if(!rawTitle)return;
            const time=fmtTime((m.timeFrom||m.startTime||sTime||"").toString());
            allMeetings.push({title:(bodyLabel?bodyLabel+" -- ":"")+rawTitle,time,room:getRoom(m)||null});
          });
        });
      });
    }

    const om=jdata.officialMeetings||{};
    processSubsidiary(om.groups||[]);
    processOrgans(om.specialGroups||[]);
    processOther(jdata.informalMeetings||jdata.informalConsultations);
    processOther(jdata.otherMeetings);

    const chambers=["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"]
      .map(function(name){return {room:name,meetings:(chamberMap[name]||[])};});
    const seen={},titles=[];
    allMeetings.forEach(function(m){if(m.title&&m.title.length>3&&!seen[m.title]){seen[m.title]=true;titles.push(m.title);}});
    return {chambers,meetings:titles.slice(0,30)};
  }

  async function fetchLiveJournal(){
    const res=await fetch(BASE+"journal.json?t="+Date.now());
    if(!res.ok)throw new Error("journal.json not found ("+res.status+")");
    const json=await res.json();
    if(!json.meetings||json.meetings.length===0)throw new Error("journal.json has 0 meetings");
    return {chambers:json.chambers||[],meetings:json.meetings||[]};
  }

  async function fetchBriefing(){
    if(fetchedRef.current)return;
    fetchedRef.current=true;
    setLoading(true);setError(null);
    const EMPTY=[
      {room:"General Assembly Hall",meetings:[]},{room:"Security Council",meetings:[]},
      {room:"Trusteeship Council",meetings:[]},{room:"Economic and Social Council",meetings:[]},
    ];
    try{
      const liveData=await fetchLiveJournal().catch(function(e){console.warn("journal.json:",e.message);return null;});
      setData({chambers:liveData?liveData.chambers:EMPTY,meetings:liveData?liveData.meetings:[]});
      setJournalSource(liveData?"live":"offline");
    }catch(err){setError(err.message);fetchedRef.current=false;}
    finally{setLoading(false);}
  }

  function extraLabel(e){
    const org=e.organizer_type==="un_body"?e.organizer_name:e.organizer_type==="mission"?"Mission of "+e.organizer_name:e.organizer_name;
    return org+" -- "+e.title+(e.is_closed?" [Closed]":"");
  }

  return (
    <div style={{minHeight:"100dvh",background:"linear-gradient(160deg,#0a1628 0%,#0d2044 50%,#0a1a38 100%)",fontFamily:"'DM Sans','Segoe UI',sans-serif",color:"#fff",paddingBottom:"env(safe-area-inset-bottom,40px)"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        body{margin:0;overscroll-behavior-y:none;}
        input,select{outline:none;}
        input::placeholder{color:rgba(255,255,255,0.3);}
        option{background:#0d2044;}
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
              {data&&<span style={{fontSize:"9px",fontWeight:"700",padding:"2px 7px",borderRadius:"10px",background:journalSource==="live"?"rgba(76,159,56,0.2)":"rgba(255,255,255,0.08)",color:journalSource==="live"?"#56C02B":"rgba(255,255,255,0.3)",letterSpacing:"0.5px",textTransform:"uppercase"}}>{journalSource==="live"?"Live Journal":"Offline"}</span>}
            </div>
          )}
        </div>
      </div>

      {/* International Day Banner */}
      {todayObservance&&(
        <a href={todayObservance.url} target="_blank" rel="noopener noreferrer" style={{display:"block",background:"linear-gradient(90deg,rgba(0,96,214,0.35),rgba(0,150,220,0.18))",borderBottom:"1px solid rgba(0,160,220,0.25)",padding:"12px 24px",textDecoration:"none"}}>
          <div style={{maxWidth:"520px",margin:"0 auto",display:"flex",alignItems:"center",gap:"10px"}}>
            <div style={{width:"36px",height:"36px",borderRadius:"50%",background:"rgba(0,160,220,0.25)",border:"1px solid rgba(0,160,220,0.5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",flexShrink:0}}>&#127981;</div>
            <div style={{flex:1}}>
              <div style={{fontSize:"9px",letterSpacing:"1.5px",color:"#00A0DC",fontWeight:"700",textTransform:"uppercase",marginBottom:"2px"}}>Today: International Day</div>
              <div style={{fontSize:"14px",fontWeight:"700",color:"#fff",lineHeight:"1.3"}}>{todayObservance.name}</div>
            </div>
            <span style={{fontSize:"14px",color:"rgba(0,160,220,0.7)",flexShrink:0}}>&#8599;</span>
          </div>
        </a>
      )}
      {weekendObservances.map(function(obs,i){return(
        <a key={i} href={obs.url} target="_blank" rel="noopener noreferrer" style={{display:"block",background:obs.past?"rgba(255,255,255,0.02)":"linear-gradient(90deg,rgba(0,96,214,0.2),rgba(0,150,220,0.08))",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"10px 24px",textDecoration:"none",opacity:obs.past?0.65:1}}>
          <div style={{maxWidth:"520px",margin:"0 auto",display:"flex",alignItems:"center",gap:"10px"}}>
            <span style={{fontSize:"16px",flexShrink:0}}>&#127981;</span>
            <div style={{flex:1}}>
              <div style={{fontSize:"9px",letterSpacing:"1.5px",color:"rgba(255,255,255,0.4)",fontWeight:"700",textTransform:"uppercase"}}>{obs.weekday}</div>
              <div style={{fontSize:"13px",fontWeight:"600",color:"rgba(255,255,255,0.75)",lineHeight:"1.3"}}>{obs.name}</div>
            </div>
            <span style={{fontSize:"12px",color:"rgba(255,255,255,0.3)",flexShrink:0}}>&#8599;</span>
          </div>
        </a>
      );})}

      {/* Main content */}
      <div style={{maxWidth:"520px",margin:"0 auto",padding:"24px 18px 0"}}>

        {/* Start screen */}
        {!data&&!loading&&!error&&(
          <div style={{textAlign:"center",padding:"48px 24px",animation:"fadeSlideIn 0.5s ease"}}>
            <div style={{fontSize:"52px",marginBottom:"20px"}}>&#127482;&#127475;</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"22px",fontWeight:"700",margin:"0 0 10px"}}>Your daily UN briefing</h2>
            <p style={{color:"rgba(255,255,255,0.5)",fontSize:"14px",lineHeight:"1.6",marginBottom:"28px"}}>Live chamber schedule and all meetings from the UN Journal.</p>
            <button onClick={fetchBriefing} style={{background:"linear-gradient(135deg,#0096D6,#0050A0)",color:"#fff",border:"none",borderRadius:"50px",padding:"14px 36px",fontSize:"15px",fontWeight:"700",cursor:"pointer",boxShadow:"0 8px 24px rgba(0,100,200,0.4)",fontFamily:"'DM Sans',sans-serif"}}>Load Today's Schedule</button>
          </div>
        )}

        {/* Loading */}
        {loading&&(
          <div style={{textAlign:"center",padding:"60px 24px"}}>
            <div style={{width:"52px",height:"52px",border:"3px solid rgba(0,160,220,0.2)",borderTop:"3px solid #00A0DC",borderRadius:"50%",margin:"0 auto 24px",animation:"spin 0.9s linear infinite"}}/>
            <p style={{color:"rgba(255,255,255,0.65)",fontSize:"14px",fontWeight:"500",animation:"pulse 1.5s ease infinite"}}>{loadingMsg}{dots}</p>
          </div>
        )}

        {/* Error */}
        {error&&!loading&&(
          <div style={{background:"rgba(220,50,50,0.1)",border:"1px solid rgba(220,50,50,0.3)",borderRadius:"12px",padding:"20px",textAlign:"center"}}>
            <p style={{color:"#ff6b6b",margin:"0 0 16px",fontSize:"13px"}}>{error}</p>
            <button onClick={function(){fetchedRef.current=false;fetchBriefing();}} style={{background:"rgba(255,107,107,0.2)",color:"#ff6b6b",border:"1px solid rgba(255,107,107,0.4)",borderRadius:"8px",padding:"8px 20px",cursor:"pointer",fontSize:"13px",fontWeight:"600"}}>Try Again</button>
          </div>
        )}

        {/* Data */}
        {data&&!loading&&(function(){
          const visibleExtras=extraMeetings.filter(function(e){return !deletedExtraIds.includes(e.id);});

          const mergedChambers=(data.chambers||[]).map(function(chamber){
            const extras=visibleExtras
              .filter(function(e){return (ROOM_DISPLAY[e.room]||e.room)===chamber.room;})
              .map(function(e){
                const org=e.organizer_type==="un_body"?e.organizer_name:e.organizer_type==="mission"?"Mission of "+e.organizer_name:e.organizer_name;
                return {time:e.time_start?fmtTime(e.time_start):"TBD",title:org+" -- "+e.title+(e.is_closed?" [Closed]":""),agenda:[],id:e.id||null};
              });
            const journalMeetings=(chamber.meetings||[]).map(function(m){
              // cancelKey = full list title e.g. "Security Council -- 10136th meeting"
            // chamber m.title = short title e.g. "10136th meeting"
            // match if cancelKey equals or contains the chamber title
            const cancelled=cancelledTitles.some(function(ct){return ct===m.title||ct.includes(m.title);});
              return Object.assign({},m,{cancelled});
            });
            return Object.assign({},chamber,{meetings:[...journalMeetings,...extras]});
          });

          const allMeetings=[
            ...(data.meetings||[]).map(function(title){return {title,isExtra:false,extraId:null,cancelKey:title,cancelled:cancelledTitles.includes(title)};}),
            ...visibleExtras.map(function(e){return {title:extraLabel(e),isExtra:true,extraId:e.id,cancelKey:null,cancelled:false};}),
          ];

          return (
            <div>
              {/* Chambers */}
              <div style={{marginBottom:"28px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"14px"}}>
                  <span style={{fontSize:"11px",fontWeight:"700",color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"1.5px"}}>&#127963;&#65039; Council Chambers</span>
                  {journalSource==="live"&&<span style={{background:"rgba(76,159,56,0.15)",color:"#56C02B",fontSize:"9px",fontWeight:"700",padding:"2px 6px",borderRadius:"10px"}}>LIVE</span>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                  {mergedChambers.map(function(c,i){return <ChamberCard key={i} chamber={c} index={i}/>;} )}
                </div>
              </div>

              {/* All Meetings */}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <span style={{fontSize:"11px",fontWeight:"700",color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"1.5px"}}>&#128203; All Meetings Today</span>
                    {visibleExtras.length>0&&<span style={{background:"rgba(252,195,11,0.15)",color:"#FCC30B",fontSize:"9px",fontWeight:"700",padding:"2px 6px",borderRadius:"10px"}}>+{visibleExtras.length} added</span>}
                  </div>
                  <p style={{margin:"4px 0 0",fontSize:"11px",color:"rgba(255,255,255,0.25)"}}>{allMeetings.length} meetings across the UN</p>
                </div>
                <button onClick={function(){setShowAddForm(true);}} style={{background:"linear-gradient(135deg,#0096D6,#0050A0)",color:"#fff",border:"none",borderRadius:"50%",width:"36px",height:"36px",fontSize:"22px",fontWeight:"700",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(0,100,200,0.4)",lineHeight:1}}>+</button>
              </div>

              {/* Add form */}
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
                      <option>Conference Room 1</option><option>Conference Room 2</option>
                      <option>Conference Room 3</option><option>Conference Room 4</option>
                      <option>Conference Room 5</option><option>Conference Room 8</option>
                      <option>Conference Room 10</option><option>Conference Room 11</option>
                      <option>Conference Room 12</option>
                    </select>
                    <div style={{display:"flex",gap:"8px"}}>
                      <input type="time" value={formTimeStart} onChange={function(e){setFormTimeStart(e.target.value);}} style={{flex:1,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"8px",color:"#fff",padding:"8px 10px",fontSize:"13px",fontFamily:"inherit"}}/>
                      <input type="time" value={formTimeEnd} onChange={function(e){setFormTimeEnd(e.target.value);}} style={{flex:1,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"8px",color:"#fff",padding:"8px 10px",fontSize:"13px",fontFamily:"inherit"}}/>
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
              <div style={{height:"40px"}}/>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
