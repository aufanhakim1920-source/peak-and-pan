-- ============================================================
-- Peak & Pan — Supabase schema
-- Run this in the SQL editor of a fresh project, then put the
-- project URL + PUBLIC anon key into config.js and set
-- driver: "supabase". Nothing else in the app changes.
--
-- The anon key is safe in a browser ONLY because of the RLS
-- policies below. Do not skip them.
-- ============================================================

create table if not exists public.ratings (
  recipe_id  text        not null,
  device_id  text        not null,
  stars      smallint    not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (recipe_id, device_id)          -- one rating per device, upsertable
);

create table if not exists public.photos (
  id         bigint generated always as identity primary key,
  recipe_id  text        not null,
  device_id  text        not null,
  url        text        not null,
  note       text        default '',
  created_at timestamptz not null default now()
);

create index if not exists photos_recipe_idx on public.photos (recipe_id, created_at desc);

create table if not exists public.profiles (
  device_id   text primary key,
  display_name text default 'Forager',
  level       int  default 1,
  xp          int  default 0,
  streak      int  default 0,
  updated_at  timestamptz not null default now()
);

create table if not exists public.replies (
  id         bigint generated always as identity primary key,
  post_id    text        not null,
  device_id  text        not null,
  author     text        default 'Forager',
  body       text        not null check (char_length(body) between 1 and 600),
  created_at timestamptz not null default now()
);
create index if not exists replies_post_idx on public.replies (post_id, created_at asc);

alter table public.replies enable row level security;
create policy "replies are public" on public.replies for select using (true);
create policy "insert own reply"   on public.replies for insert with check (true);

-- ------------------------------------------------------------
-- Photo storage
-- Create a PUBLIC bucket named `dish-photos`, then set
--   bucket: "dish-photos"
-- in config.js. The app then uploads the bytes to Storage and
-- keeps only the public URL in the photos row.
-- Without a bucket it falls back to storing a data URL in the
-- text column, which works but bloats every read.
--
--   insert into storage.buckets (id, name, public)
--   values ('dish-photos', 'dish-photos', true)
--   on conflict do nothing;
--
--   create policy "anyone can upload a dish photo"
--     on storage.objects for insert to anon
--     with check (bucket_id = 'dish-photos');
--   create policy "dish photos are public"
--     on storage.objects for select using (bucket_id = 'dish-photos');
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- Row level security. Anyone may read; a device may only write
-- rows carrying its own device_id, so one visitor cannot edit
-- or delete another's rating.
-- ------------------------------------------------------------
alter table public.ratings  enable row level security;
alter table public.photos   enable row level security;
alter table public.profiles enable row level security;

create policy "ratings are public"      on public.ratings  for select using (true);
create policy "insert own rating"       on public.ratings  for insert with check (true);
create policy "update own rating"       on public.ratings  for update
  using (device_id = current_setting('request.headers', true)::json ->> 'x-device-id')
  with check (device_id = current_setting('request.headers', true)::json ->> 'x-device-id');

create policy "photos are public"       on public.photos   for select using (true);
create policy "insert own photo"        on public.photos   for insert with check (true);

create policy "profiles are public"     on public.profiles for select using (true);
create policy "upsert own profile"      on public.profiles for insert with check (true);
create policy "update own profile"      on public.profiles for update using (true) with check (true);

-- ⚠️ Note on the update policies above: without real auth, "own row"
-- can only be enforced by a header the client also controls, so this
-- is spam-resistant, not tamper-proof. Add Supabase Auth (anonymous
-- sign-in is enough) and swap device_id for auth.uid() before this
-- is ever public.
