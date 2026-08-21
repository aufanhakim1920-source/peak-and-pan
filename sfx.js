/* ============================================================
   Peak & Pan — sound
   Real audio files only. Nothing here synthesises a beep from an
   oscillator: programmatic SFX always sound cheap, and this app is
   trying to feel like a game, not a form.

   Drop files into assets/sfx/ using the names in SOUNDS below. Any
   file that is missing is simply skipped — the app never breaks or
   waits on audio, so a half-filled folder is fine.

   Muted by default: a hackathon judge opening a link on a train
   should not be ambushed. The toggle is in Profile -> Access.
   ============================================================ */

const SFX_KEY = "peak-and-pan/sound/v1";

/* name -> file, plus how loud it should sit in the mix */
const SOUNDS = {
  tap:        { file: "tap.mp3",        vol: 0.35 },
  gather:     { file: "gather.mp3",     vol: 0.55 },
  lesson:     { file: "lesson.mp3",     vol: 0.5  },
  step:       { file: "step.mp3",       vol: 0.3  },
  served:     { file: "served.mp3",     vol: 0.7  },
  levelup:    { file: "levelup.mp3",    vol: 0.7  },
  stageClear: { file: "stage-clear.mp3", vol: 0.75 },
  unlock:     { file: "unlock.mp3",     vol: 0.7  },
  error:      { file: "error.mp3",      vol: 0.4  },
};

const SFX = (() => {
  let on = false;
  try { on = JSON.parse(localStorage.getItem(SFX_KEY) || "false"); } catch { on = false; }

  const cache = {};
  let unlocked = false;

  /* Browsers refuse audio until the user has interacted. Rather than
     fight it, the first real tap unlocks playback. */
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    Object.values(cache).forEach((a) => { a.load(); });
  }
  document.addEventListener("pointerdown", unlock, { once: true });

  function load(name) {
    const def = SOUNDS[name];
    if (!def) return null;
    if (!cache[name]) {
      const a = new Audio(`assets/sfx/${def.file}`);
      a.preload = "auto";
      a.volume = def.vol;
      /* a missing file must not throw into whatever called play() */
      a.addEventListener("error", () => { cache[name] = null; }, { once: true });
      cache[name] = a;
    }
    return cache[name];
  }

  return {
    get enabled() { return on; },
    set enabled(v) {
      on = Boolean(v);
      localStorage.setItem(SFX_KEY, JSON.stringify(on));
      if (on) { unlock(); SFX.play("tap"); }     // confirm it audibly
    },

    play(name) {
      if (!on || !unlocked) return;
      const a = load(name);
      if (!a) return;
      try {
        /* clone so rapid repeats overlap instead of cutting each other off */
        const node = a.cloneNode();
        node.volume = a.volume;
        node.play().catch(() => {});             // autoplay refusal is not an error worth surfacing
      } catch { /* no audio device, or the file never loaded */ }
    },

    /** which files are actually present — used by the settings screen */
    async audit() {
      const results = {};
      await Promise.all(Object.entries(SOUNDS).map(async ([name, def]) => {
        try {
          const r = await fetch(`assets/sfx/${def.file}`, { method: "HEAD" });
          results[name] = r.ok;
        } catch { results[name] = false; }
      }));
      return results;
    },
  };
})();
