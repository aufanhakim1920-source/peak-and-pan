/* ============================================================
   Peak & Pan — content
   The Figma is a design file, not a content source: it repeats
   "Fowlbeast Stew" and lorem across every card. The names below
   (Glorb, Blorg, Starchroot, Limseed Oil) are the team's own from
   the canvas; everything else is written to match that fiction so
   the prototype reads like a real app instead of lorem.
   ============================================================ */

const CREATURES = [
  {
    id: "glorb", name: "Glorb", tag: "Marsh cephalopod · Common",
    danger: 2, weight: "1.4 – 2.2 kg", best: "Dusk, after rain",
    where: "Verdant Marsh, shallow pools",
    desc: "Eight-limbed, endlessly curious, and slow enough to catch if you approach from downwind. The tentacles are the prize — dense, sweet, and they crisp beautifully. The mantle is watery and best left behind.",
    yields: ["Glorb tentacle", "Glorb mantle", "Ink sac"],
    weakness: "Sudden light", art: "assets/mascot.png", artFit: "contain",
  },
  {
    id: "fowlbeast", name: "Fowlbeast", tag: "Ridge fowl · Uncommon",
    danger: 3, weight: "4 – 6 kg", best: "First light",
    where: "Ashen Ridge, cliff nests",
    desc: "Bad tempered, faster than it looks, and it will absolutely take a run at you. Worth it: the thigh meat is the richest thing on the ridge and one bird stews for four people.",
    yields: ["Fowlbeast thigh", "Breast fillet", "Bone stock"],
    weakness: "Open ground",
  },
  {
    id: "blorg", name: "Blorg", tag: "Bog dweller · Common",
    danger: 1, weight: "0.6 – 1 kg", best: "Any time",
    where: "Low bog, under flat stones",
    desc: "Barely moves. Barely notices you. Mash it with salt and Limseed oil and it becomes the most reliable meal in the region — which is why every guide starts here.",
    yields: ["Blorg body", "Blorg jelly"],
    weakness: "Nothing in particular",
  },
  {
    id: "skitter", name: "Marsh Skitter", tag: "Reed insect · Abundant",
    danger: 1, weight: "80 – 140 g", best: "Midday heat",
    where: "Reed beds, whole colonies",
    desc: "Comes in swarms, so you never take just one. Skewered whole over embers they turn nutty and shatter like crackling.",
    yields: ["Skitter cluster"],
    weakness: "Smoke",
  },
];

const INGREDIENTS = [
  { id: "starchroot", name: "Starchroot", tag: "Root · Forageable", where: "Marsh margins",
    desc: "Fat, pale, and starchy. Bulks out any stew and thickens it as it goes.", keeps: "12 days cool" },
  { id: "limseed", name: "Limseed Oil", tag: "Pressed oil · Trade", where: "Bought at camp",
    desc: "Pressed from limseed pods. High smoke point, faintly citrus — the default frying fat.", keeps: "3 months sealed" },
  { id: "salt", name: "Salt", tag: "Mineral · Trade", where: "Bought at camp",
    desc: "Salt is salt. Carry more than you think you need.", keeps: "Forever" },
  { id: "emberpepper", name: "Emberpepper", tag: "Spice · Forageable", where: "Ashen Ridge, south face",
    desc: "Slow heat that arrives after you have swallowed. Use half of what you want to.", keeps: "2 months dried" },
  { id: "dewcap", name: "Dewcap Mushroom", tag: "Fungus · Forageable", where: "Shaded marsh floor",
    desc: "Holds water like a sponge. Squeeze it into the pot, not onto the fire.", keeps: "4 days" },
];

const RECIPES = [
  {
    id: "fowlbeast-stew", diet: "meat", name: "Fowlbeast Stew", prep: "10m", cook: "1hr 15m", difficulty: 4,
    img: "assets/food-stew.jpg", serves: 4,
    notes: "Yummy yummy in my tummy — the thigh meat falls apart if you give it the full hour. Don't rush it like I did the first time.",
    needs: [
      { name: "Fowlbeast thigh", qty: "600g", have: true },
      { name: "Starchroot", qty: "4 pc", have: true },
      { name: "Salt", qty: "10g", have: true },
      { name: "Emberpepper", qty: "2g", have: false },
    ],
    steps: [
      { t: "Joint the fowlbeast and separate the thighs from the breast. Keep the bones.", hint: "Bones make the stock — don't bin them" },
      { t: "Brown the thighs hard in Limseed oil until the skin blisters. Work in two batches.", hint: "Crowding the pan steams the meat" },
      { t: "Cover the bones with water and bring to a bare simmer for 40 minutes.", hint: "Skim the grey foam off twice" },
      { t: "Cube the starchroot and drop it in with the browned thighs.", hint: "Thumb-sized pieces hold their shape" },
      { t: "Simmer 35 minutes, until a spoon goes through the root with no resistance." },
      { t: "Salt at the end, then a pinch of emberpepper off the heat.", hint: "Emberpepper turns bitter if it boils" },
    ],
  },
  {
    id: "fried-glorb", diet: "meat", name: "Fried Glorb", prep: "15m", cook: "12m", difficulty: 2,
    img: "assets/food-stew.jpg", serves: 2,
    notes: "The one I make when I get back late. Tentacles only — the mantle goes rubbery.",
    needs: [
      { name: "Glorb", qty: "200g", have: false },
      { name: "Salt", qty: "10g", have: true },
      { name: "Limseed Oil", qty: "300g", have: true },
      { name: "Starchroot", qty: "4 pc", have: true },
    ],
    steps: [
      { t: "Separate the tentacles from the mantle. Keep the tentacles, discard the mantle.", hint: "The ink sac is worth saving separately" },
      { t: "Salt the tentacles and leave them 10 minutes to draw out water.", hint: "Wet glorb will never crisp" },
      { t: "Heat the limseed oil until a scrap of starchroot fizzes on contact." },
      { t: "Fry the tentacles 4 minutes until the edges curl and colour." },
      { t: "Drain, salt again immediately, eat standing up." },
    ],
  },
  {
    id: "blorg-mash", diet: "meat", name: "Blorg Mash", prep: "10m", cook: "2hr 15m", difficulty: 2,
    img: "assets/food-stew.jpg", serves: 3,
    notes: "Long, slow, and impossible to get wrong. Good first cook.",
    needs: [
      { name: "Blorg body", qty: "3 pc", have: true },
      { name: "Starchroot", qty: "6 pc", have: true },
      { name: "Limseed Oil", qty: "40g", have: true },
    ],
    steps: [
      { t: "Simmer the blorg whole for two hours until it collapses when pressed." },
      { t: "Boil the starchroot separately — it wants far less time." },
      { t: "Mash both together with limseed oil while everything is still hot.", hint: "Cold mash goes gluey" },
      { t: "Salt hard. Blorg takes more than you expect." },
    ],
  },
  {
    id: "skitter-skewers", diet: "meat", name: "Skitter Skewers", prep: "5m", cook: "8m", difficulty: 1,
    img: "assets/food-stew.jpg", serves: 2,
    notes: "Camp food. Ten minutes from reed bed to eating.",
    needs: [
      { name: "Skitter cluster", qty: "1 pc", have: true },
      { name: "Emberpepper", qty: "1g", have: false },
      { name: "Salt", qty: "5g", have: true },
    ],
    steps: [
      { t: "Thread the skitters whole onto a green reed stem." },
      { t: "Hold them over embers, not flame, turning constantly.", hint: "Flame scorches before the inside sets" },
      { t: "They are done the moment they stop steaming — about 8 minutes." },
      { t: "Salt and a scrape of emberpepper." },
    ],
  },
  {
    id: "starchroot-bake", diet: "veg", name: "Charred Starchroot", prep: "6m", cook: "40m", difficulty: 1,
    img: "assets/food-stew.jpg", serves: 3,
    notes: "The thing you make while something else is simmering. Almost impossible to overcook.",
    needs: [
      { name: "Starchroot", qty: "6 pc", have: false },
      { name: "Limseed Oil", qty: "30g", have: true },
      { name: "Salt", qty: "6g", have: true },
      { name: "Emberpepper", qty: "1g", have: false },
    ],
    steps: [
      { t: "Halve the starchroot lengthways and score the cut face in a grid.", hint: "The scoring is what lets the salt in" },
      { t: "Rub with limseed oil and salt, cut side down on a hot flat stone." },
      { t: "Leave it alone for 25 minutes. Do not move it.", hint: "Every time you turn it you lose the crust" },
      { t: "Flip, another 15 minutes, then a scrape of emberpepper." },
    ],
  },
  {
    id: "dewcap-broth", diet: "veg", name: "Dewcap Broth", prep: "8m", cook: "35m", difficulty: 3,
    img: "assets/food-stew.jpg", serves: 4,
    notes: "What you make when the hunt goes badly and you come back with nothing.",
    needs: [
      { name: "Dewcap Mushroom", qty: "8 pc", have: false },
      { name: "Starchroot", qty: "2 pc", have: true },
      { name: "Salt", qty: "8g", have: true },
    ],
    steps: [
      { t: "Squeeze the dewcaps over the pot and keep the water they give up." },
      { t: "Slice them thin and dry-fry until the edges brown.", hint: "No oil — they release plenty" },
      { t: "Add the dewcap water and the starchroot, simmer 30 minutes." },
      { t: "Salt in stages, tasting each time." },
    ],
  },
];

/* map pins — coordinates are in the 393×852 viewBox the Figma frames use */
const PINS = [
  { id: "you",    kind: "you",      x: 82,  y: 300, label: "You" },
  { id: "d1",     kind: "danger",   x: 250, y: 265, label: "Fowlbeast nest", sub: "Aggressive · keep 40m", dist: "620m" },
  { id: "d2",     kind: "danger",   x: 108, y: 590, label: "Bog sink",       sub: "Unstable ground",       dist: "310m" },
  { id: "c1",     kind: "creature", x: 232, y: 500, label: "Glorb",          sub: "3 sighted at dusk", dist: "1400m", creature: "glorb" },
  { id: "c2",     kind: "creature", x: 300, y: 690, label: "Marsh Skitter",  sub: "Whole colony",      dist: "890m",  creature: "skitter" },
  { id: "c3",     kind: "creature", x: 148, y: 402, label: "Blorg",          sub: "Under the flat stones", dist: "450m", creature: "blorg" },
];

const POSTS = [
  { id: 1, who: "James", when: "2h", pfp: "assets/mascot.png",
    body: "Sharing my favourites this week — the Fried Glorb is unbeatable if you salt the tentacles first. Ten minutes, no excuses.",
    img: "assets/food-stew.jpg", likes: 24, tag: "reviews" },
  { id: 2, who: "Ren", when: "5h", pfp: "assets/mascot.png",
    body: "Could we get some help killing a glorb? Third attempt this week and it keeps slipping back into the pool the second I get close.",
    likes: 11, tag: "quests" },
  { id: 3, who: "Ora", when: "1d", pfp: "assets/mascot.png",
    body: "Full guide up for the Ashen Ridge approach — go at first light, stay off the open ground, and bring more salt than you think.",
    img: "assets/map-thumb.jpg", likes: 62, tag: "guides" },
  { id: 4, who: "Bel", when: "2d", pfp: "assets/mascot.png",
    body: "Blorg mash for the fourth night running. Not sorry. Two hours of doing nothing and it comes out perfect every time.",
    img: "assets/food-stew.jpg", likes: 8, tag: "reviews" },
];

const GEAR = [
  { id: "net",    name: "Weighted net",   note: "For anything that lives in water" },
  { id: "knife",  name: "Butchering knife", note: "Sharpen it before you leave, not there" },
  { id: "lamp",   name: "Shuttered lamp", note: "Glorb freeze in sudden light" },
  { id: "salt",   name: "Salt pouch",     note: "Preserve the cuts you can't carry cold" },
  { id: "boots",  name: "Marsh boots",    note: "The bog sink is real" },
];

/* pieces offered after a successful butcher, keyed by creature */
/* `feeds` is the recipe ingredient this cut satisfies — without it the loop
   never closes, because you butcher a "Tentacle" but the recipe asks for "Glorb" */
const PIECES = {
  glorb: [
    { name: "Tentacle", grade: "Prime", qty: "820g", use: "Fried Glorb", feeds: "Glorb", best: true, kcal: 150, mass: "10-20 kg", per: "2 per glorb" },
    { name: "Mantle",   grade: "Poor",  qty: "400g", use: "Stock only", kcal: 60, mass: "4-8 kg", per: "1 per glorb" },
    { name: "Ink sac",  grade: "Rare",  qty: "40g",  use: "Colouring · trades well", kcal: 20, mass: "0.2 kg", per: "1 per glorb" },
  ],
  fowlbeast: [
    { name: "Thigh",    grade: "Prime", qty: "600g", use: "Fowlbeast Stew", feeds: "Fowlbeast thigh", best: true, kcal: 210, mass: "2-4 kg", per: "2 per bird" },
    { name: "Breast",   grade: "Good",  qty: "450g", use: "Fast sear", kcal: 180, mass: "1-2 kg", per: "2 per bird" },
    { name: "Bones",    grade: "Good",  qty: "700g", use: "Stock base", kcal: 15, mass: "1 kg", per: "1 set" },
  ],
  blorg:  [
    { name: "Body",  grade: "Good", qty: "700g", use: "Blorg Mash", feeds: "Blorg body", best: true, kcal: 120, mass: "0.6-1 kg", per: "1 per blorg" },
    { name: "Jelly", grade: "Fair", qty: "120g", use: "Thickener", kcal: 40, mass: "0.1 kg", per: "1 per blorg" },
  ],
  skitter: [
    { name: "Cluster", grade: "Good", qty: "300g", use: "Skitter Skewers", feeds: "Skitter cluster", best: true, kcal: 90, mass: "0.3 kg", per: "whole colony" },
  ],
};

/* the guide screens (Preparation / The Hunt / Butchering / Recommended Pieces)
   all share one template in the Figma: an altitude range, a season selector,
   a party/duration bar, then written sections. Content per creature below. */
const GUIDES = {
  glorb: {
    prep: [
      { h: "Pack for wet ground", p: ["Bring waterproof boots, gloves and one dry layer.",
        "During XY-35, Glorb territory stays wet even after several clear days. Expect mud, shallow water and slippery rock."],
        cap: "Do not wear light shoes! Fine on the way in, miserable on the way back with 12 kg of Glorb." },
    ],
    hunt: [
      { h: "Introduction", p: ["Glorbs have poor eyesight, but excellent hearing and a surprisingly good sense of vibration.",
        "Do not rush the approach just because it has not looked at you."] },
      { h: "Find fresh signs", p: ["Look for wet drag marks between pools and shells turned belly-up on the bank. Both go dry within an hour, so a fresh sign means it is still close."],
        cap: "Old marks crumble at the edge. Fresh ones hold a clean line." },
    ],
    butcher: [
      { h: "Safely dissecting a glorb", p: ["Do not spread its legs!", "Work from the mantle down, one limb at a time, and keep the ink sac intact until last."],
        cap: "Wear gloves at all times!" },
      { h: "Getting rid of glorb bones", p: ["There is no true skeleton — only the beak and the pen. Both come out whole if you pull along the grain rather than across it."] },
    ],
  },
  fowlbeast: {
    prep: [{ h: "Pack for exposed ridge", p: ["Wind shell, eye protection and a long pole.", "Fowlbeast come at your face first. Give yourself something to hold between you and it."], cap: "Nothing loose on your pack. It will grab straps." }],
    hunt: [
      { h: "Introduction", p: ["Excellent eyesight, poor hearing, and it will charge rather than flee.", "Approach along the cliff, never across open ground."] },
      { h: "Find fresh signs", p: ["Scratch lines on flat stone and down caught on the scrub. Down blows away within a day."] },
    ],
    butcher: [
      { h: "Taking a fowlbeast apart", p: ["Thighs first, then breast. The joints give easily if you find them by feel rather than cutting through."], cap: "Keep the bones — they are the whole point of the stew." },
    ],
  },
  blorg: {
    prep: [{ h: "Pack light", p: ["Blorg need almost nothing. A bag and a knife.", "The bog is the danger, not the animal."], cap: "Test every step before you weight it." }],
    hunt: [{ h: "Introduction", p: ["It will not run. It will not notice. The only skill is finding the right stone."] },
           { h: "Find fresh signs", p: ["Flat stones with a clean damp ring underneath. A dry ring means it moved days ago."] }],
    butcher: [{ h: "Dressing a blorg", p: ["One cut along the underside and it opens completely. Keep the jelly separately — it thickens anything."] }],
  },
  skitter: {
    prep: [{ h: "Pack for reeds", p: ["Long sleeves and a fine net.", "You are taking a colony, not an individual."], cap: "Smoke settles them. Bring something that smoulders." }],
    hunt: [{ h: "Introduction", p: ["Skitters react to the whole reed bed moving, not to you. Move one stem at a time."] }],
    butcher: [{ h: "Preparing a cluster", p: ["Nothing to butcher. Rinse, dry, thread whole."] }],
  },
};
const SEASONS = ["XY-35", "J-87", "RJ-41"];
const ALTITUDES = ["1000m", "2000m", "3000m", "7600m"];
