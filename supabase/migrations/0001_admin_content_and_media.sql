-- =============================================================================
-- Website content, homepage composition, SEO overrides and media metadata.
--
-- STATUS: NOT APPLIED. This file is written for review. Nothing in the admin
-- console depends on it; the modules it would enable currently render "Setup
-- required" and name these tables, which is why they are named here exactly as
-- the console expects them.
--
-- Read the PRECONDITIONS block before running any of it.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PRECONDITIONS — verify these by hand before applying
-- -----------------------------------------------------------------------------
-- 1. public.profiles exists with columns (id uuid, role text, account_status
--    text). Verified present in this project.
-- 2. profiles' own RLS lets a signed-in user SELECT their own row. The admin
--    predicate below reads profiles as the CALLER, so if that select is denied
--    every policy here silently evaluates false and admins are locked out.
--    Check with:  set role authenticated; select * from profiles where id = auth.uid();
-- 3. No table named below already exists. `create table if not exists` will
--    silently skip a name collision and leave you with a table whose columns
--    are not the ones these policies assume.
-- -----------------------------------------------------------------------------

begin;

-- -----------------------------------------------------------------------------
-- The admin predicate.
--
-- SECURITY INVOKER on purpose — it is NOT a definer function. A definer here
-- would run as the owner and bypass profiles' RLS, which is exactly the
-- "bypass the permission error" pattern that hides a misconfiguration until it
-- matters. Running as the caller means that if profiles' policies are wrong,
-- this returns false and admins are locked OUT rather than everyone being let
-- in. Failing closed is the whole point.
--
-- STABLE, so the planner evaluates it once per statement rather than per row.
-- -----------------------------------------------------------------------------
create or replace function public.is_active_admin()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
      and p.account_status = 'active'
  );
$$;

comment on function public.is_active_admin() is
  'True when the caller is an active administrator. Security INVOKER: it reads profiles under the caller''s own RLS and fails closed.';

revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

-- =============================================================================
-- site_content — editable page copy
-- =============================================================================
create table if not exists public.site_content (
  id            uuid primary key default gen_random_uuid(),
  page          text not null,
  section       text not null,
  -- Structured rather than a blob of HTML. Storing markup would mean either
  -- rendering it with dangerouslySetInnerHTML or sanitising it on every read;
  -- discrete fields make an injected <script> impossible rather than filtered.
  heading       text,
  subheading    text,
  body          text,
  cta_label     text,
  cta_href      text,
  image_path    text,
  image_alt     text,
  position      integer not null default 0,
  published     boolean not null default false,
  -- The draft a published row is edited against, so "preview before publish"
  -- does not require a second row or a separate table.
  draft         jsonb,
  updated_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (page, section)
);

alter table public.site_content enable row level security;

-- Anonymous visitors read only what is published. Note the predicate is on the
-- ROW, not merely on the role: `to anon` alone would expose every draft.
create policy site_content_public_read on public.site_content
  for select to anon, authenticated
  using (published = true);

create policy site_content_admin_read on public.site_content
  for select to authenticated
  using (public.is_active_admin());

create policy site_content_admin_insert on public.site_content
  for insert to authenticated
  with check (public.is_active_admin());

-- USING decides which rows may be updated; WITH CHECK decides what they may be
-- updated INTO. Both are required: with USING alone an admin could rewrite a
-- row into a state the policy would never have allowed them to create.
create policy site_content_admin_update on public.site_content
  for update to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

create policy site_content_admin_delete on public.site_content
  for delete to authenticated
  using (public.is_active_admin());

-- =============================================================================
-- homepage_sections — order and visibility of the homepage's blocks
-- =============================================================================
create table if not exists public.homepage_sections (
  id          uuid primary key default gen_random_uuid(),
  -- Matches the component key the front end already renders, so this table
  -- reorders existing sections rather than describing new ones.
  section_key text not null unique,
  label       text not null,
  position    integer not null default 0,
  visible     boolean not null default true,
  settings    jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.homepage_sections enable row level security;

create policy homepage_public_read on public.homepage_sections
  for select to anon, authenticated
  using (visible = true);

create policy homepage_admin_read on public.homepage_sections
  for select to authenticated using (public.is_active_admin());
create policy homepage_admin_insert on public.homepage_sections
  for insert to authenticated with check (public.is_active_admin());
create policy homepage_admin_update on public.homepage_sections
  for update to authenticated
  using (public.is_active_admin()) with check (public.is_active_admin());
create policy homepage_admin_delete on public.homepage_sections
  for delete to authenticated using (public.is_active_admin());

-- =============================================================================
-- seo_settings — per-route title, description and share image
-- =============================================================================
create table if not exists public.seo_settings (
  id            uuid primary key default gen_random_uuid(),
  route         text not null unique,
  title         text,
  description   text,
  og_image_path text,
  -- Left null to inherit the generated canonical. A wrong canonical is worse
  -- than none, so this is opt-in per route rather than defaulted.
  canonical     text,
  noindex       boolean not null default false,
  published     boolean not null default false,
  draft         jsonb,
  updated_at    timestamptz not null default now()
);

alter table public.seo_settings enable row level security;

create policy seo_public_read on public.seo_settings
  for select to anon, authenticated using (published = true);
create policy seo_admin_read on public.seo_settings
  for select to authenticated using (public.is_active_admin());
create policy seo_admin_insert on public.seo_settings
  for insert to authenticated with check (public.is_active_admin());
create policy seo_admin_update on public.seo_settings
  for update to authenticated
  using (public.is_active_admin()) with check (public.is_active_admin());
create policy seo_admin_delete on public.seo_settings
  for delete to authenticated using (public.is_active_admin());

-- =============================================================================
-- media — the metadata Storage cannot hold
--
-- Storage keeps the bytes; this keeps what an editor needs: alt text, a
-- caption, and who uploaded it. It does NOT try to be an index of where each
-- file is used — the console checks that live against diamonds.image_path and
-- blogs.cover_path, which cannot drift the way a cached index would.
-- =============================================================================
create table if not exists public.media (
  id          uuid primary key default gen_random_uuid(),
  bucket      text not null,
  path        text not null,
  alt_text    text,
  caption     text,
  uploaded_by uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (bucket, path)
);

alter table public.media enable row level security;

-- Alt text is read by public pages, so the select is open; nothing sensitive
-- is on this table by design, and uploaded_by is a profile id, not a name.
create policy media_public_read on public.media
  for select to anon, authenticated using (true);
create policy media_admin_insert on public.media
  for insert to authenticated with check (public.is_active_admin());
create policy media_admin_update on public.media
  for update to authenticated
  using (public.is_active_admin()) with check (public.is_active_admin());
create policy media_admin_delete on public.media
  for delete to authenticated using (public.is_active_admin());

-- -----------------------------------------------------------------------------
-- updated_at, maintained by the database rather than by every caller.
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger site_content_touch before update on public.site_content
  for each row execute function public.touch_updated_at();
create trigger homepage_sections_touch before update on public.homepage_sections
  for each row execute function public.touch_updated_at();
create trigger seo_settings_touch before update on public.seo_settings
  for each row execute function public.touch_updated_at();

create index if not exists site_content_page_idx on public.site_content (page, position);
create index if not exists homepage_sections_position_idx on public.homepage_sections (position);

commit;

-- =============================================================================
-- ROLLBACK
--   drop trigger if exists seo_settings_touch on public.seo_settings;
--   drop trigger if exists homepage_sections_touch on public.homepage_sections;
--   drop trigger if exists site_content_touch on public.site_content;
--   drop table if exists public.media, public.seo_settings,
--                        public.homepage_sections, public.site_content;
--   drop function if exists public.touch_updated_at();
--   drop function if exists public.is_active_admin();
-- =============================================================================
