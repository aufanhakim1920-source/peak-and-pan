/* ============================================================
   Peak & Pan v2 — audio description
   Ported from pokemu's narrator (components/sections/collection/
   CollectionView.tsx): voice picking, a fixed rate/pitch profile,
   and the voiceschanged race that bites everyone once.

   Different job though. Theirs narrates flavour text; this one
   describes the screen for someone who can't see it, so every
   screen supplies its own description and the text also lands in
   an aria-live region — a blind user on a real screen reader
   should never be forced through browser TTS.
   ============================================================ */

const SKEY = "peak-and-pan/a11y/v1";
const supported = typeof window !== "undefined" && "speechSynthesis" in window;

let prefs = (() => {
  try { return { audio: false, ...JSON.parse(localStorage.getItem(SKEY) || "{}") }; }
  catch { return { audio: false }; }
})();
const savePrefs = () => localStorage.setItem(SKEY, JSON.stringify(prefs));

/* ---------------- voice ----------------
   Browser TTS can't be given a timbre, only nudged. Prefer a natural
   English voice and avoid the flat robotic defaults where possible. */
function pickVoice(voices) {
  if (!voices.length) return null;
  const en = voices.filter((v) => /^en(-|$)/i.test(v.lang));
  const pool = en.length ? en : voices;
  const prefers = [
    /Natural/i,                       // Windows 11 "… (Natural)" voices are far better
    /Google (UK|US) English/i,
    /Microsoft (Aria|Guy|Sonia|Ryan|Libby)/i,
    /Samantha|Daniel|Karen|Moira/i,
  ];
  for (const re of prefers) {
    const hit = pool.find((v) => re.test(v.name));
    if (hit) return hit;
  }
  return pool[0] || null;
}

let cachedVoice = null;
function voice() {
  if (!supported) return null;
  if (cachedVoice) return cachedVoice;
  cachedVoice = pickVoice(speechSynthesis.getVoices());
  /* getVoices() is empty on first call in Chrome — the list arrives later.
     Without this listener the first utterance always uses the default voice. */
  if (!cachedVoice) {
    speechSynthesis.addEventListener("voiceschanged", () => {
      cachedVoice = pickVoice(speechSynthesis.getVoices());
    }, { once: true });
  }
  return cachedVoice;
}

/* ---------------- speaking ---------------- */
function stop() { if (supported) speechSynthesis.cancel(); }

function say(text, { force = false } = {}) {
  const clean = String(text).replace(/\s+/g, " ").trim();
  if (!clean) return;

  /* always publish to the live region: a real screen reader beats TTS */
  const live = document.getElementById("live");
  if (live) { live.textContent = ""; setTimeout(() => { live.textContent = clean; }, 40); }

  if (!supported || (!prefs.audio && !force)) return;
  stop();
  const u = new SpeechSynthesisUtterance(clean);
  const v = voice();
  if (v) u.voice = v;
  u.rate = 1.02;
  u.pitch = 1;
  u.volume = 1;
  speechSynthesis.speak(u);
}

const Narrator = {
  supported,
  get enabled() { return prefs.audio; },
  set enabled(v) {
    prefs.audio = Boolean(v);
    savePrefs();
    if (!prefs.audio) stop();
  },
  say,
  stop,
  /** speak once regardless of the toggle — for an explicit "listen" button */
  readAloud(text) { say(text, { force: true }); },
};
