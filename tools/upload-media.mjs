/* ============================================================
   Upload official artwork to Supabase Storage and index it.

   Put images in a folder named after the kind:
     media/ingredient/kecap.jpg      -> media row ('ingredient','kecap')
     media/dish/nasi-goreng.jpg      -> media row ('dish','nasi-goreng')
     media/country/id.jpg            -> media row ('country','id')

   The filename (without extension) must match the id in story.js.

   Run:
     SUPABASE_URL=https://xxx.supabase.co \
     SUPABASE_SERVICE_KEY=... \
     node tools/upload-media.mjs ./media

   ⚠️ The service_role key is read from the environment and is never
   written to disk. Do not paste it into a file, and do not commit it.
   Get it from: Supabase dashboard → Project Settings → API.
   ============================================================ */
import { readdir, readFile } from "node:fs/promises";
import { join, extname, basename } from "node:path";

const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_KEY;
const ROOT = process.argv[2] || "./media";
const BUCKET = "content";
const KINDS = ["ingredient", "dish", "country", "ui"];
const MIME = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

if (!URL_BASE || !KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_KEY in the environment.");
  process.exit(1);
}

let ok = 0, skipped = 0;

for (const kind of KINDS) {
  let files = [];
  try { files = await readdir(join(ROOT, kind)); } catch { continue; }

  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (!MIME[ext]) { skipped++; continue; }
    const key = basename(file, ext);
    const path = `${kind}/${file}`;
    const bytes = await readFile(join(ROOT, kind, file));

    const up = await fetch(`${URL_BASE}/storage/v1/object/${BUCKET}/${path}`, {
      method: "POST",
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": MIME[ext], "x-upsert": "true" },
      body: bytes,
    });
    if (!up.ok) { console.error(`upload failed ${path}: ${up.status} ${await up.text()}`); continue; }

    const url = `${URL_BASE}/storage/v1/object/public/${BUCKET}/${path}`;
    const row = await fetch(`${URL_BASE}/rest/v1/media`, {
      method: "POST",
      headers: {
        apikey: KEY, Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({ kind, key, url }),
    });
    if (!row.ok) { console.error(`index failed ${kind}/${key}: ${row.status} ${await row.text()}`); continue; }

    console.log(`  ${kind.padEnd(11)} ${key.padEnd(18)} -> ${url}`);
    ok++;
  }
}

console.log(`\n${ok} uploaded and indexed${skipped ? `, ${skipped} skipped (unsupported type)` : ""}.`);
console.log("Reload the app — pictures replace the drawn fallbacks automatically.");
