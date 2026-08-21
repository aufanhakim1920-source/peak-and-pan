/* ============================================================
   Peak & Pan — visual effects
   Every effect here is ONE-SHOT, CONTAINED and triggered by something
   you did. Nothing loops, nothing drifts, nothing covers the screen
   in independently moving specks — that is the thing that makes Aufan
   motion-sick, and a celebration is not worth a headache.

   Each burst cleans itself up on animationend, so the DOM does not
   fill with spent confetti.
   ============================================================ */

const FX = (() => {
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  function layer() {
    let el = document.getElementById("fxlayer");
    if (!el) {
      el = document.createElement("div");
      el.id = "fxlayer";
      el.className = "fxlayer";
      el.setAttribute("aria-hidden", "true");
      document.querySelector(".phone__screen").appendChild(el);
    }
    return el;
  }


  /* Remove on animationend, but ALSO on a timer. If the element never
     animates — reduced-motion CSS, a hidden tab, display:none — the
     event never fires and the node leaks. Belt and braces. */
  function sweep(el, ms) {
    let gone = false;
    const kill = () => { if (!gone) { gone = true; el.remove(); } };
    el.addEventListener("animationend", kill, { once: true });
    setTimeout(kill, ms);
  }

  /** centre of an element, in the phone's coordinate space */
  function centreOf(target) {
    const host = document.querySelector(".phone__screen").getBoundingClientRect();
    const r = (target instanceof Element ? target : document.body).getBoundingClientRect();
    return { x: r.left - host.left + r.width / 2, y: r.top - host.top + r.height / 2 };
  }

  return {
    /** an expanding ring plus a few sparks — for completing one thing */
    burst(target, color = "var(--accent)", pieces = 10) {
      if (reduced() || !target) return;
      const { x, y } = centreOf(target);
      const l = layer();

      const ring = document.createElement("span");
      ring.className = "fx-ring";
      ring.style.cssText = `left:${x}px;top:${y}px;--c:${color}`;
      l.appendChild(ring);
      sweep(ring, 900);

      for (let i = 0; i < pieces; i++) {
        const a = (Math.PI * 2 * i) / pieces + Math.random() * 0.4;
        const d = 34 + Math.random() * 30;
        const s = document.createElement("span");
        s.className = "fx-spark";
        s.style.cssText =
          `left:${x}px;top:${y}px;--c:${color};--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;` +
          `--r:${Math.random() * 240 - 120}deg;animation-delay:${Math.random() * 60}ms`;
        l.appendChild(s);
        sweep(s, 900);
      }
    },

    /** a soft wash of colour from the edges — for a big moment */
    flash(color = "var(--accent)") {
      if (reduced()) return;
      const f = document.createElement("span");
      f.className = "fx-flash";
      f.style.setProperty("--c", color);
      layer().appendChild(f);
      sweep(f, 1100);
    },

    /** a short fall of ribbons over one element — country cleared */
    cheer(target, color = "var(--accent)") {
      if (reduced()) return;
      const { x, y } = centreOf(target || document.body);
      const l = layer();
      const colors = [color, "#F9E95A", "#5FBF8A", "#E8543A", "#8E6FB8"];
      for (let i = 0; i < 16; i++) {          // deliberately few: legible, not a blizzard
        const p = document.createElement("span");
        p.className = "fx-ribbon";
        p.style.cssText =
          `left:${x + (Math.random() * 220 - 110)}px;top:${y - 40}px;` +
          `--c:${colors[i % colors.length]};--dy:${150 + Math.random() * 120}px;` +
          `--r:${Math.random() * 720 - 360}deg;animation-delay:${Math.random() * 260}ms`;
        l.appendChild(p);
        sweep(p, 2000);
      }
    },
  };
})();
