# Working on Peak & Pan together

Everything is vanilla HTML/CSS/JS. No install, no build. Run it with:

```bash
python -m http.server 3400
```

then open <http://localhost:3400>.

## One file per page, one branch per page

Each screen lives in its own file, and each has a branch already waiting.
Pick the page you're working on and check out its branch:

| Page | File | Branch |
|---|---|---|
| The arrival cutscene | `screens/intro.js` | `screen/intro` |
| Main mission (tentacle map) | `screens/stage.js` | `screen/stage` |
| 3D globe + paywall | `screens/globe.js` | `screen/globe` |
| Dish + cook-along | `screens/dish.js` | `screen/dish` |
| Search + ingredients | `screens/browse.js` | `screen/browse` |
| Daily orders + medals | `screens/progress.js` | `screen/progress` |
| Profile / bookshelf | `screens/profile.js` | `screen/profile` |
| Cook assistant | `screens/chat.js` | `screen/chat` |
| Countries, dishes, Glorb's lines | `story.js` | `content` |

```bash
git fetch
git checkout screen/dish
# ...work...
git add -A && git commit -m "Dish: ..." && git push
```

Then open a pull request into `main` on GitHub.

**Stay inside your own file.** If two people edit `main.js` or `ui.js` in the
same afternoon you will get a merge conflict; if you each stay in your own
`screens/` file you will never get one.

## Adding a screen

1. Create `screens/yours.js`:
   ```js
   screens.yours = function yours(arg) {
     return { nav: "#/yours", html: `<div class="stripes"></div>${hud()} …` };
   };
   ```
2. Add one line to `index.html`, **above** `main.js`.
3. Link to it with `data-go="#/yours"`.

Load order is the only rule: **`ui.js` first → screens in any order → `main.js` last.**
`main.js` boots the router, so it has to see every screen before it runs.

## Adding a country or a dish

Nothing in `screens/` needs to change — it's all data.

- A country: add to `CHAPTERS` in `story.js` (needs `id`, `code`, `c1`, `c2`,
  `ink`, `color`, `lat`, `lng`, three `dishes`) and drop a pattern SVG at
  `assets/patterns/<id>.svg`.
- A dish: add to `DISHES` with a `chapter`, `needs` (ingredient ids), `learn`
  and its `steps`. The ten stage nodes regenerate themselves.

## Before you push

```bash
git log -p --all | grep -nE "AIza[0-9A-Za-z_-]{15,}|sk-[A-Za-z0-9]{20,}|ghp_|eyJhbGciOi"
```

Silence is good. Real Supabase values go in `config.local.js` (gitignored) —
never in `config.js`. See the Secrets section of the README.
