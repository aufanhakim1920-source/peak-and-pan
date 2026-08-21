/* ============================================================
   Peak & Pan — quests + medals
   Daily orders, titles and achievements.
   Loaded as a classic script after ui.js. Edit this file on its
   own; nothing else needs to change.
   ============================================================ */

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
