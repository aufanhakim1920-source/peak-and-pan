/* ============================================================
   Peak & Pan v2 — progression engine
   XP, levels, streak, daily quests, achievements, and the chapter
   gate: clear a country's dishes and the next country unlocks.
   One module owns every rule so no screen invents its own.
   ============================================================ */

const GKEY = "peak-and-pan/game/v2";
const gDefaults = {
  xp: 0,
  pantry: {},           // ingredient id -> count
  visited: [],          // chapter ids opened on the globe
  cooked: [],           // dish ids cooked, most recent first
  achievements: [],
  streak: 0,
  lastDay: null,
  questDay: null,
  quests: {},
  questsClaimed: [],
  seen: [],            // cutscene + lesson node ids
  purchased: [],       // premium chapter ids (prototype — no real payment)
};

let G = loadGame();

function loadGame() {
  try { return { ...gDefaults, ...JSON.parse(localStorage.getItem(GKEY) || "{}") }; }
  catch { return { ...gDefaults }; }
}
function saveGame() { localStorage.setItem(GKEY, JSON.stringify(G)); }

const todayKey = () => new Date().toISOString().slice(0, 10);
const dayDiff = (a, b) => Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);

/* ---------------- level + title ---------------- */
function levelFor(xp) {
  let cur = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.need) cur = l;
  const next = LEVELS.find((l) => l.need > xp) || null;
  const span = next ? next.need - cur.need : 1;
  const into = next ? xp - cur.need : 1;
  return { ...cur, next, progress: next ? into / span : 1, toNext: next ? next.need - xp : 0 };
}
const currentLevel = () => levelFor(G.xp);

/* ---------------- chapters ----------------
   A chapter is unlocked when every dish in the one before it is cooked.
   Chapter 1 is always open — Glorb is already standing in your kitchen. */
function chapterState(id) {
  const idx = CHAPTERS.findIndex((c) => c.id === id);
  const ch = CHAPTERS[idx];
  if (!ch) return null;
  const done = ch.dishes.filter((d) => G.cooked.includes(d));
  const prev = idx > 0 ? CHAPTERS[idx - 1] : null;
  const owned = G.purchased.includes(ch.id);
  /* A paid chapter is gated by the purchase, not by progress — the whole
     point is that it's available the moment someone wants it. */
  const unlocked = ch.premium ? owned : (idx === 0 || (prev && prev.dishes.every((d) => G.cooked.includes(d))));
  return {
    ...ch, index: idx, done: done.length, total: ch.dishes.length,
    cleared: done.length === ch.dishes.length,
    unlocked: Boolean(unlocked),
    owned,
    needs: ch.premium ? `${ch.price} · Chef's Table` : prev ? `Clear ${prev.country} first` : "",
  };
}
const allChapters = () => CHAPTERS.map((c) => chapterState(c.id));
const currentChapter = () =>
  allChapters().find((c) => c.unlocked && !c.cleared && !c.premium)
  || allChapters().find((c) => c.unlocked && !c.cleared)
  || allChapters().filter((c) => c.unlocked).pop();


/* ---------------- the stage path ----------------
   Line Ranger shape: every chapter is exactly 10 nodes, generated from
   the chapter's own dishes and ingredients so adding a country needs no
   hand-authored path. Beat order: arrive → shop → learn → cook, ×3,
   with the last dish promoted to a boss because Glorb makes a scene.

   Node types: cutscene · prep (pick up an ingredient) · lesson (a
   technique card) · dish · boss */
function nodesFor(chapterId) {
  const ch = CHAPTERS.find((c) => c.id === chapterId);
  if (!ch) return [];
  const dishes = ch.dishes.map((id) => DISHES.find((d) => d.id === id)).filter(Boolean);
  const ings = PANTRY.filter((p) => p.where === ch.id);
  const out = [{ type: "cutscene", id: `${ch.id}-open`, title: ch.country, text: ch.open }];

  dishes.forEach((d, i) => {
    const ing = ings[i % (ings.length || 1)];
    if (ing) out.push({ type: "prep", id: `${ch.id}-prep-${i}`, ing: ing.id, title: `Pick up ${ing.name}` });
    out.push({ type: "lesson", id: `${ch.id}-lesson-${i}`, dish: d.id, title: d.learn });
    out.push({ type: i === dishes.length - 1 ? "boss" : "dish", id: `${ch.id}-dish-${d.id}`, dish: d.id, title: d.name });
  });

  /* pad or trim to exactly ten so every country reads the same on the map */
  while (out.length < 10 && ings.length) {
    const ing = ings[out.length % ings.length];
    out.splice(out.length - 1, 0, { type: "prep", id: `${ch.id}-prep-x${out.length}`, ing: ing.id, title: `Pick up ${ing.name}` });
  }
  return out.slice(0, 10);
}

/** A node is done when its underlying action is done. Cutscenes and
    lessons are just "seen", tracked in G.seen. */
function nodeState(chapterId) {
  const list = nodesFor(chapterId);
  let firstOpen = -1;
  const out = list.map((n, i) => {
    let done = false;
    if (n.type === "cutscene" || n.type === "lesson") done = G.seen.includes(n.id);
    if (n.type === "prep") done = (G.pantry[n.ing] || 0) > 0;
    if (n.type === "dish" || n.type === "boss") done = G.cooked.includes(n.dish);
    return { ...n, index: i, done };
  });
  out.forEach((n, i) => { if (!n.done && firstOpen === -1) firstOpen = i; });
  return out.map((n, i) => ({ ...n, current: i === firstOpen, locked: firstOpen !== -1 && i > firstOpen }));
}

function seeNode(id) {
  if (G.seen.includes(id)) return null;
  G.seen.push(id);
  saveGame();
  return award(8, "Noted");
}

/* ---------------- Glorb ---------------- */
const glorbMood = () => moodFor(G.cooked.length);

/* ---------------- streak ---------------- */
function touchStreak() {
  const t = todayKey();
  if (G.lastDay === t) return G.streak;
  const gap = G.lastDay ? dayDiff(G.lastDay, t) : null;
  G.streak = gap === 1 ? G.streak + 1 : 1;
  G.lastDay = t;
  saveGame();
  return G.streak;
}

/* ---------------- daily quests ---------------- */
function todaysQuests() {
  const t = todayKey();
  if (G.questDay !== t) {
    G.questDay = t; G.quests = {}; G.questsClaimed = [];
    saveGame();
  }
  return questsForDate(t).map((q) => ({
    ...q,
    progress: Math.min(G.quests[q.id] || 0, q.goal),
    done: (G.quests[q.id] || 0) >= q.goal,
    claimed: G.questsClaimed.includes(q.id),
  }));
}

function bumpQuests(kind, n = 1) {
  todaysQuests().forEach((q) => {
    if (q.kind !== kind || q.done) return;
    G.quests[q.id] = (G.quests[q.id] || 0) + n;
  });
  saveGame();
}

function claimQuest(id) {
  const q = todaysQuests().find((x) => x.id === id);
  if (!q || !q.done || q.claimed) return null;
  G.questsClaimed.push(id);
  saveGame();
  return award(XP.quest, `Quest complete · ${q.text}`);
}

/* ---------------- xp + achievements ---------------- */
function award(amount, reason) {
  const before = currentLevel();
  const moodBefore = glorbMood().id;
  G.xp += amount;
  saveGame();
  const after = currentLevel();
  return {
    xp: amount, reason,
    levelUp: after.lvl > before.lvl ? after : null,
    moodUp: glorbMood().id !== moodBefore ? glorbMood() : null,
    unlocked: checkAchievements(),
  };
}

function unlock(id) {
  if (G.achievements.includes(id)) return null;
  G.achievements.push(id);
  saveGame();
  return ACHIEVEMENTS.find((a) => a.id === id) || null;
}

function checkAchievements() {
  const got = [];
  const push = (a) => { if (a) got.push(a); };
  const pantryCount = Object.keys(G.pantry).filter((k) => G.pantry[k] > 0).length;
  const cleared = allChapters().filter((c) => c.cleared).length;

  if (pantryCount >= 1) push(unlock("first-gather"));
  if (pantryCount >= 5) push(unlock("five-mats"));
  if (G.cooked.length >= 1) push(unlock("first-cook"));
  if (cleared >= 1) push(unlock("chapter-1"));
  if (cleared >= 2) push(unlock("two-chapters"));
  if (G.streak >= 3) push(unlock("streak-3"));
  if (["warm", "friend"].includes(glorbMood().id)) push(unlock("friend"));
  return got;
}

/* ---------------- actions ---------------- */
const Game = {
  get state() { return G; },
  level: currentLevel,
  quests: todaysQuests,
  claimQuest,
  streak: () => G.streak,
  mood: glorbMood,
  chapters: allChapters,
  chapter: chapterState,
  current: currentChapter,
  nodes: nodeState,
  see: seeNode,

  gather(id) {
    const p = PANTRY.find((x) => x.id === id);
    if (!p) return null;
    G.pantry[p.id] = (G.pantry[p.id] || 0) + 1;
    saveGame();
    touchStreak();
    bumpQuests("gather");
    return award(XP.gather, `Picked up ${p.name}`);
  },

  has(ingredientId) { return (G.pantry[ingredientId] || 0) > 0; },
  count(id) { return G.pantry[id] || 0; },

  canCook(dish) { return dish.needs.every((n) => Game.has(n)); },
  missing(dish) { return dish.needs.filter((n) => !Game.has(n)); },

  visit(chapterId) {
    if (G.visited.includes(chapterId)) return null;
    G.visited.push(chapterId);
    saveGame();
    bumpQuests("visit");
    return award(XP.visit, "New country");
  },

  /** Cooking is the only thing that moves the story. */
  cook(dish) {
    if (!dish) return null;
    const wasCleared = chapterState(dish.chapter)?.cleared;
    dish.needs.forEach((n) => { if (G.pantry[n] > 0) G.pantry[n] -= 1; });
    if (!G.cooked.includes(dish.id)) G.cooked.unshift(dish.id);
    saveGame();
    touchStreak();
    bumpQuests("cook");
    if (dish.diet === "veg") { bumpQuests("veg"); unlock("veg-cook"); }

    const res = award(XP.cook, `Cooked ${dish.name}`);
    const now = chapterState(dish.chapter);
    if (now && now.cleared && !wasCleared) {
      const bonus = award(XP.chapter, `${now.country} cleared`);
      res.xp += bonus.xp;
      res.chapterCleared = now;
      res.unlocked = [...(res.unlocked || []), ...(bonus.unlocked || [])];
      res.levelUp = bonus.levelUp || res.levelUp;
      res.moodUp = bonus.moodUp || res.moodUp;
      const nextCh = CHAPTERS[now.index + 1];
      if (nextCh) res.chapterUnlocked = chapterState(nextCh.id);
    }
    return res;
  },

  rated() { touchStreak(); bumpQuests("rate"); unlock("rate-one"); return award(XP.rate, "Rated a dish"); },

  achievements() { return ACHIEVEMENTS.map((a) => ({ ...a, owned: G.achievements.includes(a.id) })); },

  /** Prototype only — this does not take money. It flips a local flag so
      the paid flow can be demoed end to end. */
  purchase(chapterId) {
    const ch = CHAPTERS.find((c) => c.id === chapterId);
    if (!ch || !ch.premium || G.purchased.includes(chapterId)) return null;
    G.purchased.push(chapterId);
    saveGame();
    return award(0, `${ch.country} unlocked`);
  },

  reset() { G = JSON.parse(JSON.stringify(gDefaults)); saveGame(); },
};
