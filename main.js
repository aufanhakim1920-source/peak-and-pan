/* ============================================================
   Peak & Pan — router + events
   Screen descriptions, the globe mount, every click handler, boot.
   This is the only file that knows about all the others.
   Loaded as a classic script after ui.js. Edit this file on its
   own; nothing else needs to change.
   ============================================================ */

/* legacy routes from the earlier fictions */
["creature", "ingredient", "hunt-prep", "hunt", "butcher", "pieces", "recipe", "material", "social", "ob", "splash", "cook", "chapter", "settings"].forEach((k) => {
  screens[k] = () => screens.stage();
});


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

  wireFoil(document.getElementById("screen"));

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

  const buy = t.closest("[data-buy]");
  if (buy) {
    const id = buy.dataset.buy;
    Game.purchase(id);
    closeSheet();
    planet?.refresh(Game.chapters());
    toast(`${chapOf(id)?.country} unlocked`);
    go(`#/stage/${id}`);
    return;
  }

  const claim = t.closest("[data-claim]");
  if (claim) { showReward(Game.claimQuest(claim.dataset.claim)); route(); return; }

  const star = t.closest("[data-star]");
  if (star) {
    const id = star.closest("[data-recipe]").dataset.recipe;
    await DB.rate(id, Number(star.dataset.star));
    await DB.loadLove();          // the card's stars are everyone's average
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

/* pull the artwork index, then repaint once so pictures replace the
   drawn fallbacks without blocking first paint */
Promise.all([DB.loadMedia(), DB.loadLove()]).then(([m, l]) => {
  if (Object.keys(m).length || Object.keys(l).length) { route(); afterRoute(); }
});
