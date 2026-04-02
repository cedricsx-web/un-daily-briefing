// fetch-journal.cjs
// Uses Claude API with web search to read journal.un.org and extract today's meetings.

const { writeFileSync, mkdirSync } = require("fs");

const API_KEY = process.env.VITE_ANTHROPIC_KEY;

if (!API_KEY) {
  console.error("❌ VITE_ANTHROPIC_KEY not set");
  process.exit(1);
}

function todayInNewYork() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const p = {};
  parts.forEach(({ type, value }) => { p[type] = value; });
  return `${p.year}-${p.month}-${p.day}`;
}

function emptyChambers() {
  return [
    { room: "General Assembly Hall", meetings: [] },
    { room: "Security Council", meetings: [] },
    { room: "Trusteeship Council", meetings: [] },
    { room: "Economic and Social Council", meetings: [] },
  ];
}

function saveResult(dateStr, chambers, meetings, note) {
  mkdirSync("public", { recursive: true });
  writeFileSync("public/journal.json", JSON.stringify({
    date: dateStr,
    fetched_at: new Date().toISOString(),
    ny_date: todayInNewYork(),
    source: "journal.un.org via Claude",
    note: note || null,
    chambers,
    meetings,
  }, null, 2));
  console.log(`✅ Saved — ${meetings.length} meetings | ${note || "ok"}`);
}

async function main() {
  const dateStr = todayInNewYork();
  console.log(`\n📅 NY date: ${dateStr} | UTC: ${new Date().toISOString()}\n`);

  const prompt = `Today is ${dateStr}. 

Please search the web and read the UN Journal page at:
https://journal.un.org/en/new-york/all/${dateStr}

Extract ALL meetings listed for today. The page has sections:
- Official Meetings (with sub-sections: Security Council, General Assembly, Economic and Social Council, etc.)
- Other Meetings

For each meeting, extract:
1. The meeting title
2. The start time (like "10:00 AM", "11:30 AM", "3:00 PM")
3. The room/location (e.g. "Security Council Consultations Room", "Economic and Social Council Chamber", "General Assembly Hall", "Conference Room 1", etc.)

Then return ONLY this JSON structure, no markdown, no explanation:
{
  "chambers": [
    {
      "room": "General Assembly Hall",
      "meetings": [{"time": "10:00 AM", "title": "Meeting title here"}]
    },
    {
      "room": "Security Council",
      "meetings": [{"time": "11:30 AM", "title": "Closed - Consultations of the whole"}]
    },
    {
      "room": "Trusteeship Council",
      "meetings": []
    },
    {
      "room": "Economic and Social Council",
      "meetings": [{"time": "4:30 PM", "title": "Briefing to Member States"}]
    }
  ],
  "meetings": [
    "Full title of every meeting today (all sections combined)"
  ]
}

Rules:
- chambers: only list meetings physically held IN that specific room. A Security Council meeting held in the ECOSOC Chamber goes under "Economic and Social Council", not "Security Council".
- meetings: flat list of ALL meeting titles from the page (Official + Other Meetings)
- If the page shows no meetings or says "No meetings scheduled", return empty arrays
- Return ONLY the raw JSON object`;

  console.log("Calling Claude API with web search...");

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error?.message || `API error ${res.status}`);
    }

    // Extract text from response
    let raw = "";
    for (const block of data.content || []) {
      if (block.type === "text") raw += block.text;
    }

    console.log(`\nRaw response (first 500 chars):\n${raw.slice(0, 500)}\n`);

    // Clean and parse JSON
    raw = raw.replace(/```json|```/g, "").trim();
    const start = raw.indexOf("{");
    const end   = raw.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON found in response");

    const parsed = JSON.parse(raw.slice(start, end + 1));

    const chambers = parsed.chambers || emptyChambers();
    const meetings = parsed.meetings || [];

    // Log chamber summary
    console.log("🏛️  Chambers:");
    chambers.forEach(c => {
      const ms = c.meetings || [];
      console.log(`  ${c.room}: ${ms.length > 0 ? ms.map(m => `${m.time} — ${m.title}`).join(" | ") : "none"}`);
    });
    console.log(`\n📋 Total meetings: ${meetings.length}`);
    meetings.forEach(m => console.log(`  - ${m}`));

    saveResult(dateStr, chambers, meetings,
      meetings.length > 0
        ? `Live from journal.un.org — ${meetings.length} meetings`
        : "journal.un.org returned no meetings for today"
    );

  } catch (err) {
    console.error("Error:", err.message);
    saveResult(todayInNewYork(), emptyChambers(), [], `Error: ${err.message}`);
  }
}

main();
