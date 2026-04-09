import { useState, useEffect, useRef } from "react";

const API_KEY = import.meta.env.VITE_ANTHROPIC_KEY || "";
const BASE = import.meta.env.BASE_URL || "/";
const SB_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const SDG_COLORS = {
  1: "#E5243B", 2: "#DDA63A", 3: "#4C9F38", 4: "#C5192D",
  5: "#FF3A21", 6: "#26BDE2", 7: "#FCC30B", 8: "#A21942",
  9: "#FD6925", 10: "#DD1367", 11: "#FD9D24", 12: "#BF8B2E",
  13: "#3F7E44", 14: "#0A97D9", 15: "#56C02B", 16: "#00689D",
  17: "#19486A",
};

const CHAMBER_ICONS = {
  "General Assembly Hall": "GA",
  "Security Council": "SC",
  "Trusteeship Council": "TC",
  "Economic and Social Council": "ECOSOC",
};

const MONTHS = ["January","February","March","April","May","June","July",
  "August","September","October","November","December"];
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];


// UN International Days & Weeks -- keyed as "MM-DD"
// Each entry: { name, url }
const UN_OBSERVANCES = {
  "01-04": { name: "World Braille Day", url: "https://www.un.org/en/observances/braille-day" },
  "01-24": { name: "International Day of Education", url: "https://www.un.org/en/observances/education-day" },
  "01-26": { name: "International Day of Clean Energy", url: "https://www.un.org/en/observances/clean-energy-day" },
  "01-27": { name: "International Day of Commemoration in Memory of the Victims of the Holocaust", url: "https://www.un.org/en/observances/commemoration-holocaust-victims-day" },
  "01-28": { name: "International Day of Peaceful Coexistence", url: "https://www.un.org/en/observances/peaceful-coexistence-day" },
  "02-02": { name: "World Wetlands Day", url: "https://www.un.org/en/observances/world-wetlands-day" },
  "02-04": { name: "International Day of Human Fraternity", url: "https://www.un.org/en/observances/human-fraternity" },
  "02-06": { name: "International Day of Zero Tolerance to Female Genital Mutilation", url: "https://www.un.org/en/observances/female-genital-mutilation-day" },
  "02-11": { name: "International Day of Women and Girls in Science", url: "https://www.un.org/en/observances/women-and-girls-in-science-day/" },
  "02-13": { name: "World Radio Day", url: "https://www.un.org/en/observances/radio-day" },
  "02-20": { name: "World Day of Social Justice", url: "https://www.un.org/en/observances/social-justice-day" },
  "02-21": { name: "International Mother Language Day", url: "https://www.un.org/en/observances/mother-language-day" },
  "03-03": { name: "World Wildlife Day", url: "https://www.un.org/en/observances/world-wildlife-day" },
  "03-05": { name: "International Day for Disarmament and Non-Proliferation Awareness", url: "https://www.un.org/en/observances/disarmament-non-proliferation-awareness-day" },
  "03-08": { name: "International Women's Day", url: "https://www.un.org/en/observances/womens-day" },
  "03-10": { name: "International Day of Women Judges", url: "https://www.un.org/en/observances/women-judges-day" },
  "03-15": { name: "International Day to Combat Islamophobia", url: "https://www.un.org/en/observances/anti-islamophobia-day" },
  "03-20": { name: "International Day of Happiness", url: "https://www.un.org/en/observances/happiness-day" },
  "03-21": { name: "International Day for the Elimination of Racial Discrimination", url: "https://www.un.org/en/observances/end-racism-day" },
  "03-22": { name: "World Water Day", url: "https://www.un.org/en/observances/water-day" },
  "03-23": { name: "World Meteorological Day", url: "https://wmo.int/about-wmo/world-meteorological-day" },
  "03-24": { name: "World Tuberculosis Day", url: "https://www.who.int/campaigns/world-tb-day/" },
  "03-25": { name: "International Day of Remembrance of the Victims of Slavery and the Transatlantic Slave Trade", url: "https://www.un.org/en/observances/transatlantic-slave-trade" },
  "03-30": { name: "International Day of Zero Waste", url: "https://www.un.org/en/observances/zero-waste-day" },
  "04-02": { name: "World Autism Awareness Day", url: "https://www.un.org/en/observances/autism-day" },
  "04-04": { name: "International Day for Mine Awareness and Assistance in Mine Action", url: "https://www.un.org/en/observances/mine-awareness-day" },
  "04-05": { name: "International Day of Conscience", url: "https://www.un.org/en/observances/conscience-day" },
  "04-06": { name: "International Day of Sport for Development and Peace", url: "https://www.un.org/en/observances/sport-day" },
  "04-07": { name: "World Health Day", url: "https://www.who.int/campaigns/world-health-day" },
  "04-12": { name: "International Day of Human Space Flight", url: "https://www.un.org/en/observances/human-spaceflight-day" },
  "04-21": { name: "World Creativity and Innovation Day", url: "https://www.un.org/en/observances/creativity-and-innovation-day" },
  "04-22": { name: "International Mother Earth Day", url: "https://www.un.org/en/observances/earth-day" },
  "04-23": { name: "World Book and Copyright Day", url: "https://www.unesco.org/en/days/world-book-and-copyright" },
  "04-24": { name: "International Day of Multilateralism and Diplomacy for Peace", url: "https://www.un.org/en/observances/Multilateralism-for-Peace-day" },
  "04-25": { name: "World Malaria Day", url: "https://www.who.int/campaigns/world-malaria-day/world-malaria-day-2021" },
  "04-26": { name: "International Chernobyl Disaster Remembrance Day", url: "https://www.un.org/en/observances/chernobyl-remembrance-day" },
  "04-28": { name: "World Day for Safety and Health at Work", url: "https://www.un.org/en/observances/work-safety-day" },
  "04-29": { name: "International Day in Memory of the Victims of Earthquakes", url: "https://www.un.org/en/observances/earthquake-victims-day" },
  "04-30": { name: "International Jazz Day", url: "https://www.un.org/en/observances/jazz-day" },
  "05-03": { name: "World Press Freedom Day", url: "https://www.un.org/en/observances/press-freedom-day" },
  "05-15": { name: "International Day of Families", url: "https://www.un.org/en/observances/international-day-of-families" },
  "05-16": { name: "International Day of Living Together in Peace", url: "https://www.un.org/en/observances/living-in-peace-day" },
  "05-17": { name: "World Telecommunication and Information Society Day", url: "https://www.un.org/en/observances/telecommunication-day" },
  "05-20": { name: "World Bee Day", url: "https://www.fao.org/world-bee-day/en" },
  "05-21": { name: "World Day for Cultural Diversity for Dialogue and Development", url: "https://www.un.org/en/observances/cultural-diversity-day" },
  "05-22": { name: "International Day for Biological Diversity", url: "https://www.un.org/en/observances/biological-diversity-day" },
  "05-29": { name: "International Day of UN Peacekeepers", url: "https://www.un.org/en/observances/peacekeepers-day" },
  "05-31": { name: "World No-Tobacco Day", url: "https://www.who.int/campaigns/world-no-tobacco-day" },
  "06-01": { name: "Global Day of Parents", url: "https://www.un.org/en/observances/parents-day" },
  "06-03": { name: "World Bicycle Day", url: "https://www.un.org/en/observances/bicycle-day" },
  "06-04": { name: "International Day of Innocent Children Victims of Aggression", url: "https://www.un.org/en/observances/child-victim-day" },
  "06-05": { name: "World Environment Day", url: "https://www.un.org/en/observances/environment-day" },
  "06-08": { name: "World Oceans Day", url: "https://www.un.org/en/observances/oceans-day" },
  "06-12": { name: "World Day Against Child Labour", url: "https://www.un.org/en/observances/world-day-against-child-labour" },
  "06-17": { name: "World Day to Combat Desertification and Drought", url: "https://www.un.org/en/observances/desertification-day" },
  "06-18": { name: "International Day for Countering Hate Speech", url: "https://www.un.org/en/observances/countering-hate-speech" },
  "06-19": { name: "International Day for the Elimination of Sexual Violence in Conflict", url: "https://www.un.org/en/observances/end-sexual-violence-in-conflict-day" },
  "06-20": { name: "World Refugee Day", url: "https://www.un.org/en/observances/refugee-day" },
  "06-21": { name: "International Day of Yoga", url: "https://www.un.org/en/observances/yoga-day" },
  "06-23": { name: "United Nations Public Service Day", url: "https://www.un.org/en/observances/public-service-day" },
  "06-26": { name: "United Nations International Day in Support of Victims of Torture", url: "https://www.un.org/en/observances/torture-victims-day" },
  "07-11": { name: "World Population Day", url: "https://www.un.org/en/observances/world-population-day" },
  "07-15": { name: "World Youth Skills Day", url: "https://www.un.org/en/observances/youth-skills-day" },
  "07-18": { name: "Nelson Mandela International Day", url: "https://www.un.org/en/observances/mandela-day" },
  "07-28": { name: "World Hepatitis Day", url: "https://www.who.int/campaigns/world-hepatitis-day" },
  "07-30": { name: "International Day of Friendship", url: "https://www.un.org/en/observances/friendship-day" },
  "08-09": { name: "International Day of the World's Indigenous Peoples", url: "https://www.un.org/en/observances/indigenous-day" },
  "08-12": { name: "International Youth Day", url: "https://www.un.org/en/observances/youth-day" },
  "08-19": { name: "World Humanitarian Day", url: "https://www.un.org/en/observances/humanitarian-day" },
  "08-23": { name: "International Day for the Remembrance of the Slave Trade and its Abolition", url: "https://www.un.org/en/observances/slave-trade-abolition" },
  "09-05": { name: "International Day of Charity", url: "https://www.un.org/en/observances/charity-day" },
  "09-08": { name: "International Literacy Day", url: "https://www.un.org/en/observances/literacy-day" },
  "09-15": { name: "International Day of Democracy", url: "https://www.un.org/en/observances/democracy-day" },
  "09-16": { name: "International Day for the Preservation of the Ozone Layer", url: "https://www.un.org/en/observances/ozone-day" },
  "09-21": { name: "International Day of Peace", url: "https://www.un.org/en/observances/international-day-peace" },
  "09-26": { name: "International Day for the Total Elimination of Nuclear Weapons", url: "https://www.un.org/en/observances/nuclear-weapons-elimination-day" },
  "09-27": { name: "World Tourism Day", url: "https://www.un.org/en/observances/tourism-day" },
  "10-01": { name: "International Day of Older Persons", url: "https://www.un.org/en/observances/older-persons-day" },
  "10-02": { name: "International Day of Non-Violence", url: "https://www.un.org/en/observances/non-violence-day" },
  "10-05": { name: "World Teachers' Day", url: "https://www.un.org/en/observances/teachers-day" },
  "10-10": { name: "World Mental Health Day", url: "https://www.un.org/en/observances/world-mental-health-day" },
  "10-11": { name: "International Day of the Girl Child", url: "https://www.un.org/en/observances/girl-child-day" },
  "10-13": { name: "International Day for Disaster Risk Reduction", url: "https://www.un.org/en/observances/disaster-reduction-day" },
  "10-16": { name: "World Food Day", url: "https://www.fao.org/world-food-day/en" },
  "10-17": { name: "International Day for the Eradication of Poverty", url: "https://www.un.org/en/observances/day-for-eradicating-poverty" },
  "10-24": { name: "United Nations Day", url: "https://www.un.org/en/observances/un-day" },
  "11-05": { name: "World Tsunami Awareness Day", url: "https://www.un.org/en/observances/tsunami-awareness-day" },
  "11-10": { name: "World Science Day for Peace and Development", url: "https://www.un.org/en/observances/science-day" },
  "11-16": { name: "International Day for Tolerance", url: "https://www.un.org/en/observances/tolerance-day" },
  "11-19": { name: "World Toilet Day", url: "https://www.un.org/en/observances/toilet-day" },
  "11-20": { name: "World Children's Day", url: "https://www.un.org/en/observances/world-childrens-day" },
  "11-25": { name: "International Day for the Elimination of Violence against Women", url: "https://www.un.org/en/observances/ending-violence-against-women-day" },
  "11-29": { name: "International Day of Solidarity with the Palestinian People", url: "https://www.un.org/en/observances/international-day-solidarity-palestinian-people" },
  "12-01": { name: "World AIDS Day", url: "https://www.un.org/en/observances/world-aids-day" },
  "12-02": { name: "International Day for the Abolition of Slavery", url: "https://www.un.org/en/observances/slavery-abolition-day" },
  "12-03": { name: "International Day of Persons with Disabilities", url: "https://www.un.org/en/observances/day-of-persons-with-disabilities" },
  "12-05": { name: "International Volunteer Day", url: "https://www.un.org/en/observances/volunteer-day" },
  "12-09": { name: "International Anti-Corruption Day", url: "https://www.un.org/en/observances/anti-corruption-day" },
  "12-10": { name: "Human Rights Day", url: "https://www.un.org/en/observances/human-rights-day" },
  "12-11": { name: "International Mountain Day", url: "https://www.un.org/en/observances/mountain-day" },
  "12-18": { name: "International Migrants Day", url: "https://www.un.org/en/observances/migrants-day" },
  "12-20": { name: "International Human Solidarity Day", url: "https://www.un.org/en/observances/human-solidarity-day" },
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

function getWeekendObservances() {
  // Friday: show upcoming Sat + Sun. Monday: show past Sat + Sun.
  const now = new Date();
  const nyParts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York", weekday: "long", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const p = {};
  nyParts.forEach(({ type, value }) => { p[type] = value; });

  let offsets = [];
  let label = "";
  if (p.weekday === "Friday") {
    offsets = [1, 2];   // Sat, Sun ahead
    label = "This weekend";
  } else if (p.weekday === "Monday") {
    offsets = [-2, -1]; // Sat, Sun behind
    label = "This weekend";
  } else {
    return [];
  }

  const results = [];
  for (const offset of offsets) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    const parts2 = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York", month: "2-digit", day: "2-digit", weekday: "long",
    }).formatToParts(d);
    const p2 = {};
    parts2.forEach(({ type, value }) => { p2[type] = value; });
    const key = p2.month + "-" + p2.day;
    const obs = UN_OBSERVANCES[key];
    if (obs) results.push({ ...obs, weekday: p2.weekday, key, past: p.weekday === "Monday" });
  }
  return results;
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

// -- Chamber Card --------------------------------------------------------------
function ChamberCard({ chamber, index, apiKey }) {
  const icon = CHAMBER_ICONS[chamber.room] || "UN";
  const hasSession = chamber.meetings && chamber.meetings.length > 0;
  const isSC = chamber.room === "Security Council";

  const [recap, setRecap] = useState(null);      // full text
  const [recapTitle, setRecapTitle] = useState(null); // first line / topic title
  const [recapLoading, setRecapLoading] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const fetchedRef = useRef(false); // fetch only once

  // Extract meeting numbers from SC meetings
  const scMeetingNumbers = isSC
    ? chamber.meetings
        .filter(function(m) { return !m.cancelled; })
        .map(function(m) {
          const match = m.title.match(/(\d+)(st|nd|rd|th) meeting/i);
          return match ? match[1] + match[2] + " meeting" : null;
        })
        .filter(Boolean)
    : [];

  // Auto-fetch once when SC card mounts with meetings
  useEffect(function() {
    if (isSC && hasSession && scMeetingNumbers.length > 0 && apiKey && !fetchedRef.current) {
      fetchedRef.current = true;
      doFetch();
    }
  }, []);

  async function doFetch() {
    if (!apiKey || scMeetingNumbers.length === 0) return;
    setRecapLoading(true);
    try {
      const meetingRef = scMeetingNumbers.join(" and ");
      const today = new Date().toLocaleDateString("en-US", { timeZone: "America/New_York", month: "long", day: "numeric", year: "numeric" });
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{
            role: "user",
            content: "Today is " + today + ". The Security Council holds its " + meetingRef + " today. Search: \"" + meetingRef + " Security Council " + today + "\". Also search: \"" + meetingRef + " UNMIK OR Kosovo OR Haiti OR Yemen OR Gaza OR Syria OR Congo OR Sudan Security Council\". Also check main.un.org/securitycouncil/en/content/programme-work. Return answer in two parts split by ---FULL--- : Part 1 (before ---FULL---) the agenda item title only max 10 words e.g. The situation in Kosovo (UNMIK). Part 2 (after ---FULL---) a 3-5 sentence briefing: agenda item, who is briefing, main issue, expected outcome. Be accurate, use only search results.",
          }],
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      const text = (data.content || []).filter(function(b) { return b.type === "text"; }).map(function(b) { return b.text; }).join("").trim();
      const parts = text.split("---FULL---");
      // Clean the title: take only the last line before ---FULL--- that has real content
      // This strips Claude's reasoning text like "Now let me search..."
      const rawTitle = (parts[0] || "").trim();
      const titleLines = rawTitle.split("\n").map(function(l) { return l.replace(/[*_#]/g, "").trim(); }).filter(function(l) { return l.length > 3; });
      // The real title is usually the last non-empty line, often after "---" or "**"
      const cleanTitle = titleLines[titleLines.length - 1] || rawTitle;
      setRecapTitle(cleanTitle || null);
      setRecap((parts[1] || parts[0] || "").trim() || "No information found yet.");
    } catch (e) {
      setRecap("Search failed: " + e.message);
    }
    setRecapLoading(false);
  }

  return (
    <div style={{
      background: hasSession ? "rgba(0,150,214,0.08)" : "rgba(255,255,255,0.02)",
      border: hasSession ? "1px solid rgba(0,150,214,0.25)" : "1px solid rgba(255,255,255,0.06)",
      borderRadius: "10px", padding: "14px 16px",
      animation: "fadeSlideIn 0.4s ease both", animationDelay: (index * 0.08) + "s",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: hasSession ? "10px" : "0" }}>
        <span style={{ fontSize: "9px", fontWeight: "800", color: hasSession ? "#00A0DC" : "rgba(255,255,255,0.3)", background: hasSession ? "rgba(0,150,214,0.15)" : "rgba(255,255,255,0.06)", borderRadius: "5px", padding: "2px 5px", letterSpacing: "0.5px", flexShrink: 0 }}>{icon}</span>
        <span style={{
          flex: 1, fontSize: "10px", fontWeight: "700",
          color: hasSession ? "#00A0DC" : "rgba(255,255,255,0.3)",
          textTransform: "uppercase", letterSpacing: "0.6px", lineHeight: "1.3",
        }}>{chamber.room}</span>
        {isSC && hasSession && (recap || recapLoading) && (
          <button
            onClick={function() { setRecapOpen(function(o) { return !o; }); }}
            style={{
              background: recapOpen ? "rgba(0,150,214,0.2)" : "rgba(255,255,255,0.06)",
              border: "1px solid rgba(0,150,214,0.3)",
              color: "#00A0DC", borderRadius: "6px", padding: "2px 7px",
              fontSize: "9px", fontWeight: "700", cursor: "pointer",
              letterSpacing: "0.5px", flexShrink: 0,
            }}
          >{recapOpen ? "HIDE" : "DETAILS"}</button>
        )}
      </div>

      {hasSession ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {chamber.meetings.map(function(m, i) { return (
            <div key={i} style={{ opacity: m.cancelled ? 0.45 : 1 }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
                <span style={{ fontSize: "10px", color: "#FCC30B", fontWeight: "700", whiteSpace: "nowrap", marginTop: "1px", flexShrink: 0 }}>{m.time}</span>
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: "12px", lineHeight: "1.35", fontWeight: "600",
                    color: m.cancelled ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.9)",
                    textDecoration: m.cancelled ? "line-through" : "none",
                  }}>{m.title}{m.cancelled && <span style={{ marginLeft: "4px", fontSize: "8px", color: "#ff6b6b", fontWeight: "700" }}>CANC.</span>}</span>
                  {/* Show topic title under meeting number for SC */}
                  {isSC && recapTitle && !m.cancelled && (
                    <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.55)", fontStyle: "italic", marginTop: "2px", lineHeight: "1.3" }}>{recapTitle}</div>
                  )}
                  {isSC && recapLoading && !recap && !m.cancelled && (
                    <div style={{ fontSize: "10px", color: "rgba(0,150,214,0.5)", marginTop: "2px" }}>Loading topic...</div>
                  )}
                </div>
              </div>
              {m.agenda && m.agenda.length > 0 && !m.cancelled && (
                <div style={{ marginTop: "3px", paddingLeft: "40px", display: "flex", flexDirection: "column", gap: "2px" }}>
                  {m.agenda.map(function(item, j) { return (
                    <span key={j} style={{ fontSize: "10px", color: "rgba(255,255,255,0.45)", lineHeight: "1.4", display: "flex", gap: "5px" }}>
                      <span style={{ color: "rgba(0,160,220,0.4)", flexShrink: 0 }}>-</span>
                      {item}
                    </span>
                  ); })}
                </div>
              )}
            </div>
          ); })}
        </div>
      ) : (
        <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.25)", fontStyle: "italic" }}>No session today</p>
      )}

      {/* SC Details Panel - shown/hidden by toggle, NOT re-fetched */}
      {isSC && recapOpen && (
        <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "1px solid rgba(0,150,214,0.2)" }}>
          <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.8)", lineHeight: "1.65" }}>{recap}</p>
        </div>
      )}
    </div>
  );
}

// -- Meetings List -------------------------------------------------------------
// meetings = [{ title, isExtra, extraId, cancelled }]
function MeetingsList({ meetings, onCancel, onDelete, onUncancel }) {
  const [expanded, setExpanded] = useState(false);
  const preview = meetings.slice(0, 5);
  const rest = meetings.slice(5);
  const visible = [...preview, ...(expanded ? rest : [])];
  return (
    <div style={{
      background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: "10px", padding: "16px",
      animation: "fadeSlideIn 0.4s ease both", animationDelay: "0.35s",
    }}>
      {visible.map((m, i) => {
        // Support both object {title, isExtra, ...} and plain string (fallback)
        const title     = typeof m === "string" ? m : (m.title || "");
        const isExtra   = typeof m === "string" ? false : !!m.isExtra;
        const extraId   = typeof m === "string" ? null : m.extraId;
        const cancelKey = typeof m === "string" ? m : (m.cancelKey || m.title || m);
        const cancelled = typeof m === "string" ? false : !!m.cancelled;
        return (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: "8px",
          paddingBottom: i < visible.length - 1 ? "10px" : "0",
          marginBottom: i < visible.length - 1 ? "10px" : "0",
          borderBottom: i < visible.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
        }}>
          <span style={{ color: cancelled ? "rgba(255,100,100,0.4)" : "rgba(0,160,220,0.5)", fontSize: "9px", flexShrink: 0 }}>&#9679;</span>
          <span style={{
            flex: 1, fontSize: "13px", lineHeight: "1.45",
            color: cancelled ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.8)",
            textDecoration: cancelled ? "line-through" : "none",
          }}>
            {title}
            {isExtra && !cancelled && (
              <span style={{ marginLeft: "6px", fontSize: "9px", color: "#FCC30B", fontWeight: "700", verticalAlign: "middle" }}>ADDED</span>
            )}
            {cancelled && (
              <span style={{ marginLeft: "6px", fontSize: "9px", color: "#ff6b6b", fontWeight: "700", verticalAlign: "middle" }}>CANCELLED</span>
            )}
          </span>
          {!cancelled ? (
            <button
              onClick={e => { e.stopPropagation(); isExtra ? onDelete(extraId) : onCancel(cancelKey || title); }}
              title={isExtra ? "Remove this meeting" : "Mark as cancelled"}
              style={{
                flexShrink: 0,
                background: "rgba(220,50,50,0.15)",
                border: "1px solid rgba(220,50,50,0.35)",
                color: "#ff8080",
                borderRadius: "6px",
                width: "24px", height: "24px",
                fontSize: "13px", fontWeight: "700",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1, fontFamily: "inherit", padding: 0,
              }}
            >&#x2715;</button>
          ) : !isExtra && (
            <button
              onClick={e => { e.stopPropagation(); onUncancel(cancelKey || title); }}
              title="Restore this meeting"
              style={{
                flexShrink: 0,
                background: "rgba(76,159,56,0.15)",
                border: "1px solid rgba(76,159,56,0.35)",
                color: "#56C02B",
                borderRadius: "6px",
                width: "24px", height: "24px",
                fontSize: "13px", fontWeight: "700",
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                lineHeight: 1, fontFamily: "inherit", padding: 0,
              }}
            >&#x21A9;</button>
          )}
        </div>
        );
      })}
      {rest.length > 0 && (
        <button onClick={() => setExpanded(e => !e)} style={{
          background: "transparent", border: "none", color: "#00A0DC",
          fontSize: "12px", fontWeight: "600", cursor: "pointer",
          padding: "8px 0 0", fontFamily: "'DM Sans', sans-serif",
        }}>
          {expanded ? "Show less" : "Show " + rest.length + " more meetings"}
        </button>
      )}
    </div>
  );
}

// -- Topic Card ----------------------------------------------------------------
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
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "6px", flexWrap: "wrap" }}>
            {topic.sdg && (
              <span style={{
                background: sdgColor, color: "#fff", fontSize: "10px", fontWeight: "700",
                padding: "2px 8px", borderRadius: "20px", letterSpacing: "0.5px", whiteSpace: "nowrap",
              }}>{topic.sdg}</span>
            )}
            {topic.un_entity && (
              <span style={{
                background: "rgba(0,150,214,0.2)", color: "#00A0DC", border: "1px solid rgba(0,150,214,0.3)",
                fontSize: "10px", fontWeight: "700", padding: "2px 8px", borderRadius: "20px", whiteSpace: "nowrap",
              }}>{topic.un_entity}</span>
            )}
            {topic.tag && (
              <span style={{
                background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)",
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
        }}>&#9662;</span>
      </div>
      <ul style={{ margin: "14px 0 0", paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "7px" }}>
        {(topic.bullets || []).map((b, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "10px", color: "rgba(255,255,255,0.82)", fontSize: "13.5px", lineHeight: "1.5" }}>
            <span style={{ color: sdgColor, flexShrink: 0, marginTop: "2px", fontSize: "11px" }}>&#9670;</span>
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
          Tap for full briefing ->
        </p>
      )}
    </div>
  );
}

// -- Section Header ------------------------------------------------------------
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


// -- Main App ------------------------------------------------------------------
export default function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateLabel, setDateLabel] = useState("");
  const [journalSource, setJournalSource] = useState("live");
  const [todayObservance] = useState(() => getTodayObservance());
  const [weekendObservances] = useState(() => getWeekendObservances());
  const [dots, setDots] = useState(".");
  const [loadingMsg, setLoadingMsg] = useState("Fetching UN Journal");
  const fetchedRef = useRef(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [extraMeetings, setExtraMeetings] = useState([]);
  const [cancelledTitles, setCancelledTitles] = useState([]);
  const [deletedExtraIds, setDeletedExtraIds] = useState([]);
  // Add meeting form fields
  const [formOrgType, setFormOrgType] = useState("mission");
  const [formOrgName, setFormOrgName] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formRoom, setFormRoom] = useState("Trusteeship Council Chamber");
  const [formTimeStart, setFormTimeStart] = useState("15:00");
  const [formTimeEnd, setFormTimeEnd] = useState("");
  const [formClosed, setFormClosed] = useState(false);
  const [formNote, setFormNote] = useState("");
  const [formSaving, setFormSaving] = useState(false);
  const [formErr, setFormErr] = useState("");

  const loadingMessages = [
    "Fetching UN Journal",
    "Parsing chamber schedules",
    "Scanning all meetings",
    "Generating briefing topics",
    "Almost ready",
  ];

  useEffect(() => {
    setDateLabel(formatDate(new Date()));
    // Clear stale cancellations from previous sessions/days
    setCancelledTitles([]);
    setDeletedExtraIds([]);
    try {
      const cached = sessionStorage.getItem(todayKey());
      if (cached) {
        const parsed = JSON.parse(cached);
        setData(parsed.data);
        setJournalSource(parsed.source || "ai");
      }
    } catch (_) {}
    // Always re-fetch live cancellation state from Supabase
    fetchExtraMeetings();
    fetchCancelledMeetings();
  }, []);

  useEffect(() => {
    if (!loading) return;
    let i = 0;
    const msgI = setInterval(() => { i = (i + 1) % loadingMessages.length; setLoadingMsg(loadingMessages[i]); }, 2000);
    const dotI = setInterval(() => setDots(d => d.length >= 3 ? "." : d + "."), 500);
    return () => { clearInterval(msgI); clearInterval(dotI); };
  }, [loading]);


  async function fetchExtraMeetings() {
    if (!SB_URL || !SB_KEY) return;
    try {
      const res = await fetch(
        SB_URL + "/rest/v1/extra_meetings?date=eq." + todayStr() + "&order=time_start.asc",
        { headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY } }
      );
      if (res.ok) { const rows = await res.json(); setExtraMeetings(rows || []); }
    } catch (e) { console.warn("fetchExtraMeetings:", e.message); }
  }

  async function fetchCancelledMeetings() {
    if (!SB_URL || !SB_KEY) return;
    try {
      const res = await fetch(
        SB_URL + "/rest/v1/cancelled_meetings?date=eq." + todayStr(),
        { headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY } }
      );
      if (res.ok) {
        const rows = await res.json();
        setCancelledTitles((rows || []).map(r => r.meeting_title));
      }
    } catch (e) { console.warn("fetchCancelledMeetings:", e.message); }
  }

  async function cancelMeeting(title) {
    if (!SB_URL || !SB_KEY) return;
    // Optimistic update
    setCancelledTitles(prev => [...prev, title]);
    try {
      await fetch(SB_URL + "/rest/v1/cancelled_meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SB_KEY,
          "Authorization": "Bearer " + SB_KEY,
          "Prefer": "return=minimal",
        },
        body: JSON.stringify({ date: todayStr(), meeting_title: title }),
      });
    } catch (e) {
      // Rollback on error
      setCancelledTitles(prev => prev.filter(t => t !== title));
      console.warn("cancelMeeting:", e.message);
    }
  }

  async function deleteExtraMeeting(id) {
    if (!SB_URL || !SB_KEY) return;
    // Track deleted ID so it stays hidden across refreshes
    setDeletedExtraIds(prev => [...prev, id]);
    try {
      await fetch(SB_URL + "/rest/v1/extra_meetings?id=eq." + id, {
        method: "DELETE",
        headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY },
      });
    } catch (e) {
      setDeletedExtraIds(prev => prev.filter(i => i !== id));
      console.warn("deleteExtraMeeting:", e.message);
    }
  }

  async function uncancelMeeting(title) {
    if (!SB_URL || !SB_KEY) return;
    // Optimistic update
    setCancelledTitles(prev => prev.filter(t => t !== title));
    try {
      await fetch(
        SB_URL + "/rest/v1/cancelled_meetings?date=eq." + todayStr() + "&meeting_title=eq." + encodeURIComponent(title),
        {
          method: "DELETE",
          headers: { "apikey": SB_KEY, "Authorization": "Bearer " + SB_KEY },
        }
      );
    } catch (e) {
      // Rollback
      setCancelledTitles(prev => [...prev, title]);
      console.warn("uncancelMeeting:", e.message);
    }
  }

  // Parse the journal-api.un.org/api/allnew JSON structure
  function parseAllNew(data) {
    const CHAMBER_MAP = {
      "general assembly hall": "General Assembly Hall",
      "security council chamber": "Security Council",
      "security council consultations room": "Security Council",
      "trusteeship council chamber": "Trusteeship Council",
      "economic and social council chamber": "Economic and Social Council",
    };
    function chamberFor(raw) {
      if (!raw) return null;
      const l = raw.toLowerCase();
      for (const [k, v] of Object.entries(CHAMBER_MAP)) { if (l.includes(k)) return v; }
      return null;
    }
    function stripHtml(s) {
      return (s || "").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&nbsp;/g, " ").trim();
    }
    function getText(f) {
      if (!f) return "";
      if (typeof f === "string") return stripHtml(f);
      return stripHtml((f.en || Object.values(f)[0] || "").toString());
    }
    function fmtTime(t) {
      if (!t) return "TBD";
      const m = t.toString().match(/(\d{1,2}):(\d{2})/);
      if (!m) return t.toString();
      let h = parseInt(m[1]); const min = m[2];
      const p = h >= 12 ? "PM" : "AM";
      if (h > 12) h -= 12; if (h === 0) h = 12;
      return h + ":" + min + " " + p;
    }

    const allMeetings = [];
    const chamberMap = {};

    function getAgendaItems(m) {
      // agenda items live in m.agendaText (array) or m.program (array of {description})
      const items = [];
      const agendaText = m.agendaText || m.agenda || [];
      if (Array.isArray(agendaText)) {
        agendaText.forEach(a => {
          const t = getText(a.description || a.title || a.text || a) ;
          if (t && t.length > 2) items.push(t);
        });
      }
      // Also check program field
      const program = m.program || m.programItems || [];
      if (Array.isArray(program)) {
        program.forEach(p => {
          const t = getText(p.description || p.title || p.text || p);
          if (t && t.length > 2 && !items.includes(t)) items.push(t);
        });
      }
      return items;
    }

    function processSection(section) {
      if (!section) return;
      const groups = Array.isArray(section) ? section : (section.groups || []);
      groups.forEach(group => {
        const organName = stripHtml(group.groupNameTitle || getText(group.name) || "");
        (group.sessions || []).forEach(session => {
          const sessionName = stripHtml(session.name || getText(session.title) || organName);
          const sessionNum = stripHtml(session.session || "");
          const bodyLabel = sessionNum ? sessionName + ", " + sessionNum : sessionName;
          (session.meetings || []).forEach(m => {
            if (m.cancelled || m.isCancelled) return;
            const num = getText(m.meetingNumber);
            const ttl = getText(m.title) || getText(m.name) || getText(m.subject);
            const rawTitle = num || ttl;
            if (!rawTitle) return;

            // Get agenda items if available
            const agendaItems = getAgendaItems(m);
            const agendaSuffix = agendaItems.length > 0
              ? " [" + agendaItems.join(" / ") + "]"
              : "";

            const fullTitle = bodyLabel ? bodyLabel + " -- " + rawTitle + agendaSuffix : rawTitle + agendaSuffix;
            const time = fmtTime(m.timeFrom || m.startTime || "");
            const rawRoom = Array.isArray(m.rooms) && m.rooms[0] ? m.rooms[0].value : getText(m.room);
            const chamber = chamberFor(rawRoom);

            // For chamber cards, show agenda on separate lines
            const chamberTitle = rawTitle;
            allMeetings.push({ title: fullTitle, time, room: rawRoom || null });
            if (chamber) {
              if (!chamberMap[chamber]) chamberMap[chamber] = [];
              chamberMap[chamber].push({ time, title: chamberTitle, agenda: agendaItems, id: m.id || null });
            }
          });
        });
      });
    }

    processSection(data.officialMeetings);
    processSection(data.informalMeetings || data.informalConsultations);

    const chambers = ["General Assembly Hall","Security Council","Trusteeship Council","Economic and Social Council"]
      .map(name => ({ room: name, meetings: (chamberMap[name] || []) }));
    const titles = [...new Set(allMeetings.map(m => m.title).filter(Boolean))];
    return { chambers, meetings: titles };
  }

  // Fetch live journal data - first from journal.json, then direct API fallback
  async function fetchLiveJournal() {
    // Try journal.json (pre-fetched each morning by GitHub Action)
    try {
      const url = BASE + "journal.json";
      const res = await fetch(url + "?t=" + Date.now());
      if (res.ok) {
        const json = await res.json();
        const fetchedAt = json.fetched_at ? new Date(json.fetched_at) : null;
        const ageHours = fetchedAt ? (Date.now() - fetchedAt.getTime()) / 3600000 : 999;
        const isToday = json.date === todayStr();
        const isRecent = ageHours < 20;
        if ((isToday || isRecent) && json.meetings && json.meetings.length > 0) {
          console.log("journal.json OK: " + json.meetings.length + " meetings, date=" + json.date);
          return { chambers: json.chambers || [], meetings: json.meetings || [] };
        }
        console.warn("journal.json stale or empty: date=" + json.date + ", meetings=" + (json.meetings || []).length);
      }
    } catch (e) {
      console.warn("journal.json fetch error:", e.message);
    }

    // Fallback: call journal-api.un.org directly (works if CORS allows it)
    console.log("Trying direct journal-api.un.org...");
    const date = todayStr();
    const apiRes = await fetch("https://journal-api.un.org/api/allnew/" + date, {
      headers: { "Accept": "application/json", "Origin": "https://journal.un.org", "Referer": "https://journal.un.org/" },
    });
    if (!apiRes.ok) throw new Error("Both journal.json and direct API failed");
    const data = await apiRes.json();
    if (!data.officialMeetings) throw new Error("Direct API: no officialMeetings");
    return parseAllNew(data);
  }

  // Step 2: Ask Claude for topics (and optionally meetings if live failed)
  async function fetchClaudeTopics(meetingsContext) {
    const today = new Date();
    const dateStr = `${MONTHS[today.getMonth()]} ${today.getDate()}, ${today.getFullYear()}`;
    const dow = today.toLocaleDateString("en-US", { weekday: "long" });

    // Build observances context
    const obsToday = getTodayObservance();
    const obsWeekend = getWeekendObservances();
    let observanceContext = "";
    if (obsToday) observanceContext += `\n\nToday's UN International Day: ${obsToday.name}`;
    if (obsWeekend.length > 0) {
      observanceContext += `\nUpcoming this weekend: ${obsWeekend.map(o => o.weekday + ": " + o.name).join("; ")}`;
    }

    const meetingsList = meetingsContext?.meetings?.length > 0
      ? `\n\nToday's actual UN meetings from the Journal:\n${meetingsContext.meetings.slice(0, 15).map(m => `- ${m}`).join("\n")}`
      : "";

    // No AI-generated meetings - always empty if live fails
    const chambersSection = "";

    const prompt = `Today is ${dow}, ${dateStr}.${observanceContext}${meetingsList}

You are a UN expert generating a daily briefing for UN tour guides at United Nations Headquarters in New York.
${meetingsList ? "Use the actual meetings and international days listed above as primary sources for your topics." : "No meeting data available today - focus topics on international days and current UN global issues."}

Generate exactly 5 briefing topics following these rules:
- If today has an International Day listed above, make it one of the 5 topics
- If today is Friday and weekend International Days are listed, include them as coming-up topics
- For each topic identify the most relevant UN entity: WHO, UNICEF, UNHCR, UNEP, WFP, UNESCO, UNDP, ILO, FAO, IAEA, UN Women, UNODC, UN-Habitat, UNFPA, OCHA, Security Council, General Assembly, or ECOSOC
- Link each topic to the most relevant SDG AND the most relevant UN entity
- Make topics feel timely and connected to today's actual UN activity

Return ONLY raw JSON:
{
  "topics": [
    {
      "title": "Concise compelling title (max 8 words)",
      "sdg": "SDG X: Short Name",
      "un_entity": "e.g. WHO | UNICEF | UNHCR | UNEP | WFP | UNESCO | UNDP | ILO | FAO",
      "tag": "one of: UN Meeting | International Day | Global Crisis | Diplomacy | Humanitarian",
      "bullets": ["Key fact or statistic", "Key fact or statistic", "Key fact or statistic", "Key fact or statistic"],
      "detail": "80-120 words: what this issue is, why it matters at the UN today, and what the relevant UN entity does on this issue."
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

      // Load from journal.json (pre-fetched each morning by GitHub Action)
      try {
        liveData = await fetchLiveJournal();
        source = "live";
        console.log("Loaded from journal.json:", liveData.meetings.length, "meetings");
      } catch (e) {
        console.warn("journal.json failed:", e.message);
      }

      // Get Claude topics (passing live meetings as context if available)
      const claudeResult = await fetchClaudeTopics(liveData);

      const emptyChambers = [
        { room: "General Assembly Hall", meetings: [] },
        { room: "Security Council", meetings: [] },
        { room: "Trusteeship Council", meetings: [] },
        { room: "Economic and Social Council", meetings: [] },
      ];
      const finalData = {
        chambers: liveData?.chambers || emptyChambers,
        meetings: liveData?.meetings || [],
        topics: claudeResult.topics || [],
        journalFailed: !liveData,
      };

      if (!finalData.topics.length) throw new Error("No topics returned");

      setData(finalData);
      setJournalSource(source);
      try {
        // Only cache if we have real journal data, not a failed state
        if (!finalData.journalFailed) {
          sessionStorage.setItem(todayKey(), JSON.stringify({ data: finalData, source }));
        }
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
            }}>&#127760;</div>
            <div>
              <div style={{ fontSize: "10px", letterSpacing: "2px", color: "rgba(255,255,255,0.5)", fontWeight: "600", textTransform: "uppercase" }}>United Nations</div>
              <div style={{ fontSize: "20px", fontWeight: "800", fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>Daily Briefing</div>
            </div>
          </div>
          {dateLabel && (
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
              <p style={{ margin: 0, fontSize: "12px", color: "rgba(255,255,255,0.4)", fontWeight: "500" }}>&#128197; {dateLabel}</p>
              {data && (
                <span style={{
                  fontSize: "9px", fontWeight: "700", padding: "2px 7px", borderRadius: "10px",
                  background: journalSource === "live" ? "rgba(76,159,56,0.2)" : "rgba(255,255,255,0.08)",
                  color: journalSource === "live" ? "#56C02B" : "rgba(255,255,255,0.3)",
                  letterSpacing: "0.5px", textTransform: "uppercase",
                }}>
                  {journalSource === "live" ? "Live Journal" : "AI Generated"}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* International Day Banners */}
      {(todayObservance || weekendObservances.length > 0) && (
        <div style={{ borderBottom: "1px solid rgba(0,160,220,0.15)" }}>
          {todayObservance && (
            <a href={todayObservance.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", background: "linear-gradient(90deg, rgba(0,96,214,0.3), rgba(0,150,220,0.15))", padding: "10px 24px", textDecoration: "none" }}>
              <div style={{ maxWidth: "520px", margin: "0 auto", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "15px" }}>&#127981;</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "9px", letterSpacing: "1.5px", color: "rgba(255,255,255,0.45)", fontWeight: "700", textTransform: "uppercase" }}>Today</div>
                  <div style={{ fontSize: "13px", fontWeight: "600", color: "#fff", lineHeight: "1.3" }}>{todayObservance.name}</div>
                </div>
                <span style={{ fontSize: "11px", color: "rgba(0,160,220,0.7)" }}>&#8599;</span>
              </div>
            </a>
          )}
          {weekendObservances.map((obs, i) => (
            <a key={obs.key} href={obs.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", background: i % 2 === 0 ? "rgba(0,80,160,0.2)" : "rgba(0,60,140,0.15)", padding: "9px 24px", textDecoration: "none", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ maxWidth: "520px", margin: "0 auto", display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "13px" }}>&#128197;</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: "9px", letterSpacing: "1.5px", color: "rgba(255,255,255,0.35)", fontWeight: "700", textTransform: "uppercase" }}>
                    {obs.past ? "Last " + obs.weekday : obs.weekday}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: "600", color: obs.past ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.8)", lineHeight: "1.3" }}>{obs.name}</div>
                </div>
                <span style={{ fontSize: "11px", color: "rgba(0,160,220,0.5)" }}>&#8599;</span>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* Content */}
      <div style={{ maxWidth: "520px", margin: "0 auto", padding: "24px 18px 0" }}>

        {!API_KEY && (
          <div style={{ background: "rgba(255,180,0,0.1)", border: "1px solid rgba(255,180,0,0.3)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
            <p style={{ color: "#ffcc44", margin: 0, fontSize: "14px" }}>&#9888;&#65039; No API key configured. Add VITE_ANTHROPIC_KEY as a GitHub Secret and redeploy.</p>
          </div>
        )}

        {API_KEY && !data && !loading && !error && (
          <div style={{ textAlign: "center", padding: "48px 24px", animation: "fadeSlideIn 0.5s ease" }}>
            <div style={{ fontSize: "52px", marginBottom: "20px" }}>&#127482;&#127475;</div>
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

        {data && !loading && (() => {
          // Convert extra meeting time to display format
          function fmtTime(t) {
            if (!t) return "TBD";
            const [hStr, mStr] = t.split(":");
            let h = parseInt(hStr);
            const p = h >= 12 ? "PM" : "AM";
            if (h > 12) h -= 12;
            if (h === 0) h = 12;
            return h + ":" + mStr + " " + p;
          }

          // Map room name to chamber display name
          const ROOM_TO_CHAMBER = {
            "General Assembly Hall": "General Assembly Hall",
            "Security Council Chamber": "Security Council",
            "Security Council Consultations Room": "Security Council",
            "Trusteeship Council Chamber": "Trusteeship Council",
            "Economic and Social Council Chamber": "Economic and Social Council",
          };

          // Build extra meeting label
          function extraLabel(e) {
            const org = e.organizer_type === "un_body" ? e.organizer_name
              : e.organizer_type === "mission" ? "Mission of " + e.organizer_name
              : e.organizer_name;
            return org + " -- " + e.title + " (" + fmtTime(e.time_start) + ", " + e.room + ")" + (e.is_closed ? " [Closed]" : "");
          }

          // Build allMeetings - filter out locally deleted extra meetings
          const visibleExtras = extraMeetings.filter(e => !deletedExtraIds.includes(e.id));
          const allMeetings = [
            ...(data.meetings || []).map(title => ({
              title,
              isExtra: false,
              extraId: null,
              cancelKey: title,
              cancelled: cancelledTitles.includes(title),
            })),
            ...visibleExtras.map(e => ({
              title: extraLabel(e),
              isExtra: true,
              extraId: e.id,
              cancelKey: null,
              cancelled: false,
            })),
          ];

          // Merge extras into chambers (show cancelled with strikethrough)
          const mergedChambers = (data.chambers || []).map(chamber => {
            const extras = extraMeetings
              .filter(e => !deletedExtraIds.includes(e.id))
              .filter(e => (ROOM_TO_CHAMBER[e.room] || e.room) === chamber.room)
              .map(e => {
                const org = e.organizer_type === "un_body" ? e.organizer_name
                  : e.organizer_type === "mission" ? "Mission of " + e.organizer_name
                  : e.organizer_name;
                return { time: fmtTime(e.time_start), title: org + " -- " + e.title + (e.is_closed ? " [Closed]" : "") };
              });
            // Mark chamber meetings cancelled - exact title match
            // cancelledTitles stores the flat meeting title string (no time)
            const journalMeetings = (chamber.meetings || []).map(m => ({
              ...m,
              cancelled: cancelledTitles.includes(m.title),
            }));
            return { ...chamber, meetings: [...journalMeetings, ...extras] };
          });

          return (
            <div>
              <SectionHeader icon="&#127963;&#65039;" title="Council Chambers" subtitle="Today's session schedule" badge={journalSource === "live" ? "LIVE" : null} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "28px" }}>
                {mergedChambers.map((c, i) => <ChamberCard key={i} chamber={c} index={i} apiKey={API_KEY} />)}
              </div>

              {data.journalFailed && (
                <div style={{ background: "rgba(255,180,0,0.08)", border: "1px solid rgba(255,180,0,0.2)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "16px" }}>&#9888;&#65039;</span>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "rgba(255,200,0,0.9)" }}>Journal unavailable</div>
                    <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", marginTop: "2px" }}>Could not reach journal.un.org - add meetings manually with the + button.</div>
                  </div>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "14px" }}>&#128203;</span>
                    <span style={{ fontSize: "11px", fontWeight: "700", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1.5px" }}>All Meetings Today</span>
                    {journalSource === "live" && <span style={{ background: "rgba(0,160,220,0.15)", color: "#00A0DC", fontSize: "9px", fontWeight: "700", padding: "2px 6px", borderRadius: "10px" }}>LIVE</span>}
                    {visibleExtras.length > 0 && <span style={{ background: "rgba(252,195,11,0.15)", color: "#FCC30B", fontSize: "9px", fontWeight: "700", padding: "2px 6px", borderRadius: "10px" }}>+{visibleExtras.length} added</span>}
                  </div>
                  <p style={{ margin: "4px 0 0 22px", fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>{allMeetings.length} meetings across the UN</p>
                </div>
                <button onClick={() => setShowAddForm(true)} style={{
                  background: "linear-gradient(135deg, #0096D6, #0050A0)",
                  color: "#fff", border: "none", borderRadius: "20px",
                  padding: "6px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer",
                }}>+ Add</button>
              </div>
              <div style={{ marginBottom: "28px" }}>
                <MeetingsList
                  meetings={allMeetings}
                  onCancel={cancelMeeting}
                  onDelete={deleteExtraMeeting}
                  onUncancel={uncancelMeeting}
                />
              </div>

              <SectionHeader icon="&#128161;" title="Briefing Topics" subtitle="Tap any topic to expand" />
              {(data.topics || []).map((topic, i) => <TopicCard key={i} topic={topic} index={i} />)}

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "24px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.2)" }}>
                  {journalSource === "live" ? "&#128225; journal.un.org &#183; Claude &#183; SDGs" : "Powered by Claude &#183; UN Journal &#183; SDGs"}
                </p>
                <button onClick={() => { setData(null); fetchedRef.current = false; sessionStorage.removeItem(todayKey()); }} style={{
                  background: "transparent", border: "1px solid rgba(255,255,255,0.15)",
                  color: "rgba(255,255,255,0.4)", borderRadius: "20px", padding: "4px 12px",
                  fontSize: "11px", cursor: "pointer", fontWeight: "600",
                }}>&#8634; Refresh</button>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Floating Add Button */}
      {data && !loading && !showAddForm && (
        <button onClick={() => setShowAddForm(true)} style={{
          position: "fixed", bottom: "32px", right: "24px",
          width: "52px", height: "52px", borderRadius: "50%",
          background: "linear-gradient(135deg, #0096D6, #0050A0)",
          border: "none", color: "#fff", fontSize: "26px", cursor: "pointer",
          boxShadow: "0 4px 20px rgba(0,100,200,0.5)",
          zIndex: 100,
        }}>+</button>
      )}

      {/* Inline Add Meeting Sheet */}
      {showAddForm && (() => {
        const UN_BODIES = ["General Assembly","Security Council","Economic and Social Council","Trusteeship Council","Secretariat","OHCHR","UNDP","UNICEF","UNFPA","UN Women","WFP","UNHCR","OCHA","UNEP","UNESCO","WHO","ILO","FAO","Other UN Body"];
        const ROOMS = ["General Assembly Hall","Security Council Chamber","Trusteeship Council Chamber","Economic and Social Council Chamber","Conference Room 1","Conference Room 2","Conference Room 3","Conference Room 4","Conference Room 5","Conference Room 6","Conference Room 7","Conference Room 8","Conference Room 9","Conference Room 10","Conference Room 11","Conference Room 12","Other"];

        async function handleSave() {
          if (!formOrgName.trim()) { setFormErr("Please enter the organizer name."); return; }
          if (!formTitle.trim()) { setFormErr("Please enter a meeting title."); return; }
          if (!SB_URL || !SB_KEY) { setFormErr("Supabase not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to GitHub Secrets."); return; }
          setFormSaving(true);
          setFormErr("");
          try {
            const res = await fetch(SB_URL + "/rest/v1/extra_meetings", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": SB_KEY,
                "Authorization": "Bearer " + SB_KEY,
                "Prefer": "return=minimal",
              },
              body: JSON.stringify({
                date: todayStr(),
                organizer_type: formOrgType,
                organizer_name: formOrgName.trim(),
                title: formTitle.trim(),
                room: formRoom,
                time_start: formTimeStart || null,
                time_end: formTimeEnd || null,
                is_closed: formClosed,
                note: formNote.trim() || null,
              }),
            });
            if (!res.ok) { const t = await res.text(); throw new Error(t); }
            setFormOrgName(""); setFormTitle(""); setFormNote("");
            setFormSaving(false);
            setShowAddForm(false);
            fetchExtraMeetings();
          } catch(e) {
            setFormErr(e.message);
            setFormSaving(false);
          }
        }

        const inp = { width: "100%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "8px", padding: "10px 12px", color: "#fff", fontSize: "14px", fontFamily: "inherit", boxSizing: "border-box" };
        const lbl = { fontSize: "11px", fontWeight: "700", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "6px", display: "block" };

        return (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000 }}
            onClick={e => { if (e.target === e.currentTarget) setShowAddForm(false); }}>
            <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0d2044", borderRadius: "20px 20px 0 0", maxHeight: "88vh", overflowY: "scroll", padding: "24px 20px 60px", zIndex: 1001 }}>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <div style={{ fontSize: "18px", fontWeight: "800", fontFamily: "'Playfair Display', serif" }}>Add a Meeting</div>
                <button onClick={() => setShowAddForm(false)} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: "#fff", borderRadius: "50%", width: "32px", height: "32px", fontSize: "16px", cursor: "pointer" }}>x</button>
              </div>

              {/* Organizer Type */}
              <div style={{ marginBottom: "16px" }}>
                <span style={lbl}>Who is organizing?</span>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[["un_body","UN Body"],["mission","Mission"],["joint","Joint"]].map(([val, label]) => (
                    <button key={val} onClick={() => setFormOrgType(val)} style={{
                      flex: 1, padding: "10px 4px", borderRadius: "10px", cursor: "pointer",
                      border: formOrgType === val ? "2px solid #0096D6" : "1px solid rgba(255,255,255,0.15)",
                      background: formOrgType === val ? "rgba(0,150,214,0.2)" : "rgba(255,255,255,0.04)",
                      color: "#fff", fontSize: "13px", fontWeight: "600", fontFamily: "inherit",
                    }}>{label}</button>
                  ))}
                </div>
              </div>

              {/* Organizer Name */}
              <div style={{ marginBottom: "16px" }}>
                <span style={lbl}>{formOrgType === "un_body" ? "UN Body" : "Mission / Group"}</span>
                {formOrgType === "un_body" ? (
                  <select value={formOrgName} onChange={e => setFormOrgName(e.target.value)} style={inp}>
                    <option value="">Select UN Body...</option>
                    {UN_BODIES.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                ) : (
                  <input type="text" value={formOrgName} onChange={e => setFormOrgName(e.target.value)}
                    placeholder={formOrgType === "mission" ? "e.g. Permanent Mission of Monaco" : "e.g. Monaco + France + OHCHR"}
                    style={inp} />
                )}
              </div>

              {/* Title */}
              <div style={{ marginBottom: "16px" }}>
                <span style={lbl}>Meeting Title</span>
                <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)}
                  placeholder="e.g. High-level discussion on sexual abuse prevention"
                  style={inp} />
              </div>

              {/* Room */}
              <div style={{ marginBottom: "16px" }}>
                <span style={lbl}>Room</span>
                <select value={formRoom} onChange={e => setFormRoom(e.target.value)} style={inp}>
                  {ROOMS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Time */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <span style={lbl}>Start Time</span>
                  <input type="time" value={formTimeStart} onChange={e => setFormTimeStart(e.target.value)} style={inp} />
                </div>
                <div>
                  <span style={lbl}>End Time (opt.)</span>
                  <input type="time" value={formTimeEnd} onChange={e => setFormTimeEnd(e.target.value)} style={inp} />
                </div>
              </div>

              {/* Closed toggle */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px 14px", marginBottom: "16px" }}>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "600" }}>Closed Meeting</div>
                  <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>Toggle if not open to public</div>
                </div>
                <div onClick={() => setFormClosed(c => !c)} style={{ width: "44px", height: "24px", borderRadius: "12px", background: formClosed ? "#0096D6" : "rgba(255,255,255,0.2)", cursor: "pointer", position: "relative" }}>
                  <div style={{ position: "absolute", top: "2px", left: formClosed ? "22px" : "2px", width: "20px", height: "20px", borderRadius: "50%", background: "#fff", transition: "left 0.15s" }} />
                </div>
              </div>

              {/* Note */}
              <div style={{ marginBottom: "20px" }}>
                <span style={lbl}>Note (optional)</span>
                <input type="text" value={formNote} onChange={e => setFormNote(e.target.value)}
                  placeholder="e.g. Co-organized with France, part of GA 80th session"
                  style={inp} />
              </div>

              {formErr && <div style={{ color: "#ff6b6b", fontSize: "13px", marginBottom: "12px", padding: "10px", background: "rgba(255,100,100,0.1)", borderRadius: "8px" }}>{formErr}</div>}

              <button onClick={handleSave} disabled={formSaving} style={{
                width: "100%", padding: "14px",
                background: formSaving ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #0096D6, #0050A0)",
                color: formSaving ? "rgba(255,255,255,0.4)" : "#fff",
                border: "none", borderRadius: "50px", fontSize: "15px", fontWeight: "700",
                cursor: formSaving ? "default" : "pointer", fontFamily: "inherit",
              }}>
                {formSaving ? "Saving..." : "Add to Today's Briefing"}
              </button>

            </div>
          </div>
        );
      })()}
    </div>
  );
}
