/* ============================================================
   Peak & Pan — search + pantry
   The book of dishes and the ingredient pages.
   Loaded as a classic script after ui.js. Edit this file on its
   own; nothing else needs to change.
   ============================================================ */

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
