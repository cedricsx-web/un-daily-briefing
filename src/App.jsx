import { useState, useEffect, useRef } from "react";

const API_KEY = import.meta.env.VITE_ANTHROPIC_KEY || "";
const BASE = import.meta.env.BASE_URL || "/";

const SDG_COLORS = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D",
  5: "#FF3A21", 6: "#26BDE2", 7: "#FCC30B", 8: "#A21942",
  9: "#FD6925", 10: "#DD1367", 11: "#FD9D24", 12: "#BF8B2E",
  13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B", 16: "#00689D",
  17: "#19486A",
};

const CHAMBER_ICONS = {
  "General Assembly Hall": "🏛️",
  "Security Council": "🛡️",
  "Trusteeship Council": "⚖️",
  "Economic and Social Council": "🤝",
};

const MONTHS = ["January","February","March","April","May","June","July",
  "August","September","October","November","December"];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function formatDate(d) {
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function todayKey() {
  return `un-briefing-${todayStr()}`;
}

function ChamberCard({ chamber, index }) {
  const icon = CHAMBER_ICONS[chamber.room] || "🏢";
  const hasSession = chamber.meetings && chamber.meetings.length > 0;
  return (
    <div style={{
      background: hasSession ? "rgba(0,150,214,0.08)" : "rgba(255,255,255,0.02)",
      border: hasSession ? "1px solid rgba(0,150,214,0.25)" : "1px solid rgba(255,255,255,0.06)",
      borderRadius: "10px", padding: "14px 16px",
      animation: `fadeSlideIn 0.4s ease both`, animationDelay: `${index * 0.08}s`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: hasSession ? "10px" : "0" }}>
        <span style={{ fontSize: "16px", flexShrink: 0 }}>{icon}</span>
        <span style={{
          fontSize: "10px", fontWeight: "700",
          color: hasSession ? "#00A0DC" : "rgba(255,255,255,0.3)",
          textTransform: "uppercase", letterSpacing: "0.6px", lineHeight: "1.3",
        }}>{chamber.room}</span>
      </div>
      {hasSession ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {chamber.meetings.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
              <span style={{ fontSize: "10px", color: "#FCC30B", fontWeight: "700", whiteSpace: "nowrap", marginTop: "2px", flexShrink: 0 }}>{m.time}</span>
              <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)", lineHeight: "1.4" }}>{m.title}</span>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>No session today</p>
      )}
    </div>
  );
}

function MeetingsList({ meetings }) {
  const [expanded, setExpanded] = useState(false);
  const preview = meetings.slice(0, 5);
  const rest = meetings.slice(5);
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "10px", padding: "16px",
      animation: "fadeSlideIn 0.4s ease both", animationDelay: "0.35s",
    }}>
      {[...preview, ...(expanded ? rest : [])].map((m, i, arr) => (
        <div key={i} style={{
          display: "flex", alignItems: "flex-start", gap: "10px",
          paddingBottom: i < arr.length - 1 ? "8px" : "0",
          marginBottom: i < arr.length - 1 ? "8px" : "0",
          borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
        }}>
          <span style={{ color: "rgba(0,160,220,0.5)", fontSize: "9px", marginTop: "5px", flexShrink: 0 }}>●</span>
          <span style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", lineHeight: "1.45" }}>{m}</span>
        </div>
      ))}
      {rest.length > 0 && (
        <button onClick={() => setExpanded(e => !e)} style={{
          background: "transparent", border: "none", color: "#00A0DC",
          fontSize: "12px", fontWeight: "600", cursor: "pointer",
          padding: "8px 0 0", fontFamily: "'DM Sans', sans-serif",
        }}>
          {expanded ? "▲ Show less" : `▾ Show ${rest.length} more meetings`}
        </button>
      )}
    </div>
  );
}

function TopicCard({ topic, index }) {
  const [expanded, setExpanded] = useState(false);
  const sdgNum = topic.sdg ? parseInt(topic.sdg.replace(/\D/g, "")) : null;
  const sdgColor = sdgNum && SDG_COLORS[sdgNum] ? SDG_COLORS[sdgNum] : "#00A0DC";
  return (
    <div
      onClick={() => setExpanded(!expanded)}
      style={{
        background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
        borderLeft: `4px solid ${sdgColor}`, borderRadius: "12px", padding: "20px 22px",
        cursor: "pointer", transition: "background 0.2s ease", marginBottom: "14px",
        animation: `fadeSlideIn 0.5s ease both`, animationDelay: `${index * 0.1}s`, userSelect: "none",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
      onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.04)"}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
            {topic.sdg && (
              <span style={{
                background: sdgColor, color: "#fff", fontSize: "10px", fontWeight: "700",
                padding: "2px 8px", borderRadius: "20px", letterSpacing: "0.5px", whiteSpace: "nowrap",
              }}>{topic.sdg}</span>
            )}
            {topic.tag && (
              <span style={{
                background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)",
                fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "20px",
              }}>{topic.tag}</span>
            )}
          </div>
          <h3 style={{
            margin: 0, fontSize: "16px", fontWeight: "700", color: "#fff",
            lineHeight: "1.35", fontFamily: "'Playfair Display', Georgia, serif",
          }}>{topic.title}</h3>
        </div>
        <span style={{
          color: sdgColor, fontSize: "20px", flexShrink: 0,
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.25s ease", marginTop: "2px",
        }}>▾</span>
      </div>
      <ul style={{ margin: "14px 0 0", paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "7px" }}>
        {(topic.bullets || []).map((b, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", color: "rgba(255,255,255,0.82)", fontSize: "13.5px", lineHeight: "1.5" }}>
            <span style={{ color: sdgColor, flexShrink: 0, marginTop: "2px", fontSize: "11px" }}>◆</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      {expanded && (
        <div style={{
          marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.88)", fontSize: "14px", lineHeight: "1.75",
          animation: "fadeSlideIn 0.3s ease",
        }}>{topic.detail}</div>
      )}
      {!expanded && (
        <p style={{ margin: "12px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.35)", fontStyle: "italic" }}>
          Tap for full briefing →
        </p>
      )}
    </div>
  );
}

function SectionHeader({ icon, title, subtitle, badge }) {
  return (
    <div style={{ marginBottom: "14px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "14px" }}>{icon}</span>
        <span style={{ fontSize: "11px", fontWeight: "700", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1.5px" }}>{title}</span>
        {badge && (
          <span style={{
            background: "rgba(0,160,220,0.15)", color: "#00A0DC",
            fontSize: "9px", fontWeight: "700", padding: "2px 6px",
            borderRadius: "10px", letterSpacing: "0.5px",
          }}>{badge}</span>
        )}
      </div>
      {subtitle && <p style={{ margin: "4px 0 0 22px", fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>{subtitle}</p>}
    </div>
  );
}

export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateLabel, setDateLabel] = useState("");
  const [journalSource, setJournalSource] = useState("live");
  const [dots, setDots] = useState(".");
  const [loadingMsg, setLoadingMsg] = useState("Fetching UN Journal");
  const fetchedRef = useRef(false);

  const loadingMessages = [
    "Fetching UN Journal",
    "Parsing chamber schedules",
    "Scanning all meetings",
    "Generating briefing topics",
    "Almost ready",
  ];

  useEffect(() => {
    setDateLabel(formatDate(new Date()));
    try {
      const cached = sessionStorage.getItem(todayKey());
      if (cached) {
        const parsed = JSON.parse(cached);
        setData(parsed.data);
        setJournalSource(parsed.source || "ai");
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!loading) return;
    let i = 0;
    const msgI = setInterval(() => { i = (i + 1) % loadingMessages.length; setLoadingMsg(loadingMessages[i]); }, 2000);
    const dotI = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => { clearInterval(msgI); clearInterval(dotI); };
  }, [loading]);

  async function fetchLiveJournal() {
    const url = `${BASE}journal.json`;
    const res = await fetch(url + "?t=" + Date.now());
    if (!res.ok) throw new Error(`journal.json not found (${res.status})`);
    const json = await res.json();
    if (json.date !== todayStr()) throw new Error(`journal.json is from ${json.date}, not today`);
    if (json.error) throw new Error(`journal.json fetch error: ${json.error}`);
    return { chambers: json.chambers || [], meetings: json.meetings || [] };
  }

  async function fetchClaudeTopics(meetingsContext) {
    const today = new Date();
    const dateStr = `${MONTHS[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    const meetingsList = meetingsContext?.meetings?.length > 0
      ? `\n\nToday's actual UN meetings from the Journal:\n${meetingsContext.meetings.slice(0, 15).map(m => `- ${m}`).join("\n")}`
      : "";

    const prompt = `Today​​​​​​​​​​​​​​​​
