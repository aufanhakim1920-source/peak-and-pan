/* ============================================================
   Peak & Pan v2 — the app, rebuilt from the whiteboard
   app.js stays as the faithful Figma port and still supplies the
   router, sheet, toast, backbar, subhead and search field. Every
   screen below replaces one of its screens.

   From the brainstorm:
     · level + XP bar top-left, medals top-right
     · main mission is a Line-Ranger stage map, and the path IS an
       octopus tentacle — ten nodes per country
     · settings is a bookshelf, one book per section
     · the nav icons are tentacles holding things
     · Glorb wears a different costume in every country
   ============================================================ */

const THEME_KEY = "peak-and-pan/theme";
const theme = () => document.documentElement.dataset.theme || "light";
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  localStorage.setItem(THEME_KEY, t);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "dark" ? "#0E0A14" : "#573451");
}

const STEP_KEY = "peak-and-pan/steps/v2";
const readSteps = () => { try { return JSON.parse(localStorage.getItem(STEP_KEY) || "{}"); } catch { return {}; } };
const writeSteps = (v) => localStorage.setItem(STEP_KEY, JSON.stringify(v));

const dishById = (id) => DISHES.find((d) => d.id === id);
const ingById = (id) => PANTRY.find((p) => p.id === id);
const chapOf = (id) => CHAPTERS.find((c) => c.id === id);

/* Windows ships no flag-emoji font — 🇮🇩 renders as the bare letters "ID".
   So the badge IS the two letters, drawn deliberately in the country's
   colour instead of leaking through as a broken glyph. */
function flagOf(c) {
  if (!c) return "";
  const hex = typeof c.color === "number" ? "#" + c.color.toString(16).padStart(6, "0") : "var(--primary)";
  return `<span class="flagbadge" style="--fc:${hex}" aria-hidden="true">${esc(c.code || "??")}</span>`;
}


/* ---------------- reward feedback ---------------- */
function showReward(res) {
  if (!res) return;
  const fly = $("#xpfly");
  fly.textContent = `+${res.xp} XP`;
  fly.hidden = false;
  fly.style.animation = "none";
  void fly.offsetWidth;
  fly.style.animation = "";
  clearTimeout(showReward._t);
  showReward._t = setTimeout(() => { fly.hidden = true; }, 1500);

  if (res.chapterCleared) {
    toast(`${res.chapterCleared.code} · ${res.chapterCleared.country} cleared`);
    if (res.chapterUnlocked) setTimeout(() => toast(`${res.chapterUnlocked.code} · ${res.chapterUnlocked.country} unlocked`), 1100);
  } else if (res.levelUp) {
    toast(`Level ${res.levelUp.lvl} — ${res.levelUp.title}`);
  } else if (res.reason) {
    toast(`${res.reason} · +${res.xp} XP`);
  }
  if (res.moodUp) setTimeout(() => toast(`Glorb is ${res.moodUp.name.toLowerCase()} now`), 1600);
  (res.unlocked || []).forEach((a, i) => setTimeout(() => toast(`${a.icon} ${a.name}`), 2100 + i * 700));
}

/* ═══════════════════════════════════════════════════════════
   GLORB
   ═══════════════════════════════════════════════════════════ */

/* One mascot image, tinted by mood and hatted by country. He is the
   same creature the whole way through — he just stops looming. */
const MOOD_FILTER = {
  furious:   "saturate(1.5) hue-rotate(-28deg) contrast(1.15) brightness(0.86)",
  demanding: "saturate(1.25) hue-rotate(-14deg)",
  curious:   "saturate(1.05)",
  warm:      "saturate(1.05) brightness(1.04)",
  friend:    "saturate(1.1) brightness(1.08)",
};

function glorbArt(mood, size = 132, chapterId) {
  const costume = chapterId ? (chapOf(chapterId)?.costume || "") : "";
  return `<span class="glorb" style="--gc:${mood.color};width:${size}px;height:${size}px">
    <img src="assets/mascot.png" alt="Glorb, an alien octopus, looking ${esc(mood.name.toLowerCase())}"
         style="filter:${MOOD_FILTER[mood.id] || ""}">
    ${costume ? `<span class="glorb__hat" aria-hidden="true">${costume}</span>` : ""}
  </span>`;
}
const glorbSays = (mood) => esc(glorbLine(mood.id, Game.state.cooked.length * 7 + Game.state.xp));

/* ═══════════════════════════════════════════════════════════
   HUD — level left, medals right (straight off the whiteboard)
   ═══════════════════════════════════════════════════════════ */
function hud() {
  const L = Game.level();
  const owned = Game.achievements().filter((a) => a.owned);
  return `<div class="hud">
    <button class="hud__lvl" data-go="#/quests" aria-label="Level ${L.lvl}, ${L.title}">
      <span class="hud__ring">${L.lvl}</span>
      <span class="hud__bar"><i style="width:${Math.round(L.progress * 100)}%"></i></span>
      <span class="hud__lbl">Lv.${L.lvl} · ${esc(L.title)}</span>
    </button>
    <button class="hud__medals" data-go="#/badges" aria-label="${owned.length} medals">
      ${owned.slice(-3).map((a) => `<em>${a.icon}</em>`).join("") || `<em class="is-empty">🏅</em>`}
      <span>${owned.length}</span>
    </button>
    <span class="hud__streak" title="Day streak">${Game.streak()}🔥</span>
  </div>`;
}

/* ═══════════════════════════════════════════════════════════
   THE STAGE MAP — the tentacle path
   ═══════════════════════════════════════════════════════════ */

const NODE_ART = {
  cutscene: "💬", prep: "🧺", lesson: "📖", dish: "🍳", boss: "🐙",
};

/* Serpentine layout. Nodes are placed first, then the tentacle is drawn
   THROUGH them — so the path always fits the content instead of the
   content being squeezed onto a hand-drawn curve. */
function pathPoints(n, w = 320, gap = 122, top = 86) {
  return Array.from({ length: n }, (_, i) => ({
    x: w / 2 + Math.sin(i * 0.95 + 0.4) * (w / 2 - 68),
    y: top + i * gap,
  }));
}

/* Catmull-Rom through the points, converted to cubic bezier so the
   tentacle curves smoothly instead of kinking at every node. */
function smoothPath(pts) {
  if (pts.length < 2) return "";
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6},` +
         ` ${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6},` +
         ` ${p2.x} ${p2.y}`;
  }
  return d;
}

function tentacleSVG(pts, colorHex) {
  const d = smoothPath(pts);
  const h = pts[pts.length - 1].y + 120;

  /* suckers: two staggered rows between the nodes, shrinking toward the
     tip the way a real arm does */
  const suckers = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    [0.34, 0.66].forEach((t, k) => {
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const off = (k ? 1 : -1) * 13;
      const r = 6.2 - (i / pts.length) * 2.2;
      suckers.push(`<circle cx="${(x + off).toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" class="suck"/>`);
    });
  }

  return `<svg class="tent" viewBox="0 0 320 ${h}" width="100%" height="${h}" aria-hidden="true">
    <defs>
      <linearGradient id="tg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${colorHex}" stop-opacity=".95"/>
        <stop offset="1" stop-color="#601D49" stop-opacity=".95"/>
      </linearGradient>
    </defs>
    <path d="${d}" class="tent__arm" stroke="url(#tg)"/>
    <path d="${d}" class="tent__inner"/>
    <g class="tent__sucks">${suckers.join("")}</g>
  </svg>`;
}

screens.stage = function stage(id) {
  const chId = id || (Game.current() || Game.chapters()[0]).id;
  const c = Game.chapter(chId);
  if (!c || !c.unlocked) return screens.globe();
  const nodes = Game.nodes(chId);
  const pts = pathPoints(nodes.length);
  const mood = Game.mood();
  const hex = "#" + c.color.toString(16).padStart(6, "0");

  return { nav: "#/stage", html:
    `<div class="stagewrap" style="--ch:${hex}">
       ${hud()}
       <div class="stagehead">
         <button class="stagehead__pick" data-go="#/globe">
           <span class="stagehead__flag">${flagOf(c)}</span>
           <span>
             <b>${esc(c.country)}</b>
             <i>${c.done}/${c.total} dishes · tap to change country</i>
           </span>
           <span class="stagehead__chev">▾</span>
         </button>
       </div>

       <div class="stagemap">
         ${tentacleSVG(pts, hex)}
         ${nodes.map((n, i) => `
           <button class="snode ${n.done ? "is-done" : ""} ${n.current ? "is-current" : ""} ${n.locked ? "is-locked" : ""} ${n.type === "boss" ? "snode--boss" : ""}"
                   data-node="${chId}:${i}"
                   style="left:${(pts[i].x / 320) * 100}%; top:${pts[i].y}px"
                   aria-label="Stage ${i + 1}: ${esc(n.title)}${n.locked ? ", locked" : n.done ? ", done" : ""}">
             <span class="snode__dot">${n.done ? "✓" : n.locked ? "🔒" : NODE_ART[n.type]}</span>
             <span class="snode__n">${i + 1}</span>
             <span class="snode__t">${esc(n.title)}</span>
           </button>`).join("")}
         ${nodes.some((n) => n.current) ? `
           <span class="snode__you" style="left:${(pts[nodes.findIndex((n) => n.current)].x / 320) * 100}%; top:${pts[nodes.findIndex((n) => n.current)].y - 62}px">
             ${glorbArt(mood, 54, chId)}
           </span>` : ""}
       </div>
     </div>` };
};

/* ---------------- what happens when you tap a node ---------------- */
function openNode(chId, index) {
  const n = Game.nodes(chId)[index];
  if (!n) return;
  if (n.locked) { toast("Finish the one before it first"); return; }

  if (n.type === "cutscene") {
    const c = chapOf(chId);
    const mood = Game.mood();
    openSheet(`
      <div style="text-align:center">${glorbArt(mood, 132, chId)}</div>
      <h3 style="font-family:var(--display);font-size:23px;color:var(--secondary);text-align:center;margin-top:8px">${flagOf(c)} ${esc(c.country)}</h3>
      <p style="font-size:14px;line-height:1.6;color:var(--secondary);margin:10px 0 6px">${esc(n.text)}</p>
      <p style="font-size:13px;color:var(--primary);margin-bottom:16px">${esc(c.intro)}</p>
      <button class="btn" data-seen="${n.id}">Get to work</button>`);
    Narrator.say(`${c.country}. ${n.text} ${c.intro}`);
    return;
  }

  if (n.type === "lesson") {
    const d = dishById(n.dish);
    openSheet(`
      <span class="lessonkick">Technique</span>
      <h3 style="font-family:var(--display);font-size:25px;color:var(--secondary);margin:4px 0 10px">${esc(d.learn)}</h3>
      <p style="font-size:14px;line-height:1.6;color:var(--secondary)">${esc(d.steps.find((s) => s.hint)?.hint || d.blurb)}.</p>
      <p style="font-size:13px;color:var(--primary);margin:12px 0 16px">This is the thing <b>${esc(d.name)}</b> is really teaching you. Get it wrong and the rest of the recipe can't save it.</p>
      <button class="btn" data-seen="${n.id}">Understood</button>`);
    Narrator.say(`Technique: ${d.learn}. ${d.steps.find((s) => s.hint)?.hint || d.blurb}`);
    return;
  }

  if (n.type === "prep") {
    const p = ingById(n.ing);
    const c = chapOf(chId);
    openSheet(`
      <h3 style="font-family:var(--display);font-size:23px;color:var(--secondary)">${esc(p.name)}</h3>
      <p style="font-size:13px;color:var(--primary);margin:3px 0 14px">${flagOf(c)} ${esc(c.country)} · ${esc(p.tell)}</p>
      <div style="text-align:center;margin-bottom:16px">${ingIcon(p, 92)}</div>
      <button class="btn" data-gather="${p.id}">${Game.has(p.id) ? "Pick up another" : "Pick it up"}</button>`);
    Narrator.say(`${p.name}. ${p.tell}`);
    return;
  }

  go(`#/dish/${n.dish}`);
}

/* ═══════════════════════════════════════════════════════════
   INGREDIENT ART
   ═══════════════════════════════════════════════════════════ */
function ingIcon(p, size = 44) {
  const c = p.color;
  const art = {
    grain:  `<ellipse cx="16" cy="26" rx="5" ry="10" fill="${c}" transform="rotate(-18 16 26)"/><ellipse cx="24" cy="22" rx="5" ry="10" fill="${c}" transform="rotate(12 24 22)"/><ellipse cx="30" cy="29" rx="4.4" ry="9" fill="${c}" transform="rotate(-6 30 29)"/>`,
    bottle: `<path d="M18 6h8v6l4 6v18a2 2 0 0 1-2 2H16a2 2 0 0 1-2-2V18l4-6Z" fill="${c}"/><rect x="17" y="22" width="10" height="7" rx="1.5" fill="#fff" fill-opacity=".35"/>`,
    chilli: `<path d="M14 32c8 4 18-2 18-12 0-3-4-4-6-2-4 3-6 6-12 14Z" fill="${c}"/><path d="M31 18c1-4 3-5 5-5" stroke="#4E9E76" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    sheet:  `<rect x="10" y="10" width="24" height="24" rx="2" fill="${c}"/><path d="M14 16h16M14 22h16M14 28h11" stroke="#fff" stroke-opacity=".26" stroke-width="2"/>`,
    bowl:   `<path d="M9 21h26a13 13 0 0 1-26 0Z" fill="${c}"/><path d="M14 15c0-3 3-3 3-6M22 15c0-3 3-3 3-6" stroke="${c}" stroke-width="2" fill="none" stroke-linecap="round" opacity=".7"/>`,
    drop:   `<path d="M22 7c7 9 10 13 10 18a10 10 0 0 1-20 0c0-5 3-9 10-18Z" fill="${c}"/><circle cx="18" cy="27" r="3" fill="#fff" fill-opacity=".38"/>`,
    bulb:   `<path d="M22 9c5 4 8 8 8 13a8 8 0 0 1-16 0c0-5 3-9 8-13Z" fill="${c}"/><path d="M22 9v22" stroke="#C9A227" stroke-opacity=".5" stroke-width="1.6"/>`,
    tomato: `<circle cx="22" cy="25" r="12" fill="${c}"/><path d="M16 13c3 2 9 2 12 0M22 11v3" stroke="#4E9E76" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    lime:   `<circle cx="22" cy="22" r="13" fill="${c}"/><path d="M22 9v26M9 22h26M13 13l18 18M31 13 13 31" stroke="#fff" stroke-opacity=".35" stroke-width="1.5"/>`,
    corn:   `<ellipse cx="22" cy="23" rx="8" ry="14" fill="${c}"/><path d="M16 16h12M16 22h12M16 28h12" stroke="#B07B3A" stroke-opacity=".45" stroke-width="1.6"/><path d="M14 30c-4 2-6 6-5 9 4 0 8-3 9-7Z" fill="#8FBF52"/>`,
    seed:   `<ellipse cx="17" cy="24" rx="3.4" ry="7" fill="${c}" transform="rotate(-20 17 24)"/><ellipse cx="25" cy="21" rx="3.4" ry="7" fill="${c}" transform="rotate(14 25 21)"/><ellipse cx="22" cy="30" rx="3.4" ry="7" fill="${c}" transform="rotate(-4 22 30)"/>`,
  }[p.icon] || `<circle cx="22" cy="22" r="13" fill="${c}"/>`;
  return `<svg class="mat__ico" width="${size}" height="${size}" viewBox="0 0 44 44" aria-hidden="true">${art}</svg>`;
}

function dishRow(d) {
  const done = Game.state.cooked.includes(d.id);
  const ready = Game.canCook(d);
  return `<button class="row" data-go="#/dish/${d.id}">
    <span class="row__thumb" style="display:grid;place-items:center;background:var(--bg1);font-size:20px">${done ? "✓" : chapOf(d.chapter)?.flag || "🍽"}</span>
    <span class="row__body">
      <span class="row__title">${esc(d.name)}</span>
      <span class="row__sub">${esc(d.blurb)}</span>
    </span>
    <span class="row__meta">${d.cook}<br>${done ? "cooked" : ready ? "ready" : `${Game.missing(d).length} short`}</span>
  </button>`;
}

/* ═══════════════════════════════════════════════════════════
   SCREENS
   ═══════════════════════════════════════════════════════════ */

screens.intro = function intro(step) {
  const beats = [
    { m: "furious", h: "You were making<br>Fried Glorb.", p: "Oil hot, tentacles salted, ten minutes from dinner. Then the window goes dark." },
    { m: "furious", h: "He is a Glorb.", p: "Eight arms, a chef's hat he did not earn, and a fleet somewhere above your roof. He smells the pan. <b>“Give it here, or I start with you.”</b>" },
    { m: "demanding", h: "You hand it over.", p: "He eats it in one motion. A pause. Then: <b>“…More. And make it different this time.”</b>" },
    { m: "curious", h: "So you cook<br>him the world.", p: "One country at a time. Ten stages each. Somewhere around the third country he stops threatening you." },
  ];
  const i = Math.min(Math.max(Number(step) || 1, 1), beats.length) - 1;
  const b = beats[i];
  const mood = MOODS.find((m) => m.id === b.m) || MOODS[0];
  return { nav: false, noAsk: true, html:
    `<div class="hexes"></div>
     <div class="ob">
       <div class="ob__art">${glorbArt(mood, 210)}</div>
       <div class="ob__copy">
         <h2>${b.h}</h2>
         <p>${b.p}</p>
         <button class="btn" data-go="${i === beats.length - 1 ? "#/stage" : `#/intro/${i + 2}`}">${i === beats.length - 1 ? "Start cooking" : "Go on"}</button>
         <div class="dots">${beats.map((_, d) => `<i class="${d === i ? "is-on" : ""}"></i>`).join("")}</div>
       </div>
     </div>` };
};

screens.home = () => screens.stage();

/* ---------------- globe ---------------- */
screens.globe = function globe() {
  const chs = Game.chapters();
  const open = chs.filter((c) => c.unlocked).length;
  return { nav: "#/globe", html:
    `<div class="globewrap globewrap--earth">
       <canvas id="planet" aria-label="Globe of Earth. Use the country buttons below to open a chapter."></canvas>
       ${hud()}
       <div class="globe-top globe-top--low">
         <h2>Where next?</h2>
         <p>${open} of ${chs.length} countries open · drag to spin</p>
       </div>
       <div class="globe-search">
         <label class="search">
           ${tentacleIcon("search", 17)}
           <input id="gq" type="search" placeholder="Search countries, dishes, ingredients" autocomplete="off" aria-label="Search">
         </label>
         <div class="globe-results" id="gresults" hidden></div>
       </div>
       <div class="globe-chips" id="gchips">
         ${chs.map((c) => `<button class="gchip ${c.cleared ? "is-seen" : ""} ${c.unlocked ? "" : "is-locked"}" data-chapter="${c.id}" style="--c:#${c.color.toString(16).padStart(6, "0")}"><i></i>${flagOf(c)} ${esc(c.country)}${c.unlocked ? "" : " 🔒"}</button>`).join("")}
       </div>
       <div class="globe-hint" id="ghint">Tap a country, or pick one below</div>
     </div>` };
};

function chapterSheet(c) {
  if (!c.unlocked) {
    openSheet(`
      <h3 style="font-family:var(--display);font-size:23px;color:var(--secondary)">${flagOf(c)} ${esc(c.country)}</h3>
      <p style="font-size:13px;color:var(--primary);margin:3px 0 16px">${esc(c.needs)} — Glorb won't fly until he's finished eating where he is.</p>
      <button class="btn btn--ink" data-close-sheet>Fine</button>`);
    Narrator.say(`${c.country} is locked. ${c.needs}.`);
    return;
  }
  const nodes = Game.nodes(c.id);
  openSheet(`
    <div style="text-align:center">${glorbArt(Game.mood(), 96, c.id)}</div>
    <h3 style="font-family:var(--display);font-size:23px;color:var(--secondary);text-align:center;margin-top:6px">${flagOf(c)} ${esc(c.country)}</h3>
    <p style="font-size:13px;color:var(--primary);text-align:center;margin:3px 0 16px">${esc(c.intro)}</p>
    <div class="stagepips">${nodes.map((n) => `<i class="${n.done ? "is-done" : n.current ? "is-now" : ""}"></i>`).join("")}</div>
    <p style="font-size:12px;color:var(--primary);text-align:center;margin:10px 0 16px">${nodes.filter((n) => n.done).length} of 10 stages</p>
    <button class="btn" data-go="#/stage/${c.id}">Enter ${esc(c.country)}</button>`);
  Narrator.say(`${c.country}. ${c.intro} ${nodes.filter((n) => n.done).length} of ten stages done.`);
}

/* ---------------- dish ---------------- */
screens.dish = function dish(id) {
  const d = dishById(id);
  if (!d) return screens.search();
  const c = Game.chapter(d.chapter);
  const missing = Game.missing(d);
  const cooked = Game.state.cooked.includes(d.id);
  const mood = Game.mood();
  return { nav: false, html:
    `<div class="hero hero--dish" style="--fc:#${(c?.color || 0x573451).toString(16).padStart(6, "0")}">
       <span class="hero__flag">${c ? flagOf(c) : "🍽"}</span>
       <div class="hero__scrim"></div>
       <div class="hero__title">
         <h2>${esc(d.name)}</h2>
         <p>${esc(c?.country || "")} · serves ${d.serves} · ${d.prep} prep · ${d.cook} cook</p>
       </div>
     </div>
     ${backbar("", false, true)}
     <div class="sheet-cream" style="margin-top:-10px">
       <div class="pill-row">
         <span class="pill ${d.diet === "veg" ? "pill--accent" : ""}">${d.diet === "veg" ? "Vegetarian" : "Meat"}</span>
         <span class="pill">Difficulty ${d.difficulty}/5</span>
         <span class="pill">Teaches: ${esc(d.learn)}</span>
         ${cooked ? `<span class="pill pill--accent">Cooked ✓</span>` : ""}
       </div>
       <p class="body-copy">${esc(d.blurb)}</p>

       <div class="glorbcard glorbcard--sm" style="--gc:${mood.color};margin-top:16px">
         ${glorbArt(mood, 58, d.chapter)}
         <div class="glorbcard__b"><p class="glorbcard__line">“${esc(d.glorb)}”</p></div>
       </div>

       <div style="height:20px"></div>
       <div class="subhead subhead--ink"><h2>You need</h2></div>
       <div class="needpanel" style="margin-bottom:16px">
         ${d.needs.length ? d.needs.map((n) => {
           const p = ingById(n); const have = Game.has(n);
           return `<div class="needrow ${have ? "is-have" : ""}"><span>${esc(p ? p.name : n)}${have ? " ✓" : ""}</span><span>${have ? `×${Game.count(n)}` : "—"}</span></div>`;
         }).join("") : `<div class="needrow" style="justify-content:center;color:var(--primary)">Just milk and nerve</div>`}
       </div>
       ${missing.length
         ? `<p style="font-size:12.5px;color:var(--primary);margin-bottom:14px">Missing ${missing.map((m) => esc(ingById(m)?.name || m)).join(", ")} — pick them up in ${esc(c?.country || "the market")}.</p>`
         : `<p style="font-size:12.5px;color:var(--primary);margin-bottom:14px">You have everything.</p>`}
       <button class="btn" data-go="#/steps/${d.id}">${missing.length ? "Read it through" : "Start cooking"}</button>

       <div style="height:22px"></div>
       <div class="subhead subhead--ink"><h2>Rate it</h2></div>
       <div class="rate" id="rate" data-recipe="${d.id}">
         ${[1, 2, 3, 4, 5].map((n) => `<button data-star="${n}" aria-label="${n} star${n > 1 ? "s" : ""}">★</button>`).join("")}
         <span class="rate__n" id="rate-n">—</span>
       </div>
       <div style="height:20px"></div>
       <div class="subhead subhead--ink"><h2>How yours turned out</h2></div>
       <div class="shots" id="shots"><label>+<input type="file" accept="image/*" data-photo="${d.id}"></label></div>
       <p style="font-size:11px;color:var(--primary);margin-top:8px">${DB.isLive ? "Shared with everyone." : "Saved on this device."}</p>
     </div>` };
};

/* ---------------- steps ---------------- */
screens.steps = function steps(id) {
  const d = dishById(id);
  if (!d) return screens.search();
  const done = readSteps()[d.id] || [];
  const all = done.length >= d.steps.length;
  const missing = Game.missing(d);
  return { nav: false, html:
    `<div class="stripes"></div>
     ${backbar(d.name)}
     <div class="sect" style="margin-top:16px">
       <div style="height:6px;border-radius:999px;background:rgba(243,242,236,.22);overflow:hidden">
         <div style="height:100%;width:${(done.length / d.steps.length) * 100}%;background:var(--accent);transition:width .3s var(--pop)"></div>
       </div>
       <p style="font-size:11.5px;color:var(--on-dark);opacity:.8;margin-top:7px">${done.length} of ${d.steps.length} · teaches ${esc(d.learn.toLowerCase())}</p>
     </div>
     <div class="sheet-cream gridpaper" style="margin-top:20px">
       <div class="steps">
         ${d.steps.map((s, i) => `
           <button class="step ${done.includes(i) ? "is-done" : ""}" data-dstep="${i}" style="width:100%;text-align:left">
             <span class="step__n">${i + 1}</span>
             <span><span class="step__t">${esc(s.t)}</span>${s.hint ? `<span class="step__hint">${esc(s.hint)}</span>` : ""}</span>
           </button>`).join("")}
       </div>
       <div style="height:18px"></div>
       ${missing.length ? `<p style="font-size:12.5px;color:var(--primary);margin-bottom:12px">Still short ${missing.map((m) => esc(ingById(m)?.name || m)).join(", ")}. Read it now, cook it when you've shopped.</p>` : ""}
       <button class="btn ${all && !missing.length ? "" : "btn--ink"}" data-dfinish="${d.id}" ${missing.length ? "disabled" : ""}>
         ${missing.length ? "Missing ingredients" : all ? "Serve it to Glorb" : "Mark all done & serve"}
       </button>
     </div>` };
};

/* ---------------- search (the book) ---------------- */
screens.search = function search() {
  const q = (screens.search.q || "").trim().toLowerCase();
  const diet = screens.search.diet || null;
  const ready = screens.search.ready || false;
  const open = Game.chapters().filter((c) => c.unlocked).map((c) => c.id);

  let list = DISHES.filter((d) => open.includes(d.chapter));
  if (q) list = list.filter((d) => d.name.toLowerCase().includes(q) || d.needs.some((n) => (ingById(n)?.name || n).toLowerCase().includes(q)));
  if (diet) list = list.filter((d) => d.diet === diet);
  if (ready) list = list.filter((d) => Game.canCook(d));
  const filtering = Boolean(q || diet || ready);

  return { nav: "#/search", html:
    `<div class="stripes"></div>
     ${hud()}
     <div class="searchwrap" style="padding-top:14px">
       <label class="search">
         ${tentacleIcon("search", 18)}
         <input id="q" type="search" placeholder="Search dishes and ingredients" value="${esc(screens.search.q || "")}" autocomplete="off">
       </label>
     </div>
     <div class="chips">
       ${DIETS.map((dt) => `<button class="chip ${diet === dt.id ? "is-on" : "chip--outline"}" data-chip="diet:${dt.id}">${dt.label}</button>`).join("")}
       <button class="chip ${ready ? "is-on" : "chip--outline"}" data-chip="ready">Can cook now</button>
     </div>
     <div class="sheet-cream" style="margin-top:18px">
       ${filtering
         ? `<div class="subhead subhead--ink"><h2>Results</h2></div>
            ${list.length ? list.map(dishRow).join("") : `<div class="empty"><b>Nothing matches</b>Try another filter, or go shopping.</div>`}`
         : `<div class="subhead subhead--ink"><h2>Your pantry</h2></div>
            ${PANTRY.some((p) => Game.count(p.id) > 0)
              ? `<div class="matgrid" style="margin-bottom:22px">${PANTRY.filter((p) => Game.count(p.id) > 0).map((p) => `
                  <button class="mat" data-go="#/ing/${p.id}">
                    <span class="mat__have">${Game.count(p.id)}</span>${ingIcon(p)}
                    <span class="mat__n">${esc(p.name)}</span>
                    <span class="mat__r">${esc(chapOf(p.where)?.country || "")}</span>
                  </button>`).join("")}</div>`
              : `<div class="empty"><b>Nothing in the pantry</b>Open a stage and go shopping.</div>`}
            ${Game.chapters().filter((c) => c.unlocked).map((c) => `
              <div class="subhead subhead--ink"><h2>${flagOf(c)} ${esc(c.country)}</h2></div>
              ${c.dishes.map(dishById).filter(Boolean).map(dishRow).join("")}
              <div style="height:16px"></div>`).join("")}`}
     </div>` };
};

/* ---------------- ingredient ---------------- */
screens.ing = function ing(id) {
  const p = ingById(id);
  if (!p) return screens.search();
  const c = chapOf(p.where);
  const used = DISHES.filter((d) => d.needs.includes(p.id));
  return { nav: false, html:
    `<div class="stripes"></div>
     ${backbar(p.name)}
     <div class="sheet-cream gridpaper" style="margin-top:26px">
       <div style="display:flex;gap:16px;align-items:flex-start;margin-bottom:16px">
         <span style="background:var(--bg2);border:1px solid var(--line);border-radius:14px;padding:14px">${ingIcon(p, 64)}</span>
         <div>
           <div class="pill-row" style="margin:0 0 8px">
             <span class="pill">${c ? c.flag + " " + esc(c.country) : ""}</span>
             <span class="pill pill--accent">+${XP.gather} XP</span>
             ${Game.count(p.id) ? `<span class="pill">You have ${Game.count(p.id)}</span>` : ""}
           </div>
           <p style="font-size:12.5px;color:var(--primary)">${esc(p.tell)}</p>
         </div>
       </div>
       <button class="btn" data-gather="${p.id}">Pick one up</button>
       <div style="height:22px"></div>
       <div class="subhead subhead--ink"><h2>Used in</h2></div>
       ${used.length ? used.map(dishRow).join("") : `<div class="empty">Not used in any dish yet.</div>`}
     </div>` };
};

/* ---------------- quests ---------------- */
screens.quests = function quests() {
  const qs = Game.quests();
  const L = Game.level();
  return { nav: "#/quests", html:
    `<div class="stripes"></div>
     ${hud()}
     <div class="sheet-cream" style="margin-top:20px">
       <div class="subhead subhead--ink"><h2>Today's orders</h2></div>
       ${qs.map((q) => `
         <div class="quest ${q.done ? "is-done" : ""}">
           <span class="quest__tick" aria-hidden="true">${q.done ? "✓" : ""}</span>
           <span><span class="quest__t">${esc(q.text)}</span><span class="quest__bar"><i style="width:${(q.progress / q.goal) * 100}%"></i></span></span>
           <button class="quest__claim" data-claim="${q.id}" ${!q.done || q.claimed ? "disabled" : ""}>
             ${q.claimed ? "Claimed" : q.done ? `+${XP.quest} XP` : `${q.progress}/${q.goal}`}
           </button>
         </div>`).join("")}
       <p style="font-size:12px;color:var(--primary);margin-top:16px">Orders reset at midnight. Your streak survives as long as you cook or shop each day.</p>
       <div style="height:22px"></div>
       <div class="subhead subhead--ink"><h2>Titles</h2></div>
       ${LEVELS.map((l) => `
         <div class="setrow">
           <span><span class="setrow__t">${esc(l.title)}</span><span class="setrow__s">Level ${l.lvl} · ${l.need} XP</span></span>
           <span style="font-size:12px;color:${L.lvl >= l.lvl ? "var(--deep)" : "var(--primary)"}">${L.lvl >= l.lvl ? "Earned" : "Locked"}</span>
         </div>`).join("")}
     </div>` };
};

screens.badges = function badges() {
  const all = Game.achievements();
  return { nav: false, html:
    `<div class="stripes"></div>
     ${backbar("Medals")}
     <div class="sheet-cream" style="margin-top:26px">
       <p style="font-size:12.5px;color:var(--primary);margin-bottom:16px">${all.filter((a) => a.owned).length} of ${all.length} earned.</p>
       <div class="badges">
         ${all.map((a) => `<div class="badge ${a.owned ? "is-on" : ""}"><em>${a.icon}</em><b>${esc(a.name)}</b><span>${esc(a.desc)}</span></div>`).join("")}
       </div>
     </div>` };
};

/* ═══════════════════════════════════════════════════════════
   PROFILE — the bookshelf
   The books are the settings sections. Straight reuse of the CSS-3D
   spines from the shelf portfolio: spine + top page-block + fore-edge,
   varied heights, one leaning so the row isn't a picket fence.
   ═══════════════════════════════════════════════════════════ */
const BOOKS = [
  { id: "story",   title: "THE STORY",   spine: "#8C1C28", edge: "#591018", ink: "#F5DFE2", w: 54, h: 214 },
  { id: "access",  title: "ACCESS",      spine: "#1E5C63", edge: "#113538", ink: "#D7F0F2", w: 46, h: 228 },
  { id: "kitchen", title: "ASSISTANT",   spine: "#333333", edge: "#151515", ink: "#F9E95A", w: 62, h: 200 },
  { id: "data",    title: "DATA",        spine: "#1E3A5F", edge: "#13253D", ink: "#CFE0F5", w: 44, h: 236 },
  { id: "about",   title: "ABOUT",       spine: "#D99A2B", edge: "#A8751E", ink: "#2B1D05", w: 52, h: 208 },
];

screens.profile = function profile() {
  const mood = Game.mood();
  const chs = Game.chapters();
  const owned = Game.achievements().filter((a) => a.owned);
  return { nav: "#/profile", html:
    `<div class="stripes"></div>
     ${hud()}
     <div class="sect" style="margin-top:16px">
       <div class="glorbcard" style="--gc:${mood.color}">
         ${glorbArt(mood, 92, (Game.current() || {}).id)}
         <div class="glorbcard__b">
           <span class="glorbcard__mood">Glorb is ${esc(mood.name.toLowerCase())}</span>
           <span class="glorbcard__fed">${Game.state.cooked.length} dishes eaten · ${chs.filter((c) => c.cleared).length} countries cleared</span>
         </div>
       </div>
     </div>

     <div class="sheet-cream" style="margin-top:20px">
       <div class="statgrid">
         <div class="statbox"><b>${Game.state.cooked.length}</b><span>Cooked</span></div>
         <div class="statbox"><b>${chs.filter((c) => c.cleared).length}/${chs.length}</b><span>Countries</span></div>
         <div class="statbox"><b>${owned.length}</b><span>Medals</span></div>
       </div>

       <div class="subhead subhead--ink"><h2>The shelf</h2></div>
       <p style="font-size:12px;color:var(--primary);margin-bottom:14px">Pull a book off the shelf. Each one is a section.</p>
       <div class="shelf3d">
         <div class="books">
           ${BOOKS.map((b, i) => `
             <button class="book" data-book="${b.id}" style="width:${b.w}px;height:${b.h}px;${i === 2 ? "transform-origin:bottom left;transform:rotateZ(-2.5deg);" : ""}" aria-label="${esc(b.title)} settings">
               <span class="book__spine" style="background:${b.spine};color:${b.ink}">
                 <span class="book__rule"></span>
                 <span class="book__title">${esc(b.title)}</span>
                 <span class="book__rule"></span>
               </span>
               <span class="book__pages"></span>
               <span class="book__edge" style="background:${b.edge}"></span>
             </button>`).join("")}
         </div>
         <div class="plank"></div>
       </div>
       <div id="bookpanel"></div>
     </div>` };
};

function bookPanel(id) {
  const b = BOOKS.find((x) => x.id === id);
  if (!b) return;
  const body = {
    story: `
      <p style="font-size:13.5px;line-height:1.6;color:var(--secondary)">An alien octopus landed while you were cooking, threatened to eat you, tasted the food, and changed his mind. Now he will not leave until he has eaten the whole planet — one country at a time.</p>
      <div style="height:14px"></div>
      <button class="btn btn--ink btn--sm" data-replay>Replay the arrival</button>`,
    access: `
      <div class="setrow">
        <span><span class="setrow__t">Audio description</span><span class="setrow__s">Reads each screen aloud${Narrator.supported ? "" : " — not supported in this browser"}.</span></span>
        <button class="switch ${Narrator.enabled ? "is-on" : ""}" data-toggle="audio" role="switch" aria-checked="${Narrator.enabled}" aria-label="Audio description"><i></i></button>
      </div>
      <div class="setrow">
        <span><span class="setrow__t">Dark mode</span><span class="setrow__s">Follows your system on first open. This overrides it.</span></span>
        <button class="switch ${theme() === "dark" ? "is-on" : ""}" data-toggle="dark" role="switch" aria-checked="${theme() === "dark"}" aria-label="Dark mode"><i></i></button>
      </div>`,
    kitchen: `
      <p style="font-size:12.5px;color:var(--primary);line-height:1.55">Optional. Paste a Google AI Studio key and open questions go to Gemini Flash. Stored in this browser only — never in a file.</p>
      <input class="keyfield" id="aikey" type="password" placeholder="${AI.live ? "Key saved — paste a new one to replace" : "AIza…"}" autocomplete="off" aria-label="Gemini API key">
      <div style="display:flex;gap:10px;margin-top:12px">
        <button class="btn btn--sm" data-savekey>Save key</button>
        ${AI.live ? `<button class="btn btn--ghost btn--sm" style="color:var(--secondary);border-color:var(--line)" data-clearkey>Remove</button>` : ""}
      </div>`,
    data: `
      <div class="setrow">
        <span><span class="setrow__t">Ratings &amp; photos</span><span class="setrow__s">${DB.isLive ? "Live on Supabase." : "On this device. Fill in config.js and run supabase/schema.sql to go live."}</span></span>
        <span style="font-size:12px;color:${DB.isLive ? "var(--deep)" : "var(--primary)"}">${DB.isLive ? "Live" : "Local"}</span>
      </div>
      <div style="height:14px"></div>
      <button class="btn btn--ink btn--sm" data-wipe>Reset all progress</button>`,
    about: `
      <p style="font-size:13.5px;line-height:1.6;color:var(--secondary)">Peak &amp; Pan — built from the team rocket Figma, then reworked around the octopus. Vanilla HTML, CSS and JavaScript; no framework, no build step.</p>
      <p style="font-size:12px;color:var(--primary);margin-top:10px">Globe textures NASA blue marble via three-globe. Everything else drawn here.</p>`,
  }[id];

  $("#bookpanel").innerHTML = `
    <div class="bookopen" style="--bc:${b.spine}">
      <span class="bookopen__k">${esc(b.title)}</span>
      ${body}
    </div>`;
  $$(".book").forEach((el) => el.classList.toggle("is-active", el.dataset.book === id));
  $("#bookpanel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

/* ---------------- assistant ---------------- */
let CHAT = [];
screens.chat = function chat() {
  if (!CHAT.length) CHAT = [{ who: "ai", text: "Ask me what you can cook, what you're short of, or where an ingredient comes from." }];
  return { nav: false, noAsk: true, html:
    `<div class="stripes"></div>
     ${backbar("Ask the kitchen")}
     <div class="sheet-cream" style="margin-top:22px;display:flex;flex-direction:column;min-height:calc(100% - 120px)">
       <div class="chatlog" id="chatlog">
         ${CHAT.map((m) => `<div class="msg msg--${m.who === "me" ? "me" : "ai"}">${fmt(m.text)}</div>`).join("")}
       </div>
       <div style="margin-top:auto">
         <div class="asksuggest">${AI.suggestions().map((s) => `<button data-suggest="${esc(s)}">${esc(s)}</button>`).join("")}</div>
         <form class="askbar" id="askform">
           <input id="askinput" type="text" placeholder="${AI.live ? "Ask anything" : "Ask about your pantry or a dish"}" autocomplete="off" aria-label="Ask the kitchen">
           <button type="submit" aria-label="Send"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
         </form>
         <p style="font-size:11px;color:var(--primary);margin-top:8px">${AI.live ? "Gemini connected · pantry answers computed locally" : "Answering from your own data. Add a key in Profile → Assistant."}</p>
       </div>
     </div>` };
};
const fmt = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\n/g, "<br>");

async function sendChat(text) {
  const q = String(text || "").trim();
  if (!q) return;
  CHAT.push({ who: "me", text: q });
  route();
  const log = $("#chatlog");
  log.insertAdjacentHTML("beforeend", `<div class="msg msg--ai msg--typing"><span></span><span></span><span></span></div>`);
  log.lastElementChild.scrollIntoView({ block: "end" });
  const res = await AI.ask(q);
  CHAT.push({ who: "ai", text: res.text });
  route();
  Narrator.say(res.text.replace(/\*\*/g, ""));
  $("#chatlog")?.lastElementChild?.scrollIntoView({ block: "end", behavior: "smooth" });
}

/* legacy routes from the earlier fictions */
["creature", "ingredient", "hunt-prep", "hunt", "butcher", "pieces", "recipe", "material", "social", "ob", "splash", "cook", "chapter", "settings"].forEach((k) => {
  screens[k] = () => screens.stage();
});

/* ═══════════════════════════════════════════════════════════
   TENTACLE ICONS — every nav item is an arm holding the thing
   ═══════════════════════════════════════════════════════════ */
function tentacleIcon(kind, size = 24) {
  const arm = `<path d="M3 21c3.4 0 5.2-1.6 6.2-3.6" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/>
               <circle cx="4.4" cy="19.6" r="1.05" fill="currentColor" opacity=".8"/>
               <circle cx="7" cy="19" r=".95" fill="currentColor" opacity=".65"/>
               <circle cx="9" cy="17.4" r=".85" fill="currentColor" opacity=".5"/>`;
  const heads = {
    stage:  `<path d="M7 10.5 13 5l6 5.5V19a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 7 19v-8.5Z" stroke="currentColor" stroke-width="1.9" fill="none" stroke-linejoin="round"/><path d="M11 20.5V14h4v6.5" stroke="currentColor" stroke-width="1.7" fill="none"/>`,
    search: `<circle cx="14" cy="9.5" r="5.2" stroke="currentColor" stroke-width="2" fill="none"/><path d="M18 13.5 21.5 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>`,
    quest:  `<rect x="8" y="3.5" width="12" height="14" rx="2" stroke="currentColor" stroke-width="1.9" fill="none"/><path d="M11 8h6M11 11.5h6M11 15h3.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>`,
    profile:`<path d="M9 4.5h9a1.5 1.5 0 0 1 1.5 1.5v12H9a1.5 1.5 0 0 1-1.5-1.5V6A1.5 1.5 0 0 1 9 4.5Z" stroke="currentColor" stroke-width="1.9" fill="none"/><path d="M7.5 15.5h12" stroke="currentColor" stroke-width="1.7"/>`,
    map:    `<circle cx="12" cy="12" r="8" stroke="currentColor" stroke-width="1.9" fill="none"/><path d="M4 12h16M12 4c2.4 2.6 2.4 11.4 0 16M12 4c-2.4 2.6-2.4 11.4 0 16" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true" class="tico">${heads[kind] || ""}${kind === "map" ? "" : arm}</svg>`;
}

/* ═══════════════════════════════════════════════════════════
   WIRING
   ═══════════════════════════════════════════════════════════ */
const DESCRIBE = {
  stage: (id) => {
    const c = Game.chapter(id || (Game.current() || {}).id);
    if (!c) return "";
    const n = Game.nodes(c.id);
    const cur = n.find((x) => x.current);
    return `${c.country}. Stage ${cur ? cur.index + 1 : 10} of 10. ${cur ? `Next: ${cur.title}.` : "Country cleared."} Glorb is ${Game.mood().name.toLowerCase()}.`;
  },
  globe: () => `The globe. ${Game.chapters().filter((c) => c.unlocked).length} of ${CHAPTERS.length} countries open.`,
  search: () => `Search. ${DISHES.filter((d) => Game.chapter(d.chapter)?.unlocked).length} dishes available.`,
  dish: (id) => { const d = dishById(id); return d ? `${d.name}. ${d.blurb} Teaches ${d.learn}.` : ""; },
  quests: () => Game.quests().map((q) => `${q.text}, ${q.progress} of ${q.goal}`).join(". "),
  profile: () => `Profile. Level ${Game.level().lvl}. The shelf holds the settings — pull a book off it.`,
  chat: () => `Ask the kitchen.`,
  badges: () => `Medals. ${Game.achievements().filter((a) => a.owned).length} earned.`,
};

let planet = null, planetCanvas = null;
const routeKey = () => (location.hash || "#/").replace(/^#\//, "").split("/")[0] || "stage";
const routeArg = () => (location.hash || "").split("/")[2] || "";

function afterRoute() {
  const key = routeKey();
  $("#ask").hidden = ["chat", "intro"].includes(key);
  $$(".navitem").forEach((n) => n.classList.toggle("is-on", n.dataset.go === "#/" + key));

  if (key !== "globe" && planet) { planet.dispose(); planet = null; planetCanvas = null; }
  if (key === "globe" && window.mountPlanet && (!planet || planetCanvas !== $("#planet"))) {
    if (planet) planet.dispose();
    mountGlobe();
  }
  if (key === "globe") {
    wireGlobeSearch();
    setTimeout(() => {
      if (routeKey() !== "globe" || window.mountPlanet || $("#globe-fallback")) return;
      $(".globewrap")?.insertAdjacentHTML("beforeend", `
        <div class="globe-fallback" id="globe-fallback">
          <b>The globe needs a web server</b>
          <p>It's a 3D module, and browsers block modules loaded straight from a file. Everything else works either way.</p>
          <code>python -m http.server 3400</code>
        </div>`);
    }, 1200);
  }

  if (key === "search") {
    const q = $("#q");
    q?.addEventListener("input", () => {
      screens.search.q = q.value;
      const pos = q.selectionStart;
      route();
      const nq = $("#q");
      if (nq) { nq.focus(); nq.setSelectionRange(pos, pos); }
    });
  }

  if (key === "chat") {
    $("#askform")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const v = $("#askinput").value; $("#askinput").value = "";
      sendChat(v);
    });
    setTimeout(() => $("#chatlog")?.lastElementChild?.scrollIntoView({ block: "end" }), 30);
  }

  if (key === "dish") loadDishSocial(routeArg());

  /* scroll the stage map to whichever node is next */
  if (key === "stage") {
    const cur = $(".snode.is-current");
    if (cur) setTimeout(() => cur.scrollIntoView({ block: "center", behavior: "auto" }), 20);
  }

  ["#grid", ".matgrid", ".chatlog", ".badges", ".steps"].forEach((sel) => {
    document.querySelectorAll(`#screen ${sel}`).forEach((el) => el.classList.add("stagger"));
  });

  const d = DESCRIBE[key];
  if (d) Narrator.say(d(routeArg()));
}

function mountGlobe() {
  const canvas = $("#planet");
  if (!canvas) return;
  planetCanvas = canvas;
  planet = window.mountPlanet(canvas, {
    chapters: Game.chapters(),
    dark: theme() === "dark",
    onSelect: (c) => {
      const fresh = Game.chapter(c.id);
      if (fresh.unlocked) { const r = Game.visit(c.id); if (r) showReward(r); }
      chapterSheet(fresh);
    },
  });
  canvas.addEventListener("planethover", (e) => {
    const h = $("#ghint");
    if (h) h.textContent = e.detail ? `${e.detail.code} · ${e.detail.country}` : "Tap a country, or pick one below";
  });
  const first = Game.current();
  if (first) planet.focus(first.id);
}

async function loadDishSocial(id) {
  if (!$("#rate")) return;
  const [r, photos] = await Promise.all([DB.ratings(id), DB.photos(id)]);
  $$("#rate [data-star]").forEach((b) => b.classList.toggle("is-on", Number(b.dataset.star) <= (r.mine || Math.round(r.avg))));
  const n = $("#rate-n");
  if (n) n.textContent = r.count ? `${r.avg.toFixed(1)} from ${r.count}${r.mine ? " · yours " + r.mine : ""}` : "Be the first";
  const shots = $("#shots");
  if (shots) {
    shots.querySelectorAll("img").forEach((el) => el.remove());
    photos.forEach((p) => shots.insertAdjacentHTML("afterbegin", `<img src="${p.url}" alt="${esc(p.note || "A photo of this dish")}">`));
  }
}

function downscale(dataUrl, max, quality) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function wireGlobeSearch() {
  const q = $("#gq");
  if (!q || q.dataset.wired) return;
  q.dataset.wired = "1";
  const results = $("#gresults"), chips = $("#gchips");
  q.addEventListener("input", () => {
    const term = q.value.trim().toLowerCase();
    if (!term) { results.hidden = true; results.innerHTML = ""; chips.style.display = ""; return; }
    chips.style.display = "none";
    const hits = [];
    Game.chapters().forEach((c) => {
      if (c.country.toLowerCase().includes(term) || c.city.toLowerCase().includes(term))
        hits.push({ kind: "Country", name: `${flagOf(c)} ${c.country}`, sub: c.unlocked ? `${c.done}/${c.total} cooked` : c.needs, chapter: c.id });
    });
    DISHES.forEach((d) => { if (d.name.toLowerCase().includes(term)) hits.push({ kind: "Dish", name: d.name, sub: chapOf(d.chapter)?.country, go: `#/dish/${d.id}`, chapter: d.chapter }); });
    PANTRY.forEach((p) => { if (p.name.toLowerCase().includes(term)) hits.push({ kind: "Ingredient", name: p.name, sub: chapOf(p.where)?.country, go: `#/ing/${p.id}`, chapter: p.where }); });
    results.hidden = false;
    results.innerHTML = hits.length
      ? hits.slice(0, 6).map((h) => `<button class="gres" data-res='${esc(JSON.stringify({ go: h.go || "", chapter: h.chapter || "" }))}'>
           <span class="gres__k">${h.kind}</span><span class="gres__n">${esc(h.name)}</span><span class="gres__s">${esc(h.sub || "")}</span></button>`).join("")
      : `<div class="gres gres--empty">Nothing called “${esc(q.value)}” yet.</div>`;
  });
}

/* ---------------- events ---------------- */
document.addEventListener("click", async (e) => {
  const t = e.target;
  if (t.closest("#ask")) { go("#/chat"); return; }

  const node = t.closest("[data-node]");
  if (node) { const [ch, i] = node.dataset.node.split(":"); openNode(ch, Number(i)); return; }

  const seen = t.closest("[data-seen]");
  if (seen) { showReward(Game.see(seen.dataset.seen)); closeSheet(); route(); return; }

  const book = t.closest("[data-book]");
  if (book) { bookPanel(book.dataset.book); return; }

  const res = t.closest("[data-res]");
  if (res) {
    const { go: dest, chapter } = JSON.parse(res.dataset.res);
    if (chapter) planet?.focus(chapter);
    if (dest) { go(dest); return; }
    const c = Game.chapter(chapter);
    if (c) { if (c.unlocked) { const r = Game.visit(c.id); if (r) showReward(r); } chapterSheet(c); }
    const q = $("#gq"); if (q) { q.value = ""; q.dispatchEvent(new Event("input")); }
    return;
  }

  const chip = t.closest("[data-chapter]");
  if (chip) {
    const c = Game.chapter(chip.dataset.chapter);
    if (!c) return;
    planet?.focus(c.id);
    if (c.unlocked) { const r = Game.visit(c.id); if (r) { showReward(r); planet?.refresh(Game.chapters()); } }
    chapterSheet(c);
    return;
  }

  const gather = t.closest("[data-gather]");
  if (gather) {
    showReward(Game.gather(gather.dataset.gather));
    closeSheet();
    route();
    return;
  }

  const claim = t.closest("[data-claim]");
  if (claim) { showReward(Game.claimQuest(claim.dataset.claim)); route(); return; }

  const star = t.closest("[data-star]");
  if (star) {
    const id = star.closest("[data-recipe]").dataset.recipe;
    await DB.rate(id, Number(star.dataset.star));
    showReward(Game.rated());
    loadDishSocial(id);
    return;
  }

  const dstep = t.closest("[data-dstep]");
  if (dstep) {
    const id = routeArg(), all = readSteps(), set = new Set(all[id] || []);
    const i = Number(dstep.dataset.dstep);
    set.has(i) ? set.delete(i) : set.add(i);
    all[id] = [...set];
    writeSteps(all);
    route();
    return;
  }

  const fin = t.closest("[data-dfinish]");
  if (fin && !fin.disabled) {
    const d = dishById(fin.dataset.dfinish);
    const all = readSteps(); all[d.id] = d.steps.map((_, i) => i); writeSteps(all);
    const result = Game.cook(d);
    go("#/stage");
    setTimeout(() => showReward(result), 140);
    return;
  }

  const sug = t.closest("[data-suggest]");
  if (sug) { sendChat(sug.dataset.suggest); return; }

  const toggle = t.closest("[data-toggle]");
  if (toggle) {
    const which = toggle.dataset.toggle;
    if (which === "audio") {
      Narrator.enabled = !Narrator.enabled;
      if (Narrator.enabled) Narrator.readAloud("Audio description on.");
    } else {
      setTheme(theme() === "dark" ? "light" : "dark");
      if (planet) { planet.dispose(); planet = null; if (routeKey() === "globe") mountGlobe(); }
    }
    route();
    if (routeKey() === "profile") bookPanel("access");
    return;
  }

  if (t.closest("[data-savekey]")) { AI.key = $("#aikey").value; toast(AI.live ? "Key saved to this browser" : "Key cleared"); route(); bookPanel("kitchen"); return; }
  if (t.closest("[data-clearkey]")) { AI.key = ""; toast("Key removed"); route(); bookPanel("kitchen"); return; }
  if (t.closest("[data-replay]")) { go("#/intro/1"); return; }

  if (t.closest("[data-wipe]")) {
    Game.reset();
    localStorage.removeItem(STEP_KEY);
    localStorage.removeItem("peak-and-pan/db");
    location.hash = "#/intro/1";
    location.reload();
  }
});

document.addEventListener("click", (e) => {
  const chip = e.target.closest("[data-chip]");
  if (!chip) return;
  const [k, v] = chip.dataset.chip.split(":");
  if (k === "diet") screens.search.diet = screens.search.diet === v ? null : v;
  if (k === "ready") screens.search.ready = !screens.search.ready;
  route();
});

document.addEventListener("change", async (e) => {
  const inp = e.target.closest("[data-photo]");
  if (!inp || !inp.files?.[0]) return;
  const reader = new FileReader();
  reader.onload = async () => {
    await DB.addPhoto(inp.dataset.photo, await downscale(reader.result, 900, 0.72), "");
    toast("Photo added");
    loadDishSocial(inp.dataset.photo);
  };
  reader.readAsDataURL(inp.files[0]);
});

/* ---------------- boot ---------------- */
window.addEventListener("hashchange", afterRoute);
window.addEventListener("planet-ready", () => { if (routeKey() === "globe" && !planet) mountGlobe(); });
setTheme(theme());

/* paint the nav icons as tentacles */
document.querySelectorAll("[data-tico]").forEach((el) => {
  el.innerHTML = tentacleIcon(el.dataset.tico, el.dataset.tico === "map" ? 20 : 23);
});

if (!location.hash || location.hash === "#/") {
  location.hash = Game.state.cooked.length || Game.state.xp ? "#/stage" : "#/intro/1";
}
route();
afterRoute();
