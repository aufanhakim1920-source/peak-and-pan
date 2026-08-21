/* ============================================================
   Peak & Pan — the story layer
   Reworked 2026-08-21 from Aufan's brief:

     "While cooking, suddenly an alien octopus comes. He seems scary
      and ready to conquer the world. He smells the food and demands
      it or he'll eat the player. The player gives it, the squid loves
      it and demands more — so the player has to find more recipes and
      learn cooking to fill this belly. And by the time, this octopus
      becomes his friend."

   The opening beat uses the team's own fiction against itself: the
   dish you're cooking when he arrives is **Fried Glorb**, the recipe
   already in their Figma. He is a Glorb. He has opinions about that.

   The globe is Earth now, not an invented planet. Each chapter is a
   country; clear its dishes and the next one unlocks.
   ============================================================ */

/* ---------------- Glorb's mood arc ----------------
   Drives his portrait, his colour and every line he says. He never
   stops being hungry; he stops being frightening. */
const MOODS = [
  { id: "furious",   from: 0,  name: "Furious",    color: "#C6402F",
    face: "menacing", line: "GIVE. IT. HERE." },
  { id: "demanding", from: 2,  name: "Demanding",  color: "#D9782B",
    face: "stern",    line: "More. And make it different this time." },
  { id: "curious",   from: 5,  name: "Curious",    color: "#C9A227",
    face: "curious",  line: "What else does this planet make?" },
  { id: "warm",      from: 9,  name: "Warm",       color: "#5FBF8A",
    face: "happy",    line: "You're better at this than you were." },
  { id: "friend",    from: 14, name: "Friend",     color: "#57A8E0",
    face: "friend",   line: "Sit. Eat with me this time." },
];

/* Things he says, keyed by mood. Picked deterministically from the
   number of dishes cooked so the same state always reads the same. */
const GLORB_LINES = {
  furious: [
    "That smell. Hand it over or I start with you.",
    "I have eaten three moons this week. You are not special.",
    "You cook. I eat. That is the arrangement now.",
  ],
  demanding: [
    "Adequate. Now something else. I do not repeat meals.",
    "Faster. My stomach is a very large room.",
    "You call that a portion? I have suckers bigger than that plate.",
  ],
  curious: [
    "Where does this one come from? The little islands?",
    "Explain the spice. Not the name — the reason.",
    "I have conquered nine planets. None of them had this.",
  ],
  warm: [
    "You remembered I don't like it dry. Noted.",
    "I told the fleet to hold position. No reason.",
    "This one. Make this one again sometime.",
  ],
  friend: [
    "I brought nothing. I never bring anything. Sorry.",
    "Conquering is loud. This is better.",
    "When you run out of countries, we'll start again from the top.",
  ],
};

/* ---------------- chapters ----------------
   Real countries, real coordinates on a real Earth. Order is the
   journey: home first, then outward. */
const CHAPTERS = [
  {
    id: "id", code: "ID", costume: "🥥", country: "Indonesia", city: "Surabaya", lat: -7.25, lng: 112.75,
    color: 0xE8543A, flag: "🇮🇩",
    open: "He lands in the kitchen doorway while the oil is still hot.",
    intro: "You were making Fried Glorb. He is a Glorb. Nobody mentions it.",
    dishes: ["nasi-goreng", "sate-ayam", "rendang"],
  },
  {
    id: "jp", code: "JP", costume: "🍥", country: "Japan", city: "Osaka", lat: 34.69, lng: 135.50,
    color: 0xD94A6A, flag: "🇯🇵",
    open: "He has heard there is a country that takes rice seriously.",
    intro: "Fewer ingredients, more attention. He finds this suspicious at first.",
    dishes: ["onigiri", "miso-soup", "katsu-curry"],
  },
  {
    id: "it", code: "IT", costume: "🍕", country: "Italy", city: "Naples", lat: 40.85, lng: 14.27,
    color: 0x5FBF8A, flag: "🇮🇹",
    open: "Somebody told him about a flat bread with cheese on it.",
    intro: "He learns that four ingredients done properly beats fourteen done badly.",
    dishes: ["aglio-e-olio", "margherita", "carbonara"],
  },
  {
    id: "mx", code: "MX", costume: "🌮", country: "Mexico", city: "Oaxaca", lat: 17.07, lng: -96.72,
    color: 0xE8A33A, flag: "🇲🇽",
    open: "He arrives already complaining about the flight.",
    intro: "Heat that builds instead of hits. He respects the patience in it.",
    dishes: ["guacamole", "elote", "tacos-al-pastor"],
  },
  {
    id: "in", code: "IN", costume: "🍛", country: "India", city: "Kochi", lat: 9.93, lng: 76.27,
    color: 0x8E6FB8, flag: "🇮🇳",
    open: "He wants to know why everything here smells like a decision.",
    intro: "Spice as structure, not as a dare. This is where he stops rushing you.",
    dishes: ["dal-tadka", "chana-masala", "butter-chicken"],
  },
  {
    id: "au", code: "AU", costume: "☕", country: "Australia", city: "Melbourne", lat: -37.81, lng: 144.96,
    color: 0x57A8E0, flag: "🇦🇺",
    open: "Your turn to pick. He follows you home.",
    intro: "The last one is the one you actually live in.",
    dishes: ["parma", "lamingtons", "flat-white"],
  },
];

/* ---------------- ingredients ----------------
   Gathered from the country you're in — a market, not a marsh. */
const PANTRY = [
  { id: "rice",      name: "Rice",           icon: "grain",   color: "#E8DCC0", where: "id", diet: "veg", tell: "Day-old and cold fries better than fresh." },
  { id: "kecap",     name: "Kecap Manis",    icon: "bottle",  color: "#4A2E1F", where: "id", diet: "veg", tell: "Thick, sweet, almost syrup. Not soy sauce." },
  { id: "chilli",    name: "Chilli",         icon: "chilli",  color: "#C6402F", where: "id", diet: "veg", tell: "Bird's eye. Small ones carry it." },
  { id: "nori",      name: "Nori",           icon: "sheet",   color: "#2E4A3A", where: "jp", diet: "veg", tell: "Crisp until you wrap it. Then it's soft on purpose." },
  { id: "miso",      name: "Miso",           icon: "bowl",    color: "#B07B3A", where: "jp", diet: "veg", tell: "Never boil it. It goes flat and sour." },
  { id: "dashi",     name: "Dashi",          icon: "bottle",  color: "#C9A227", where: "jp", diet: "veg", tell: "Kombu and flakes. The whole soup is this." },
  { id: "olive",     name: "Olive Oil",      icon: "drop",    color: "#A8C64F", where: "it", diet: "veg", tell: "Good enough to taste on its own." },
  { id: "garlic",    name: "Garlic",         icon: "bulb",    color: "#EFE6D2", where: "it", diet: "veg", tell: "Sliced, not crushed, when it's the star." },
  { id: "tomato",    name: "San Marzano",    icon: "tomato",  color: "#C6402F", where: "it", diet: "veg", tell: "Crush by hand. A blender makes it foam." },
  { id: "lime",      name: "Lime",           icon: "lime",    color: "#8FBF52", where: "mx", diet: "veg", tell: "Heavy for its size means juicy." },
  { id: "maize",     name: "Maize",          icon: "corn",    color: "#E8C24A", where: "mx", diet: "veg", tell: "Husk still tight, silk still pale." },
  { id: "cumin",     name: "Cumin",          icon: "seed",    color: "#8A5A2B", where: "in", diet: "veg", tell: "Toast whole, then grind. Not the other way round." },
  { id: "lentil",    name: "Toor Dal",       icon: "grain",   color: "#D9A441", where: "in", diet: "veg", tell: "Rinse until the water runs clear." },
  { id: "ghee",      name: "Ghee",           icon: "drop",    color: "#E8C87A", where: "in", diet: "veg", tell: "Nutty, not greasy. It should smell toasted." },
];

/* ---------------- dishes ----------------
   `learn` is the technique the chapter is actually teaching — Glorb
   asks about it, and it's what the guide screen explains. */
const DISHES = [
  {
    id: "nasi-goreng", name: "Nasi Goreng", chapter: "id", diet: "veg",
    prep: "10m", cook: "12m", difficulty: 2, serves: 2,
    learn: "Heat control", needs: ["rice", "kecap", "chilli"],
    blurb: "Cold rice, a hot pan, and sweet soy that catches at the edges.",
    glorb: "It's brown. Why is it brown? …Oh. OH.",
    steps: [
      { t: "Use cold rice. Break every clump with your fingers before it goes near heat.", hint: "Warm rice steams and turns to paste" },
      { t: "Get the pan hotter than feels sensible, then add oil." },
      { t: "Fry the chilli and aromatics for thirty seconds — no longer." },
      { t: "Rice in, spread it flat, and leave it alone so it catches.", hint: "Stirring constantly is why yours goes soggy" },
      { t: "Kecap manis around the edge of the pan, not on the rice.", hint: "It caramelises on the metal first" },
    ],
  },
  {
    id: "sate-ayam", name: "Sate Ayam", chapter: "id", diet: "meat",
    prep: "25m", cook: "10m", difficulty: 3, serves: 3,
    learn: "Marinade time", needs: ["kecap", "chilli"],
    blurb: "Skewers over coals, peanut sauce thick enough to stand a stick in.",
    glorb: "Eight arms. Eight skewers. Do the maths.",
    steps: [
      { t: "Cut the chicken smaller than you want to. It cooks evenly that way." },
      { t: "Marinate at least twenty minutes. An hour is better.", hint: "Salt needs time to get past the surface" },
      { t: "Coals, not flame. Flame chars before the middle sets." },
      { t: "Turn every thirty seconds. Baste on the last two turns only." },
    ],
  },
  {
    id: "rendang", name: "Rendang", chapter: "id", diet: "meat",
    prep: "20m", cook: "3hr", difficulty: 5, serves: 4,
    learn: "Patience", needs: ["chilli", "kecap"],
    blurb: "Three hours until the sauce stops being sauce and becomes coating.",
    glorb: "Three hours? I have laid siege to cities in less.",
    steps: [
      { t: "Blend the spice paste properly. Any grit here stays grit." },
      { t: "Fry the paste until the oil separates out.", hint: "This is the step everyone cuts short" },
      { t: "Coconut milk in, then the lowest heat you have, uncovered." },
      { t: "Two hours: it's a curry. Three: it's rendang. Wait.", hint: "Stop when the oil comes back and it coats" },
    ],
  },

  {
    id: "onigiri", name: "Onigiri", chapter: "jp", diet: "veg",
    prep: "12m", cook: "0m", difficulty: 1, serves: 2,
    learn: "Salt and pressure", needs: ["rice", "nori"],
    blurb: "Rice, salt, hands. Nothing to hide behind.",
    glorb: "Where is the rest of it. Where is the REST of it.",
    steps: [
      { t: "Wet your hands, then salt them. The salt seasons through your palms.", hint: "Dry hands and it welds to you" },
      { t: "Rice still warm. Cold rice won't hold a shape." },
      { t: "Three light presses per side. Firm enough to carry, loose enough to bite.", hint: "Squeezing makes a rice brick" },
      { t: "Nori on at the last second, or it goes limp." },
    ],
  },
  {
    id: "miso-soup", name: "Miso Soup", chapter: "jp", diet: "veg",
    prep: "5m", cook: "10m", difficulty: 2, serves: 2,
    learn: "Never boil it", needs: ["miso", "dashi"],
    blurb: "Two ingredients and one rule.",
    glorb: "This is water with an opinion. I approve.",
    steps: [
      { t: "Make the dashi first. Kombu in cold water, pulled out before it boils.", hint: "Boiled kombu turns slimy and bitter" },
      { t: "Take the pot off the heat before the miso goes anywhere near it." },
      { t: "Loosen the miso in a ladle of broth, then stir it back in.", hint: "Dropping the paste in whole leaves lumps" },
      { t: "Never let it boil again. That's the whole dish." },
    ],
  },
  {
    id: "katsu-curry", name: "Katsu Curry", chapter: "jp", diet: "meat",
    prep: "20m", cook: "25m", difficulty: 3, serves: 3,
    learn: "Dry, wet, dry", needs: ["rice", "dashi"],
    blurb: "The crunch survives the sauce, if you build it right.",
    glorb: "Crisp AND wet. You people are showing off.",
    steps: [
      { t: "Flour, egg, panko — in that order, and press the panko on.", hint: "Skip the flour and the egg slides off" },
      { t: "Oil at 170°C. A panko crumb should sizzle, not vanish." },
      { t: "Rest it on a rack, never on paper.", hint: "Paper steams the bottom soft" },
      { t: "Sauce beside it, not over it. Always." },
    ],
  },

  {
    id: "aglio-e-olio", name: "Aglio e Olio", chapter: "it", diet: "veg",
    prep: "5m", cook: "12m", difficulty: 2, serves: 2,
    learn: "Pasta water is an ingredient", needs: ["olive", "garlic"],
    blurb: "Four things. Nowhere to hide.",
    glorb: "You did almost nothing and it worked. Explain.",
    steps: [
      { t: "Slice the garlic thin. Cold pan, cold oil, low heat.", hint: "Garlic dropped into hot oil is bitter in seconds" },
      { t: "Salt the pasta water until it tastes like a sea you'd complain about." },
      { t: "Keep a mug of the water before you drain. This is the sauce.", hint: "The starch in it is what emulsifies" },
      { t: "Pasta into the pan, splash of water, toss hard until it turns glossy." },
    ],
  },
  {
    id: "margherita", name: "Margherita", chapter: "it", diet: "veg",
    prep: "1hr", cook: "8m", difficulty: 4, serves: 2,
    learn: "Restraint", needs: ["tomato", "olive"],
    blurb: "Three toppings. Adding a fourth is how you lose.",
    glorb: "I ordered nine. He brought one. He was right.",
    steps: [
      { t: "Stretch by hand from the middle out. Leave the rim alone.", hint: "A rolling pin kills every bubble" },
      { t: "Crushed tomato, salt, nothing else. Do not cook it first." },
      { t: "Hottest oven you own, on a preheated surface." },
      { t: "Basil after it comes out, not before.", hint: "In the oven it just turns black" },
    ],
  },
  {
    id: "carbonara", name: "Carbonara", chapter: "it", diet: "meat",
    prep: "8m", cook: "14m", difficulty: 4, serves: 2,
    learn: "Off the heat", needs: ["garlic", "olive"],
    blurb: "No cream. The sauce is egg, cheese and nerve.",
    glorb: "If you scramble this I am eating the chef.",
    steps: [
      { t: "Render the pork slowly. The fat is half the sauce." },
      { t: "Egg yolks and pecorino beaten together into a paste." },
      { t: "Pan OFF the heat. Pasta in, then the egg, tossing constantly.", hint: "Any direct heat and you've made breakfast" },
      { t: "Pasta water a splash at a time until it flows." },
    ],
  },

  {
    id: "guacamole", name: "Guacamole", chapter: "mx", diet: "veg",
    prep: "10m", cook: "0m", difficulty: 1, serves: 4,
    learn: "Acid and salt", needs: ["lime", "chilli"],
    blurb: "Mashed, not blended. Texture is the point.",
    glorb: "Green. Suspicious. …Fine. FINE.",
    steps: [
      { t: "Avocado that gives slightly at the stem end. Nowhere else." },
      { t: "Salt and lime FIRST, into the onion and chilli.", hint: "It takes the raw bite off the onion" },
      { t: "Mash with a fork. Leave lumps." },
      { t: "Taste, add lime, taste again. It's almost always more lime." },
    ],
  },
  {
    id: "elote", name: "Elote", chapter: "mx", diet: "veg",
    prep: "5m", cook: "12m", difficulty: 1, serves: 3,
    learn: "Char", needs: ["maize", "lime", "chilli"],
    blurb: "Corn, blackened in places, dressed while it's too hot to hold.",
    glorb: "You BURNED it. …Deliberately. I see.",
    steps: [
      { t: "Husk off, straight onto the grill. You want black patches, not an even colour.", hint: "No char, no flavour — that's the dish" },
      { t: "Dress it hot so everything melts into the kernels." },
      { t: "Lime last, over the top, generously." },
    ],
  },
  {
    id: "tacos-al-pastor", name: "Tacos al Pastor", chapter: "mx", diet: "meat",
    prep: "6hr", cook: "20m", difficulty: 4, serves: 4,
    learn: "Layering", needs: ["chilli", "lime", "maize"],
    blurb: "Marinade overnight, char hard, pineapple to cut it.",
    glorb: "Fruit. On meat. I have questions and also a full mouth.",
    steps: [
      { t: "Toast the dried chillies before soaking. Thirty seconds a side.", hint: "Untoasted chilli tastes like dust" },
      { t: "Marinate six hours minimum. Overnight is the real answer." },
      { t: "High heat, don't crowd the pan, let it catch." },
      { t: "Warm the tortillas dry, one at a time.", hint: "A cold tortilla splits" },
    ],
  },

  {
    id: "dal-tadka", name: "Dal Tadka", chapter: "in", diet: "veg",
    prep: "10m", cook: "35m", difficulty: 2, serves: 4,
    learn: "Blooming spice", needs: ["lentil", "cumin", "ghee"],
    blurb: "The dal is the base. The tadka poured over it is the dish.",
    glorb: "It hissed when you poured it. Do that again.",
    steps: [
      { t: "Rinse the dal until the water runs clear, then simmer until it collapses." },
      { t: "Ghee hot, cumin in — it should sizzle immediately and smell nutty.", hint: "Cold fat and the spice just soaks, never blooms" },
      { t: "Pour the tadka over the dal at the table. That sound is the point." },
    ],
  },
  {
    id: "chana-masala", name: "Chana Masala", chapter: "in", diet: "veg",
    prep: "12m", cook: "40m", difficulty: 3, serves: 4,
    learn: "Cooking out the raw", needs: ["cumin", "tomato", "chilli"],
    blurb: "Onions further than you think, tomatoes until the oil splits back out.",
    glorb: "You stood there stirring for twenty minutes. I watched. I understand now.",
    steps: [
      { t: "Onions to deep brown, not golden. This is fifteen minutes, not five.", hint: "Pale onions leave the whole thing thin" },
      { t: "Ginger and garlic until the raw smell goes." },
      { t: "Tomatoes until the oil separates and pools at the edge.", hint: "That split is the signal to move on" },
      { t: "Chickpeas and their water, then simmer to thicken." },
    ],
  },
  {
    id: "butter-chicken", name: "Butter Chicken", chapter: "in", diet: "meat",
    prep: "4hr", cook: "30m", difficulty: 4, serves: 4,
    learn: "Two-stage cooking", needs: ["ghee", "tomato", "cumin"],
    blurb: "Char it first, then let it sit in the sauce. Both steps or neither.",
    glorb: "Smoke, then silk. Whoever thought of this deserves a planet.",
    steps: [
      { t: "Yoghurt marinade, four hours. It tenderises and it clings." },
      { t: "Char the chicken hard and fast — grill or the hottest pan you own.", hint: "The smoke flavour comes from here, not the sauce" },
      { t: "Build the sauce separately, blend it smooth, then finish with butter off the heat." },
      { t: "Chicken back into the sauce for the last five minutes only." },
    ],
  },

  {
    id: "parma", name: "Chicken Parma", chapter: "au", diet: "meat",
    prep: "15m", cook: "25m", difficulty: 2, serves: 2,
    learn: "Everything you already know", needs: ["tomato", "garlic"],
    blurb: "Every pub in Melbourne, and everyone has a strong opinion.",
    glorb: "This is three of your countries stacked on one plate. Efficient.",
    steps: [
      { t: "Crumb it the way you crumbed the katsu. Same rules." },
      { t: "Fry first, sauce and cheese after, then grill to melt.", hint: "Sauce before frying and the crumb is gone" },
      { t: "Grill only until it bubbles. Longer and the base goes soft." },
    ],
  },
  {
    id: "lamingtons", name: "Lamingtons", chapter: "au", diet: "veg",
    prep: "30m", cook: "25m", difficulty: 3, serves: 6,
    learn: "Day-old is better", needs: ["ghee"],
    blurb: "Stale sponge holds the chocolate. Fresh sponge falls apart.",
    glorb: "Cake. In squares. Rolled in dust. You have gone strange again.",
    steps: [
      { t: "Bake the sponge the day before. Fresh cake disintegrates in the icing.", hint: "This is the entire trick" },
      { t: "Thin chocolate icing — it should run off a spoon." },
      { t: "Dip, drain, coconut, rest on a rack." },
    ],
  },
  {
    id: "flat-white", name: "Flat White", chapter: "au", diet: "veg",
    prep: "3m", cook: "2m", difficulty: 3, serves: 1,
    learn: "Texture over volume", needs: [],
    blurb: "Melbourne's actual contribution. Microfoam, not froth.",
    glorb: "You made me a drink. Nobody has made me a drink.",
    steps: [
      { t: "Stretch the milk for two seconds only, then drop the wand under the surface." },
      { t: "Spin it until the jug is too hot to hold comfortably — about 60°C.", hint: "Past that it tastes scalded and won't pour" },
      { t: "Tap, swirl, pour close to the surface." },
    ],
  },
];

/* deterministic pick so the same state always shows the same line */
function glorbLine(mood, seed) {
  const pool = GLORB_LINES[mood] || GLORB_LINES.furious;
  return pool[Math.abs(seed) % pool.length];
}

function moodFor(cooked) {
  let m = MOODS[0];
  for (const x of MOODS) if (cooked >= x.from) m = x;
  const next = MOODS.find((x) => x.from > cooked) || null;
  return { ...m, next, toNext: next ? next.from - cooked : 0 };
}
