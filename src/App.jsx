import { useState, useEffect, useRef } from "react";

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

// Cache key based on today's date
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
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderLeft: `4px solid ${sdgColor}`,
        borderRadius: "12px",
        padding: "20px 22px",
        cursor: "pointer",
        transition: "background 0.2s ease",
        marginBottom: "14px",
        animation: `fadeSlideIn 0.5s ease both`,
        animationDelay: `${index * 0.12}s`,
        userSelect: "none",
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
              }}>
                {topic.sdg}
              </span>
            )}
            {topic.tag && (
              <span style={{
                background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.7)",
                fontSize: "10px", fontWeight: "600", padding: "2px 8px", borderRadius: "20px",
              }}>
                {topic.tag}
              </span>
            )}
          </div>
          <h3 style={{
            margin: 0, fontSize: "16px", fontWeight: "700", color: "#fff",
            lineHeight: "1.35", fontFamily: "'Playfair Display', Georgia, serif",
          }}>
            {topic.title}
          </h3>
        </div>
        <span style={{
          color: sdgColor, fontSize: "20px", flexShrink: 0,
          transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.25s ease", marginTop: "2px",
        }}>▾</span>
      </div>

      <ul style={{ margin: "14px 0 0", paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "7px" }}>
        {topic.bullets.map((b, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", color: "rgba(255,255,255,0.82)", fontSize: "13.5px", lineHeight: "1.5" }}>
            <span style={{ color: sdgColor, flexShrink: 0, marginTop: "2px", fontSize: "11px" }}>◆</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {expanded && (
        <div style={{
          marginTop: "16px", paddingTop: "16px",
          borderTop: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.88)", fontSize: "14px", lineHeight: "1.75",
          animation: "fadeSlideIn 0.3s ease",
        }}>
          {topic.detail}
        </div>
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
  const [loadingMsg, setLoadingMsg] = useState("Consulting the UN Journal");
  const fetchedRef = useRef(false);

  const loadingMessages = [
    "Consulting the UN Journal",
    "Scanning today's meetings",
    "Checking international days",
    "Linking to SDG goals",
    "Preparing your briefing",
  ];

  useEffect(() => {
    setDateLabel(formatDate(new Date()));

    // Load cached topics for today if available
    try {
      const cached = sessionStorage.getItem(todayKey());
      if (cached) {
        setTopics(JSON.parse(cached));
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!loading) return;
    let i = 0;
    const msgI = setInterval(() => { i = (i + 1) % loadingMessages.length; setLoadingMsg(loadingMessages[i]); }, 2200);
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

    const systemPrompt = `You are a UN expert who creates daily briefings for UN tour guides and educators.
You MUST return ONLY valid JSON — no markdown fences, no preamble, no explanation.
{
  "topics": [
    {
      "title": "Short compelling topic title",
      "sdg": "SDG X: Name",
      "tag": "one of: UN Meeting | International Day | Global Crisis | Diplomacy | Humanitarian",
      "bullets": ["bullet 1", "bullet 2", "bullet 3", "bullet 4"],
      "detail": "A rich paragraph of 100-150 words with deeper context, history, and current UN relevance."
    }
  ]
}
Generate between 4 and 6 topics. Each must be genuinely relevant to today's UN agenda.`;

    const userPrompt = `Today is ${dateStr}.
1. Search journal.un.org for today's UN meetings and sessions.
2. Check if today has any UN-designated international days.
3. Identify 4-6 world topics on today's UN agenda OR linked to an international day OR major ongoing UN/SDG issues in the news.

For each topic: compelling title, most relevant SDG, tag category, 3-5 briefing bullet points, and a detailed paragraph.
Return ONLY the JSON structure.`;

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 3000,
          system: systemPrompt,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: userPrompt }],
        }),
      });

      const data = await response.json();

      let jsonText = "";
      for (const block of data.content || []) {
        if (block.type === "text" && block.text) jsonText += block.text;
      }

      jsonText = jsonText.replace(/```json|```/g, "").trim();
      const start = jsonText.indexOf("{");
      const end = jsonText.lastIndexOf("}");
      if (start !== -1 && end !== -1) jsonText = jsonText.slice(start, end + 1);

      const parsed = JSON.parse(jsonText);
      const result = parsed.topics || [];
      setTopics(result);

      // Cache for the day
      try { sessionStorage.setItem(todayKey(), JSON.stringify(result)); } catch (_) {}
    } catch (err) {
      console.error(err);
      setError("Could not load today's briefing. Please try again.");
      fetchedRef.current = false;
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      minHeight: "100dvh",  // dynamic viewport for iOS Safari
      background: "linear-gradient(160deg, #0a1628 0%, #0d2044 50%, #0a1a38 100%)",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
      color: "#fff",
      paddingBottom: "env(safe-area-inset-bottom, 24px)",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes fadeSlideIn { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100% { opacity:.6 } 50% { opacity:1 } }
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        * { box-sizing:border-box; -webkit-tap-highlight-color:transparent; }
        body { margin:0; overscroll-behavior-y:none; }
      `}</style>

      {/* Header */}
      <div style={{
        background: "linear-gradient(180deg, rgba(0,80,160,0.4) 0%, transparent 100%)",
        padding: "calc(env(safe-area-inset-top, 0px) + 28px) 24px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div style={{ maxWidth: "520px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
            <div style={{
              width: "38px", height: "38px", borderRadius: "50%",
              background: "rgba(0,160,220,0.2)", border: "2px solid rgba(0,160,220,0.5)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px", flexShrink: 0,
            }}>🌐</div>
            <div>
              <div style={{ fontSize: "10px", letterSpacing: "2px", color: "rgba(255,255,255,0.5)", fontWeight: "600", textTransform: "uppercase" }}>United Nations</div>
              <div style={{ fontSize: "20px", fontWeight: "800", fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>Daily Briefing</div>
            </div>
          </div>
          {dateLabel && (
            <p style={{ margin: "10px 0 0", fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: "500" }}>
              📅 {dateLabel}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "520px", margin: "0 auto", padding: "24px 18px 0" }}>

        {/* Start screen */}
        {!topics && !loading && !error && (
          <div style={{ textAlign: "center", padding: "48px 24px", animation: "fadeSlideIn 0.5s ease" }}>
            <div style={{ fontSize: "52px", marginBottom: "20px" }}>🇺🇳</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", fontWeight: "700", margin: "0 0 10px" }}>
              Your daily UN briefing awaits
            </h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: "14px", lineHeight: "1.6", marginBottom: "28px" }}>
              Key UN topics drawn from the Journal, international days, and the SDGs — distilled into clear briefing points.
            </p>
            <button onClick={fetchBriefing} style={{
              background: "linear-gradient(135deg, #0096D6, #0050A0)",
              color: "#fff", border: "none", borderRadius: "50px",
              padding: "14px 36px", fontSize: "15px", fontWeight: "700", cursor: "pointer",
              boxShadow: "0 8px 24px rgba(0,100,200,0.4)", fontFamily: "'DM Sans', sans-serif",
              WebkitAppearance: "none",
            }}>
              Generate Today's Briefing
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 24px", animation: "fadeSlideIn 0.4s ease" }}>
            <div style={{
              width: "52px", height: "52px",
              border: "3px solid rgba(0,160,220,0.2)", borderTop: "3px solid #00A0DC",
              borderRadius: "50%", margin: "0 auto 24px",
              animation: "spin 0.9s linear infinite",
            }} />
            <p style={{ color: "rgba(255,255,255,0.65)", fontSize: "14px", fontWeight: "500", animation: "pulse 1.5s ease infinite" }}>
              {loadingMsg}{dots}
            </p>
            <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "12px", marginTop: "8px" }}>
              Searching the UN Journal & international days
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: "rgba(220,50,50,0.1)", border: "1px solid rgba(220,50,50,0.3)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
            <p style={{ color: "#ff6b6b", margin: "0 0 16px", fontSize: "14px" }}>{error}</p>
            <button onClick={() => { fetchedRef.current = false; fetchBriefing(); }} style={{
              background: "rgba(255,107,107,0.2)", color: "#ff6b6b",
              border: "1px solid rgba(255,107,107,0.4)", borderRadius: "8px",
              padding: "8px 20px", cursor: "pointer", fontSize: "13px", fontWeight: "600",
            }}>
              Try Again
            </button>
          </div>
        )}

        {/* Topics */}
        {topics && topics.length > 0 && (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px" }}>
              <p style={{ margin: 0, fontSize: "13px", color: "rgba(255,255,255,0.4)", fontWeight: "500" }}>
                {topics.length} topics · tap to expand
              </p>
              <button
                onClick={() => { setTopics(null); fetchedRef.current = false; sessionStorage.removeItem(todayKey()); }}
                style={{
                  background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.45)", borderRadius: "20px",
                  padding: "4px 12px", fontSize: "11px", cursor: "pointer", fontWeight: "600",
                }}
              >
                ↺ Refresh
              </button>
            </div>
            {topics.map((topic, i) => <TopicCard key={i} topic={topic} index={i} />)}
            <p style={{ textAlign: "center", fontSize: "11px", color: "rgba(255,255,255,0.2)", marginTop: "24px", lineHeight: "1.6" }}>
              Sources: journal.un.org · un.org/en/observances · un.org/sustainabledevelopment
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
