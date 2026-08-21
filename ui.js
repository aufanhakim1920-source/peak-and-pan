/* ============================================================
   Peak & Pan — shared UI
   Theme, rewards, Glorb, the HUD, icons and the row/card shapes.
   Loaded as a classic script after ui.js. Edit this file on its
   own; nothing else needs to change.
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
   INGREDIENT ART
   ═══════════════════════════════════════════════════════════ */
function ingIcon(p, size = 44) {
  /* a real photograph beats a drawn glyph when one has been uploaded */
  const shot = DB.media("ingredient", p.id);
  if (shot) return `<img class="mat__ico mat__ico--photo" src="${shot}" alt="" width="${size}" height="${size}" loading="lazy">`;
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
   RECIPE CARDS — collectible, with foil
   The app is about collecting the world's dishes for Glorb, so a dish
   should feel like something you own. Technique from the Foil
   portfolio: two stacked layers over the face, both reading the same
   pointer position the tilt does, so the sheen tracks the angle you
   are holding the card at. Pointer-driven throughout — nothing drifts.
   ═══════════════════════════════════════════════════════════ */
function foilCard(d, opts) {
  const big = opts && opts.big;
  const c = chapOf(d.chapter);
  const hex = "#" + ((c && c.color) || 0x573451).toString(16).padStart(6, "0");
  const cooked = Game.state.cooked.includes(d.id);
  const ready = Game.canCook(d);
  const stars = "★".repeat(d.difficulty) + "☆".repeat(5 - d.difficulty);
  return `<div class="fcard ${big ? "fcard--big" : ""} ${cooked ? "is-cooked" : ""}"
               data-foil data-go="#/dish/${d.id}" role="button" tabindex="0"
               style="--fc:${hex};--fink:${(c && c.ink) || "#F3F2EC"}"
               aria-label="${esc(d.name)}${cooked ? ", cooked" : ""}">
    <div class="fcard__tilt">
      <div class="fcard__face">
        <span class="fcard__pat" style="background-image:url(assets/patterns/${d.chapter}.svg)"></span>
        <span class="fcard__top">${flagOf(c)}<span class="fcard__diff">${stars}</span></span>
        <span class="fcard__art">${cooked ? "🍽" : ready ? "🍄" : "🧺"}</span>
        <span class="fcard__name">${esc(d.name)}</span>
        <span class="fcard__learn">Teaches - ${esc(d.learn)}</span>
        ${cooked ? `<span class="fcard__seal" aria-hidden="true">EATEN</span>` : ""}
        <span class="foil"></span>
        <span class="glare"></span>
      </div>
    </div>
  </div>`;
}

function wireFoil(root) {
  (root || document).querySelectorAll("[data-foil]").forEach((host) => {
    if (host.dataset.foilWired) return;
    host.dataset.foilWired = "1";
    const tilt = host.querySelector(".fcard__tilt");
    const face = host.querySelector(".fcard__face");
    if (!tilt || !face) return;
    host.addEventListener("pointermove", (e) => {
      const r = host.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      tilt.style.transform = `rotateY(${(px - 0.5) * 16}deg) rotateX(${(0.5 - py) * 16}deg)`;
      /* the foil background is 300%, so a small pointer move sweeps a
         long way — that speed difference is what reads as light on a
         surface rather than a texture sliding about */
      face.style.setProperty("--fx", `${18 + px * 64}%`);
      face.style.setProperty("--fy", `${18 + py * 64}%`);
      face.style.setProperty("--gx", `${px * 100}%`);
      face.style.setProperty("--gy", `${py * 100}%`);
      face.classList.add("is-lit");
    });
    host.addEventListener("pointerleave", () => {
      tilt.style.transform = "";
      face.classList.remove("is-lit");
    });
    host.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(host.dataset.go); }
    });
  });
}

