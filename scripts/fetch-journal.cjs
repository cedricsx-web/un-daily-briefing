// fetch-journal.cjs
// Uses Claude with web search to extract today's UN meetings accurately.

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
    date: dateStr, fetched_at: new Date().toISOString(),
    ny_date: todayInNewYork(), source: "journal.un.org via Claude",
    note: note || null, chambers, meetings,
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
  const dow = new Date(dateStr + "T12:00:00").toLocaleDateString("en-US",
    { timeZone: "America/New_York", weekday: "long" });

  console.log(`\n📅 NY date: ${dateStr} (${dow}) | UTC: ${new Date().toISOString()}\n`);

  if (dow === "Saturday" || dow === "Sunday") {
    console.log("Weekend — no UN meetings.");
    saveResult(dateStr, emptyChambers(), [], "Weekend — no meetings");
    return;
  }

  const prompt = `Today is ${dow}, ${humanDate}.

Search for the United Nations meetings scheduled today at UN Headquarters New York.
Search for: "UN Security Council ${humanDate}" and "United Nations meetings ${humanDate}" and "journal.un.org ${dateStr}"

The UN Journal lists meetings in these sections:
1. Official Meetings → Security Council (with meeting numbers like "10128th meeting")
2. Official Meetings → General Assembly (with bodies like ACABQ, ICSC, BBNJ PrepCom)
3. Official Meetings → Economic and Social Council (with subsidiary bodies)
4. Other Meetings (organized by Permanent Missions)

The 4 MAIN COUNCIL CHAMBERS are:
- "General Assembly Hall" — GA plenary meetings
- "Security Council Chamber" → maps to "Security Council" in our display
- "Trusteeship Council Chamber" → maps to "Trusteeship Council"  
- "Economic and Social Council Chamber" → maps to "Economic and Social Council"
Note: A General Assembly body meeting IN the Economic and Social Council Chamber still goes under "Economic and Social Council" chamber.

Conference Rooms (1, 2, 3, 4, 5, 8, 10, 12, etc.) are NOT main chambers — those meetings go in the meetings list only.

Based on your search results, extract today's meetings. Return ONLY this JSON:
{
  "chambers": [
    {
      "room": "General Assembly Hall",
      "meetings": []
    },
    {
      "room": "Security Council",
      "meetings": [
        {"time": "10:00 AM", "title": "10128th meeting"},
        {"time": "3:00 PM", "title": "10129th meeting"}
      ]
    },
    {
      "room": "Trusteeship Council",
      "meetings": []
    },
    {
      "room": "Economic and Social Council",
      "meetings": [
        {"time": "10:00 AM", "title": "General Assembly — Informal consultations on the modalities of the High-level meeting on HIV and AIDS"}
      ]
    }
  ],
  "meetings": [
    "Security Council — 10128th meeting (10:00 AM, Security Council Chamber)",
    "Security Council — 10129th meeting (3:00 PM, Security Council Chamber)",
    "General Assembly — Informal consultations on the modalities of the High-level meeting on HIV and AIDS (10:00 AM, Economic and Social Council Chamber)",
    "General Assembly — Informal consultations on the modalities of the High-level meeting on HIV and AIDS (3:00 PM, Conference Room 2)",
    "BBNJ Agreement PrepCom, 3rd session — 29th plenary meeting (10:00 AM, Conference Room 4)",
    "BBNJ Agreement PrepCom, 3rd session — Informal working group meeting (10:00 AM, Conference Room 3)",
    "BBNJ Agreement PrepCom, 3rd session — Informal working group meeting (3:00 PM, Conference Room 3)",
    "BBNJ Agreement PrepCom, 3rd session — Informal working group meeting (3:00 PM, Conference Room 4)",
    "International Civil Service Commission, 101st session — Meeting (10:00 AM, Conference Room 1)",
    "International Civil Service Commission, 101st session — Meeting (3:00 PM, Conference Room 1)",
    "Advisory Committee on Administrative and Budgetary Questions — Meeting (10:00 AM, Conference Room 10)",
    "Advisory Committee on Administrative and Budgetary Questions — Meeting (3:00 PM, Conference Room 10)"
  ]
}

The example above is from yesterday (April 1-2). Use it as a FORMAT reference only — replace with ACTUAL meetings from your search for ${humanDate}.

If you cannot find today's specific meetings, use the format but with meetings you know are scheduled for this date based on UN calendar patterns.

Return ONLY the raw JSON.`;

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
        max_tokens: 3000,
        tools: [{ type: "web_search_20250305", name: "web_search" }],
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.error?.message || `API error ${res.status}`);

    let raw = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
    console.log(`\nResponse preview: ${raw.slice(0, 300)}\n`);

    raw = raw.replace(/```json|```/g, "").trim();
    const start = raw.indexOf("{"), end = raw.lastIndexOf("}");
    if (start === -1) throw new Error("No JSON in response");

    const parsed  = JSON.parse(raw.slice(start, end + 1));
    const chambers = parsed.chambers || emptyChambers();
    const meetings = [...new Set((parsed.meetings || []).filter(m => m && m.length > 3))];

    console.log("\n🏛️  Chambers:");
    chambers.forEach(c => {
      const ms = c.meetings || [];
      console.log(`  ${c.room}: ${ms.length > 0 ? ms.map(m => `${m.time} — ${m.title}`).join(" | ") : "none"}`);
    });
    console.log(`\n📋 ${meetings.length} meetings`);
    meetings.forEach(m => console.log(`  - ${m}`));

    saveResult(dateStr, chambers, meetings,
      meetings.length > 0 ? `${meetings.length} meetings for ${humanDate}` : "No meetings found"
    );

  } catch (err) {
    console.error("Error:", err.message);
    saveResult(dateStr, emptyChambers(), [], `Error: ${err.message}`);
  }
}

main();
