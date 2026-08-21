/* ============================================================
   Peak & Pan — runtime config
   Everything runs on the local driver until you fill this in.

   To go live:
     1. Create a Supabase project
     2. Run supabase/schema.sql in its SQL editor
     3. Paste the project URL and the PUBLIC anon key below
     4. Set driver to "supabase"

   The anon key belongs in a browser — it is public by design and
   Row Level Security is what protects the data. NEVER put the
   service_role key here; it bypasses RLS entirely.
   ============================================================ */

window.PP_CONFIG = {
  driver: "local",   // "local" | "supabase"
  url: "",           // https://<project-ref>.supabase.co
  anonKey: "",       // public anon key only
  bucket: "",        // optional: a PUBLIC Storage bucket for dish photos, e.g. "dish-photos"
};
