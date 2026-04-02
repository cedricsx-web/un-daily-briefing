// fetch-journal.cjs
// Uses Claude API to generate today's UN meeting schedule.
// Falls back gracefully — app works with or without this data.

const { writeFileSync, mkdirSync } = require("fs");

const API_KEY = process.env.VITE_ANTHROPIC_KEY;
if (!API_KEY) { console.error("❌ VITE_ANTHROPIC_KEY not set"); process.exit(1); }

const MONTHS = ["January","February","March","April","May","June","July",
  "August","September","October","November","December"];

function todayInNewYork() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const p = {};
  parts.forEach(({ type, value }) => { p[type] = value; });
  return `${p.year}-${p.month}-${p.day}`;
}

function saveResult(dateStr, chambers, meetings, note) {
  mkdirSync("public", { recursive: true });
  writeFileSync("public/journal.json", JSON.stringify({
    date: dateStr,
    fetched_at: new Date().toISOString(),
    ny_date: todayInNewYork(),
    source: "Claude AI",
    note: note || null,
    chambers,
    meetings,
  }, null, 2));
  console.log(`✅ Saved — ${meetings.length} meetings | ${note || "ok"}`);
}

function emptyChambers() {
  return [
    { room: "General Assembly Hall", meetings: [] },
    { room: "Security Council", meetings: [] },
    { room: "Trusteeship Council", meetings: [] },
    { room: "Economic and Social Council", meetings: [] },
  ];
}

async function main() {
  const dateStr = todayInNewYork();
  const [year, month, day] = dateStr.split("-");
  const humanDate = `${MONTHS[parseInt(month)-1]} ${parseInt(day)}, ${year}`;
  const dayOfWeek = new Date(dateStr).toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long" });

  console.log(`\n📅 NY date: ${dateStr} (${dayOfWeek}) | UTC: ${new Date().toISOString()}\n`);

  // Weekend — no UN meetings
  const dow = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long" });
  if (dow === "Saturday" || dow === "Sunday") {
    console.log("Weekend — no UN meetings scheduled.");
    saveResult(dateStr, emptyChambers(), [], "Weekend — no meetings scheduled");
    return;
  }

  console.log("Calling Claude API...");

  const prompt = `Today is ${dayOfWeek}, ${humanDate}.

You are a UN expert. Based on your knowledge of the UN calendar, ongoing sessions, and typical scheduling patterns for this time of year, generate a realistic list of meetings happening today at UN Headquarters in New York.

Consider:
- What General Assembly bodies, committees or sessions are typically active in ${MONTHS[parseInt(month)-1]}
- Security Council meeting patterns (consultations, formal meetings)
- ECOSOC sessions and subsidiary bodies active this time of year
- Any known international observances for ${MONTHS[parseInt(month)-1]} ${parseInt(day)} that might have associated UN events

Return ONLY this raw JSON — no markdown, no explanation:
{
  "chambers": [
    {
      "room": "General Assembly Hall",
      "meetings": [{"time": "10:00 AM", "title": "Meeting title"}]
    },
    {
      "room": "Security Council",
      "meetings": [{"time": "11:00 AM", "title": "Meeting title"}]
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
    "Full title of every meeting today across all UN bodies (8-15 items)"
  ]
}

Rules:
- chambers: only list meetings physically in those 4 rooms. Security Council consultations go under Security Council even if in Consultations Room.
- meetings: comprehensive flat list of all meetings across all UN bodies today
- Be specific with meeting titles (include session numbers, agenda items where known)
- Return ONLY the JSON`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `API error ${res.status}`);

    let raw = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    raw = raw.replace(/```json|```/g, "").trim();
    const start = raw.indexOf("{");
    const end   = raw.lastIndexOf("}");
    if (start === -1) throw new Error("No JSON in response");

    const parsed  = JSON.parse(raw.slice(start, end + 1));
    const chambers = parsed.chambers || emptyChambers();
    const meetings = [...new Set((parsed.meetings || []).filter(m => m && m.length > 3))];

    console.log("\n🏛️  Chambers:");
    chambers.forEach(c => {
      const ms = c.meetings || [];
      console.log(`  ${c.room}: ${ms.length > 0 ? ms.map(m => `${m.time} — ${m.title}`).join(" | ") : "none"}`);
    });
    console.log(`\n📋 ${meetings.length} meetings total`);

    saveResult(dateStr, chambers, meetings, `AI-generated — ${meetings.length} meetings for ${humanDate}`);

  } catch (err) {
    console.error("Error:", err.message);
    saveResult(dateStr, emptyChambers(), [], `Error: ${err.message}`);
  }
}

main();
