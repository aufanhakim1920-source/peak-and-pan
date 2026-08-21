# Peak & Pan

**Play it:** https://aufanhakim1920-source.github.io/peak-and-pan/
**Code:** https://github.com/aufanhakim1920-source/peak-and-pan

An alien octopus lands while you are cooking, threatens to eat you, tastes the
food, and changes his mind. Now he will not leave until he has eaten the whole
planet — one country at a time.

The hosted demo saves to your own browser. It is the full app, not a mockup.

---


Built from the **team rocket** Figma (`GCaFeYthggBP5kXDfJJQf2`, page `39:2`), then reworked 2026-08-20.

**v1 is untouched** at `C:\Coding\peak-and-pan\` — copied before a single line changed, and it still runs on port 3300. This is the fork.

```bash
python -m http.server 3400 --directory "C:\Coding\peak-and-pan-v2"
```

Open **http://localhost:3400** — or your PC's LAN address on your phone (see below).

## ⚠️ It has to be served — double-clicking `index.html` won't show the globe

The globe is an **ES module**, and browsers block `import` from a `file://` page as a cross-origin request. Open the file directly from disk and every other screen works while the globe is silently missing — so the app now says so on that screen instead of showing an empty rectangle.

Any web server fixes it. It is not localhost-specific: localhost, a LAN address, or a real host all work.

**On your phone:** run the server, find your PC's LAN address with `ipconfig` (the IPv4 under your Wi-Fi adapter), and open `http://<that-address>:3400`. If it doesn't connect at all, Windows Firewall is blocking the port — allow Python on private networks.

**three.js is vendored** in `vendor/`, not pulled from unpkg, so the globe also works with no internet and on a network that blocks CDNs. That folder is excluded from the vault mirror — restore it with:

```bash
curl -L -o vendor/three.module.min.js https://unpkg.com/three@0.169.0/build/three.module.min.js
```

---

## What the rework added

| Ask | What shipped |
|---|---|
| **3D globe instead of the flat map** | A real planet. Drag to spin, tap a marker or a biome chip to open it. The surface is **generated**, not a texture download — Peak & Pan isn't Earth |
| **More motion** | XP chips that fly up, level-up toasts, animated progress bars, quest ticks, pressed states everywhere, a globe you throw around. All of it caused by you — nothing drifts on its own |
| **Gamified tools** | XP, 10 levels with titles (Forager → Peak & Pan), a day streak, 3 daily quests that reroll at midnight, 9 achievements |
| **Gathering materials** | 5 materials, each with its own drawn icon, rarity, XP value, **where to obtain it**, and what to look for. Gathered from the biome you're standing in |
| **Dietary filter** | Vegetarian / Meat / Can-make-now / Favourites, and a new vegetarian recipe so the filter returns more than one thing |
| **Accessibility** | Light + dark mode following your system, **audio description** that reads each screen aloud, an `aria-live` region so real screen readers get the text, skip link, focus rings, `role="switch"` on the toggles |
| **Live database** | Ratings and photos on a **Supabase-ready** data layer. See below |
| **AI chat** | A cook assistant that answers from your actual pack and recipes with no key at all, and calls Gemini Flash if you give it one |
| **Straighten the context** | Copy fixed where it still said "map", the assistant explains itself, empty states say what to do next |
| **Globe search** | Search biomes, creatures and materials; picking a result spins the globe to it and opens it |
| **Working replies** | Threads on every post, persisted through the same data layer as ratings |

## The database, honestly

**Nothing is provisioned.** Your three Supabase projects are all paused and I wasn't going to spend a free-tier slot without you saying so.

What exists instead: `db.js` has **two drivers behind one interface**, and `supabase/schema.sql` has the tables, indexes and RLS policies ready to run.

To go live:
1. Create a Supabase project
2. Run `supabase/schema.sql` in its SQL editor
3. Put the project URL and the **public anon key** in `config.js`
4. Set `driver: "supabase"`

No screen changes. And if the database is down mid-session, every call falls back to local rather than throwing into a render — the app degrades, it doesn't break.

⚠️ Read the note at the bottom of the schema: without real auth, "only edit your own row" can only be enforced by a header the client also controls. It's spam-resistant, not tamper-proof. Add Supabase anonymous auth and swap `device_id` for `auth.uid()` before this is ever public.

## The AI key, honestly

The assistant works with no key. Questions about **your** state — what can I cook, what am I missing, where do I find emberpepper, what's my streak — are computed locally, because a general model can't know what's in your pack and would confidently guess.

For open questions, paste a Google AI Studio key in **Settings**. It lives in your browser's localStorage, is never written to a file, never logged, and goes nowhere except Google. Model fallback order is lifted from pokemu's `gemini-facts` route, so a 404 or a quota error rolls to the next Flash model instead of failing.

## What came from pokemu

You pointed me at `kevicebryan/pokemu` for the audio description, and it gave me two things directly:

- **The narrator** (`CollectionView.tsx`) — voice picking, a fixed rate/pitch profile, and the `voiceschanged` race where `getVoices()` is empty on first call so your first utterance silently uses the wrong voice.
- **The globe** (`Atlas/GlobeCanvas.tsx`) — the lat/lng → sphere maths, marker model and timezone opening rotation. Written up in the vault as a reusable pattern.



## The database is live

Supabase project **`peak-and-pan`** (Sydney, free tier). Ratings, photos, replies and the artwork index are real — not local storage.

**The keys are not in this repo and never will be.** `config.local.js` is gitignored and only loads on `localhost`, so the public demo and any fresh clone run on the local driver — every feature still works, the data just lives in that browser instead of being shared.

The live database is Aufan's. Ask him for `config.local.js` if you need to point at it. The key in it is the **publishable** key, which is designed to sit in a browser and is safe to send over chat. The **service_role** key is not, and belongs nowhere in this repo.

### Pictures are not embedded

Two buckets:

| Bucket | What | Who can write |
|---|---|---|
| `content` | Official artwork — kecap, nasi goreng, country art | Nobody from the browser. Upload with the tool below |
| `dish-photos` | Photos players take of their own cooking | Anyone, from the app |

A `media` table maps `kind + key` to a public URL, so the app looks up
`ingredient/kecap` or `dish/nasi-goreng` and uses the picture **if one exists**.
No row means it falls back to the drawn icon — so the app is never broken by
missing art, and art can be added or changed without a deploy.

To add pictures, name the file after the id in `story.js`:

```
media/ingredient/kecap.jpg
media/dish/nasi-goreng.jpg
media/country/id.jpg
```

then:

```bash
SUPABASE_URL=https://emqolbwgormmlsiewgix.supabase.co SUPABASE_SERVICE_KEY=<from the dashboard> node tools/upload-media.mjs ./media
```

The service key is read from the environment and never written to disk. Reload
the app and the pictures replace the drawn fallbacks.

## Secrets — read this before you commit

**Nothing in this repo is a secret, and it needs to stay that way.**

| Thing | Where it lives | In git? |
|---|---|---|
| Gemini API key | Your browser's `localStorage`, typed into Profile → Assistant | **Never.** It is not written to any file |
| Supabase URL + anon key | `config.local.js` (gitignored) | **No** — `config.js` ships empty and committed |
| Supabase `service_role` key | Nowhere. Ever | **No.** It bypasses Row Level Security entirely |

The Supabase **anon** key is public by design — it is meant to sit in a browser, and RLS is what protects the data. The **service_role** key is the opposite: it ignores every policy. Never put it in a browser file.

Before pushing, this is worth thirty seconds:

```bash
git log -p --all | grep -nE "AIza[0-9A-Za-z_-]{15,}|sk-[A-Za-z0-9]{20,}|ghp_|eyJhbGciOi|-----BEGIN"
```

Silence means clean. **If something ever does get committed, rotate the key first** — deleting the commit does not un-leak it, because the push already happened.

## Working on this together

**One file per page.** Two people can edit different screens without touching the same file.

```
ui.js                shared: theme, HUD, Glorb, icons, card/row shapes
screens/intro.js     the arrival cutscene
screens/stage.js     main mission — the tentacle stage map
screens/globe.js     the 3D Earth + country sheet + Chef's Table paywall
screens/dish.js      a recipe, its ingredients, ratings, photos, cook-along
screens/browse.js    search + the ingredient pages
screens/progress.js  daily orders, titles, medals
screens/profile.js   the bookshelf (every book is a settings section)
screens/chat.js      the cook assistant
main.js              router, click handlers, boot — the only file that knows about all of them
```

Load order in `index.html` matters: **`ui.js` first, the screens in any order, `main.js` last.** Adding a screen is: write `screens/yours.js` defining `screens.yourname = () => ({ nav, html })`, add one `<script>` line, done.

Content lives apart from code — `story.js` (countries, dishes, Glorb's lines), `world.js` (levels, quests, medals). You can add a country or a dish without opening a screen file.

## Money

There's a **Chef's Table** chapter — France, `$4.99`, three technique dishes. It appears on the globe with a ★ and opens a paywall.

⚠️ **The button takes no money and talks to no payment provider.** It flips a local flag so the flow can be demoed end to end. Wiring a real provider is a separate job and should not go in a prototype.

## Files

```
index.html    styles.css      ← the faithful Figma port
              styles-v2.css   ← everything the rework added
app.js        ← the Figma port's screens
app-v2.js     ← new screens + the four overridden ones
data.js       ← recipes, creatures, guides (from the Figma)
world.js      ← biomes, materials, levels, quests, achievements
planet.js     ← the globe (ES module, three.js)
game.js       ← XP, streak, quests, achievements
speech.js     ← audio description
db.js         ← local ↔ Supabase
ai.js         ← the cook assistant
config.js     ← runtime config (no secrets)
supabase/schema.sql
```

## Verified, not assumed

Driven through headless Chrome with real events: globe mounts with WebGL and 7 biome chips, opening a biome awards XP and marks it visited, gathering twice puts 2 starchroot in the pack and moves the matching quest to 2/4, the streak starts at 1, the chat answers *"You can make one thing right now: Blorg Mash"* with no key, the theme toggle flips dark→light, the audio toggle writes to the live region, and the vegetarian filter returns exactly the two vegetarian recipes. Zero console errors, zero horizontal overflow at 393px.

## Photos

Uploads are **downscaled in the browser** to 900px / JPEG 0.72 before they are stored — a phone JPEG is 3–6MB, localStorage caps around 5MB total, and a Storage bucket bills by the byte.

If you set `bucket` in `config.js` (and create a public bucket — SQL is in the schema), the bytes go to **Supabase Storage** and the row keeps only the public URL. Without a bucket it falls back to a data URL in the text column, which works but bloats every read.

## Still not done

- Profile and the material pages are **invented** — no frames exist for them in the Figma.
- Replies have no moderation and no rate limit. Fine locally, not fine public.
- The `profiles` table exists in the schema but nothing writes to it yet — progression is still device-local.

## Two bugs worth knowing about

**Re-rendering the globe screen destroys the WebGL canvas.** `route()` replaces `#screen`'s HTML, which swaps out the `<canvas>` and leaves the planet bound to an orphan. Gathering from the biome drawer now redraws only the drawer, and `afterRoute` remounts if the canvas element changed identity.

**Screen overrides must be defined before boot runs.** `app-v2.js` overrides four screens from `app.js`; a block appended *after* its own `route()` call meant a direct page load rendered the old version and only a navigation fixed it. The boot lines now sit at the very bottom of the file.
