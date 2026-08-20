-- ============================================================
-- NEW GROWN DIAMOND — PUBLIC STOREFRONT READ POLICIES
-- ------------------------------------------------------------
-- Run in: Supabase Dashboard → SQL Editor (whole file, once).
--
-- Lets the public product pages (diamonds.html, diamond-details,
-- jewellery.html, jewellery-details) read products with the
-- publishable key: visitors and signed-in customers may see ONLY
-- rows that are active AND not archived — inactive and archived
-- products stay invisible at the DATABASE level, not just in the
-- UI. Admin visibility is unaffected: the existing active-admin
-- policies OR together with these.
--
-- This file only ADDS the scoped storefront policies (dropping
-- and re-creating its own names). It never removes the admin
-- policies and never disables RLS. The public pages themselves
-- request an explicit column list — internal_notes / created_by
-- are never selected by the storefront.
-- jewellery_images already carries a public read policy from
-- supabase/jewellery-images.sql.
-- ============================================================

alter table public.diamonds enable row level security;
alter table public.jewellery enable row level security;

-- Storefront read: only live merchandise, for everyone.
drop policy if exists "storefront reads active diamonds" on public.diamonds;
create policy "storefront reads active diamonds"
on public.diamonds
for select
to anon, authenticated
using (active = true and archived_at is null);

drop policy if exists "storefront reads active jewellery" on public.jewellery;
create policy "storefront reads active jewellery"
on public.jewellery
for select
to anon, authenticated
using (active = true and archived_at is null);

grant select on public.diamonds to anon, authenticated;
grant select on public.jewellery to anon, authenticated;

-- Writes remain admin-only through the existing policies — anon gets
-- no insert/update/delete anywhere.
revoke insert, update, delete on public.diamonds from anon;
revoke insert, update, delete on public.jewellery from anon;

-- Optional check — the storefront policies exist beside the admin ones:
-- select tablename, policyname, cmd from pg_policies
--  where tablename in ('diamonds', 'jewellery') order by tablename, cmd;
