// fetch-journal.cjs - DEBUG VERSION to find new API structure
const { writeFileSync, mkdirSync } = require("fs");
const puppeteer = require("puppeteer");

function todayInNewYork() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const p = {};
  parts.forEach(function(x) { p[x.type] = x.value; });
  return p.year + "-" + p.month + "-" + p.day;
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
    date: dateStr, fetched_at: new Date().toISOString(),
    ny_date: todayInNewYork(), source: "journal-api.un.org",
    note: note || null, chambers: chambers, meetings: meetings,
  }, null, 2));
  console.log("Saved " + meetings.length + " meetings | " + (note || "ok"));
}

async function main() {
  const dateStr = todayInNewYork();
  const dow = new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { timeZone: "America/New_York", weekday: "long" });
  console.log("NY date: " + dateStr + " (" + dow + ")");
  if (dow === "Saturday" || dow === "Sunday") { saveResult(dateStr, emptyChambers(), [], "Weekend"); return; }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
    });
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36");
    await page.setExtraHTTPHeaders({ "Accept-Language": "en-US,en;q=0.9" });

    let journalData = null;
    page.on("response", async function(response) {
      if (!response.url().includes("/allnew/")) return;
      try {
        const buf = await response.buffer();
        journalData = JSON.parse(buf.toString("utf8"));
        console.log("Captured allnew: " + buf.length + "b");
      } catch(e) {}
    });

    await page.goto("https://journal.un.org/en/new-york/all/" + dateStr, { waitUntil: "networkidle2", timeout: 45000 });
    await new Promise(function(r) { setTimeout(r, 5000); });
    await browser.close();

    if (!journalData) { saveResult(dateStr, emptyChambers(), [], "No data"); return; }

    // === FULL STRUCTURE DEBUG ===
    console.log("\n=== TOP LEVEL KEYS ===");
    console.log(Object.keys(journalData).join(", "));

    console.log("\n=== officialMeetings KEYS ===");
    const om = journalData.officialMeetings || {};
    console.log(Object.keys(om).join(", "));

    console.log("\n=== officialMeetings.groups ===");
    const groups = om.groups || [];
    console.log("Number of groups: " + groups.length);
    groups.forEach(function(g, i) {
      console.log("\nGroup " + i + ": [" + (g.groupNameTitle || g.name || "?") + "]");
      console.log("  Keys: " + Object.keys(g).join(", "));
      const sessions = g.sessions || g.items || [];
      console.log("  Sessions: " + sessions.length);
      sessions.forEach(function(s, j) {
        const meetings = s.meetings || s.items || [];
        console.log("  Session " + j + ": [" + (s.name || "?") + "] session=[" + (s.session || "") + "] meetings=" + meetings.length);
        meetings.forEach(function(m, k) {
          const room = (Array.isArray(m.rooms) && m.rooms[0]) ? m.rooms[0].value : (m.room ? JSON.stringify(m.room) : "?");
          const num = m.meetingNumber ? JSON.stringify(m.meetingNumber).slice(0, 40) : "";
          const title = m.title ? JSON.stringify(m.title).slice(0, 40) : "";
          console.log("    Mtg " + k + ": room=[" + room + "] num=" + num + " title=" + title);
        });
      });
    });

    // Check other sections
    ["informalMeetings", "informalConsultations", "otherMeetings"].forEach(function(key) {
      if (journalData[key]) {
        console.log("\n=== " + key + " ===");
        const groups2 = (journalData[key].groups || []);
        console.log("Groups: " + groups2.length);
        groups2.slice(0,3).forEach(function(g) {
          console.log("  Group: [" + (g.groupNameTitle || g.name || "?") + "] sessions=" + (g.sessions || []).length);
        });
      }
    });

    saveResult(dateStr, emptyChambers(), [], "Debug run - see log for structure");

  } catch (err) {
    if (browser) { try { await browser.close(); } catch(e) {} }
    console.error("Error: " + err.message);
    saveResult(todayInNewYork(), emptyChambers(), [], "Error: " + err.message);
  }
}

main();
