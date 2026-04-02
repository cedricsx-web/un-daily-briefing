// fetch-journal.cjs
// Intercepts window.fetch BEFORE the page app runs, capturing all API calls
// including those to journal-api.un.org

const { writeFileSync, mkdirSync } = require("fs");
const puppeteer = require("puppeteer");

const CHAMBER_MAP = {
  "general assembly hall": "General Assembly Hall",
  "security council chamber": "Security Council",
  "security council consultations room": "Security Council",
  "trusteeship council chamber": "Trusteeship Council",
  "economic and social council chamber": "Economic and Social Council",
};

function chamberForRoom(raw) {
  if (!raw) return null;
  const lower = raw.toLowerCase().trim();
  for (const [key, val] of Object.entries(CHAMBER_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

function normalizeTime(raw) {
  if (!raw) return "TBD";
  const clean = raw.toString().trim().replace(/\s*-\s*\d{1,2}:\d{2}$/, "");
  const m = clean.match(/(\d{1,2}):(\d{2})/);
  if (!m) return raw.toString().trim();
  let h = parseInt(m[1]), min = m[2];
  const p = h >= 12 ? "PM" : "AM";
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${min} ${p}`;
}

function todayInNewYork() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit",
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
    date: dateStr, fetched_at: new Date().toISOString(),
    ny_date: todayInNewYork(), source: "journal.un.org",
    note: note || null, chambers, meetings,
  }, null, 2));
  console.log(`✅ Saved — ${meetings.length} meetings | ${note || "ok"}`);
}

function extractFromData(obj, meetings, chamberMap) {
  if (!obj || typeof obj !== "object") return;
  if (Array.isArray(obj)) {
    obj.forEach(item => extractFromData(item, meetings, chamberMap));
    return;
  }
  const title = obj.title || obj.Title || obj.meeting_title || obj.MeetingTitle
              || obj.name  || obj.Name  || obj.subject || obj.Subject;
  const time  = obj.time  || obj.Time  || obj.startTime || obj.StartTime
              || obj.start_time || obj.hour || obj.Hour || obj.startHour;
  const room  = obj.room  || obj.Room  || obj.location || obj.Location
              || obj.venue || obj.Venue || obj.chamber  || obj.Chamber
              || obj.roomName || obj.RoomName;

  if (title && typeof title === "string" && title.trim().length > 8) {
    const normTime    = normalizeTime(time);
    const normChamber = chamberForRoom(room);
    meetings.push({ title: title.trim(), time: normTime, room: room || null });
    if (normChamber) {
      if (!chamberMap[normChamber]) chamberMap[normChamber] = [];
      chamberMap[normChamber].push({ time: normTime, title: title.trim() });
    }
    return;
  }
  Object.values(obj).forEach(v => {
    if (v && typeof v === "object") extractFromData(v, meetings, chamberMap);
  });
}

async function main() {
  const dateStr = todayInNewYork();
  console.log(`\n📅 NY date: ${dateStr} | UTC: ${new Date().toISOString()}\n`);

  const url = `https://journal.un.org/en/new-york/all/${dateStr}`;
  console.log(`Opening: ${url}`);

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
      args: ["--no-sandbox","--disable-setuid-sandbox","--disable-dev-shm-usage","--disable-gpu"],
    });

    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36");

    // ── KEY: Intercept window.fetch BEFORE page scripts run ──────────────
    // This captures ALL fetch calls including journal-api.un.org
    await page.evaluateOnNewDocument(() => {
      window._journalApiCalls = [];

      // Override fetch
      const _origFetch = window.fetch;
      window.fetch = async function(...args) {
        const response = await _origFetch.apply(this, args);
        const url = (args[0] instanceof Request ? args[0].url : args[0]) || "";
        try {
          const clone = response.clone();
          const text  = await clone.text();
          window._journalApiCalls.push({ url: url.toString(), body: text, status: response.status });
        } catch (_) {}
        return response;
      };

      // Override XHR too
      const _origXHROpen = XMLHttpRequest.prototype.open;
      const _origXHRSend = XMLHttpRequest.prototype.send;
      XMLHttpRequest.prototype.open = function(method, url) {
        this._url = url;
        return _origXHROpen.apply(this, arguments);
      };
      XMLHttpRequest.prototype.send = function() {
        this.addEventListener("load", () => {
          window._journalApiCalls.push({
            url: this._url || "", body: this.responseText || "", status: this.status
          });
        });
        return _origXHRSend.apply(this, arguments);
      };
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: 45000 });
    console.log(`Page title: ${await page.title()}`);

    // Wait for async data loading
    console.log("Waiting 8s for data...");
    await new Promise(r => setTimeout(r, 8000));

    // Scroll to trigger lazy loading
    await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); });
    await new Promise(r => setTimeout(r, 3000));

    // Read all intercepted calls
    const allCalls = await page.evaluate(() => window._journalApiCalls || []);
    console.log(`\nIntercepted ${allCalls.length} API calls:`);

    const meetings   = [];
    const chamberMap = {};

    for (const call of allCalls) {
      const shortUrl = call.url.replace(/https?:\/\/[^/]+/, "");
      console.log(`  [${call.status}] ${call.url.slice(0, 80)} | ${call.body.length}b`);

      if (call.body.length < 10) continue;

      // Log the body for debugging
      if (call.body.trim().startsWith("{") || call.body.trim().startsWith("[")) {
        console.log(`    → JSON preview: ${call.body.slice(0, 200)}`);
        try {
          const data = JSON.parse(call.body);
          const before = meetings.length;
          extractFromData(data, meetings, chamberMap);
          if (meetings.length > before) {
            console.log(`    ✅ Found ${meetings.length - before} meetings!`);
          }
        } catch (_) {}
      } else if (!call.url.match(/\.(js|css|png|svg|ico)/)) {
        console.log(`    → text: ${call.body.slice(0, 100)}`);
      }
    }

    await browser.close();

    // Summary
    console.log("\n🏛️  Chambers:");
    ["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"].forEach(c => {
      const ms = chamberMap[c] || [];
      console.log(`  ${c}: ${ms.length > 0 ? ms.map(m=>`${m.time} — ${m.title}`).join(" | ") : "none"}`);
    });

    const chambers = ["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"]
      .map(name => ({ room: name, meetings: (chamberMap[name]||[]).map(m=>({time:m.time,title:m.title})) }));
    const titles = [...new Set(meetings.map(m=>m.title).filter(t=>t&&t.length>4))].slice(0,30);
    console.log(`\n📋 ${titles.length} meetings`);
    titles.forEach(t => console.log(`  - ${t}`));

    saveResult(dateStr, chambers, titles,
      titles.length > 0
        ? `Live from journal.un.org — ${titles.length} meetings`
        : `Page loaded, ${allCalls.length} API calls intercepted but no meetings found — check log`
    );

  } catch (err) {
    if (browser) await browser.close().catch(()=>{});
    console.error("Error:", err.message);
    saveResult(todayInNewYork(), emptyChambers(), [], `Error: ${err.message}`);
  }
}

main();
