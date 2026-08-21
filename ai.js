/* ============================================================
   Peak & Pan v2 — the cook assistant
   Works with no key at all: it answers from the app's own state,
   which is the part a general model would get wrong anyway (it
   cannot know what's in your pack).

   Paste a Google AI Studio key in Settings and it also calls
   Gemini Flash for open questions. The key is held in this
   browser's localStorage and is never written to a file, never
   logged, and never sent anywhere except Google.
   Model fallback order borrowed from pokemu's gemini-facts route.
   ============================================================ */

const AIKEY = "peak-and-pan/ai-key";
const MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
  "gemini-flash-latest",
];

const AI = {
  get key() { return localStorage.getItem(AIKEY) || ""; },
  set key(v) {
    const t = String(v || "").trim();
    if (t) localStorage.setItem(AIKEY, t);
    else localStorage.removeItem(AIKEY);
  },
  get live() { return Boolean(this.key); },
};

/* ---------------- what the assistant knows ---------------- */
function context() {
  const lvl = Game.level();
  const pack = Object.entries(Game.state.materials)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => `${MATERIALS.find((m) => m.id === id)?.name || id} ×${n}`);
  const carried = (JSON.parse(localStorage.getItem("peak-and-pan/v1") || "{}").inventory || [])
    .map((p) => p.name);

  return {
    level: lvl.lvl, title: lvl.title, xp: Game.state.xp, streak: Game.streak(),
    pack, carried,
    quests: Game.quests().map((q) => `${q.text} (${q.progress}/${q.goal})`),
    recipes: RECIPES.map((r) => ({
      name: r.name, diet: r.diet, cook: r.cook, difficulty: r.difficulty,
      needs: r.needs.map((n) => n.name),
      missing: r.needs.filter((n) => !n.have && !Game.has(n.name) && !carried.includes(n.name)).map((n) => n.name),
    })),
    materials: MATERIALS.map((m) => ({ name: m.name, where: BIOMES.find((b) => b.id === m.biome)?.name, tell: m.tell })),
    creatures: CREATURES.map((c) => ({ name: c.name, where: c.where, danger: c.danger })),
  };
}

/* ---------------- local brain ----------------
   Deliberately narrow: it answers the questions that depend on
   YOUR state, and hands anything else to the model or says so. */
function localAnswer(q) {
  const s = q.toLowerCase();
  const ctx = context();
  const canMake = ctx.recipes.filter((r) => r.missing.length === 0);

  if (/\b(cook|make|eat)\b.*\b(now|today|what|can)\b|\bwhat can i\b/.test(s)) {
    if (!canMake.length) {
      const closest = [...ctx.recipes].sort((a, b) => a.missing.length - b.missing.length)[0];
      return `Nothing you can finish right now. Closest is **${closest.name}** — you're short ${closest.missing.join(", ")}. ${whereToGet(closest.missing[0])}`;
    }
    return `You can make ${canMake.length === 1 ? "one thing" : `${canMake.length} things`} right now: ${canMake.map((r) => `**${r.name}**`).join(", ")}.`;
  }

  if (/\bveg|vegetarian|no meat|meat-free\b/.test(s)) {
    const veg = ctx.recipes.filter((r) => r.diet === "veg");
    return `Vegetarian: ${veg.map((r) => `**${r.name}**`).join(", ")}. ${veg.some((r) => !r.missing.length) ? "You can make one now." : "You're short ingredients for all of them."}`;
  }

  const where = s.match(/where.*(?:find|get|obtain)?\s+(?:a |an |the |some )?([a-z\s]+)\??$/);
  if (where) {
    const term = where[1].trim();
    const m = MATERIALS.find((x) => x.name.toLowerCase().includes(term) || term.includes(x.name.toLowerCase().split(" ")[0]));
    if (m) return whereToGet(m.name);
    const c = CREATURES.find((x) => x.name.toLowerCase().includes(term));
    if (c) return `**${c.name}** — ${c.where}. Danger ${c.danger}/5, best at ${c.best.toLowerCase()}.`;
  }

  const forRecipe = RECIPES.find((r) => s.includes(r.name.toLowerCase()));
  if (forRecipe) {
    const r = ctx.recipes.find((x) => x.name === forRecipe.name);
    return r.missing.length
      ? `**${r.name}** needs ${r.needs.join(", ")}. You're missing ${r.missing.join(", ")}. ${whereToGet(r.missing[0])}`
      : `You have everything for **${r.name}**. ${forRecipe.cook} on the pot, difficulty ${forRecipe.difficulty}/5.`;
  }

  if (/\b(level|xp|streak|quest|progress)\b/.test(s)) {
    return `Level ${ctx.level} — **${ctx.title}**, ${ctx.xp} XP, ${ctx.streak}-day streak. Today: ${ctx.quests.join(" · ")}.`;
  }

  if (/\b(pack|carrying|inventory|have)\b/.test(s)) {
    const all = [...ctx.pack, ...ctx.carried];
    return all.length ? `In your pack: ${all.join(", ")}.` : "Your pack is empty. Open the globe and gather something.";
  }

  return null;
}

function whereToGet(name) {
  const m = MATERIALS.find((x) => x.name === name);
  if (!m) {
    const c = CREATURES.find((x) => x.yields.some((y) => y === name) || x.name === name);
    return c ? `Hunt a **${c.name}** — ${c.where}.` : "";
  }
  const b = BIOMES.find((x) => x.id === m.biome);
  return `Find **${m.name}** at **${b?.name}** — ${m.tell}`;
}

/* ---------------- Gemini ---------------- */
async function askGemini(question) {
  const ctx = context();
  const system = [
    "You are the field cook in Peak & Pan, a foraging and cooking app set on an invented planet.",
    "Answer in 2-4 short sentences. Practical, warm, a little dry. Never mention being an AI.",
    "Only use the world facts given below — this planet's creatures and plants are fictional, so do not bring in real-world food facts.",
    "If the answer depends on something not in the data, say so plainly.",
    "",
    "PLAYER: level " + ctx.level + " (" + ctx.title + "), " + ctx.xp + " XP, " + ctx.streak + "-day streak.",
    "PACK: " + ([...ctx.pack, ...ctx.carried].join(", ") || "empty"),
    "RECIPES: " + ctx.recipes.map((r) => `${r.name} [${r.diet}] needs ${r.needs.join("/")}${r.missing.length ? `, missing ${r.missing.join("/")}` : ", ready"}`).join(" | "),
    "MATERIALS: " + ctx.materials.map((m) => `${m.name} at ${m.where}`).join(" | "),
    "CREATURES: " + ctx.creatures.map((c) => `${c.name} at ${c.where} (danger ${c.danger}/5)`).join(" | "),
  ].join("\n");

  let lastErr = null;
  for (const model of MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(AI.key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: question }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 220 },
          }),
        }
      );
      if (!res.ok) {
        const body = await res.text();
        /* 404 unknown model or 429 quota → try the next one, same as pokemu */
        if (/404|429|not found|quota|RESOURCE_EXHAUSTED/i.test(String(res.status) + body)) {
          lastErr = new Error(`${model}: ${res.status}`);
          continue;
        }
        throw new Error(`${res.status} ${body.slice(0, 140)}`);
      }
      const json = await res.json();
      const text = json?.candidates?.[0]?.content?.parts?.map((p) => p.text).join("").trim();
      if (text) return text;
      lastErr = new Error("empty response");
    } catch (err) { lastErr = err; }
  }
  throw lastErr || new Error("no model answered");
}

/* ---------------- what the chat screen calls ---------------- */
AI.ask = async function ask(question) {
  const local = localAnswer(question);
  if (local) return { text: local, source: "local" };
  if (!AI.live) {
    return {
      source: "local",
      text: "I can answer anything about your pack, what you can cook, where to find a material, or your level and quests. For open questions, add a Gemini key in Settings and I'll think harder.",
    };
  }
  try {
    return { text: await askGemini(question), source: "gemini" };
  } catch (err) {
    console.warn("[ai] gemini failed", err);
    return { text: "Couldn't reach the model just then. Ask me about your pack, a recipe, or where to find something and I'll answer from the field notes.", source: "error" };
  }
};

AI.suggestions = () => [
  "What can I cook right now?",
  "Where do I find emberpepper?",
  "Anything vegetarian?",
  "What's my streak?",
];
