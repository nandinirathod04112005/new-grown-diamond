-- ============================================================
-- ARCHIVED DIAMOND MANAGEMENT — restore + guarded hard delete
-- ============================================================
-- Run once in the Supabase SQL Editor (idempotent).
--
-- The admin console gains an Archived Diamonds view with Restore
-- and Permanently Delete. Restore is a plain UPDATE (covered by
-- the existing "active admins update diamonds" policy). This file
-- adds ONLY what the audit proved missing for a SAFE hard delete:
--
-- 1) A DELETE policy + grant on public.diamonds (none existed —
--    every earlier flow was soft-archive only).
-- 2) An active-admin READ policy on public.favourites, so the
--    console's reference check can SEE that customers still
--    favourite a stone (favourites were self-read-only before,
--    which would have made the check silently blind).
-- 3) FK hardening, so the DATABASE also refuses to destroy or
--    orphan history no matter what a client does:
--      · favourites.diamond_id was ON DELETE CASCADE — a hard
--        delete would have silently destroyed customer
--        favourites. Now RESTRICT.
--      · enquiries.diamond_id was ON DELETE SET NULL — a hard
--        delete would have detached enquiry history from its
--        product. Now RESTRICT.
--    quotes / holds / inspections were already RESTRICT.
--
-- Net effect: a referenced diamond CANNOT be hard-deleted (the
-- app checks first and shows honest copy; the FKs are the
-- backstop). An unreferenced ARCHIVED diamond can be removed by
-- an active admin after confirmation. Nothing here changes the
-- stock_number UNIQUE constraint — one stock number remains one
-- diamond record; restoring is the intended path.
--
-- Requires public.is_active_admin() (supabase/admin-customers.sql
-- or supabase/diamond-edit-status-archive.sql).
-- ============================================================

-- 1 · hard delete is admin-only (and new: it now exists at all) --------
drop policy if exists "active admins delete diamonds" on public.diamonds;
create policy "active admins delete diamonds"
on public.diamonds
for delete
to authenticated
using (public.is_active_admin());

revoke delete on public.diamonds from anon;
grant delete on public.diamonds to authenticated;

-- 2 · admins may READ favourites (reference check only — no writes) ----
drop policy if exists "active admins read favourites" on public.favourites;
create policy "active admins read favourites"
on public.favourites
for select
to authenticated
using (public.is_active_admin());

-- 3 · history FKs must BLOCK a hard delete, never cascade or detach ----
do $$
declare
  con record;
begin
  select c.conname, c.confdeltype
    into con
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
   where c.conrelid = 'public.favourites'::regclass
     and c.contype = 'f'
     and c.confrelid = 'public.diamonds'::regclass
     and a.attname = 'diamond_id'
   limit 1;
  if con.conname is not null and con.confdeltype <> 'r' then
    execute format('alter table public.favourites drop constraint %I', con.conname);
  end if;
  if not exists (
    select 1
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.conrelid = 'public.favourites'::regclass
       and c.contype = 'f'
       and c.confrelid = 'public.diamonds'::regclass
       and a.attname = 'diamond_id'
  ) then
    alter table public.favourites
      add constraint favourites_diamond_id_fkey
      foreign key (diamond_id) references public.diamonds(id) on delete restrict;
  end if;
end $$;

do $$
declare
  con record;
begin
  select c.conname, c.confdeltype
    into con
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
   where c.conrelid = 'public.enquiries'::regclass
     and c.contype = 'f'
     and c.confrelid = 'public.diamonds'::regclass
     and a.attname = 'diamond_id'
   limit 1;
  if con.conname is not null and con.confdeltype <> 'r' then
    execute format('alter table public.enquiries drop constraint %I', con.conname);
  end if;
  if not exists (
    select 1
      from pg_constraint c
      join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
     where c.conrelid = 'public.enquiries'::regclass
       and c.contype = 'f'
       and c.confrelid = 'public.diamonds'::regclass
       and a.attname = 'diamond_id'
  ) then
    alter table public.enquiries
      add constraint enquiries_diamond_id_fkey
      foreign key (diamond_id) references public.diamonds(id) on delete restrict;
  end if;
end $$;

-- Optional check:
-- select polname, polcmd from pg_policies
--  where schemaname = 'public' and tablename = 'diamonds';
-- select conname, confdeltype from pg_constraint
--  where confrelid = 'public.diamonds'::regclass and contype = 'f';
