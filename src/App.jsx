import { useState, useEffect, useRef } from "react";

const BASE     = import.meta.env.BASE_URL || "/";
const GH_TOKEN = import.meta.env.VITE_GITHUB_TOKEN || "";
const SB_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const SDG_COLORS = {
  1:"#E5243B",2:"#DDA63A",3:"#4C9F38",4:"#C5192D",5:"#FF3A21",
  6:"#26BDE2",7:"#FCC30B",8:"#A21942",9:"#FD6925",10:"#DD1367",
  11:"#FD9D24",12:"#BF8B2E",13:"#3F7E44",14:"#0A97D9",15:"#56C02B",
  16:"#00689D",17:"#19486A",
};

// Observances loaded from Supabase
let UN_OBSERVANCES = [];

function todayNY(){const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const o={};p.forEach(function(x){o[x.type]=x.value;});return o.year+"-"+o.month+"-"+o.day;}
function mmddNY(){const p=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",month:"2-digit",day:"2-digit"}).formatToParts(new Date());const o={};p.forEach(function(x){o[x.type]=x.value;});return o.month+"-"+o.day;}
function getTodayObservance(list){
  const arr=list||UN_OBSERVANCES;
  return arr.find(function(o){return (o.month_day||o.date)===mmddNY();})||null;
}
function getWeekendObservances(list){
  const arr=list||UN_OBSERVANCES;
  const now=new Date(new Date().toLocaleString("en-US",{timeZone:"America/New_York"}));
  const dow=now.getDay();const results=[];
  const offsets=dow===5?[1,2]:dow===1?[-2,-1]:[];
  const labels=dow===5?["Saturday","Sunday"]:["Last Saturday","Last Sunday"];
  offsets.forEach(function(d,i){
    const dt=new Date(now);dt.setDate(dt.getDate()+d);
    const m=String(dt.getMonth()+1).padStart(2,"0"),day=String(dt.getDate()).padStart(2,"0");
    const obs=arr.find(function(o){return (o.month_day||o.date)===m+"-"+day;});
    if(obs)results.push(Object.assign({},obs,{weekday:labels[i],past:dow===1}));
  });
  return results;
}
function formatDate(d){return d.toLocaleDateString("en-US",{timeZone:"America/New_York",weekday:"long",year:"numeric",month:"long",day:"numeric"});}

const CHAMBER_ICONS={"General Assembly Hall":"GA","Security Council":"SC","Trusteeship Council":"TC","Economic and Social Council":"ECOSOC"};
const ROOM_TO_CHAMBER={"general assembly hall":"General Assembly Hall","security council chamber":"Security Council","security council consultations room":"Security Council","trusteeship council chamber":"Trusteeship Council","economic and social council chamber":"Economic and Social Council"};
const ORGAN_TO_CHAMBER={"general assembly":"General Assembly Hall","security council":"Security Council","trusteeship council":"Trusteeship Council","economic and social council":"Economic and Social Council"};
const ROOM_DISPLAY={"General Assembly Hall":"General Assembly Hall","Security Council Chamber":"Security Council","Trusteeship Council Chamber":"Trusteeship Council","Economic and Social Council Chamber":"Economic and Social Council"};

// -- Meeting Row --
function MeetingRow({m,onCancel,onAdjourn,onUnadjourn,onDelete,adjournedTitles,meetingNotes,chamberName}) {
  const [agendaOpen,setAgendaOpen]=useState(false);
  const [showActions,setShowActions]=useState(false);
  const [titleExpanded,setTitleExpanded]=useState(false);
  const adjourned=(adjournedTitles||[]).some(function(at){return at===m.title||m.title.includes(at)||at.includes(m.title);});
  const hasAgenda=m.agenda&&m.agenda.length>0;
  const cancelKey=m.title;
  return (
    <div style={{opacity:adjourned?0.6:1}}>
      <div style={{display:"flex",gap:"6px",alignItems:"flex-start"}}>
        <span style={{fontSize:"10px",color:adjourned?"rgba(255,200,0,0.5)":"#FCC30B",fontWeight:"700",whiteSpace:"nowrap",marginTop:"3px",flexShrink:0}}>{m.time}</span>
        <div
          onClick={hasAgenda?function(){setAgendaOpen(function(o){return !o;});}:undefined}
          style={{flex:1,cursor:hasAgenda?"pointer":"default",padding:"1px 0"}}
        >
          <span style={{
            fontSize:"12px",lineHeight:"1.35",fontWeight:"600",
            color:adjourned?"rgba(255,255,255,0.35)":"rgba(255,255,255,0.9)",
            textDecoration:adjourned?"line-through":"none",
            display:"-webkit-box",WebkitLineClamp:titleExpanded?100:3,
            WebkitBoxOrient:"vertical",overflow:"hidden",
          }}>{m.title}</span>
          {m.title.length>80&&(
            <button onClick={function(e){e.stopPropagation();setTitleExpanded(function(x){return !x;});}} style={{background:"none",border:"none",color:"rgba(0,160,220,0.5)",fontSize:"10px",cursor:"pointer",padding:"1px 0",fontFamily:"inherit",display:"block"}}>
              {titleExpanded?"Show less":"...more"}
            </button>
          )}
          {adjourned&&<span style={{fontSize:"8px",color:"rgba(255,200,0,0.7)",fontWeight:"700"}}>ADJOURNED</span>}
          {hasAgenda&&!adjourned&&!titleExpanded&&<span style={{marginLeft:"5px",fontSize:"9px",color:"rgba(0,160,220,0.45)"}}>{agendaOpen?"&#9650;":"&#9660;"}</span>}
          {(function(){
            if(adjourned)return null;
            // For extra meetings: use extra_notes field directly
            if(m.isExtra){
              return m.extra_notes
                ?<div style={{fontSize:"10px",color:"rgba(255,220,100,0.75)",marginTop:"3px",lineHeight:"1.4",fontStyle:"italic"}}>&#128203; {m.extra_notes}</div>
                :null;
            }
            // For journal meetings: look up in meetingNotes by title (exact or partial)
            if(!meetingNotes)return null;
            const note=meetingNotes[m.title]||Object.entries(meetingNotes).reduce(function(found,entry){
              if(found)return found;
              const key=entry[0],val=entry[1];
              if(key.includes(m.title)||m.title.includes(key))return val;
              return null;
            },null);
            return note?<div style={{fontSize:"10px",color:"rgba(255,220,100,0.75)",marginTop:"3px",lineHeight:"1.4",fontStyle:"italic"}}>&#128203; {note}</div>:null;
          })()}
        </div>
        {!adjourned?(
          <button onClick={function(e){e.stopPropagation();setShowActions(function(s){return !s;});}} style={{flexShrink:0,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.3)",borderRadius:"5px",width:"20px",height:"20px",fontSize:"12px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,lineHeight:1}}>&#8942;</button>
        ):(
          <button onClick={function(){onUnadjourn&&onUnadjourn(cancelKey,chamberName);}} title="Restore" style={{flexShrink:0,background:"rgba(255,200,0,0.1)",border:"1px solid rgba(255,200,0,0.3)",color:"rgba(255,200,0,0.7)",borderRadius:"5px",width:"20px",height:"20px",fontSize:"10px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0,lineHeight:1}}>&#8617;</button>
        )}
      </div>
      {hasAgenda&&agendaOpen&&(
        <div style={{marginTop:"6px",marginLeft:"46px",paddingLeft:"10px",borderLeft:"2px solid rgba(0,150,214,0.3)",display:"flex",flexDirection:"column",gap:"4px",animation:"fadeSlideIn 0.2s ease"}}>
          {m.agenda.map(function(item,j){return(<span key={j} style={{fontSize:"11px",color:"rgba(255,255,255,0.75)",lineHeight:"1.5"}}>{item}</span>);})}
        </div>
      )}
      {showActions&&!adjourned&&(
        <div style={{marginTop:"6px",marginLeft:"46px",display:"flex",gap:"6px",flexWrap:"wrap",animation:"fadeSlideIn 0.15s ease"}}>
          <button onClick={function(){onAdjourn&&onAdjourn(cancelKey,chamberName);setShowActions(false);}} style={{background:"rgba(252,195,11,0.12)",border:"1px solid rgba(252,195,11,0.3)",color:"#FCC30B",borderRadius:"6px",padding:"4px 10px",fontSize:"10px",fontWeight:"700",cursor:"pointer",fontFamily:"inherit"}}>&#10003; Adjourned</button>
          {m.isExtra?(
            <button onClick={function(){onDelete&&onDelete(m.extraId);setShowActions(false);}} style={{background:"rgba(220,50,50,0.12)",border:"1px solid rgba(220,50,50,0.3)",color:"#ff8080",borderRadius:"6px",padding:"4px 10px",fontSize:"10px",fontWeight:"700",cursor:"pointer",fontFamily:"inherit"}}>&#x2715; Remove</button>
          ):(
            <button onClick={function(){onCancel&&onCancel(cancelKey);setShowActions(false);}} style={{background:"rgba(220,50,50,0.12)",border:"1px solid rgba(220,50,50,0.3)",color:"#ff8080",borderRadius:"6px",padding:"4px 10px",fontSize:"10px",fontWeight:"700",cursor:"pointer",fontFamily:"inherit"}}>&#x2715; Cancel</button>
          )}
          <button onClick={function(){setShowActions(false);}} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"rgba(255,255,255,0.4)",borderRadius:"6px",padding:"4px 10px",fontSize:"10px",cursor:"pointer",fontFamily:"inherit"}}>Close</button>
        </div>
      )}
    </div>
  );
}

// -- Chamber Card --
function ChamberCard({chamber,index,onCancel,onAdjourn,onUnadjourn,onDelete,adjournedTitles,cancelledTitles,override,onCycleStatus,chamberStatus,adjournedTitlesForStatus,meetingNotes}) {
  const icon=CHAMBER_ICONS[chamber.room]||"UN";
  const hasSession=chamber.meetings&&chamber.meetings.some(function(m){return !m.cancelled;});
  const isSC=chamber.room==="Security Council";
  return (
    <div style={{background:hasSession?"rgba(0,150,214,0.08)":"rgba(255,255,255,0.02)",border:hasSession?"1px solid rgba(0,150,214,0.25)":"1px solid rgba(255,255,255,0.06)",borderRadius:"10px",overflow:"hidden",animation:"fadeSlideIn 0.4s ease both",animationDelay:(index*0.08)+"s"}}>
      {/* Status bar - full width at top */}
      {(function(){
        const st=chamberStatus?chamberStatus(chamber,override,adjournedTitlesForStatus):"OPEN";
        const stColors={"OPEN":["rgba(76,159,56,0.25)","#56C02B","rgba(76,159,56,0.08)"],"CLOSED":["rgba(220,50,50,0.3)","#ff6b6b","rgba(220,50,50,0.08)"],"WT":["rgba(252,195,11,0.3)","#FCC30B","rgba(252,195,11,0.06)"],"WT 4th":["rgba(252,195,11,0.3)","#FCC30B","rgba(252,195,11,0.06)"],"WT 3rd":["rgba(252,120,0,0.3)","#FF8C00","rgba(252,120,0,0.06)"]};
        const [border,color,bg]=stColors[st]||stColors["OPEN"];
        return (
          <div
            onClick={function(){onCycleStatus&&onCycleStatus(chamber.room,st);}}
            style={{background:bg,borderBottom:"1px solid "+border,padding:"5px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",cursor:"pointer",userSelect:"none"}}
          >
            <span style={{fontSize:"9px",fontWeight:"800",color:color,letterSpacing:"1px",textTransform:"uppercase"}}>{st}</span>
            <span style={{fontSize:"9px",color:"rgba(255,255,255,0.25)"}}>tap to change</span>
          </div>
        );
      })()}
      <div style={{padding:"12px 14px"}}>
      <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:hasSession?"10px":"0"}}>
        <span style={{fontSize:"9px",fontWeight:"800",color:hasSession?"#00A0DC":"rgba(255,255,255,0.3)",background:hasSession?"rgba(0,150,214,0.15)":"rgba(255,255,255,0.06)",borderRadius:"5px",padding:"2px 5px",letterSpacing:"0.5px",flexShrink:0}}>{icon}</span>
        <span style={{flex:1,fontSize:"10px",fontWeight:"700",color:hasSession?"#00A0DC":"rgba(255,255,255,0.3)",textTransform:"uppercase",letterSpacing:"0.6px",lineHeight:"1.3"}}>{chamber.room}</span>
        {isSC&&hasSession&&(
          <a href="https://press.un.org/en/security-council" target="_blank" rel="noopener noreferrer" style={{background:"rgba(255,255,255,0.06)",border:"1px solid rgba(0,150,214,0.3)",color:"#00A0DC",borderRadius:"6px",padding:"2px 7px",fontSize:"9px",fontWeight:"700",letterSpacing:"0.5px",flexShrink:0,textDecoration:"none"}}>PRESS &#8599;</a>
        )}
      </div>
      {hasSession?(
        <div style={{display:"flex",flexDirection:"column",gap:"10px"}}>
          {(chamber.meetings||[]).map(function(m,i){return <MeetingRow key={i} m={m} onCancel={onCancel} onAdjourn={onAdjourn} onUnadjourn={onUnadjourn} onDelete={onDelete} adjournedTitles={adjournedTitles} meetingNotes={meetingNotes} chamberName={chamber.room}/>;} )}
        </div>
      ):(
        <p style={{margin:0,fontSize:"11px",color:"rgba(255,255,255,0.25)",fontStyle:"italic"}}>No session today</p>
      )}
      </div>
    </div>
  );
}

// -- Inline Note Editor --
function NoteEditor({title,initialNote,onSave,onClose}) {
  const [text,setText]=useState(initialNote||"");
  return (
    <div style={{background:"rgba(0,60,120,0.2)",border:"1px solid rgba(0,150,214,0.25)",borderRadius:"8px",padding:"10px",marginTop:"4px",animation:"fadeSlideIn 0.15s ease"}}>
      <textarea
        value={text}
        onChange={function(e){setText(e.target.value);}}
        placeholder="Add note: subject, context, special guest..."
        autoFocus
        rows={2}
        style={{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"6px",color:"#fff",padding:"7px 9px",fontSize:"12px",fontFamily:"inherit",resize:"vertical",display:"block"}}
      />
      <div style={{display:"flex",gap:"6px",marginTop:"7px"}}>
        <button onClick={function(){onSave(title,text);}} style={{flex:1,background:"linear-gradient(135deg,#0096D6,#0050A0)",color:"#fff",border:"none",borderRadius:"6px",padding:"6px",fontSize:"12px",fontWeight:"700",cursor:"pointer",fontFamily:"inherit"}}>Save</button>
        {initialNote&&<button onClick={function(){onSave(title,"");}} style={{background:"rgba(220,50,50,0.15)",color:"#ff8080",border:"1px solid rgba(220,50,50,0.3)",borderRadius:"6px",padding:"6px 10px",fontSize:"12px",cursor:"pointer",fontFamily:"inherit"}}>Clear</button>}
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.07)",color:"rgba(255,255,255,0.5)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"6px",padding:"6px 10px",fontSize:"12px",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
      </div>
    </div>
  );
}

// -- Edit Meeting Form --
function EditMeetingForm({meeting,onSave,onClose}) {
  const [title,setTitle]=useState(meeting.rawTitle||meeting.title||"");
  const [notes,setNotes]=useState(meeting.extra_notes||meeting.note||"");
  const [timeStart,setTimeStart]=useState(meeting.time_start||"");
  const [timeEnd,setTimeEnd]=useState(meeting.time_end||"");
  const [isClosed,setIsClosed]=useState(!!meeting.is_closed);
  const [saving,setSaving]=useState(false);
  return (
    <div style={{background:"rgba(0,80,160,0.15)",border:"1px solid rgba(0,150,214,0.3)",borderRadius:"10px",padding:"14px",marginBottom:"8px",animation:"fadeSlideIn 0.2s ease"}}>
      <div style={{fontSize:"11px",fontWeight:"700",color:"#00A0DC",marginBottom:"10px",textTransform:"uppercase",letterSpacing:"1px"}}>Edit Meeting</div>
      <div style={{display:"flex",flexDirection:"column",gap:"7px"}}>
        <input value={title} onChange={function(e){setTitle(e.target.value);}} placeholder="Meeting title" style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"7px",color:"#fff",padding:"7px 10px",fontSize:"13px",fontFamily:"inherit"}}/>
        <textarea value={notes} onChange={function(e){setNotes(e.target.value);}} placeholder="Notes: subject, special guest, context..." rows={3} style={{background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"7px",color:"#fff",padding:"7px 10px",fontSize:"13px",fontFamily:"inherit",resize:"vertical"}}/>
        <div style={{display:"flex",gap:"8px"}}>
          <input type="time" value={timeStart} onChange={function(e){setTimeStart(e.target.value);}} style={{flex:1,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"7px",color:"#fff",padding:"7px 10px",fontSize:"13px",fontFamily:"inherit"}}/>
          <input type="time" value={timeEnd} onChange={function(e){setTimeEnd(e.target.value);}} style={{flex:1,background:"rgba(255,255,255,0.08)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"7px",color:"#fff",padding:"7px 10px",fontSize:"13px",fontFamily:"inherit"}}/>
        </div>
        <label style={{display:"flex",alignItems:"center",gap:"8px",fontSize:"12px",color:"rgba(255,255,255,0.7)",cursor:"pointer"}}>
          <input type="checkbox" checked={isClosed} onChange={function(e){setIsClosed(e.target.checked);}} style={{width:"15px",height:"15px"}}/>Closed meeting
        </label>
        <div style={{display:"flex",gap:"8px",marginTop:"4px"}}>
          <button
            onClick={async function(){setSaving(true);await onSave(meeting.extraId||meeting.id,{title:title.trim(),extra_notes:notes.trim(),time_start:timeStart||null,time_end:timeEnd||null,is_closed:isClosed});setSaving(false);}}
            disabled={saving}
            style={{flex:1,background:"linear-gradient(135deg,#0096D6,#0050A0)",color:"#fff",border:"none",borderRadius:"7px",padding:"9px",fontSize:"13px",fontWeight:"700",cursor:saving?"not-allowed":"pointer",fontFamily:"inherit"}}
          >{saving?"Saving...":"Save"}</button>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",color:"rgba(255,255,255,0.6)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:"7px",padding:"9px 14px",fontSize:"13px",cursor:"pointer",fontFamily:"inherit"}}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// -- Meetings List --
function MeetingsList({meetings,onCancel,onDelete,onUncancel,onEdit,editingId,onSaveEdit,onCloseEdit,meetingNotes,editingNote,onEditNote,onSaveNote,onCloseNote}) {
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
        const notes=typeof m==="string"?"":(m.extra_notes||m.note||"");
        const isEditing=isExtra&&editingId===extraId;
        return(
          <div key={i}>
            {isEditing&&(
              <EditMeetingForm meeting={m} onSave={onSaveEdit} onClose={onCloseEdit}/>
            )}
            <div style={{display:"flex",alignItems:"flex-start",gap:"8px",paddingBottom:i<visible.length-1?"10px":"0",marginBottom:i<visible.length-1?"10px":"0",borderBottom:i<visible.length-1&&!isEditing?"1px solid rgba(255,255,255,0.05)":"none"}}>
              <span style={{color:cancelled?"rgba(255,100,100,0.4)":"rgba(0,160,220,0.5)",fontSize:"9px",flexShrink:0,marginTop:"4px"}}>&#9679;</span>
              <div style={{flex:1}}>
                <span style={{fontSize:"13px",lineHeight:"1.45",color:cancelled?"rgba(255,255,255,0.35)":"rgba(255,255,255,0.8)",textDecoration:cancelled?"line-through":"none"}}>
                  {title}
                  {isExtra&&!cancelled&&<span style={{marginLeft:"6px",fontSize:"9px",color:"#FCC30B",fontWeight:"700",verticalAlign:"middle"}}>ADDED</span>}
                  {cancelled&&<span style={{marginLeft:"6px",fontSize:"9px",color:"#ff6b6b",fontWeight:"700",verticalAlign:"middle"}}>CANCELLED</span>}
                </span>
                {notes&&!cancelled&&<div style={{fontSize:"11px",color:"rgba(255,255,255,0.45)",marginTop:"2px",lineHeight:"1.4",fontStyle:"italic"}}>{notes}</div>}
                {!isExtra&&!cancelled&&meetingNotes&&meetingNotes[cancelKey]&&(
                  <div style={{fontSize:"11px",color:"rgba(255,220,100,0.8)",marginTop:"3px",lineHeight:"1.4",fontStyle:"italic"}}>&#128203; {meetingNotes[cancelKey]}</div>
                )}
                {editingNote===cancelKey&&!isExtra&&(
                  <NoteEditor title={cancelKey} initialNote={meetingNotes&&meetingNotes[cancelKey]} onSave={onSaveNote} onClose={onCloseNote}/>
                )}
              </div>
              <div style={{display:"flex",gap:"4px",flexShrink:0}}>
                {!cancelled&&(
                  <button onClick={function(e){e.stopPropagation();isExtra?onEdit(m):onEditNote(cancelKey);}} style={{background:"rgba(0,150,214,0.12)",border:"1px solid rgba(0,150,214,0.25)",color:"#00A0DC",borderRadius:"6px",width:"24px",height:"24px",fontSize:"12px",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",padding:0}}>&#9998;</button>
                )}
                {!cancelled?(
                  <button onClick={function(e){e.stopPropagation();isExtra?onDelete(extraId):onCancel(cancelKey);}} style={{flexShrink:0,background:"rgba(220,50,50,0.15)",border:"1px solid rgba(220,50,50,0.35)",color:"#ff8080",borderRadius:"6px",width:"24px",height:"24px",fontSize:"13px",fontWeight:"700",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,fontFamily:"inherit",padding:0}}>&#x2715;</button>
                ):!isExtra&&(
                  <button onClick={function(e){e.stopPropagation();onUncancel(cancelKey);}} style={{flexShrink:0,background:"rgba(76,159,56,0.15)",border:"1px solid rgba(76,159,56,0.35)",color:"#56C02B",borderRadius:"6px",width:"24px",height:"24px",fontSize:"13px",fontWeight:"700",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1,fontFamily:"inherit",padding:0}}>&#8617;</button>
                )}
              </div>
            </div>
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
  const [adjournedTitles,setAdjournedTitles]=useState([]);
  const [chamberOverrides,setChamberOverrides]=useState({});
  const [editingMeeting,setEditingMeeting]=useState(null);
  const [observances,setObservances]=useState([]);
  const [triggering,setTriggering]=useState(false);
  const [triggerMsg,setTriggerMsg]=useState("");
  const [meetingNotes,setMeetingNotes]=useState({});
  const [editingNote,setEditingNote]=useState(null);
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

  const todayObservance=getTodayObservance(observances);
  const weekendObservances=getWeekendObservances(observances);
  const loadingMessages=["Fetching UN Journal","Parsing chamber schedules","Scanning all meetings","Almost ready"];

  useEffect(function(){
    setDateLabel(formatDate(new Date()));
    setCancelledTitles([]);
    setAdjournedTitles([]);
    setDeletedExtraIds([]);
    fetchExtraMeetings();
    fetchCancelledMeetings();
    fetchAdjournedMeetings();
    fetchObservances();
    fetchChamberStatuses();
    fetchMeetingNotes();
  },[]);

  useEffect(function(){
    if(!loading)return;
    let i=0;
    const msgI=setInterval(function(){i=(i+1)%loadingMessages.length;setLoadingMsg(loadingMessages[i]);},2000);
    const dotI=setInterval(function(){setDots(function(d){return d.length>=3?".":d+".";});},500);
    return function(){clearInterval(msgI);clearInterval(dotI);};
  },[loading]);

  // Poll shared state every 30s so all guides stay in sync
  useEffect(function(){
    const interval=setInterval(function(){
      fetchCancelledMeetings();
      fetchAdjournedMeetings();
      fetchMeetingNotes();
      fetchExtraMeetings();
      fetchChamberStatuses(); // chamber statuses last so local changes have time to save
    },30000);
    return function(){clearInterval(interval);};
  },[]);

  async function fetchExtraMeetings(){if(!SB_URL||!SB_KEY)return;try{const res=await fetch(SB_URL+"/rest/v1/extra_meetings?date=eq."+todayNY()+"&order=time_start.asc",{headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});if(res.ok){const rows=await res.json();setExtraMeetings(rows||[]);}}catch(e){}}
  async function fetchCancelledMeetings(){if(!SB_URL||!SB_KEY)return;try{const res=await fetch(SB_URL+"/rest/v1/cancelled_meetings?date=eq."+todayNY(),{headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});if(res.ok){const rows=await res.json();setCancelledTitles((rows||[]).map(function(r){return r.meeting_title;}));}}catch(e){}}
  async function fetchAdjournedMeetings(){if(!SB_URL||!SB_KEY)return;try{const res=await fetch(SB_URL+"/rest/v1/adjourned_meetings?date=eq."+todayNY(),{headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});if(res.ok){const rows=await res.json();setAdjournedTitles((rows||[]).map(function(r){return r.meeting_title;}));}}catch(e){}}

  async function fetchChamberStatuses(){
    if(!SB_URL||!SB_KEY)return;
    try{
      const res=await fetch(SB_URL+"/rest/v1/chamber_status?date=eq."+todayNY(),{headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});
      if(res.ok){
        const rows=await res.json();
        // Build map from DB - only update what DB knows about
        // If DB is empty for a chamber, remove local override (it was intentionally cleared)
        const fromDB={};
        (rows||[]).forEach(function(r){fromDB[r.chamber]=r.status;});
        setChamberOverrides(fromDB); // DB is source of truth
      }
    }catch(e){
      // On fetch error, keep existing local state - don't clear it
      console.warn("fetchChamberStatuses failed, keeping local state");
    }
  }
  async function saveChamberStatus(chamber,statusVal){
    if(!SB_URL||!SB_KEY){console.warn("Supabase not configured");return;}
    try{
      if(!statusVal){
        const r=await fetch(SB_URL+"/rest/v1/chamber_status?date=eq."+todayNY()+"&chamber=eq."+encodeURIComponent(chamber),{method:"DELETE",headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});
        if(!r.ok){const t=await r.text();console.warn("DELETE chamber_status failed:",r.status,t);}
      } else {
        const r=await fetch(SB_URL+"/rest/v1/chamber_status?on_conflict=date,chamber",{
          method:"POST",
          headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Prefer":"resolution=merge-duplicates,return=minimal"},
          body:JSON.stringify({date:todayNY(),chamber:chamber,status:statusVal})
        });
        if(!r.ok){const t=await r.text();console.warn("UPSERT chamber_status failed:",r.status,t,{chamber,statusVal});}
        else{console.log("Chamber status saved:",chamber,"->",statusVal);}
      }
    }catch(e){console.warn("saveChamberStatus error:",e.message);}
  }
  async function cycleChamberStatus(chamber,currentStatus){
    const isGA=chamber==="General Assembly Hall";
    let next=null;
    if(isGA){
      // GA cycle: OPEN -> CLOSED -> WT 4th -> WT 3rd -> auto
      if(currentStatus==="OPEN")next="closed";
      else if(currentStatus==="CLOSED")next="wt_4th";
      else if(currentStatus==="WT 4th")next="wt_3rd";
      else next=null; // WT 3rd -> remove override
    } else {
      // Other chambers: OPEN -> CLOSED -> WT -> auto
      if(currentStatus==="OPEN")next="closed";
      else if(currentStatus==="CLOSED")next="wt";
      else next=null; // WT -> remove override
    }
    // Update local state
    setChamberOverrides(function(prev){
      const upd=Object.assign({},prev);
      if(next)upd[chamber]=next; else delete upd[chamber];
      return upd;
    });
    await saveChamberStatus(chamber,next);
  }
  async function triggerFetchWorkflow(){
    if(!GH_TOKEN){setTriggerMsg("No GitHub token configured");setTimeout(function(){setTriggerMsg("");},3000);return;}
    setTriggering(true);
    setTriggerMsg("Triggering fetch...");
    try{
      const res=await fetch("https://api.github.com/repos/cedricsx-web/un-daily-briefing/actions/workflows/fetch-journal.yml/dispatches",{
        method:"POST",
        headers:{"Accept":"application/vnd.github+json","Authorization":"Bearer "+GH_TOKEN,"X-GitHub-Api-Version":"2022-11-28","Content-Type":"application/json"},
        body:JSON.stringify({ref:"main"}),
      });
      if(res.status===204){
        setTriggerMsg("Fetching... checking for updates");
        // Poll for fresh data every 30s for up to 4 minutes
        let attempts=0;
        const poll=setInterval(async function(){
          attempts++;
          setTriggerMsg("Checking for updates... ("+(attempts*30)+"s)");
          try{
            const RAW="https://raw.githubusercontent.com/cedricsx-web/un-daily-briefing/main/public/journal.json";
            const jr=await fetch(RAW+"?t="+Date.now());
            if(jr.ok){
              const jd=await jr.json();
              if(jd.date===todayNY()&&jd.meetings&&jd.meetings.length>0){
                clearInterval(poll);
                setTriggerMsg("Updated! Reloading...");
                setData({chambers:jd.chambers||[],meetings:jd.meetings||[],date:jd.date,fetched_at:jd.fetched_at});
                setJournalSource("live");
                setTimeout(function(){setTriggerMsg("");},3000);
              }
            }
          }catch(e){}
          if(attempts>=8){clearInterval(poll);setTriggerMsg("Done - tap Load if data not updated yet");setTimeout(function(){setTriggerMsg("");},5000);}
        },30000);
      } else {
        const err=await res.json().catch(function(){return {};});
        setTriggerMsg("Error: "+(err.message||res.status));
        setTimeout(function(){setTriggerMsg("");},5000);
      }
    }catch(e){setTriggerMsg("Error: "+e.message);setTimeout(function(){setTriggerMsg("");},5000);}
    setTriggering(false);
  }
  async function fetchObservances(){
    if(!SB_URL||!SB_KEY)return;
    try{
      const res=await fetch(SB_URL+"/rest/v1/observances?select=month_day,name,url&order=month_day.asc",{
        headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}
      });
      if(res.ok){
        const rows=await res.json();
        if(rows&&rows.length>0)setObservances(rows);
      }
    }catch(e){console.warn("fetchObservances failed:",e.message);}
  }
  async function fetchMeetingNotes(){
    if(!SB_URL||!SB_KEY)return;
    try{
      const res=await fetch(SB_URL+"/rest/v1/meeting_notes?date=eq."+todayNY(),{headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});
      if(res.ok){
        const rows=await res.json();
        const map={};
        (rows||[]).forEach(function(r){map[r.meeting_title]=r.note;});
        setMeetingNotes(map);
      }
    }catch(e){}
  }
  async function saveMeetingNote(title,note){
    const trimmed=note.trim();
    // Optimistic update
    setMeetingNotes(function(p){
      const next=Object.assign({},p);
      if(trimmed)next[title]=trimmed; else delete next[title];
      return next;
    });
    setEditingNote(null);
    if(!SB_URL||!SB_KEY)return;
    if(!trimmed){
      try{await fetch(SB_URL+"/rest/v1/meeting_notes?date=eq."+todayNY()+"&meeting_title=eq."+encodeURIComponent(title),{method:"DELETE",headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});}catch(e){}
    } else {
      try{
        const r=await fetch(SB_URL+"/rest/v1/meeting_notes?on_conflict=date,meeting_title",{
          method:"POST",
          headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Prefer":"resolution=merge-duplicates,return=minimal"},
          body:JSON.stringify({date:todayNY(),meeting_title:title,note:trimmed})
        });
        if(!r.ok){const t=await r.text();console.warn("saveMeetingNote failed:",r.status,t);}
        else{console.log("Note saved for:",title);}
      }catch(e){console.warn("saveMeetingNote error:",e.message);}
    }
  }
  async function updateExtraMeeting(id,updates){
    if(!SB_URL||!SB_KEY)return;
    setExtraMeetings(function(p){return p.map(function(e){return e.id===id?Object.assign({},e,updates):e;});});
    try{
      await fetch(SB_URL+"/rest/v1/extra_meetings?id=eq."+id,{method:"PATCH",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Prefer":"return=minimal"},body:JSON.stringify(updates)});
    }catch(e){}
    setEditingMeeting(null);
  }
  async function adjournMeeting(key,chamber){
    setAdjournedTitles(function(p){return [...p,key];});
    // Also set chamber to OPEN so it persists across reloads
    if(chamber){
      setChamberOverrides(function(prev){return Object.assign({},prev,{[chamber]:"open"});});
    }
    if(!SB_URL||!SB_KEY)return;
    try{
      const r=await fetch(SB_URL+"/rest/v1/adjourned_meetings?on_conflict=date,meeting_title",{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Prefer":"resolution=merge-duplicates,return=minimal"},body:JSON.stringify({date:todayNY(),meeting_title:key})});
      if(!r.ok){const t=await r.text();console.warn("adjourn insert failed:",r.status,t);}
      else{console.log("Meeting adjourned:",key);}
      if(chamber){await saveChamberStatus(chamber,"open");}
    }catch(e){console.warn("adjournMeeting error:",e.message);}
  }
  async function unadjournMeeting(key,chamber){
    setAdjournedTitles(function(p){return p.filter(function(t){return t!==key;});});
    if(!SB_URL||!SB_KEY)return;
    try{await fetch(SB_URL+"/rest/v1/adjourned_meetings?date=eq."+todayNY()+"&meeting_title=eq."+encodeURIComponent(key),{method:"DELETE",headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});}catch(e){}
  }
  async function cancelMeeting(key){
    setCancelledTitles(function(p){return [...p,key];});
    if(!SB_URL||!SB_KEY)return;
    try{await fetch(SB_URL+"/rest/v1/cancelled_meetings",{method:"POST",headers:{"Content-Type":"application/json","apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY,"Prefer":"return=minimal"},body:JSON.stringify({date:todayNY(),meeting_title:key})});}
    catch(e){setCancelledTitles(function(p){return p.filter(function(t){return t!==key;});});}
  }
  async function uncancelMeeting(key){
    setCancelledTitles(function(p){return p.filter(function(t){return t!==key;});});
    if(!SB_URL||!SB_KEY)return;
    try{await fetch(SB_URL+"/rest/v1/cancelled_meetings?date=eq."+todayNY()+"&meeting_title=eq."+encodeURIComponent(key),{method:"DELETE",headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});}
    catch(e){setCancelledTitles(function(p){return [...p,key];});}
  }
  async function deleteExtraMeeting(id){
    setDeletedExtraIds(function(p){return [...p,id];});
    if(!SB_URL||!SB_KEY)return;
    try{await fetch(SB_URL+"/rest/v1/extra_meetings?id=eq."+id,{method:"DELETE",headers:{"apikey":SB_KEY,"Authorization":"Bearer "+SB_KEY}});}catch(e){}
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
    // Fetch directly from GitHub raw content - always latest committed version
    // bypasses Vite build so no redeploy needed after fetch workflow runs
    const RAW="https://raw.githubusercontent.com/cedricsx-web/un-daily-briefing/main/public/journal.json";
    const res=await fetch(RAW+"?t="+Date.now());
    if(!res.ok)throw new Error("journal.json not found ("+res.status+")");
    const json=await res.json();
    if(!json.meetings||json.meetings.length===0)throw new Error("journal.json has 0 meetings");
    return {chambers:json.chambers||[],meetings:json.meetings||[],date:json.date||null,fetched_at:json.fetched_at||null};
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
      setData({chambers:liveData?liveData.chambers:EMPTY,meetings:liveData?liveData.meetings:[],date:liveData?liveData.date:null,fetched_at:liveData?liveData.fetched_at:null});
      setJournalSource(liveData?"live":"offline");
    }catch(err){setError(err.message);fetchedRef.current=false;}
    finally{setLoading(false);}
  }

  function currentNYTime(){
    const now=new Date();
    const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",hour:"2-digit",minute:"2-digit",hour12:false}).formatToParts(now);
    const o={};parts.forEach(function(x){o[x.type]=x.value;});
    return parseInt(o.hour)*60+parseInt(o.minute); // minutes since midnight
  }
  function parseMeetingTime(timeStr){
    if(!timeStr||timeStr==="TBD")return null;
    const m=timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if(!m)return null;
    let h=parseInt(m[1]);const min=parseInt(m[2]);const ap=m[3].toUpperCase();
    if(ap==="PM"&&h!==12)h+=12;
    if(ap==="AM"&&h===12)h=0;
    return h*60+min;
  }
  function chamberStatus(chamber,override,adjTitles){
    if(override==="wt")return "WT";
    if(override==="wt_4th")return "WT 4th";
    if(override==="wt_3rd")return "WT 3rd";
    if(override==="open")return "OPEN";
    if(override==="closed")return "CLOSED";
    const now=currentNYTime();
    const meetings=chamber.meetings||[];
    const adj=adjTitles||[];
    const hasActive=meetings.some(function(m){
      if(m.cancelled)return false;
      const isAdjourned=adj.some(function(at){return at===m.title||m.title.includes(at)||at.includes(m.title);});
      if(isAdjourned)return false;
      const start=parseMeetingTime(m.time);
      if(start===null)return false;
      return now>=start-10&&now<start+180;
    });
    return hasActive?"CLOSED":"OPEN";
  }
  function extraLabel(e){
    const org=e.organizer_type==="un_body"?e.organizer_name:e.organizer_type==="mission"?"Mission of "+e.organizer_name:e.organizer_name;
    return org+" -- "+e.title+(e.is_closed?" [Closed]":"");
  }

  return (
    <div style={{minHeight:"100dvh",width:"100%",background:"linear-gradient(160deg,#0a1628 0%,#0d2044 50%,#0a1a38 100%)",fontFamily:"'DM Sans','Segoe UI',sans-serif",color:"#fff",paddingBottom:"env(safe-area-inset-bottom,40px)",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeSlideIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:.6}50%{opacity:1}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
        html,body{margin:0;padding:0;width:100%;overscroll-behavior-y:none;}
        body{-webkit-text-size-adjust:100%;text-size-adjust:100%;}
        input,select,textarea,button{outline:none;-webkit-appearance:none;}
        input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.3);}
        option{background:#0d2044;}
        img{max-width:100%;}
        :root{--pad:max(16px,env(safe-area-inset-left,16px));}
      `}</style>

      <div style={{background:"linear-gradient(180deg,rgba(0,80,160,0.45) 0%,transparent 100%)",padding:"calc(env(safe-area-inset-top,0px) + 28px) var(--pad) 22px",borderBottom:"1px solid rgba(255,255,255,0.08)"}}>
        <div style={{maxWidth:"600px",margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",gap:"12px",position:"relative"}}>
            <div
            onClick={GH_TOKEN&&!triggering?triggerFetchWorkflow:undefined}
            title={GH_TOKEN?"Tap to refresh journal":undefined}
            style={{width:"38px",height:"38px",borderRadius:"50%",background:triggering?"rgba(0,160,220,0.35)":"rgba(0,160,220,0.2)",border:"2px solid rgba(0,160,220,0.5)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"18px",cursor:GH_TOKEN&&!triggering?"pointer":"default",flexShrink:0,animation:triggering?"spin 1.5s linear infinite":undefined}}
          >&#127760;</div>
          {triggerMsg&&<span style={{position:"absolute",top:"8px",left:"50%",transform:"translateX(-50%)",fontSize:"10px",color:"rgba(0,160,220,0.8)",background:"rgba(10,22,40,0.9)",padding:"3px 8px",borderRadius:"10px",whiteSpace:"nowrap",pointerEvents:"none"}}>{triggerMsg}</span>}
            <div>
              <div style={{fontSize:"10px",letterSpacing:"2px",color:"rgba(255,255,255,0.5)",fontWeight:"600",textTransform:"uppercase"}}>United Nations</div>
              <div style={{fontSize:"clamp(17px,5vw,22px)",fontWeight:"800",fontFamily:"'Playfair Display',serif",lineHeight:1}}>Daily Briefing</div>

            </div>
          </div>
          {dateLabel&&(
            <div style={{marginTop:"10px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"10px"}}>
                <p style={{margin:0,fontSize:"12px",color:"rgba(255,255,255,0.4)",fontWeight:"500"}}>&#128197; {dateLabel}</p>
                {data&&<span style={{fontSize:"9px",fontWeight:"700",padding:"2px 7px",borderRadius:"10px",background:journalSource==="live"?"rgba(76,159,56,0.2)":"rgba(255,255,255,0.08)",color:journalSource==="live"?"#56C02B":"rgba(255,255,255,0.3)",letterSpacing:"0.5px",textTransform:"uppercase"}}>{journalSource==="live"?"Live Journal":"Offline"}</span>}
              </div>

              {data&&data.date&&(
                <p style={{margin:"3px 0 0",fontSize:"11px",color:data.date===todayNY()?"rgba(255,255,255,0.3)":"rgba(255,180,0,0.7)",fontWeight:data.date===todayNY()?"400":"600"}}>
                  {data.date===todayNY()
                    ? "Journal fetched " + (data.fetched_at ? new Date(data.fetched_at).toLocaleTimeString("en-US",{timeZone:"America/New_York",hour:"2-digit",minute:"2-digit"}) : "") + " NY time"
                    : "Warning: showing data from " + data.date + " -- run the fetch workflow"}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {todayObservance&&(
        <a href={todayObservance.url} target="_blank" rel="noopener noreferrer" style={{display:"block",background:"linear-gradient(90deg,rgba(0,96,214,0.35),rgba(0,150,220,0.18))",borderBottom:"1px solid rgba(0,160,220,0.25)",padding:"12px var(--pad)",textDecoration:"none"}}>
          <div style={{maxWidth:"600px",margin:"0 auto",display:"flex",alignItems:"center",gap:"10px"}}>
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
        <a key={i} href={obs.url} target="_blank" rel="noopener noreferrer" style={{display:"block",background:obs.past?"rgba(255,255,255,0.02)":"linear-gradient(90deg,rgba(0,96,214,0.2),rgba(0,150,220,0.08))",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"10px var(--pad)",textDecoration:"none",opacity:obs.past?0.65:1}}>
          <div style={{maxWidth:"600px",margin:"0 auto",display:"flex",alignItems:"center",gap:"10px"}}>
            <span style={{fontSize:"16px",flexShrink:0}}>&#127981;</span>
            <div style={{flex:1}}>
              <div style={{fontSize:"9px",letterSpacing:"1.5px",color:"rgba(255,255,255,0.4)",fontWeight:"700",textTransform:"uppercase"}}>{obs.weekday}</div>
              <div style={{fontSize:"13px",fontWeight:"600",color:"rgba(255,255,255,0.75)",lineHeight:"1.3"}}>{obs.name}</div>
            </div>
            <span style={{fontSize:"12px",color:"rgba(255,255,255,0.3)",flexShrink:0}}>&#8599;</span>
          </div>
        </a>
      );})}

      <div style={{maxWidth:"600px",margin:"0 auto",padding:"20px var(--pad) 0",width:"100%"}}>
        {!data&&!loading&&!error&&(
          <div style={{textAlign:"center",padding:"48px 24px",animation:"fadeSlideIn 0.5s ease"}}>
            <div style={{fontSize:"52px",marginBottom:"20px"}}>&#127482;&#127475;</div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:"22px",fontWeight:"700",margin:"0 0 10px"}}>Your daily UN briefing</h2>
            <p style={{color:"rgba(255,255,255,0.5)",fontSize:"14px",lineHeight:"1.6",marginBottom:"28px"}}>Live chamber schedule and all meetings from the UN Journal.</p>
            <button onClick={fetchBriefing} style={{background:"linear-gradient(135deg,#0096D6,#0050A0)",color:"#fff",border:"none",borderRadius:"50px",padding:"14px 36px",fontSize:"15px",fontWeight:"700",cursor:"pointer",boxShadow:"0 8px 24px rgba(0,100,200,0.4)",fontFamily:"'DM Sans',sans-serif"}}>Load Today's Schedule</button>
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
            <p style={{color:"#ff6b6b",margin:"0 0 16px",fontSize:"13px"}}>{error}</p>
            <button onClick={function(){fetchedRef.current=false;fetchBriefing();}} style={{background:"rgba(255,107,107,0.2)",color:"#ff6b6b",border:"1px solid rgba(255,107,107,0.4)",borderRadius:"8px",padding:"8px 20px",cursor:"pointer",fontSize:"13px",fontWeight:"600"}}>Try Again</button>
          </div>
        )}
        {data&&!loading&&(function(){
          const visibleExtras=extraMeetings.filter(function(e){return !deletedExtraIds.includes(e.id);});
          // Reorder chambers: SC, TC, ECOSOC, GA Hall
          const CHAMBER_ORDER=["Security Council","Trusteeship Council","Economic and Social Council","General Assembly Hall"];
          const chambersOrdered=CHAMBER_ORDER.map(function(name){
            return (data.chambers||[]).find(function(c){return c.room===name;})||{room:name,meetings:[]};
          });
          const mergedChambers=chambersOrdered.map(function(chamber){
            const extras=visibleExtras
              .filter(function(e){return (ROOM_DISPLAY[e.room]||e.room)===chamber.room;})
              .map(function(e){
                const org=e.organizer_type==="un_body"?e.organizer_name:e.organizer_type==="mission"?"Mission of "+e.organizer_name:e.organizer_name;
                return {time:e.time_start?fmtTime(e.time_start):"TBD",title:org+" -- "+e.title+(e.is_closed?" [Closed]":""),agenda:[],id:e.id||null,isExtra:true,extraId:e.id};
              });
            const journalMeetings=(chamber.meetings||[])
              .filter(function(m){return !cancelledTitles.some(function(ct){return ct===m.title||ct.includes(m.title);});});
            return Object.assign({},chamber,{meetings:[...journalMeetings,...extras]});
          });
          const allMeetings=[
            ...(data.meetings||[]).map(function(title){return {title,isExtra:false,extraId:null,cancelKey:title,cancelled:cancelledTitles.includes(title)};}),
            ...visibleExtras.map(function(e){return {title:extraLabel(e),isExtra:true,extraId:e.id,cancelKey:null,cancelled:false,extra_notes:e.extra_notes||e.note||"",rawTitle:e.title,id:e.id,time_start:e.time_start,time_end:e.time_end,is_closed:e.is_closed};}),
          ];
          return (
            <div>
              <div style={{marginBottom:"28px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"14px"}}>
                  <span style={{fontSize:"11px",fontWeight:"700",color:"rgba(255,255,255,0.5)",textTransform:"uppercase",letterSpacing:"1.5px"}}>&#127963;&#65039; Council Chambers</span>
                  {journalSource==="live"&&<span style={{background:"rgba(76,159,56,0.15)",color:"#56C02B",fontSize:"9px",fontWeight:"700",padding:"2px 6px",borderRadius:"10px"}}>LIVE</span>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"10px"}}>
                  {mergedChambers.map(function(c,i){return <ChamberCard key={i} chamber={c} index={i} onCancel={cancelMeeting} onAdjourn={adjournMeeting} onUnadjourn={unadjournMeeting} onDelete={deleteExtraMeeting} adjournedTitles={adjournedTitles} cancelledTitles={cancelledTitles} override={chamberOverrides[c.room]||null} onCycleStatus={cycleChamberStatus} chamberStatus={chamberStatus} adjournedTitlesForStatus={adjournedTitles} meetingNotes={meetingNotes}/>;} )}
                </div>
              </div>
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
                      <option>General Assembly Hall</option><option>Security Council Chamber</option>
                      <option>Trusteeship Council Chamber</option><option>Economic and Social Council Chamber</option>
                      <option>Conference Room 1</option><option>Conference Room 2</option>
                      <option>Conference Room 3</option><option>Conference Room 4</option>
                      <option>Conference Room 5</option><option>Conference Room 8</option>
                      <option>Conference Room 10</option><option>Conference Room 11</option><option>Conference Room 12</option>
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
              <MeetingsList meetings={allMeetings} onCancel={cancelMeeting} onDelete={deleteExtraMeeting} onUncancel={uncancelMeeting} onEdit={function(m){setEditingMeeting(m.extraId);}} editingId={editingMeeting} onSaveEdit={updateExtraMeeting} onCloseEdit={function(){setEditingMeeting(null);}} meetingNotes={meetingNotes} editingNote={editingNote} onEditNote={function(title){setEditingNote(title);}} onSaveNote={saveMeetingNote} onCloseNote={function(){setEditingNote(null);}}/>
              <div style={{height:"40px"}}/>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
