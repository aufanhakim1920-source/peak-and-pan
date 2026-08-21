/* ============================================================
   Peak & Pan v2 — data layer
   One interface, two drivers. Everything runs on `local` today;
   flipping PP_CONFIG.driver to "supabase" moves ratings, photos
   and profiles to a real Postgres without touching a screen.

   Nothing here contains a key. PP_CONFIG lives in config.js,
   which is gitignored and holds only the PUBLIC anon key — the
   one that's safe in a browser because RLS does the real work.
   Schema + policies: supabase/schema.sql
   ============================================================ */

const PP_CONFIG = window.PP_CONFIG || { driver: "local", url: "", anonKey: "" };

/* a stable anonymous id so ratings can be "yours" without an account */
function deviceId() {
  let id = localStorage.getItem("peak-and-pan/device");
  if (!id) {
    id = "dev_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("peak-and-pan/device", id);
  }
  return id;
}

/* ---------------- local driver ---------------- */
const LOCAL_KEY = "peak-and-pan/db";
function readLocal() {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}"); } catch { return {}; }
}
function writeLocal(v) { localStorage.setItem(LOCAL_KEY, JSON.stringify(v)); }

const localDriver = {
  async ratings(recipeId) {
    const db = readLocal();
    const rows = (db.ratings || []).filter((r) => r.recipe_id === recipeId);
    const mine = rows.find((r) => r.device_id === deviceId());
    const avg = rows.length ? rows.reduce((a, r) => a + r.stars, 0) / rows.length : 0;
    return { avg, count: rows.length, mine: mine ? mine.stars : 0 };
  },
  async rate(recipeId, stars) {
    const db = readLocal();
    db.ratings = (db.ratings || []).filter((r) => !(r.recipe_id === recipeId && r.device_id === deviceId()));
    db.ratings.push({ recipe_id: recipeId, device_id: deviceId(), stars, created_at: new Date().toISOString() });
    writeLocal(db);
    return this.ratings(recipeId);
  },
  async photos(recipeId) {
    return (readLocal().photos || []).filter((p) => p.recipe_id === recipeId).slice(0, 12);
  },
  async addPhoto(recipeId, dataUrl, note) {
    const db = readLocal();
    db.photos = db.photos || [];
    db.photos.unshift({ id: Date.now(), recipe_id: recipeId, url: dataUrl, note: note || "", device_id: deviceId() });
    db.photos = db.photos.slice(0, 40);          // localStorage is not a bucket
    writeLocal(db);
    return db.photos.filter((p) => p.recipe_id === recipeId);
  },
  async replies(postId) {
    return (readLocal().replies || [])
      .filter((r) => String(r.post_id) === String(postId))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  },
  async addReply(postId, text) {
    const db = readLocal();
    db.replies = db.replies || [];
    db.replies.push({
      id: Date.now(), post_id: String(postId), device_id: deviceId(),
      author: "You", body: text, created_at: new Date().toISOString(),
    });
    writeLocal(db);
    return this.replies(postId);
  },
};

/* ---------------- supabase driver ----------------
   PostgREST over fetch — no SDK, so the app stays dependency-free. */
function sb(path, opts = {}) {
  const { url, anonKey } = PP_CONFIG;
  return fetch(`${url}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      Prefer: opts.prefer || "return=representation",
      ...(opts.headers || {}),
    },
  }).then(async (r) => {
    const text = await r.text();
    if (!r.ok) throw new Error(`supabase ${r.status}: ${text}`);
    /* `Prefer: return=minimal` answers 201 with an EMPTY body, and
       r.json() throws on empty input — which made every write look like
       a failure and silently fall back to the local driver. */
    return text ? JSON.parse(text) : null;
  });
}

const supabaseDriver = {
  async ratings(recipeId) {
    const rows = await sb(`ratings?recipe_id=eq.${encodeURIComponent(recipeId)}&select=stars,device_id`);
    const mine = rows.find((r) => r.device_id === deviceId());
    const avg = rows.length ? rows.reduce((a, r) => a + r.stars, 0) / rows.length : 0;
    return { avg, count: rows.length, mine: mine ? mine.stars : 0 };
  },
  async rate(recipeId, stars) {
    await sb("ratings", {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=minimal",
      body: JSON.stringify({ recipe_id: recipeId, device_id: deviceId(), stars }),
    });
    return this.ratings(recipeId);
  },
  async photos(recipeId) {
    return sb(`photos?recipe_id=eq.${encodeURIComponent(recipeId)}&select=*&order=created_at.desc&limit=12`);
  },
  /* A data URL in a text column works but is the wrong shape: it bloats
     every row read and there is no CDN in front of it. When a bucket is
     configured the bytes go to Storage and the row keeps only the URL. */
  async addPhoto(recipeId, dataUrl, note) {
    let url = dataUrl;
    if (PP_CONFIG.bucket) {
      const blob = await (await fetch(dataUrl)).blob();
      const path = `${recipeId}/${deviceId()}-${Date.now()}.jpg`;
      const res = await fetch(`${PP_CONFIG.url}/storage/v1/object/${PP_CONFIG.bucket}/${path}`, {
        method: "POST",
        headers: {
          apikey: PP_CONFIG.anonKey,
          Authorization: `Bearer ${PP_CONFIG.anonKey}`,
          "Content-Type": blob.type || "image/jpeg",
          "x-upsert": "true",
        },
        body: blob,
      });
      if (!res.ok) throw new Error(`storage ${res.status}: ${await res.text()}`);
      url = `${PP_CONFIG.url}/storage/v1/object/public/${PP_CONFIG.bucket}/${path}`;
    }
    await sb("photos", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({ recipe_id: recipeId, url, note: note || "", device_id: deviceId() }),
    });
    return this.photos(recipeId);
  },
  async replies(postId) {
    return sb(`replies?post_id=eq.${encodeURIComponent(postId)}&select=*&order=created_at.asc`);
  },
  async addReply(postId, text) {
    await sb("replies", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({ post_id: String(postId), device_id: deviceId(), author: "You", body: text }),
    });
    return this.replies(postId);
  },
};

/* ---------------- official artwork ----------------
   One fetch on boot, cached. Dish and ingredient pictures live in the
   `content` Storage bucket; this table just maps kind+key -> its URL,
   so nothing is embedded in the app and art can change without a
   deploy. Missing rows are normal — the drawn fallback takes over. */
let MEDIA = {};

async function loadMedia(live) {
  if (!live) return {};
  try {
    const rows = await sb("media?select=kind,key,url");
    MEDIA = Object.fromEntries(rows.map((r) => [`${r.kind}/${r.key}`, r.url]));
  } catch (err) {
    console.warn("[db] media index unavailable, using drawn fallbacks", err);
    MEDIA = {};
  }
  return MEDIA;
}

/** URL for a piece of official art, or "" if none is uploaded yet. */
function mediaUrl(kind, key) { return MEDIA[`${kind}/${key}`] || ""; }

/* ---------------- how loved a dish is ----------------
   Community score, not difficulty. People rate 1-5; what the card shows
   is the RATIO who loved it (4 or 5) turned into 0-3 stars, so one
   generous friend cannot make a dish look beloved — it takes agreement.
   Fetched in bulk once rather than per card. */
let LOVE = {};

function scoreRows(rows) {
  const by = {};
  rows.forEach((r) => {
    const k = r.recipe_id;
    by[k] = by[k] || { total: 0, loved: 0, sum: 0 };
    by[k].total += 1;
    by[k].sum += r.stars;
    if (r.stars >= 4) by[k].loved += 1;
  });
  const out = {};
  for (const [k, v] of Object.entries(by)) {
    const ratio = v.loved / v.total;
    /* needs at least two votes before it can show 3 — a single rating is
       an opinion, not a consensus */
    let stars = ratio >= 0.8 ? 3 : ratio >= 0.5 ? 2 : ratio >= 0.25 ? 1 : 0;
    if (v.total < 2 && stars === 3) stars = 2;
    out[k] = { stars, ratio, count: v.total, avg: v.sum / v.total };
  }
  return out;
}

async function loadLove(live) {
  try {
    if (live) {
      LOVE = scoreRows(await sb("ratings?select=recipe_id,stars"));
    } else {
      LOVE = scoreRows((readLocal().ratings || []).map((r) => ({ recipe_id: r.recipe_id, stars: r.stars })));
    }
  } catch (err) {
    console.warn("[db] love index unavailable", err);
    LOVE = {};
  }
  return LOVE;
}

/** { stars 0-3, ratio, count, avg } or null when nobody has rated it */
function loveOf(recipeId) { return LOVE[recipeId] || null; }

/* ---------------- the interface the app actually calls ---------------- */
const DB = (() => {
  /* Boolean(), not the && chain: that returns the KEY as a truthy value,
     so anything printing DB.isLive would print the credential. */
  const live = Boolean(PP_CONFIG.driver === "supabase" && PP_CONFIG.url && PP_CONFIG.anonKey);
  const driver = live ? supabaseDriver : localDriver;

  /* a live database can be down; the app must not be. Every call falls
     back to local rather than throwing into a screen render. */
  const guard = (name) => async (...args) => {
    try { return await driver[name](...args); }
    catch (err) {
      console.warn(`[db] ${name} failed, falling back to local`, err);
      DB.degraded = true;
      return localDriver[name](...args);
    }
  };

  return {
    isLive: live,
    degraded: false,
    ratings: guard("ratings"),
    rate: guard("rate"),
    photos: guard("photos"),
    addPhoto: guard("addPhoto"),
    replies: guard("replies"),
    addReply: guard("addReply"),
    media: mediaUrl,
    loadMedia: () => loadMedia(live),
    love: loveOf,
    loadLove: () => loadLove(live),
  };
})();
