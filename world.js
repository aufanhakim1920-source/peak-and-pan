/* ============================================================
   Peak & Pan v2 — progression
   Reworked 2026-08-21 for the Glorb story. The world content
   (chapters, dishes, pantry, Glorb's moods) lives in story.js;
   this file is only the rules that sit on top of it.
   ============================================================ */

const LEVELS = [
  { lvl: 1,  need: 0,    title: "Terrified" },
  { lvl: 2,  need: 60,   title: "Line Cook" },
  { lvl: 3,  need: 160,  title: "Short Order" },
  { lvl: 4,  need: 320,  title: "Prep Hand" },
  { lvl: 5,  need: 540,  title: "Sous" },
  { lvl: 6,  need: 820,  title: "Saucier" },
  { lvl: 7,  need: 1180, title: "Head Cook" },
  { lvl: 8,  need: 1620, title: "Chef" },
  { lvl: 9,  need: 2150, title: "Feeder of Fleets" },
  { lvl: 10, need: 2800, title: "Glorb's Chef" },
];

const XP = { gather: 5, cook: 40, quest: 30, rate: 8, chapter: 120, visit: 6 };

const ACHIEVEMENTS = [
  { id: "first-gather", name: "First Shop",     desc: "Pick up any ingredient",          icon: "🧺" },
  { id: "first-cook",   name: "Fed the Beast",  desc: "Cook anything for Glorb",         icon: "🍳" },
  { id: "chapter-1",    name: "Home Kitchen",   desc: "Clear Indonesia",                 icon: "🇮🇩" },
  { id: "two-chapters", name: "Passport",       desc: "Clear two countries",             icon: "🛫" },
  { id: "five-mats",    name: "Well Stocked",   desc: "Hold 5 different ingredients",    icon: "🥫" },
  { id: "streak-3",     name: "Three Days",     desc: "Keep a 3-day streak",             icon: "🔥" },
  { id: "veg-cook",     name: "No Meat Needed", desc: "Cook a vegetarian dish",          icon: "🥬" },
  { id: "rate-one",     name: "Opinionated",    desc: "Rate a dish",                     icon: "⭐" },
  { id: "friend",       name: "Friend",         desc: "Cook Glorb into a good mood",     icon: "🐙" },
];

/* Daily quests — deterministic from the date, so everyone opening the
   app on the same day gets the same three and a refresh doesn't reroll. */
const QUEST_POOL = [
  { id: "q-gather-2", text: "Pick up 2 ingredients",        goal: 2, kind: "gather" },
  { id: "q-gather-4", text: "Pick up 4 ingredients",        goal: 4, kind: "gather" },
  { id: "q-cook-1",   text: "Cook something for Glorb",     goal: 1, kind: "cook" },
  { id: "q-cook-2",   text: "Cook twice today",             goal: 2, kind: "cook" },
  { id: "q-visit-2",  text: "Open 2 countries on the globe", goal: 2, kind: "visit" },
  { id: "q-rate-1",   text: "Rate a dish",                  goal: 1, kind: "rate" },
  { id: "q-veg-1",    text: "Cook something vegetarian",    goal: 1, kind: "veg" },
];

function questsForDate(dateKey) {
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) h = (h * 31 + dateKey.charCodeAt(i)) >>> 0;
  const pool = [...QUEST_POOL];
  const out = [];
  for (let i = 0; i < 3 && pool.length; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    out.push(pool.splice(h % pool.length, 1)[0]);
  }
  return out;
}

const DIETS = [
  { id: "veg",  label: "Vegetarian" },
  { id: "meat", label: "Meat" },
];
