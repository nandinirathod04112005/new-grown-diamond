-- ============================================================
-- SITE CONTENT (CMS) — table + RLS
-- ============================================================
-- Run once in the Supabase SQL Editor (idempotent).
--
-- One row per editable website section, keyed by a stable slug the
-- frontend knows (assets/js/content-registry.js). Public pages read
-- ACTIVE rows and fall back to their built-in copy when a row is
-- missing or inactive — the site can never go blank because of this
-- table. Only active admins may write.
--
-- Requires public.is_active_admin() from supabase/admin-customers.sql.
-- ============================================================

create table if not exists public.site_content (
  key text primary key,
  heading text,
  subheading text,
  body text,
  cta_text text,
  cta_url text,
  cta2_text text,
  cta2_url text,
  image_url text,
  secondary_image_url text,
  display_order integer not null default 0,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint site_content_key_format check (key ~ '^[a-z0-9_]{3,60}$')
);

create or replace function public.set_site_content_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists site_content_set_updated_at on public.site_content;
create trigger site_content_set_updated_at
  before update on public.site_content
  for each row execute function public.set_site_content_updated_at();

alter table public.site_content enable row level security;

-- Public storefront reads ONLY active sections.
drop policy if exists "site content public reads active" on public.site_content;
create policy "site content public reads active"
  on public.site_content for select
  to anon, authenticated
  using (active = true);

-- Active admins read everything (including inactive drafts)…
drop policy if exists "site content admin reads all" on public.site_content;
create policy "site content admin reads all"
  on public.site_content for select
  to authenticated
  using (public.is_active_admin());

-- …and are the only ones who can write.
drop policy if exists "site content admin insert" on public.site_content;
create policy "site content admin insert"
  on public.site_content for insert
  to authenticated
  with check (public.is_active_admin());

drop policy if exists "site content admin update" on public.site_content;
create policy "site content admin update"
  on public.site_content for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

drop policy if exists "site content admin delete" on public.site_content;
create policy "site content admin delete"
  on public.site_content for delete
  to authenticated
  using (public.is_active_admin());

grant select on public.site_content to anon, authenticated;
revoke insert, update, delete on public.site_content from anon;
grant insert, update, delete on public.site_content to authenticated;

-- Optional check:
-- select key, active, display_order, updated_at from public.site_content
--  order by display_order, key;
