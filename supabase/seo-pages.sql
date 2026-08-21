-- ============================================================
-- SEO PAGES — table + RLS
-- ============================================================
-- Run once in the Supabase SQL Editor (idempotent).
--
-- One row per managed public page, keyed by a stable slug the
-- frontend knows (assets/js/seo-registry.js). Public pages read
-- ACTIVE rows and fall back to the SEO tags built into their own
-- HTML when a row is missing or inactive — a page can never lose
-- its SEO because of this table. Only active admins may write.
--
-- Structured data (Organization / WebSite / Breadcrumb / Product
-- JSON-LD) is generated in the browser from these values and from
-- public product columns — no raw schema code is ever stored, so
-- nothing executable can enter this table.
--
-- Requires public.is_active_admin() from supabase/admin-customers.sql.
-- ============================================================

create table if not exists public.seo_pages (
  key text primary key,
  page_name text,
  title text,
  meta_description text,
  meta_keywords text,
  canonical_url text,
  robots_index boolean not null default true,
  robots_follow boolean not null default true,
  og_title text,
  og_description text,
  og_image_url text,
  twitter_title text,
  twitter_description text,
  twitter_image_url text,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint seo_pages_key_format check (key ~ '^[a-z0-9_]{3,60}$'),
  constraint seo_pages_title_length check (title is null or char_length(title) <= 200),
  constraint seo_pages_description_length check (meta_description is null or char_length(meta_description) <= 500),
  constraint seo_pages_keywords_length check (meta_keywords is null or char_length(meta_keywords) <= 500),
  -- a canonical is either absent or a real absolute web address
  constraint seo_pages_canonical_shape check (canonical_url is null or canonical_url ~* '^https?://')
);

create or replace function public.set_seo_pages_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists seo_pages_set_updated_at on public.seo_pages;
create trigger seo_pages_set_updated_at
  before update on public.seo_pages
  for each row execute function public.set_seo_pages_updated_at();

alter table public.seo_pages enable row level security;

-- Public storefront reads ONLY active records.
drop policy if exists "seo pages public reads active" on public.seo_pages;
create policy "seo pages public reads active"
  on public.seo_pages for select
  to anon, authenticated
  using (active = true);

-- Active admins read everything (including inactive drafts)…
drop policy if exists "seo pages admin reads all" on public.seo_pages;
create policy "seo pages admin reads all"
  on public.seo_pages for select
  to authenticated
  using (public.is_active_admin());

-- …and are the only ones who can write.
drop policy if exists "seo pages admin insert" on public.seo_pages;
create policy "seo pages admin insert"
  on public.seo_pages for insert
  to authenticated
  with check (public.is_active_admin());

drop policy if exists "seo pages admin update" on public.seo_pages;
create policy "seo pages admin update"
  on public.seo_pages for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

drop policy if exists "seo pages admin delete" on public.seo_pages;
create policy "seo pages admin delete"
  on public.seo_pages for delete
  to authenticated
  using (public.is_active_admin());

grant select on public.seo_pages to anon, authenticated;
revoke insert, update, delete on public.seo_pages from anon;
grant insert, update, delete on public.seo_pages to authenticated;

-- Optional check:
-- select key, active, robots_index, robots_follow, updated_at
--   from public.seo_pages order by key;
