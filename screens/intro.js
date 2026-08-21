/* ============================================================
   Peak & Pan — the arrival
   Glorb's cutscene, four beats.
   Loaded as a classic script after ui.js. Edit this file on its
   own; nothing else needs to change.
   ============================================================ */

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
