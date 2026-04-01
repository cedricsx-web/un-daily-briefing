import { useState, useEffect, useRef } from "react";

const API_KEY = import.meta.env.VITE_ANTHROPIC_KEY || "";

const SDG_COLORS = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D",
  5: "#FF3A21", 6: "#26BDE2", 7: "#FCC30B", 8: "#A21942",
  9: "#FD6925", 10: "#DD1367", 11: "#FD9D24", 12: "#BF8B2E",
  13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B", 16: "#00689D",
  17: "#19486A",
};

const MONTHS = ["January","February","March","April","May","June","July",
  "August","September","October","November","December"];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];

function formatDate(d) {
  return `${DAYS[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}
function todayKey() {
  const d = new Date();
  return `un-briefing-${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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
        animation: `fadeSlideIn 0.5s ease both`, animationDelay: `${index * 0.12}s`, userSelect: "none",
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

export default function App() {
  const [topics, setTopics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateLabel, setDateLabel] = useState("");
  const [dots, setDots] = useState(".");
  const [loadingMsg, setLoadingMsg] = useState("Consulting the UN agenda");
  const fetchedRef = useRef(false);

  const loadingMessages = [
    "Consulting the UN agenda",
    "Scanning international days",
    "Linking to SDG goals",
    "Preparing your briefing",
  ];

  useEffect(() => {
    setDateLabel(formatDate(new Date()));
    try {
      const cached = sessionStorage.getItem(todayKey());
      if (cached) setTopics(JSON.parse(cached));
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!loading) return;
    let i = 0;
    const msgI = setInterval(() => { i = (i + 1) % loadingMessages.length; setLoadingMsg(loadingMessages[i]); }, 2000);
    const dotI = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => { clearInterval(msgI); clearInterval(dotI); };
  }, [loading]);

  async function fetchBriefing() {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    setLoading(true);
    setError(null);

    const today = new Date();
    const dateStr = `${MONTHS[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;

    const prompt = `Today is ${dateStr}.

You are a UN expert briefing a UN tour guide at the start of their day.

Generate 5 world topics relevant to the United Nations for today. Consider:
- What sessions or committees typically meet at this time of year at the UN
- Any UN-designated international observance days for ${MONTHS[today.getMonth()]} ${today.getDate()}
- Major ongoing UN/SDG topics always relevant to tour guides (climate, peace, humanitarian, development)
- Topics that connect what visitors see at the UN to real world issues

Return ONLY this raw JSON — no markdown, no explanation:
{
  "topics": [
    {
      "title": "Concise compelling title (max 8 words)",
      "sdg": "SDG X: Short Name",
      "tag": "one of: UN Meeting | International Day | Global Crisis | Diplomacy | Humanitarian",
      "bullets": ["Key fact", "Key fact", "Key fact", "Key fact"],
      "detail": "80-120 words of richer context, history, and why this matters at the UN today."
    }
  ]
}`;

    try {
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
          max_tokens: 2500,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || `API error ${res.status}`);

      let raw = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      raw = raw.replace(/```json|```/g, "").trim();
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start === -1 || end === -1) throw new Error("Invalid response format");
      const parsed = JSON.parse(raw.slice(start, end + 1));
      const result = parsed.topics || [];
      if (!result.length) throw new Error("No topics returned");

      setTopics(result);
      try { sessionStorage.setItem(todayKey(), JSON.stringify(result)); } catch (_) {}

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
      paddingBottom: "env(safe-area-inset-bottom, 24px)",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeSlideIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
        body { margin:0; overscroll-behavior-y:none; }
      `}</style>

      <div style={{
        background: "linear-gradient(180deg, rgba(0,80,160,0.4) 0%, transparent 100%)",
        padding: "calc(env(safe-area-inset-top, 0px) + 28px) 24px 24px",
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
            <p style={{ margin: "10px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: "500" }}>📅 {dateLabel}</p>
          )}
        </div>
      </div>

      <div style={{ maxWidth: "520px", margin: "0 auto", padding: "24px 18px 0" }}>

        {!API_KEY && (
          <div style={{ background: "rgba(255,180,0,0.1)", border: "1px solid rgba(255,180,0,0.3)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
            <p style={{ color: "#ffcc44", margin: 0, fontSize: "14px" }}>
              ⚠️ No API key configured. Add VITE_ANTHROPIC_KEY as a GitHub Secret and redeploy.
            </p>
          </div>
        )}

        {API_KEY && !topics && !loading && !error && (
          <div style={{ textAlign: "center", padding: "48px 24px", animation: "fadeSlideIn 0.5s ease" }}>
            <div style={{ fontSize: "52px", marginBottom: "20px" }}>🇺🇳</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", fontWeight: "700", margin: "0 0 10px" }}>
              Your daily UN briefing awaits
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", lineHeight: "1.6", marginBottom: "28px" }}>
              5 key topics every morning — UN agenda, international days, and SDGs — distilled into clear briefing points.
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
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", fontWeight: "500", animation: "pulse 1.5s ease infinite" }}>
              {loadingMsg}{dots}
            </p>
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

        {topics && topics.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.4)", fontWeight: "500" }}>
                {topics.length} topics · tap to expand
              </p>
              <button onClick={() => { setTopics(null); fetchedRef.current = false; sessionStorage.removeItem(todayKey()); }} style={{
                background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                color: "rgba(255,255,255,0.45)", borderRadius: "20px", padding: "4px 12px",
                fontSize: "11px", cursor: "pointer", fontWeight: "600",
              }}>↺ Refresh</button>
            </div>
            {topics.map((topic, i) => <TopicCard key={i} topic={topic} index={i} />)}
            <p style={{ textAlign: "center", fontSize: "11px", color: "rgba(255,255,255,0.2)", marginTop: "24px", lineHeight: "1.6" }}>
              Powered by Claude · UN Journal · SDGs
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
