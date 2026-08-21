/* ============================================================
   Peak & Pan — router + screens
   Vanilla, no build step. Hash routing, one <main> swapped per route.
   State persists to localStorage so the loop (hunt → butcher → cook)
   actually carries between screens instead of resetting.
   ============================================================ */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const screenEl = $("#screen");

/* ---------------- persistent state ---------------- */
const KEY = "peak-and-pan/v1";
const defaults = { notes: {}, favs: [], inventory: [], cooked: [], gear: [], stepDone: {}, follow: "friends" };
let S = load();

function load() {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; }
  catch { return { ...defaults }; }
}
function save() { localStorage.setItem(KEY, JSON.stringify(S)); }

/* ---------------- helpers ---------------- */
const byId = (arr, id) => arr.find((x) => x.id === id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* inline so the star inherits currentColor — the exported Figma star is a
   fixed-fill SVG and can't show a filled/empty pair from one file */
const STAR = `<path d="M6 .6l1.6 3.5 3.8.4-2.9 2.6.8 3.8L6 8.9 2.7 10.9l.8-3.8L.6 4.5l3.8-.4L6 .6z" fill="currentColor" stroke="rgba(87,52,81,.55)" stroke-width=".7" stroke-linejoin="round"/>`;
function stars(n) {
  return `<span class="stars">${[1, 2, 3, 4, 5]
    .map((i) => `<svg viewBox="0 0 12 12" class="${i <= n ? "" : "is-off"}" aria-hidden="true">${STAR}</svg>`)
    .join("")}</span>`;
}

function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 2200);
}

function openSheet(html) {
  $("#sheet-panel").innerHTML = `<div class="sheet__grab"></div>${html}`;
  $("#sheet").hidden = false;
}
function closeSheet() { $("#sheet").hidden = true; }

function go(hash) { location.hash = hash; }

function clock() {
  const el = $("#clock");
  if (el) el.textContent = new Date().toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit", hour12: false });
}

/* pieces the player is carrying */
const carrying = (name) => S.inventory.some((p) => p.name === name || p.feeds === name);

/* ---------------- shared fragments ---------------- */
const backbar = (title, dark, over) =>
  `<div class="backbar ${dark ? "backbar--ink" : ""} ${over ? "backbar--over" : ""}">
     <button class="backbtn" data-back aria-label="Back">
       <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
     </button>
     <span class="backbar__title">${esc(title)}</span>
   </div>`;

const subhead = (t, ink) => `<div class="subhead ${ink ? "subhead--ink" : ""}"><h2>${esc(t)}</h2></div>`;

/* ---- the shared guide template (Preparation / Hunt / Butchering / Pieces) ---- */
const ALT_STOPS = [7, 27, 50, 93];
let ALT = 1, SEASON = 0;

const guideHead = (title) =>
  `<div class="guidehead">
     <div class="hexes"></div>
     <div class="guidehead__row">
       <button class="backbtn" data-back aria-label="Back">
         <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
       </button>
       <div class="subhead"><h2>${esc(title)}</h2></div>
     </div>
   </div>`;

function envBlock(showMeta) {
  return `
    <div class="altitude">
      <div class="subhead subhead--ink"><h2>Altitude</h2></div>
      <div class="alt__labels">${ALTITUDES.map((a) => `<span>${a}</span>`).join("")}</div>
      <div class="alt__track">
        <div class="alt__fill" style="width:${ALT_STOPS[ALT]}%"></div>
        ${ALT_STOPS.map((x, i) => `<button class="alt__dot ${i === ALT ? "is-on" : ""}" data-alt="${i}" style="left:${x}%" aria-label="${ALTITUDES[i]}"></button>`).join("")}
      </div>
    </div>
    <div class="subhead subhead--ink"><h2>Season</h2></div>
    <div class="seasons">${SEASONS.map((x, i) => `<button class="season ${i === SEASON ? "is-on" : ""}" data-season="${i}">${x}</button>`).join("")}</div>
    ${showMeta ? `<div class="metabar">
        <span><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M16 20v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 20v-2a4 4 0 0 0-3-3.9"/></svg> 1-4</span>
        <span><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg> 2-4 Hours</span>
      </div>` : ""}`;
}

const guideSecs = (secs) => (secs || []).map((s) => `
  <div class="guidesec">
    <div class="subhead subhead--ink"><h2>${esc(s.h)}</h2></div>
    ${s.p.map((t) => `<p>${esc(t)}</p>`).join("")}
    ${s.cap ? `<div class="guidesec__plate"></div><p class="guidesec__cap">${esc(s.cap)}</p>` : ""}
  </div>`).join("");


const searchbar = (value = "", placeholder = "Search") =>
  `<div class="searchwrap">
     <label class="search">
       <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
       <input id="q" type="search" placeholder="${esc(placeholder)}" value="${esc(value)}" autocomplete="off">
       ${value ? '<button class="search__clear" data-clear aria-label="Clear">✕</button>' : ""}
     </label>
   </div>`;

function recipeCard(r) {
  return `<button class="card" data-go="#/recipe/${r.id}">
    <img class="card__thumb" src="${r.img}" alt="">
    <span class="card__body">
      <span class="card__title">${esc(r.name)}</span>
      <span class="card__stats">
        <span><b>Prep</b><span>${r.prep}</span></span>
        <span><b>Cook</b><span>${r.cook}</span></span>
        <span><b>Difficulty</b>${stars(r.difficulty)}</span>
      </span>
      <span class="card__notes"><b>My notes:</b><p>${esc(S.notes[r.id] || r.notes)}</p></span>
    </span>
  </button>`;
}

/* ═══════════════════════════════════════════════════════════
   SCREENS
   ═══════════════════════════════════════════════════════════ */

const screens = {

  /* ---------- splash + onboarding ---------- */
  splash() {
    setTimeout(() => { if (location.hash === "#/" || location.hash === "") go("#/ob/1"); }, 1400);
    return { nav: false, html:
      `<div class="hexes"></div>
       <div class="splash"><div class="splash__inner">
         <img src="assets/logo-glorb.png" alt="">
         <h1>PEAK &amp; PAN</h1>
       </div></div>` };
  },

  ob(n) {
    const steps = [
      { h: "Finding Food<br>Made Easy", p: "Every creature and plant in the region, mapped. Use the map to find exactly where to look — and what will look back.", art: "assets/mascot.png" },
      { h: "Getting a Little<br>Hungry?", p: "Track it, take it, butcher it properly. Peak &amp; Pan tells you which cuts are worth carrying home and which to leave.", art: "assets/logo-glorb.png" },
      { h: "Then Cook<br>It Right", p: "Step-by-step recipes with your own notes attached, so the thing you got right last time stays right.", art: "assets/mascot.png" },
    ];
    const i = Math.min(Math.max(Number(n) || 1, 1), 3) - 1;
    const s = steps[i];
    return { nav: false, html:
      `<div class="hexes"></div>
       <div class="ob">
         <div class="ob__art"><img src="${s.art}" alt=""></div>
         <div class="ob__copy">
           <h2>${s.h}</h2>
           <p>${s.p}</p>
           <button class="btn" data-go="${i === 2 ? "#/home" : `#/ob/${i + 2}`}">${i === 2 ? "Start hunting" : "Next"}</button>
           <div class="dots">${[0, 1, 2].map((d) => `<i class="${d === i ? "is-on" : ""}"></i>`).join("")}</div>
         </div>
       </div>` };
  },

  /* ---------- home ---------- */
  home() {
    const recent = S.cooked.length
      ? S.cooked.map((id) => byId(RECIPES, id)).filter(Boolean)
      : [byId(RECIPES, "fowlbeast-stew")];
    const current = byId(RECIPES, "fried-glorb");
    const still = current.needs.filter((n) => !n.have && !carrying(n.name));

    return { nav: "#/home", html:
      `<div class="stripes"></div>
       <h1 class="h1">What's on<br>the menu?</h1>

       <div class="sect" style="margin-top:34px">
         ${subhead("Recently Cooked")}
         <div class="deck">
           <span class="deck__under deck__under--2"></span>
           <span class="deck__under deck__under--1"></span>
           ${recipeCard(recent[0])}
         </div>
       </div>

       <div class="sheet-cream">
         ${subhead("Current Recipe", true)}
         <p style="font-family:var(--display);font-size:20px;color:var(--primary);text-align:center;margin-bottom:12px">${esc(current.name)}</p>
         <div style="display:grid;grid-template-columns:150px 1fr;gap:14px;align-items:start">
           <div class="needpanel">
             <h3>Still need:</h3>
             ${still.length
               ? still.map((n) => `<div class="needrow"><span>${esc(n.name)}</span><span>${n.qty}</span></div>`).join("")
               : `<div class="needrow" style="justify-content:center;color:var(--primary)">All gathered</div>`}
             ${current.needs.filter((n) => n.have || carrying(n.name))
               .map((n) => `<div class="needrow is-have"><span>${esc(n.name)} ✓</span><span>${n.qty}</span></div>`).join("")}
           </div>
           <button style="position:relative;border-radius:5px;overflow:hidden;height:145px;width:100%" data-go="#/map">
             <img src="assets/map-thumb.jpg" alt="Map" style="width:100%;height:100%;object-fit:cover">
             <span style="position:absolute;inset:0;background:rgba(87,52,81,.35)"></span>
             <span style="position:absolute;left:8px;bottom:8px;font-family:var(--body);font-size:11px;color:#fff">200m</span>
             <span style="position:absolute;right:10px;top:10px;width:22px;height:22px;border-radius:50%;border:2px solid var(--accent)"></span>
           </button>
         </div>
         <p style="font-size:12px;color:var(--primary);margin-top:14px;text-align:center">
           ${still.length ? `${still.length} ingredient${still.length > 1 ? "s" : ""} still to find` : "You have everything — start cooking"}
         </p>
         <div style="margin-top:14px"><button class="btn" data-go="#/recipe/${current.id}">Open recipe</button></div>
       </div>` };
  },

  /* ---------- cook ---------- */
  cook() {
    const q = (screens.cook.q || "").trim().toLowerCase();
    const onlyFav = screens.cook.fav || false;
    const ing = screens.cook.ing || null;

    let list = RECIPES.slice();
    if (q) list = list.filter((r) =>
      r.name.toLowerCase().includes(q) || r.needs.some((n) => n.name.toLowerCase().includes(q)));
    if (onlyFav) list = list.filter((r) => S.favs.includes(r.id));
    if (ing) list = list.filter((r) => r.needs.some((n) => n.name === ing));

    const chips = `<div class="chips">
      ${ing ? `<button class="chip is-on" data-chip="ing">1 Ingredient</button>` : ""}
      <button class="chip ${onlyFav ? "is-on" : ""}" data-chip="fav">Favourites</button>
      <button class="chip chip--outline" data-chip="quick">Under 30m</button>
      <button class="chip chip--outline" data-chip="have">Can make now</button>
    </div>`;

    const browse = `
      <div class="sheet-cream" style="margin-top:18px">
        ${subhead("Browse", true)}
        <div class="cats">
          ${CREATURES.slice(0, 3).map((c) => `
            <button class="cat" data-go="#/creature/${c.id}">
              ${c.art ? `<img src="${c.art}" alt="" style="object-fit:contain;background:var(--bg1);padding:10px">`
                       : `<span class="cat__ph" style="display:grid;place-items:center;font-family:var(--display);font-size:26px;color:var(--bg2)">${esc(c.name[0])}</span>`}
              <span>${esc(c.name)}</span>
            </button>`).join("")}
        </div>
        <div style="height:22px"></div>
        ${subhead("All recipes", true)}
        ${RECIPES.map((r) => rowFor(r)).join("")}
      </div>`;

    const results = `
      <div class="sheet-cream" style="margin-top:18px">
        ${subhead("Results", true)}
        ${list.length ? `${recipeCard(list[0])}<div style="height:14px"></div>${list.slice(1).map(rowFor).join("")}`
                      : `<div class="empty"><b>Nothing matches</b>Try a creature name, or clear the filters.</div>`}
      </div>`;

    return { nav: "#/cook", html:
      `<div class="stripes"></div>
       ${searchbar(screens.cook.q || "", "Search recipes, creatures…")}
       ${chips}
       ${q || onlyFav || ing ? results : browse}` };
  },

  /* ---------- map ---------- */
  map() {
    return { nav: "#/map", html:
      `<div class="mapwrap">
         ${mapSVG()}
         <div class="map-ui">
           ${searchbar("", "Search the region")}
           <div class="chips">
             <button class="chip" data-mapfilter="all">Popular</button>
             <button class="chip chip--outline" data-mapfilter="danger">Danger</button>
             <button class="chip chip--outline" data-mapfilter="creature">Creatures</button>
           </div>
         </div>
         <div class="map-foot">
           <span class="dist" id="dist">Tap a pin</span>
           <button class="recenter" data-recenter aria-label="Recentre">
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>
           </button>
         </div>
       </div>` };
  },

  /* ---------- social ---------- */
  social() {
    const tab = S.follow;
    const posts = tab === "friends" ? POSTS : POSTS.filter((p) => p.likes > 20);
    return { nav: "#/social", html:
      `<div class="stripes"></div>
       <div style="padding:62px 22px 0"><h2 style="font-family:var(--display);font-size:26px;color:var(--accent)">Friends !</h2></div>
       <div class="seg" style="margin-top:14px">
         <button class="${tab === "friends" ? "is-on" : ""}" data-follow="friends">Friends</button>
         <button class="${tab === "following" ? "is-on" : ""}" data-follow="following">Following</button>
       </div>
       <div class="sheet-cream" style="margin-top:16px">
         ${subhead("Feed", true)}
         ${posts.map((p) => `
           <article class="post">
             <div class="post__head">
               <img class="post__pfp" src="${p.pfp}" alt="" style="object-fit:contain;background:var(--bg1)">
               <div style="flex:1">
                 <div class="post__name">${esc(p.who)}</div>
                 <div class="post__when">${p.when} ago · ${p.tag}</div>
               </div>
             </div>
             <p class="post__body">${esc(p.body)}</p>
             ${p.img ? `<img class="post__img" src="${p.img}" alt="">` : ""}
             <div class="post__acts">
               <button data-like="${p.id}" class="${S.favs.includes("post" + p.id) ? "is-on" : ""}">♥ ${p.likes + (S.favs.includes("post" + p.id) ? 1 : 0)}</button>
               <button data-reply="${p.id}">💬 Reply</button>
             </div>
           </article>`).join("")}
       </div>` };
  },

  /* ---------- profile (not in the Figma — built from the same system) ---------- */
  profile() {
    const favRecipes = RECIPES.filter((r) => S.favs.includes(r.id));
    return { nav: "#/profile", html:
      `<div class="stripes"></div>
       <div style="padding:62px 22px 0;display:flex;align-items:center;gap:16px">
         <img src="assets/logo-glorb.png" alt="" style="width:70px;height:70px;border-radius:50%;background:var(--secondary);object-fit:contain;padding:6px">
         <div>
           <h2 style="font-family:var(--display);font-size:26px;color:var(--accent);line-height:1">Forager</h2>
           <p style="font-size:12.5px;color:var(--bg2);opacity:.75">Verdant Marsh · joined this season</p>
         </div>
       </div>
       <div class="sheet-cream" style="margin-top:22px">
         <div class="statgrid">
           <div class="statbox"><b>${S.cooked.length}</b><span>Cooked</span></div>
           <div class="statbox"><b>${S.inventory.length}</b><span>Carrying</span></div>
           <div class="statbox"><b>${favRecipes.length}</b><span>Saved</span></div>
         </div>
         ${subhead("In your pack", true)}
         ${S.inventory.length
           ? S.inventory.map((p) => `<div class="row"><span class="row__body"><span class="row__title">${esc(p.name)}</span><span class="row__sub">${esc(p.use)}</span></span><span class="row__meta">${esc(p.qty)}</span></div>`).join("")
           : `<div class="empty"><b>Pack is empty</b>Go hunt something and butcher it.</div>`}
         <div style="height:20px"></div>
         ${subhead("Saved recipes", true)}
         ${favRecipes.length ? favRecipes.map(rowFor).join("") : `<div class="empty"><b>Nothing saved yet</b>Tap the heart on any recipe.</div>`}
         <div style="height:18px"></div>
         <button class="btn btn--ink" data-reset>Reset the prototype</button>
       </div>` };
  },

  /* ---------- creature ---------- */
  creature(id) {
    const c = byId(CREATURES, id);
    if (!c) return screens.home();
    return { nav: false, html:
      `<div class="hero">
         ${c.art ? `<img src="${c.art}" alt="" style="object-fit:contain;background:var(--bg1);padding:34px">`
                 : `<div style="width:100%;height:100%;background:var(--bg1);display:grid;place-items:center;font-family:var(--display);font-size:90px;color:rgba(243,242,236,.3)">${esc(c.name[0])}</div>`}
         <div class="hero__scrim"></div>
         <div class="hero__title"><h2>${esc(c.name)}</h2><p>${esc(c.tag)}</p></div>
       </div>
       ${backbar("", false, true)}
       <div class="sheet-cream" style="margin-top:-10px">
         <div class="pill-row">
           <span class="pill pill--danger">Danger ${c.danger}/5</span>
           <span class="pill">${esc(c.weight)}</span>
           <span class="pill pill--accent">Best: ${esc(c.best)}</span>
         </div>
         <p class="body-copy">${esc(c.desc)}</p>
         <div style="height:18px"></div>
         <dl class="kv">
           <dt>Where</dt><dd>${esc(c.where)}</dd>
           <dt>Weakness</dt><dd>${esc(c.weakness)}</dd>
           <dt>Yields</dt><dd>${c.yields.map(esc).join(" · ")}</dd>
         </dl>
         <button class="btn" data-go="#/hunt-prep/${c.id}">Plan the hunt</button>
       </div>` };
  },

  /* ---------- ingredient ---------- */
  ingredient(id) {
    const g = byId(INGREDIENTS, id);
    if (!g) return screens.cook();
    const used = RECIPES.filter((r) => r.needs.some((n) => n.name === g.name));
    return { nav: false, html:
      `<div class="stripes"></div>
       ${backbar(g.name)}
       <div class="sheet-cream" style="margin-top:26px">
         <div class="pill-row"><span class="pill">${esc(g.tag)}</span><span class="pill">Keeps ${esc(g.keeps)}</span></div>
         <p class="body-copy">${esc(g.desc)}</p>
         <div style="height:16px"></div>
         <dl class="kv"><dt>Found</dt><dd>${esc(g.where)}</dd></dl>
         ${subhead("Used in", true)}
         ${used.length ? used.map(rowFor).join("") : `<div class="empty">Not used in any saved recipe.</div>`}
       </div>` };
  },

  /* ---------- recipe ---------- */
  recipe(id) {
    const r = byId(RECIPES, id);
    if (!r) return screens.cook();
    const fav = S.favs.includes(r.id);
    const missing = r.needs.filter((n) => !n.have && !carrying(n.name));
    return { nav: false, html:
      `<div class="hero"><img src="${r.img}" alt=""><div class="hero__scrim"></div>
         <div class="hero__title"><h2>${esc(r.name)}</h2><p>Serves ${r.serves} · ${r.prep} prep · ${r.cook} cook</p></div>
       </div>
       ${backbar("", false, true)}
       <div class="sheet-cream" style="margin-top:-10px">
         <div class="pill-row">
           <span class="pill">Difficulty ${r.difficulty}/5</span>
           <button class="pill ${fav ? "pill--accent" : ""}" data-fav="${r.id}">${fav ? "♥ Saved" : "♡ Save"}</button>
         </div>
         ${subhead("Ingredients", true)}
         <div class="needpanel" style="margin-bottom:18px">
           ${r.needs.map((n) => {
             const have = n.have || carrying(n.name);
             return `<div class="needrow ${have ? "is-have" : ""}"><span>${esc(n.name)}${have ? " ✓" : ""}</span><span>${n.qty}</span></div>`;
           }).join("")}
         </div>
         ${missing.length
           ? `<p style="font-size:12.5px;color:var(--primary);margin-bottom:14px">Missing ${missing.map((m) => esc(m.name)).join(", ")} — find it on the globe first.</p>`
           : `<p style="font-size:12.5px;color:var(--primary);margin-bottom:14px">You have everything you need.</p>`}
         ${subhead("My notes", true)}
         <p class="body-copy" style="margin-bottom:14px">${esc(S.notes[r.id] || r.notes)}</p>
         <div style="display:flex;gap:10px">
           <button class="btn" data-go="#/steps/${r.id}">Start cooking</button>
           <button class="btn btn--ink btn--sm" data-notes="${r.id}">Notes</button>
         </div>
       </div>` };
  },

  /* ---------- step-by-step ---------- */
  steps(id) {
    const r = byId(RECIPES, id);
    if (!r) return screens.cook();
    const done = S.stepDone[r.id] || [];
    const all = done.length === r.steps.length;
    return { nav: false, html:
      `<div class="stripes"></div>
       ${backbar(r.name)}
       <div class="sect" style="margin-top:16px">
         <div style="height:6px;border-radius:999px;background:rgba(243,242,236,.22);overflow:hidden">
           <div style="height:100%;width:${(done.length / r.steps.length) * 100}%;background:var(--accent);transition:width .3s var(--pop)"></div>
         </div>
         <p style="font-size:11.5px;color:var(--bg2);opacity:.8;margin-top:7px">${done.length} of ${r.steps.length} done</p>
       </div>
       <div class="sheet-cream" style="margin-top:20px">
         <div class="steps">
           ${r.steps.map((s, i) => `
             <button class="step ${done.includes(i) ? "is-done" : ""}" data-step="${i}" style="width:100%;text-align:left">
               <span class="step__n">${i + 1}</span>
               <span>
                 <span class="step__t">${esc(s.t)}</span>
                 ${s.hint ? `<span class="step__hint">${esc(s.hint)}</span>` : ""}
               </span>
             </button>`).join("")}
         </div>
         <div style="height:18px"></div>
         <div style="display:flex;gap:10px">
           <button class="btn ${all ? "" : "btn--ink"}" data-finish="${r.id}">${all ? "Finish — I cooked this" : "Mark all done"}</button>
           <button class="btn btn--ink btn--sm" data-notes="${r.id}">Notes</button>
         </div>
       </div>` };
  },

  /* ---------- guide screens: Preparation / The Hunt / Butchering ---------- */
  "hunt-prep"(id) {
    const c = byId(CREATURES, id);
    if (!c) return screens.map();
    const g = GUIDES[c.id] || GUIDES.glorb;
    return { nav: false, html:
      guideHead("Preparation") +
      `<div class="sheet-cream gridpaper" style="margin-top:0;border-radius:0">
         ${envBlock(true)}
         ${guideSecs(g.prep)}
         <button class="btn" data-go="#/hunt/${c.id}">Start the hunt</button>
       </div>` };
  },

  hunt(id) {
    const c = byId(CREATURES, id);
    if (!c) return screens.map();
    const g = GUIDES[c.id] || GUIDES.glorb;
    return { nav: false, html:
      guideHead("The Hunt") +
      `<div class="sheet-cream gridpaper" style="margin-top:0;border-radius:0">
         ${envBlock(true)}
         ${guideSecs(g.hunt)}
         <button class="btn" data-go="#/butcher/${c.id}">I've caught it</button>
       </div>` };
  },

  butcher(id) {
    const c = byId(CREATURES, id);
    if (!c) return screens.map();
    const g = GUIDES[c.id] || GUIDES.glorb;
    return { nav: false, html:
      guideHead("Butchering") +
      `<div class="sheet-cream gridpaper" style="margin-top:0;border-radius:0">
         ${envBlock(true)}
         ${guideSecs(g.butcher)}
         <button class="btn" data-go="#/pieces/${c.id}">See recommended pieces</button>
       </div>` };
  },

  /* ---------- recommended pieces ---------- */
  pieces(id) {
    const c = byId(CREATURES, id);
    if (!c) return screens.map();
    const cuts = PIECES[c.id] || [];
    const taken = cuts.filter((p) => S.inventory.some((x) => x.name === p.name));
    const suggest = RECIPES.filter((r) => r.needs.some((n) => taken.some((p) => p.feeds === n.name)));
    return { nav: false, html:
      guideHead("Recommended Pieces") +
      `<div class="sheet-cream gridpaper" style="margin-top:0;border-radius:0">
         ${envBlock(false)}
         <div class="subhead subhead--ink"><h2>Recommended</h2></div>
         ${cuts.map((p, i) => {
           const on = S.inventory.some((x) => x.name === p.name);
           return `<article class="piece ${on ? "is-taken" : ""}">
             <div class="piece__img"></div>
             <div class="piece__b">
               <div class="piece__t">${esc(p.name)}</div>
               <div class="piece__m">${p.kcal} kcal / kg<br>${esc(p.mass)}<br>${esc(p.per)}</div>
             </div>
             <button class="piece__flag ${on ? "is-on" : ""}" data-take="${c.id}:${i}" aria-label="${on ? "Leave" : "Take"} ${esc(p.name)}">
               <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3v11Zm2-11 4.2-8.4A2 2 0 0 1 17 3.5V9h4.2a2 2 0 0 1 1.95 2.45l-1.6 7A2 2 0 0 1 19.6 20H9V11Z"/></svg>
             </button>
             <button class="piece__view" data-view="${c.id}:${i}">View</button>
           </article>`;
         }).join("")}
         ${taken.length ? `<p style="font-size:12px;color:var(--primary);margin:6px 0 18px">${taken.length} piece${taken.length > 1 ? "s" : ""} in your pack.</p>` : `<p style="font-size:12px;color:var(--primary);margin:6px 0 18px">Tap a flag to take a piece with you.</p>`}
         <div class="subhead subhead--ink"><h2>Cook it now</h2></div>
         ${(suggest.length ? suggest : RECIPES.slice(0, 2)).map(rowFor).join("")}
       </div>` };
  },
};

function rowFor(r) {
  return `<button class="row" data-go="#/recipe/${r.id}">
    <img class="row__thumb" src="${r.img}" alt="">
    <span class="row__body">
      <span class="row__title">${esc(r.name)}</span>
      <span class="row__sub">${esc(S.notes[r.id] || r.notes)}</span>
    </span>
    <span class="row__meta">${r.cook}<br>${"★".repeat(r.difficulty)}</span>
  </button>`;
}

/* ═══════════════════════════════════════════════════════════
   MAP — drawn as SVG so pins are real elements, not an image
   ═══════════════════════════════════════════════════════════ */
function mapSVG(opts = {}) {
  const contours = [];
  const blobs = [
    { cx: 250, cy: 250, rx: 62, ry: 96, rot: -18 },
    { cx: 130, cy: 560, rx: 74, ry: 88, rot: 12 },
    { cx: 300, cy: 690, rx: 58, ry: 70, rot: -6 },
  ];
  blobs.forEach((b) => {
    for (let i = 0; i < 7; i++) {
      const k = 1 + i * 0.26;
      contours.push(`<ellipse cx="${b.cx}" cy="${b.cy}" rx="${b.rx * k}" ry="${b.ry * k}"
        transform="rotate(${b.rot} ${b.cx} ${b.cy})" fill="none"
        stroke="rgba(243,242,236,${0.10 - i * 0.011})" stroke-width="1"/>`);
    }
  });

  const region = (cx, cy, rx, ry, rot) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${rot} ${cx} ${cy})"
       fill="url(#hatch)" stroke="var(--accent)" stroke-width="2" stroke-dasharray="7 6" opacity=".85"/>`;

  const pins = PINS.filter((p) => !opts.focus || p.kind !== "creature" || p.creature === opts.focus)
    .map((p) => {
      if (p.kind === "you") {
        return `<g class="pin" data-pin="${p.id}" transform="translate(${p.x},${p.y})">
          <circle class="ping-ring" r="10" fill="none" stroke="#5BA9E8" stroke-width="2"/>
          <path class="pin__head" d="M0 14 L-11 -4 A12.5 12.5 0 1 1 11 -4 Z" fill="#4A9BE0"/>
          <circle cy="-9" r="7.5" fill="none" stroke="#F3F2EC" stroke-width="1.6"/>
          <path d="M0 -18v3M0 -3v3M-8 -9h3M5 -9h3" stroke="#F3F2EC" stroke-width="1.6" stroke-linecap="round"/>
        </g>`;
      }
      if (p.kind === "danger") {
        return `<g class="pin" data-pin="${p.id}" transform="translate(${p.x},${p.y})">
          <path class="pin__head" d="M0 14 L-11 -4 A12.5 12.5 0 1 1 11 -4 Z" fill="#D94A3D"/>
          <path d="M0 -17 L8 -3 H-8 Z" fill="none" stroke="#F3F2EC" stroke-width="1.6" stroke-linejoin="round"/>
          <path d="M0 -12v5" stroke="#F3F2EC" stroke-width="1.6" stroke-linecap="round"/>
          <circle cy="-5" r="1" fill="#F3F2EC"/>
        </g>`;
      }
      return `<g class="pin" data-pin="${p.id}" transform="translate(${p.x},${p.y})">
        <circle class="pin__head" r="16" fill="none" stroke="var(--accent)" stroke-width="2.4"/>
        <path d="M-5 0 L4 -7 V7 Z" fill="var(--accent)"/>
      </g>`;
    }).join("");

  return `<svg class="mapsvg" id="mapsvg" viewBox="0 0 393 852" preserveAspectRatio="xMidYMid slice">
    <defs>
      <pattern id="hatch" width="9" height="9" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
        <rect width="9" height="9" fill="rgba(96,29,73,.55)"/>
        <path d="M0 0v9" stroke="rgba(249,233,90,.22)" stroke-width="2.4"/>
      </pattern>
    </defs>
    <rect width="393" height="852" fill="#573451"/>
    <g id="mappan">
      ${contours.join("")}
      ${region(252, 258, 58, 92, -18)}
      ${region(126, 566, 66, 80, 12)}
      ${pins}
    </g>
  </svg>`;
}

/* ═══════════════════════════════════════════════════════════
   ROUTER
   ═══════════════════════════════════════════════════════════ */
function route() {
  const hash = location.hash || "#/";
  const [, name = "", arg = ""] = hash.replace(/^#\//, "").match(/^([^/]*)\/?(.*)$/) || [];
  const key = name === "" ? "splash" : name;
  const fn = screens[key];
  const out = fn ? fn(arg) : screens.home();

  screenEl.innerHTML = out.html;
  screenEl.scrollTop = 0;
  screenEl.classList.toggle("no-nav", out.nav === false);
  $("#hotbar").style.display = out.nav === false ? "none" : "";
  $$(".navitem").forEach((n) => n.classList.toggle("is-on", n.dataset.go === out.nav));
  closeSheet();

  if (key === "map" || key === "hunt") wireMap();
  if (key === "cook") wireCook();
}

/* ---------------- per-screen wiring ---------------- */
function wireMap() {
  const svg = $("#mapsvg");
  const pan = $("#mappan");
  let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0, moved = 0;

  svg.addEventListener("pointerdown", (e) => {
    dragging = true; moved = 0; sx = e.clientX; sy = e.clientY;
    svg.setPointerCapture?.(e.pointerId);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    moved = Math.max(moved, Math.hypot(dx, dy));
    pan.setAttribute("transform", `translate(${ox + dx * 1.1},${oy + dy * 1.1})`);
  });
  const stop = (e) => {
    if (!dragging) return;
    dragging = false;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    ox += dx * 1.1; oy += dy * 1.1;
  };
  svg.addEventListener("pointerup", stop);
  svg.addEventListener("pointercancel", stop);

  svg.addEventListener("click", (e) => {
    if (moved > 8) return;                       // that was a pan, not a tap
    const g = e.target.closest("[data-pin]");
    if (!g) return;
    const p = PINS.find((x) => x.id === g.dataset.pin);
    if (!p) return;
    const d = $("#dist");
    if (d) d.textContent = p.dist ? `${p.dist} · ${p.label}` : p.label;
    openSheet(`
      <h3 style="font-family:var(--display);font-size:22px;color:var(--secondary)">${esc(p.label)}</h3>
      <p style="font-size:13px;color:var(--primary);margin:4px 0 16px">${esc(p.sub || "Your position")}${p.dist ? ` · ${p.dist} away` : ""}</p>
      ${p.creature ? `<button class="btn" data-go="#/creature/${p.creature}">Open ${esc(p.label)}</button>
                      <div style="height:10px"></div>
                      <button class="btn btn--ink" data-go="#/hunt-prep/${p.creature}">Plan the hunt</button>`
                   : `<button class="btn btn--ink" data-close-sheet>Close</button>`}`);
  });

  const rc = $("[data-recenter]");
  if (rc) rc.addEventListener("click", () => {
    ox = 0; oy = 0;
    pan.setAttribute("transform", "translate(0,0)");
    const d = $("#dist"); if (d) d.textContent = "Tap a pin";
  });

  $$("[data-mapfilter]").forEach((b) => b.addEventListener("click", () => {
    $$("[data-mapfilter]").forEach((x) => { x.classList.add("chip--outline"); x.classList.remove("chip"); x.classList.add("chip"); });
    $$("[data-mapfilter]").forEach((x) => x.classList.toggle("chip--outline", x !== b));
    const f = b.dataset.mapfilter;
    $$("[data-pin]").forEach((g) => {
      const p = PINS.find((x) => x.id === g.dataset.pin);
      const show = f === "all" || p.kind === f || p.kind === "you";
      g.style.display = show ? "" : "none";
    });
  }));
}

function wireCook() {
  const q = $("#q");
  if (!q) return;
  q.addEventListener("input", () => {
    screens.cook.q = q.value;
    const pos = q.selectionStart;
    route();
    const nq = $("#q");
    if (nq) { nq.focus(); nq.setSelectionRange(pos, pos); }
  });
}

/* ═══════════════════════════════════════════════════════════
   GLOBAL EVENTS
   ═══════════════════════════════════════════════════════════ */
document.addEventListener("click", (e) => {
  const t = e.target;

  const goEl = t.closest("[data-go]");
  if (goEl) { go(goEl.dataset.go); return; }

  if (t.closest("[data-back]")) { history.length > 1 ? history.back() : go("#/home"); return; }
  if (t.closest("[data-close-sheet]")) { closeSheet(); return; }
  if (t.closest("[data-clear]")) { screens.cook.q = ""; route(); return; }

  const chip = t.closest("[data-chip]");
  if (chip) {
    const k = chip.dataset.chip;
    if (k === "fav") screens.cook.fav = !screens.cook.fav;
    if (k === "ing") screens.cook.ing = null;
    if (k === "quick") { screens.cook.q = screens.cook.q === "skewers" ? "" : "skewers"; }
    if (k === "have") { screens.cook.ing = screens.cook.ing ? null : "Starchroot"; }
    route(); return;
  }

  const fav = t.closest("[data-fav]");
  if (fav) {
    const id = fav.dataset.fav;
    S.favs = S.favs.includes(id) ? S.favs.filter((x) => x !== id) : [...S.favs, id];
    save(); route();
    toast(S.favs.includes(id) ? "Saved to your recipes" : "Removed");
    return;
  }

  const like = t.closest("[data-like]");
  if (like) {
    const id = "post" + like.dataset.like;
    S.favs = S.favs.includes(id) ? S.favs.filter((x) => x !== id) : [...S.favs, id];
    save(); route(); return;
  }
  if (t.closest("[data-reply]")) { toast("Replies aren't in the Figma yet"); return; }

  const fol = t.closest("[data-follow]");
  if (fol) { S.follow = fol.dataset.follow; save(); route(); return; }

  const step = t.closest("[data-step]");
  if (step) {
    const id = location.hash.split("/")[2];
    const i = Number(step.dataset.step);
    const done = new Set(S.stepDone[id] || []);
    done.has(i) ? done.delete(i) : done.add(i);
    S.stepDone[id] = [...done];
    save(); route(); return;
  }

  const gear = t.closest("[data-gear]");
  if (gear) {
    const id = gear.dataset.gear;
    S.gear = S.gear.includes(id) ? S.gear.filter((x) => x !== id) : [...S.gear, id];
    save(); route(); return;
  }

  const fin = t.closest("[data-finish]");
  if (fin) {
    const id = fin.dataset.finish;
    const r = byId(RECIPES, id);
    S.stepDone[id] = r.steps.map((_, i) => i);
    S.cooked = [id, ...S.cooked.filter((x) => x !== id)].slice(0, 5);
    save();
    toast(`${r.name} added to Recently Cooked`);
    go("#/home");
    return;
  }

  const alt = t.closest("[data-alt]");
  if (alt) { ALT = Number(alt.dataset.alt); route(); return; }

  const sea = t.closest("[data-season]");
  if (sea) { SEASON = Number(sea.dataset.season); route(); return; }

  const take = t.closest("[data-take]");
  if (take) {
    const [cid, i] = take.dataset.take.split(":");
    const piece = (PIECES[cid] || [])[Number(i)];
    if (!piece) return;
    const had = S.inventory.some((x) => x.name === piece.name);
    S.inventory = had ? S.inventory.filter((x) => x.name !== piece.name) : [...S.inventory, piece];
    save(); route();
    toast(had ? `Left the ${piece.name.toLowerCase()}` : `${piece.name} in your pack`);
    return;
  }

  const view = t.closest("[data-view]");
  if (view) {
    const [cid, i] = view.dataset.view.split(":");
    const piece = (PIECES[cid] || [])[Number(i)];
    if (!piece) return;
    openSheet(`
      <h3 style="font-family:var(--display);font-size:22px;color:var(--secondary)">${esc(piece.name)}</h3>
      <p style="font-size:13px;color:var(--primary);margin:4px 0 16px">${esc(piece.grade)} grade · ${esc(piece.qty)}</p>
      <dl class="kv">
        <dt>Energy</dt><dd>${piece.kcal} kcal / kg</dd>
        <dt>Typical</dt><dd>${esc(piece.mass)}</dd>
        <dt>Yield</dt><dd>${esc(piece.per)}</dd>
        <dt>Best for</dt><dd>${esc(piece.use)}</dd>
      </dl>
      <button class="btn" data-take="${cid}:${i}">${S.inventory.some((x) => x.name === piece.name) ? "Leave it" : "Take it"}</button>`);
    return;
  }

  const nt = t.closest("[data-notes]");
  if (nt) {
    const id = nt.dataset.notes;
    const r = byId(RECIPES, id);
    openSheet(`
      <h3 style="font-family:var(--display);font-size:22px;color:var(--secondary);margin-bottom:12px">Notes · ${esc(r.name)}</h3>
      <div class="notes"><textarea id="notetext" placeholder="What did you change? What would you do differently?">${esc(S.notes[id] || r.notes)}</textarea></div>
      <div style="height:14px"></div>
      <button class="btn" data-savenote="${id}">Save note</button>`);
    setTimeout(() => $("#notetext")?.focus(), 60);
    return;
  }

  const sn = t.closest("[data-savenote]");
  if (sn) {
    S.notes[sn.dataset.savenote] = $("#notetext").value.trim();
    save(); closeSheet(); route(); toast("Note saved");
    return;
  }

  if (t.closest("[data-reset]")) {
    S = { ...defaults }; save(); route(); toast("Prototype reset");
  }
});

/* ---------------- boot ---------------- */
window.addEventListener("hashchange", route);
clock();
setInterval(clock, 30000);
route();
