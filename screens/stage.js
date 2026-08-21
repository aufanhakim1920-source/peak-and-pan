/* ============================================================
   Peak & Pan — the stage map
   Main mission: the tentacle path and what a node opens.
   Loaded as a classic script after ui.js. Edit this file on its
   own; nothing else needs to change.
   ============================================================ */

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
    `<div class="stagewrap" style="--ch:${hex};--c1:${c.c1};--c2:${c.c2};--cink:${c.ink}">
       <div class="scene" aria-hidden="true">
         <span class="scene__pat" style="background-image:url(assets/patterns/${c.id}.svg)"></span>
         <span class="scene__glow"></span>
         <span class="scene__grain"></span>
       </div>
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
