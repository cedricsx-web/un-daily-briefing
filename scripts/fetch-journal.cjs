// fetch-journal.cjs — uses Puppeteer to render journal.un.org

const { writeFileSync, mkdirSync } = require("fs");
const puppeteer = require("puppeteer");

const ROOM_MAP = {
  "general assembly hall": "General Assembly Hall",
  "general assembly": "General Assembly Hall",
  "security council": "Security Council",
  "trusteeship council": "Trusteeship Council",
  "economic and social council": "Economic and Social Council",
  "ecosoc chamber": "Economic and Social Council",
  "ecosoc": "Economic and Social Council",
};

function normalizeRoom(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  for (const [key, val] of Object.entries(ROOM_MAP)) {
    if (lower.includes(key)) return val;
  }
  return raw.trim();
}

function normalizeTime(raw) {
  if (!raw) return "TBD";
  const clean = raw.toString().trim()
    .replace(/a\.m\./gi, "AM").replace(/p\.m\./gi, "PM")
    .replace(/noon/gi, "12:00 PM")
    .replace(/\s+/g, " ");
  if (/\d{1,2}:\d{2}\s*(AM|PM)/i.test(clean)) return clean.toUpperCase();
  const m24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    let h = parseInt(m24[1]);
    const min = m24[2];
    const period = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${h}:${min} ${period}`;
  }
  return clean;
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
  const output = {
    date: dateStr,
    fetched_at: new Date().toISOString(),
    ny_date: todayInNewYork(),
    source: "journal.un.org",
    note: note || null,
    chambers,
    meetings,
  };
  writeFileSync("public/journal.json", JSON.stringify(output, null, 2));
  console.log(`✅ Saved — ${meetings.length} meetings | ${note || "ok"}`);
}

async function main() {
  const dateStr = todayInNewYork();
  console.log(`\n📅 New York date: ${dateStr}`);
  console.log(`🕐 UTC: ${new Date().toISOString()}\n`);

  const url = `https://journal.un.org/en/new-york/all/${dateStr}`;
  console.log(`Opening: ${url}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36");

    // Intercept API calls made by the page
    const apiResponses = [];
    page.on("response", async response => {
      const respUrl = response.url();
      const ct = response.headers()["content-type"] || "";
      if (ct.includes("json") && respUrl.includes("journal.un.org")) {
        try {
          const data = await response.json();
          apiResponses.push({ url: respUrl, data });
          console.log(`  📡 Intercepted API: ${respUrl}`);
        } catch (_) {}
      }
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    // Wait a bit more for any lazy-loaded content
    await new Promise(r => setTimeout(r, 3000));

    console.log(`Page title: ${await page.title()}`);

    // First try: extract from intercepted API calls
    const meetings = [];
    const chamberMap = {};

    function processItem(item) {
      const title = item.title || item.meeting_title || item.name || item.subject;
      const time = item.time || item.startTime || item.start_time || item.hour;
      const room = item.room || item.location || item.venue || item.chamber;
      if (title && typeof title === "string" && title.length > 10) {
        const normRoom = normalizeRoom(room);
        const normTime = normalizeTime(time);
        meetings.push({ title, time: normTime, room: normRoom });
        if (normRoom) {
          if (!chamberMap[normRoom]) chamberMap[normRoom] = [];
          chamberMap[normRoom].push({ time: normTime, title });
        }
        return true;
      }
      return false;
    }

    function walkData(obj) {
      if (!obj || typeof obj !== "object") return;
      if (Array.isArray(obj)) {
        obj.forEach(item => {
          if (item && typeof item === "object") {
            processItem(item);
            walkData(item);
          }
        });
      } else {
        Object.values(obj).forEach(walkData);
      }
    }

    apiResponses.forEach(({ data }) => walkData(data));
    console.log(`API intercept: ${meetings.length} meetings`);

    // Second try: parse rendered DOM
    if (meetings.length === 0) {
      const domData = await page.evaluate(() => {
        const results = [];

        // Try common meeting selectors
        const selectors = [
          "[class*='meeting']", "[class*='Meeting']",
          "[class*='event']", "[class*='Event']",
          ".views-row", "tr", "li",
        ];

        for (const sel of selectors) {
          const items = document.querySelectorAll(sel);
          if (items.length < 2) continue;

          let found = 0;
          items.forEach(item => {
            const text = (item.textContent || "").replace(/\s+/g, " ").trim();
            if (text.length < 15 || text.length > 400) return;
            if (!/committee|council|assembly|working.?group|panel|session|meeting|conference/i.test(text)) return;

            const timeEl = item.querySelector("[class*='time'],[class*='hour'],time");
            const roomEl = item.querySelector("[class*='room'],[class*='location'],[class*='venue']");
            const titleEl = item.querySelector("h1,h2,h3,h4,a,[class*='title']");

            results.push({
              title: (titleEl?.textContent || text).replace(/\s+/g, " ").trim(),
              time: (timeEl?.textContent || "").trim(),
              room: (roomEl?.textContent || "").trim(),
            });
            found++;
          });

          if (found > 0) {
            console.log(`DOM selector "${sel}": ${found} items`);
            break;
          }
        }

        // Also grab all text and look for time + meeting patterns
        if (results.length === 0) {
          const walker = document.createTreeWalker(document.body, 4);
          let node;
          while ((node = walker.nextNode())) {
            const text = (node.textContent || "").trim();
            if (text.length < 20 || text.length > 300) continue;
            if (!/committee|council|assembly|working group|session|meeting/i.test(text)) continue;
            if (/cookie|javascript|privacy/i.test(text)) continue;
            results.push({ title: text, time: "", room: "" });
          }
        }

        return results;
      });

      domData.forEach(item => processItem(item));
      console.log(`DOM parse: ${meetings.length} meetings`);
    }

    // Save a screenshot for debugging
    await page.screenshot({ path: "public/journal-debug.png", fullPage: false });
    console.log("Screenshot saved to public/journal-debug.png");

    await browser.close();

    const chambers = [
      "General Assembly Hall",
      "Security Council",
      "Trusteeship Council",
      "Economic and Social Council",
    ].map(name => ({ room: name, meetings: chamberMap[name] || [] }));

    const titles = [...new Set(meetings.map(m => m.title))].slice(0, 30);

    if (titles.length > 0) {
      saveResult(dateStr, chambers, titles, `Live from journal.un.org — ${titles.length} meetings`);
    } else {
      saveResult(dateStr, emptyChambers(), [], "Page loaded but no meetings parsed — check journal-debug.png");
    }

  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    console.error("Puppeteer error:", err.message);
    saveResult(todayInNewYork(), emptyChambers(), [], `Puppeteer error: ${err.message}`);
  }
}

main();
