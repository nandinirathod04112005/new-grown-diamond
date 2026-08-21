-- ============================================================
-- SITE SETTINGS — table + RLS
-- ============================================================
-- Run once in the Supabase SQL Editor (idempotent).
--
-- Global website/company configuration as key → value rows with
-- STABLE keys the frontend knows (assets/js/settings-registry.js)
-- — never generated row ids. Public pages read only the keys the
-- storefront needs; keys listed in the public-read policy's
-- exclusion below (currently the contact-form recipient inbox)
-- stay admin-only, enforced by the database. Only active admins
-- may write.
--
-- SECRETS NEVER LIVE HERE: no service_role key, database
-- password, admin signup code, SMTP passwords or private API
-- keys — those belong in Supabase secrets / dashboard config,
-- not in a table the browser can query.
--
-- A missing row, an empty table or an unreachable Supabase leaves
-- every public page on its built-in design — settings can only
-- refine the site, never blank it.
--
-- Requires public.is_active_admin() from supabase/admin-customers.sql.
-- ============================================================

create table if not exists public.site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now(),
  constraint site_settings_key_format check (key ~ '^[a-z0-9_]{3,60}$'),
  constraint site_settings_value_length check (value is null or char_length(value) <= 2000)
);

create or replace function public.set_site_settings_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists site_settings_set_updated_at on public.site_settings;
create trigger site_settings_set_updated_at
  before update on public.site_settings
  for each row execute function public.set_site_settings_updated_at();

alter table public.site_settings enable row level security;

-- The storefront reads everything EXCEPT admin-only keys.
-- Add future private keys to this list before storing them.
drop policy if exists "site settings public reads" on public.site_settings;
create policy "site settings public reads"
  on public.site_settings for select
  to anon, authenticated
  using (key not in ('contact_form_recipient'));

-- Active admins read everything (including admin-only keys)…
drop policy if exists "site settings admin reads all" on public.site_settings;
create policy "site settings admin reads all"
  on public.site_settings for select
  to authenticated
  using (public.is_active_admin());

-- …and are the only ones who can write.
drop policy if exists "site settings admin insert" on public.site_settings;
create policy "site settings admin insert"
  on public.site_settings for insert
  to authenticated
  with check (public.is_active_admin());

drop policy if exists "site settings admin update" on public.site_settings;
create policy "site settings admin update"
  on public.site_settings for update
  to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

drop policy if exists "site settings admin delete" on public.site_settings;
create policy "site settings admin delete"
  on public.site_settings for delete
  to authenticated
  using (public.is_active_admin());

grant select on public.site_settings to anon, authenticated;
revoke insert, update, delete on public.site_settings from anon;
grant insert, update, delete on public.site_settings to authenticated;

-- Optional check:
-- select key, value, updated_at from public.site_settings order by key;
