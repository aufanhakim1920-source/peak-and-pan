/* ============================================================
   Peak & Pan — dish + steps
   A recipe, its ingredients, ratings, photos and the cook-along.
   Loaded as a classic script after ui.js. Edit this file on its
   own; nothing else needs to change.
   ============================================================ */

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
