// fetch-journal.cjs — Uses Claude with web search to read the UN Journal

const { writeFileSync, mkdirSync } = require("fs");

const API_KEY = process.env.VITE_ANTHROPIC_KEY;
if (!API_KEY) { console.error("❌ VITE_ANTHROPIC_KEY not set"); process.exit(1); }

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
    source: "journal.un.org via Claude",
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
  const monthNames = ["","January","February","March","April","May","June","July","August","September","October","November","December"];
  const humanDate = `${monthNames[parseInt(month)]} ${parseInt(day)}, ${year}`;

  console.log(`\n📅 NY date: ${dateStr} | UTC: ${new Date().toISOString()}\n`);
  console.log("Calling Claude API with web search...");

  const prompt = `Today is ${humanDate} (${dateStr}).

Search for and read the UN Journal for today at: https://journal.un.org/en/new-york/all/${dateStr}

The UN Journal lists ALL meetings happening at UN Headquarters in New York today. It has these sections:
- Official Meetings (sub-sections: Security Council, General Assembly, Economic and Social Council)
- Other Meetings (organized by Permanent Missions, UN bodies, etc.)

For EACH meeting extract:
- title: the full meeting name
- time: start time in format "10:00 AM", "3:00 PM" etc (use TBD if not listed)
- room: the exact room name as written in the journal (e.g. "Security Council Consultations Room", "Economic and Social Council Chamber", "General Assembly Hall", "Conference Room 3", "Conference Room 12", etc.)

IMPORTANT room→chamber mapping for the chambers array:
- Any meeting in "General Assembly Hall" → put under "General Assembly Hall" chamber
- Any meeting in "Security Council Chamber" OR "Security Council Consultations Room" → put under "Security Council" chamber  
- Any meeting in "Trusteeship Council Chamber" → put under "Trusteeship Council" chamber
- Any meeting in "Economic and Social Council Chamber" → put under "Economic and Social Council" chamber
- Meetings in Conference Rooms do NOT go in any chamber

Return ONLY this raw JSON — no markdown, no explanation:
{
  "chambers": [
    {
      "room": "General Assembly Hall",
      "meetings": [{"time": "10:00 AM", "title": "exact meeting title"}]
    },
    {
      "room": "Security Council",
      "meetings": [{"time": "11:30 AM", "title": "exact meeting title"}]
    },
    {
      "room": "Trusteeship Council",
      "meetings": []
    },
    {
      "room": "Economic and Social Council",
      "meetings": [{"time": "4:30 PM", "title": "exact meeting title"}]
    }
  ],
  "meetings": [
    "Full title of EVERY meeting (Official + Other Meetings combined)"
  ]
}

Be exhaustive — include ALL meetings from ALL sections of the journal including Other Meetings organized by Permanent Missions.`;

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
    if (!res.ok) throw new Error(data?.error?.message || `API error ${res.status}`);

    let raw = "";
    for (const block of data.content || []) {
      if (block.type === "text") raw += block.text;
    }

    console.log(`\nRaw response preview:\n${raw.slice(0, 300)}\n`);

    raw = raw.replace(/```json|```/g, "").trim();
    const start = raw.indexOf("{");
    const end   = raw.lastIndexOf("}");
    if (start === -1 || end === -1) throw new Error("No JSON in response");

    const parsed = JSON.parse(raw.slice(start, end + 1));
    const chambers = parsed.chambers || emptyChambers();
    const meetings = (parsed.meetings || []).filter(m => m && m.length > 3);

    // Deduplicate meetings list
    const uniqueMeetings = [...new Set(meetings)];

    console.log("\n🏛️  Chambers:");
    chambers.forEach(c => {
      const ms = c.meetings || [];
      console.log(`  ${c.room}: ${ms.length > 0 ? ms.map(m => `${m.time} — ${m.title}`).join(" | ") : "none"}`);
    });
    console.log(`\n📋 Total meetings: ${uniqueMeetings.length}`);
    uniqueMeetings.forEach(m => console.log(`  - ${m}`));

    saveResult(dateStr, chambers, uniqueMeetings,
      uniqueMeetings.length > 0
        ? `Live — ${uniqueMeetings.length} meetings from journal.un.org`
        : "journal.un.org returned no meetings for today"
    );

  } catch (err) {
    console.error("Error:", err.message);
    saveResult(dateStr, emptyChambers(), [], `Error: ${err.message}`);
  }
}

main();
