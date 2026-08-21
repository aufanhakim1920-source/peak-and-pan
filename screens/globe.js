/* ============================================================
   Peak & Pan — the globe
   Earth, the country sheet, and the Chef's Table paywall.
   Loaded as a classic script after ui.js. Edit this file on its
   own; nothing else needs to change.
   ============================================================ */

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
         ${chs.map((c) => `<button class="gchip ${c.cleared ? "is-seen" : ""} ${c.unlocked ? "" : "is-locked"}" data-chapter="${c.id}" style="--c:#${c.color.toString(16).padStart(6, "0")}"><i></i>${flagOf(c)} ${esc(c.country)}${c.unlocked ? "" : c.premium ? " ★" : " 🔒"}</button>`).join("")}
       </div>
       <div class="globe-hint" id="ghint">Tap a country, or pick one below</div>
     </div>` };
};

function chapterSheet(c) {
  if (c.premium && !c.owned) {
    openSheet(`
      <div class="paywall">
        <span class="paywall__kick">Chef's Table</span>
        <div style="text-align:center;margin:6px 0 10px">${glorbArt(Game.mood(), 108, c.id)}</div>
        <h3>${esc(c.country)}</h3>
        <p class="paywall__blurb">${esc(c.intro)}</p>
        <ul class="paywall__list">
          ${c.dishes.map(dishById).filter(Boolean).map((d) => `<li><b>${esc(d.name)}</b><span>${esc(d.learn)}</span></li>`).join("")}
        </ul>
        <div class="paywall__price"><b>${esc(c.price)}</b><span>one payment · yours for good</span></div>
        <button class="btn paywall__buy" data-buy="${c.id}">Unlock ${esc(c.country)}</button>
        <p class="paywall__note">Prototype — this button takes no money and connects to no payment provider. It unlocks the chapter locally so the flow can be shown end to end.</p>
        <button class="btn btn--ink btn--sm" data-close-sheet style="width:100%;margin-top:10px">Not now</button>
      </div>`);
    Narrator.say(`${c.country} is a paid chapter, ${c.price}. Three dishes: ${c.dishes.map((x) => dishById(x)?.name).join(", ")}.`);
    return;
  }
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
