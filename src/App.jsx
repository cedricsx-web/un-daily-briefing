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


// UN International Days & Weeks -- keyed as "MM-DD"
const UN_OBSERVANCES = {
  "01-04": "World Braille Day",
  "01-24": "International Day of Education",
  "01-26": "International Day of Clean Energy",
  "01-27": "International Day of Commemoration in Memory of the Victims of the Holocaust",
  "01-28": "International Day of Peaceful Coexistence",
  "02-02": "World Wetlands Day",
  "02-04": "International Day of Human Fraternity",
  "02-06": "International Day of Zero Tolerance to Female Genital Mutilation",
  "02-11": "International Day of Women and Girls in Science",
  "02-13": "World Radio Day",
  "02-20": "World Day of Social Justice",
  "02-21": "International Mother Language Day",
  "03-03": "World Wildlife Day",
  "03-05": "International Day for Disarmament and Non-Proliferation Awareness",
  "03-08": "International Women's Day",
  "03-10": "International Day of Women Judges",
  "03-15": "International Day to Combat Islamophobia",
  "03-20": "International Day of Happiness",
  "03-21": "International Day for the Elimination of Racial Discrimination",
  "03-22": "World Water Day",
  "03-23": "World Meteorological Day",
  "03-24": "World Tuberculosis Day",
  "03-25": "International Day of Remembrance of the Victims of Slavery",
  "03-30": "International Day of Zero Waste",
  "04-02": "World Autism Awareness Day",
  "04-04": "International Day for Mine Awareness",
  "04-05": "International Day of Conscience",
  "04-06": "International Day of Sport for Development and Peace",
  "04-07": "World Health Day",
  "04-12": "International Day of Human Space Flight",
  "04-21": "World Creativity and Innovation Day",
  "04-22": "International Mother Earth Day",
  "04-23": "World Book and Copyright Day",
  "04-24": "International Day of Multilateralism and Diplomacy for Peace",
  "04-25": "World Malaria Day",
  "04-26": "International Chernobyl Disaster Remembrance Day",
  "04-28": "World Day for Safety and Health at Work",
  "04-29": "International Day in Memory of the Victims of Earthquakes",
  "04-30": "International Jazz Day",
  "05-03": "World Press Freedom Day",
  "05-15": "International Day of Families",
  "05-16": "International Day of Living Together in Peace",
  "05-17": "World Telecommunication and Information Society Day",
  "05-20": "World Bee Day",
  "05-21": "World Day for Cultural Diversity for Dialogue and Development",
  "05-22": "International Day for Biological Diversity",
  "05-29": "International Day of UN Peacekeepers",
  "05-31": "World No-Tobacco Day",
  "06-01": "Global Day of Parents",
  "06-03": "World Bicycle Day",
  "06-04": "International Day of Innocent Children Victims of Aggression",
  "06-05": "World Environment Day",
  "06-08": "World Oceans Day",
  "06-12": "World Day Against Child Labour",
  "06-17": "World Day to Combat Desertification and Drought",
  "06-18": "International Day for Countering Hate Speech",
  "06-19": "International Day for the Elimination of Sexual Violence in Conflict",
  "06-20": "World Refugee Day",
  "06-21": "International Day of Yoga",
  "06-23": "United Nations Public Service Day",
  "06-26": "United Nations International Day in Support of Victims of Torture",
  "07-11": "World Population Day",
  "07-15": "World Youth Skills Day",
  "07-18": "Nelson Mandela International Day",
  "07-28": "World Hepatitis Day",
  "07-30": "International Day of Friendship",
  "08-09": "International Day of the World's Indigenous Peoples",
  "08-12": "International Youth Day",
  "08-19": "World Humanitarian Day",
  "08-23": "International Day for the Remembrance of the Slave Trade and its Abolition",
  "09-05": "International Day of Charity",
  "09-08": "International Literacy Day",
  "09-15": "International Day of Democracy",
  "09-16": "International Day for the Preservation of the Ozone Layer",
  "09-21": "International Day of Peace",
  "09-26": "International Day for the Total Elimination of Nuclear Weapons",
  "09-27": "World Tourism Day",
  "10-01": "International Day of Older Persons",
  "10-02": "International Day of Non-Violence",
  "10-05": "World Teachers' Day",
  "10-10": "World Mental Health Day",
  "10-11": "International Day of the Girl Child",
  "10-13": "International Day for Disaster Risk Reduction",
  "10-16": "World Food Day",
  "10-17": "International Day for the Eradication of Poverty",
  "10-24": "United Nations Day",
  "11-05": "World Tsunami Awareness Day",
  "11-10": "World Science Day for Peace and Development",
  "11-16": "International Day for Tolerance",
  "11-19": "World Toilet Day",
  "11-20": "World Children's Day",
  "11-25": "International Day for the Elimination of Violence against Women",
  "11-29": "International Day of Solidarity with the Palestinian People",
  "12-01": "World AIDS Day",
  "12-02": "International Day for the Abolition of Slavery",
  "12-03": "International Day of Persons with Disabilities",
  "12-05": "International Volunteer Day",
  "12-09": "International Anti-Corruption Day",
  "12-10": "Human Rights Day",
  "12-11": "International Mountain Day",
  "12-18": "International Migrants Day",
  "12-20": "International Human Solidarity Day",
};

function getTodayObservance() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const p = {};
  parts.forEach(({ type, value }) => { p[type] = value; });
  const key = p.month + "-" + p.day;
  return UN_OBSERVANCES[key] || null;
}

function formatDate(d) {
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function todayStr() {
  // Always use New York time to match journal.json
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const p = {}; parts.forEach(({ type, value }) => { p[type] = value; });
  return `${p.year}-${p.month}-${p.day}`;
}
function todayKey() {
  return `un-briefing-${todayStr()}`;
}

// ── Chamber Card ──────────────────────────────────────────────────────────────
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

// ── Meetings List ─────────────────────────────────────────────────────────────
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

// ── Topic Card ────────────────────────────────────────────────────────────────
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

// ── Section Header ────────────────────────────────────────────────────────────
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

// ── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateLabel, setDateLabel] = useState("");
  const [journalSource, setJournalSource] = useState("live");
  const [todayObservance] = useState(() => getTodayObservance()); // "live" | "ai"
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

  // Step 1: Try to load live journal.json (fetched this morning by GitHub Action)
  async function fetchLiveJournal() {
    const url = `${BASE}journal.json`;
    const res = await fetch(url + "?t=" + Date.now());
    if (!res.ok) throw new Error(`journal.json not found (${res.status})`);
    const json = await res.json();

    // Check if it's today's data
    if (json.date !== todayStr()) {
      throw new Error(`journal.json is from ${json.date}, not today`);
    }
    if (json.error) {
      throw new Error(`journal.json fetch error: ${json.error}`);
    }
    return {
      chambers: json.chambers || [],
      meetings: json.meetings || [],
    };
  }

  // Step 2: Ask Claude for topics (and optionally meetings if live failed)
  async function fetchClaudeTopics(meetingsContext) {
    const today = new Date();
    const dateStr = `${MONTHS[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    const dow = today.toLocaleDateString("en-US", { weekday: "long" });

    const meetingsList = meetingsContext?.meetings?.length > 0
      ? `\n\nToday's actual UN meetings from the Journal:\n${meetingsContext.meetings.slice(0, 15).map(m => `- ${m}`).join("\n")}`
      : "";

    const chambersSection = !meetingsContext ? `
  "chambers": [
    {
      "room": "General Assembly Hall",
      "meetings": []
    },
    {
      "room": "Security Council",
      "meetings": [
        {"time": "10:00 AM", "title": "Formal meeting title or Consultations of the whole"},
        {"time": "3:00 PM", "title": "Formal meeting title or Consultations of the whole"}
      ]
    },
    {
      "room": "Trusteeship Council",
      "meetings": []
    },
    {
      "room": "Economic and Social Council",
      "meetings": []
    }
  ],
  "meetings": [
    "Security Council — [meeting number or topic] (10:00 AM, Security Council Chamber)",
    "General Assembly — [body name]: [meeting description] (10:00 AM, [room])",
    "Advisory Committee on Administrative and Budgetary Questions — Meeting (10:00 AM, Conference Room 10)",
    "International Civil Service Commission, [session] — Meeting (10:00 AM, Conference Room 1)",
    "Preparatory Commission for BBNJ Agreement — [meeting description] (10:00 AM, Conference Room 4)"
  ],` : "";

    const prompt = `Today is ${dow}, ${dateStr}.${meetingsList}

You are a UN expert generating a daily briefing for UN tour guides at the United Nations in New York.
${meetingsList ? "Use the actual meetings listed above." : `
IMPORTANT — generate REALISTIC UN meetings for today based on the UN calendar:
- Security Council typically meets formally (numbered meetings like "10128th meeting") and/or holds closed consultations
- General Assembly bodies active in ${MONTHS[today.getMonth()]} include: ACABQ (Advisory Committee on Administrative and Budgetary Questions), ICSC (International Civil Service Commission), Sixth Committee, and the BBNJ PrepCom
- Bodies meeting in the MAIN CHAMBERS (General Assembly Hall, Security Council Chamber, Trusteeship Council Chamber, Economic and Social Council Chamber) go in the chambers section
- Bodies meeting in Conference Rooms (1, 2, 3, 4, 5, 8, 10, 12) go in the meetings list only
- A General Assembly body using the Economic and Social Council Chamber still appears under "Economic and Social Council" chamber
- Include 8-12 meetings in the meetings list covering all active bodies`}

Return ONLY raw JSON — no markdown, no explanation:
{
  "topics": [
    {
      "title": "Concise compelling title (max 8 words)",
      "sdg": "SDG X: Short Name",
      "tag": "one of: UN Meeting | International Day | Global Crisis | Diplomacy | Humanitarian",
      "bullets": ["Key fact", "Key fact", "Key fact", "Key fact"],
      "detail": "80-120 words of richer context and why this matters at the UN today."
    }
  ]${chambersSection}
}

Generate exactly 5 topics. Return ONLY the JSON.`;

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 3500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const json = await res.json();
    if (!res.ok) throw new Error(json?.error?.message || `API error ${res.status}`);

    let raw = (json.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    raw = raw.replace(/```json|```/g, "").trim();
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1) throw new Error("No JSON in response");
    return JSON.parse(raw.slice(start, end + 1));
  }

  async function fetchBriefing() {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    setError(null);

    try {
      let liveData = null;
      let source = "ai";

      // Try live journal first
      try {
        liveData = await fetchLiveJournal();
        source = "live";
        console.log("✅ Loaded live UN Journal data");
      } catch (e) {
        console.warn("Live journal unavailable, using AI fallback:", e.message);
      }

      // Get Claude topics (passing live meetings as context if available)
      const claudeResult = await fetchClaudeTopics(liveData);

      const finalData = {
        chambers: liveData?.chambers || claudeResult.chambers || [],
        meetings: liveData?.meetings || claudeResult.meetings || [],
        topics: claudeResult.topics || [],
      };

      if (!finalData.topics.length) throw new Error("No topics returned");

      setData(finalData);
      setJournalSource(source);
      try {
        sessionStorage.setItem(todayKey(), JSON.stringify({ data: finalData, source }));
      } catch (_) {}

    } catch (err) {
      setError(`Error: ${err.message}`);
      fetchedRef.current = false;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100dvh",
      background: "linear-gradient(160deg, #0a1628 0%, #0d2044 50%, #0a1a38 100%)",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#fff",
      paddingBottom: "env(safe-area-inset-bottom, 40px)",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
        body { margin:0; overscroll-behavior-y:none; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, rgba(0,80,160,0.45) 0%, transparent 100%)",
        padding: "calc(env(safe-area-inset-top, 0px) + 28px) 24px 22px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ maxWidth: "520px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{
              width: "38px", height: "38px", borderRadius: "50%",
              background: "rgba(0,160,220,0.2)", border: "2px solid rgba(0,160,220,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px",
            }}>🌐</div>
            <div>
              <div style={{ fontSize: "10px", letterSpacing: "2px", color: "rgba(255,255,255,0.5)", fontWeight: "600", textTransform: "uppercase" }}>United Nations</div>
              <div style={{ fontSize: "20px", fontWeight: "800", fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>Daily Briefing</div>
            </div>
          </div>
          {dateLabel && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
              <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: "500" }}>📅 {dateLabel}</p>
              {data && (
                <span style={{
                  fontSize: "9px", fontWeight: "700", padding: "2px 7px", borderRadius: "10px",
                  background: journalSource === "live" ? "rgba(76,159,56,0.2)" : "rgba(255,255,255,0.08)",
                  color: journalSource === "live" ? "#56C02B" : "rgba(255,255,255,0.3)",
                  letterSpacing: "0.5px", textTransform: "uppercase",
                }}>
                  {journalSource === "live" ? "🟢 Live Journal" : "AI Generated"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* International Day Banner */}
      {todayObservance && (
        <div style={{
          background: "linear-gradient(90deg, rgba(0,96,214,0.3), rgba(0,150,220,0.15))",
          borderBottom: "1px solid rgba(0,160,220,0.2)",
          padding: "10px 24px",
          animation: "fadeSlideIn 0.5s ease",
        }}>
          <div style={{ maxWidth: "520px", margin: "0 auto", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px", flexShrink: 0 }}>&#127981;</span>
            <div>
              <div style={{ fontSize: "9px", letterSpacing: "1.5px", color: "rgba(255,255,255,0.45)", fontWeight: "700", textTransform: "uppercase" }}>International Day</div>
              <div style={{ fontSize: "13px", fontWeight: "600", color: "#fff", lineHeight: "1.3" }}>{todayObservance}</div>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: "520px", margin: "0 auto", padding: "24px 18px 0" }}>

        {!API_KEY && (
          <div style={{ background: "rgba(255,180,0,0.1)", border: "1px solid rgba(255,180,0,0.3)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
            <p style={{ color: "#ffcc44", margin: 0, fontSize: "14px" }}>⚠️ No API key configured. Add VITE_ANTHROPIC_KEY as a GitHub Secret and redeploy.</p>
          </div>
        )}

        {API_KEY && !data && !loading && !error && (
          <div style={{ textAlign: "center", padding: "48px 24px", animation: "fadeSlideIn 0.5s ease" }}>
            <div style={{ fontSize: "52px", marginBottom: "20px" }}>🇺🇳</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", fontWeight: "700", margin: "0 0 10px" }}>Your daily UN briefing awaits</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", lineHeight: "1.6", marginBottom: "28px" }}>
              Live chamber schedule, all meetings from the UN Journal, and 5 key briefing topics.
            </p>
            <button onClick={fetchBriefing} style={{
              background: "linear-gradient(135deg, #0096D6, #0050A0)", color: "#fff",
              border: "none", borderRadius: "50px", padding: "14px 36px",
              fontSize: "15px", fontWeight: "700", cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0,100,200,0.4)", fontFamily: "'DM Sans', sans-serif",
            }}>Generate Today's Briefing</button>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "60px 24px" }}>
            <div style={{
              width: "52px", height: "52px", border: "3px solid rgba(0,160,220,0.2)",
              borderTop: "3px solid #00A0DC", borderRadius: "50%", margin: "0 auto 24px",
              animation: "spin 0.9s linear infinite",
            }} />
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", fontWeight: "500", animation: "pulse 1.5s ease infinite" }}>{loadingMsg}{dots}</p>
          </div>
        )}

        {error && !loading && (
          <div style={{ background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.3)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
            <p style={{ color: "#ff6b6b", margin: "0 0 16px", fontSize: "13px", fontFamily: "monospace", wordBreak: "break-all" }}>{error}</p>
            <button onClick={() => { fetchedRef.current = false; fetchBriefing(); }} style={{
              background: "rgba(255,107,107,0.2)", color: "#ff6b6b",
              border: "1px solid rgba(255,107,107,0.4)", borderRadius: "8px",
              padding: "8px 20px", cursor: "pointer", fontSize: "13px", fontWeight: "600",
            }}>Try Again</button>
          </div>
        )}

        {data && !loading && (
          <div>
            <SectionHeader icon="🏛️" title="Council Chambers" subtitle="Today's session schedule" badge={journalSource === "live" ? "LIVE" : null} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "28px" }}>
              {(data.chambers || []).map((c, i) => <ChamberCard key={i} chamber={c} index={i} />)}
            </div>

            <SectionHeader icon="📋" title="All Meetings Today" subtitle={`${(data.meetings || []).length} meetings across the UN`} badge={journalSource === "live" ? "LIVE" : null} />
            <div style={{ marginBottom: "28px" }}>
              <MeetingsList meetings={data.meetings || []} />
            </div>

            <SectionHeader icon="💡" title="Briefing Topics" subtitle="Tap any topic to expand" />
            {(data.topics || []).map((topic, i) => <TopicCard key={i} topic={topic} index={i} />)}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>
                {journalSource === "live" ? "📡 journal.un.org · Claude · SDGs" : "Powered by Claude · UN Journal · SDGs"}
              </p>
              <button onClick={() => { setData(null); fetchedRef.current = false; sessionStorage.removeItem(todayKey()); }} style={{
                background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.4)", borderRadius: "20px", padding: "4px 12px",
                fontSize: "11px", cursor: "pointer", fontWeight: "600",
              }}>↺ Refresh</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
