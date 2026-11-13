/* =====================================================================
   Agroscope · Supabase schema  (Postgres)
   ---------------------------------------------------------------------
   HOW TO RUN
     1. Create a free project at https://supabase.com
     2. Supabase Dashboard → SQL Editor → New query
     3. Paste this whole file → Run
     4. Copy Project URL + anon key into  js/config.js
   Security model
     · Passwords are hashed by Supabase Auth (never stored in the browser)
     · Every table has Row Level Security: a user can only read/write rows
       whose user_id equals auth.uid()
     · The anon key in js/config.js is public by design — RLS is the guard
     · The service_role key must NEVER appear in frontend JavaScript
   ===================================================================== */

create extension if not exists pgcrypto;

/* ---------------------------------------------------------------- 1. users
   Mirror of the auth record: id, full name, e-mail, account created date. */
create table if not exists public.users (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text unique,
  created_at  timestamptz not null default now()
);

alter table public.users enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

/* ------------------------------------------------------- 2. farmer_profiles
   One row per user: farm + agricultural preferences. */
create table if not exists public.farmer_profiles (
  user_id            uuid primary key references auth.users (id) on delete cascade,
  farm_name          text,
  location_text      text,
  division           smallint,          -- index into DATA.bd.divisions
  district           smallint,          -- index into DATA.bd.districts
  upazila            text,              -- filled by map reverse-geocoding
  farm_size          numeric,           -- hectares
  preferred_language text default 'en',
  current_crop       text,
  soil_type          text,
  soil_texture       text,
  soil_ph            numeric,
  soil_om            numeric,
  priorities         jsonb default '[]'::jsonb,
  updated_at         timestamptz not null default now()
);

alter table public.farmer_profiles enable row level security;

drop policy if exists "profile_all_own" on public.farmer_profiles;
create policy "profile_all_own" on public.farmer_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

/* --------------------------------------------------------- 3. saved_inputs
   Category/value store for anything not on the profile row, e.g.
   "form" (raw inputs), "settings" (autofill on/off, map layer, EO index),
   "map" (last selected area). */
create table if not exists public.saved_inputs (
  user_id    uuid not null references auth.users (id) on delete cascade,
  category   text not null,
  payload    jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, category)
);

alter table public.saved_inputs enable row level security;

drop policy if exists "saved_all_own" on public.saved_inputs;
create policy "saved_all_own" on public.saved_inputs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

/* ----------------------------------------------------- 4. analysis_history
   One row per completed "Analyse this field" run — unlimited per user. */
create table if not exists public.analysis_history (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  location   text,
  division   smallint,
  district   smallint,
  crop       text,
  soil       jsonb default '{}'::jsonb,
  priorities jsonb default '[]'::jsonb,
  results    jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists analysis_history_user_idx
  on public.analysis_history (user_id, created_at desc);

alter table public.analysis_history enable row level security;

drop policy if exists "analysis_all_own" on public.analysis_history;
create policy "analysis_all_own" on public.analysis_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

/* ------------------------------------------------------------ 5. saved_plans
   Saved crop-rotation plans + the recommendation shown with them. */
create table if not exists public.saved_plans (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  plan            jsonb not null default '{}'::jsonb,
  recommendations jsonb default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists saved_plans_user_idx
  on public.saved_plans (user_id, created_at desc);

alter table public.saved_plans enable row level security;

drop policy if exists "plans_all_own" on public.saved_plans;
create policy "plans_all_own" on public.saved_plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

/* ------------------------------------------- 6. auto-create user records */
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, email)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'full_name', ''),
          new.email)
  on conflict (id) do update set full_name = excluded.full_name,
                                  email     = excluded.email;

  insert into public.farmer_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.profiles (id, full_name, preferred_language)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'full_name', ''),
          coalesce(nullif(new.raw_user_meta_data ->> 'preferred_language', ''), 'en'))
  on conflict (id) do update set full_name = excluded.full_name;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/* Keep the sign-in e-mail in sync when it is changed from Supabase. */
create or replace function public.sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users set email = new.email where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email on auth.users;
create trigger on_auth_user_email
  after update of email on auth.users
  for each row execute function public.sync_user_email();

/* ---------------------------------------------------------------- 7. profiles
   Identity + role record, one row per user. The role column supports future
   advisor / admin dashboards; preferred_language carries the EN/BN choice. */
create table if not exists public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  full_name          text,
  role               text not null default 'farmer'
                     check (role in ('farmer', 'advisor', 'admin')),
  preferred_language text not null default 'en'
                     check (preferred_language in ('en', 'bn')),
  created_at         timestamptz not null default now()
);

alter table public.profiles enable row level security;

/* rows are created by the on_auth_user_created trigger (security definer),
   so clients never INSERT — they may only read and edit their own row */
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

/* ------------------------------------------------------------ 8. saved_fields
   Drawn / selected field boundaries: a GeoJSON polygon (WGS84, RFC 7946)
   plus the computed area, centre point and free-text notes. */
create table if not exists public.saved_fields (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text,
  boundary     jsonb not null,                 -- GeoJSON Polygon / MultiPolygon
  area_ha      numeric,                        -- hectares
  area_m2      numeric,                        -- square metres
  perimeter_m  numeric,                        -- metres
  centroid_lat numeric,                        -- WGS84 degrees
  centroid_lng numeric,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists saved_fields_user_idx
  on public.saved_fields (user_id, created_at desc);

alter table public.saved_fields enable row level security;

/* a user can only ever read or edit their own drawn fields */
drop policy if exists "fields_select_own" on public.saved_fields;
create policy "fields_select_own" on public.saved_fields
  for select using (auth.uid() = user_id);

drop policy if exists "fields_insert_own" on public.saved_fields;
create policy "fields_insert_own" on public.saved_fields
  for insert with check (auth.uid() = user_id);

drop policy if exists "fields_update_own" on public.saved_fields;
create policy "fields_update_own" on public.saved_fields
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "fields_delete_own" on public.saved_fields;
create policy "fields_delete_own" on public.saved_fields
  for delete using (auth.uid() = user_id);

/* ------------------------------------- 9. create profiles for existing users */
insert into public.profiles (id, full_name)
select u.id, coalesce(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
on conflict (id) do nothing;
