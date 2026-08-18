-- Admin Diamond: edit, status, featured and soft archive.
-- Run once in the Supabase SQL Editor. RLS remains enabled.

alter table public.diamonds
  add column if not exists archived_at timestamptz;

alter table public.diamonds enable row level security;

-- SECURITY DEFINER prevents profile-table RLS from making the authorization
-- check depend on a client-visible profile policy. The caller identity still
-- comes only from the signed Supabase JWT.
create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
      and lower(account_status::text) = 'active'
  );
$$;

revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

-- Permissive policies are ORed by PostgreSQL. Remove every earlier UPDATE
-- policy so a legacy customer policy cannot bypass the active-admin rule.
do $$
declare policy_name text;
begin
  for policy_name in
    select policyname from pg_policies
    where schemaname = 'public'
      and tablename = 'diamonds'
      and cmd = 'UPDATE'
  loop
    execute format('drop policy %I on public.diamonds', policy_name);
  end loop;
end $$;

create policy "active admins update diamonds"
on public.diamonds
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

-- Reject invalid values at the database boundary as well as in the browser.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.diamonds'::regclass
      and conname = 'diamonds_carat_positive'
  ) then
    alter table public.diamonds
      add constraint diamonds_carat_positive check (carat > 0) not valid;
  end if;
end $$;

create unique index if not exists diamonds_stock_number_unique
  on public.diamonds (stock_number);
