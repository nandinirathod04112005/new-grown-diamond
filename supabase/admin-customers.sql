-- Secure customer administration. Run in the Supabase SQL editor.
-- This script deliberately grants no direct profile UPDATE privilege to the browser.
alter table public.profiles enable row level security;

-- PostgreSQL combines permissive policies with OR. Remove every existing
-- browser SELECT/UPDATE policy first so a legacy, differently-named policy
-- cannot continue to expose all profiles or permit role/status changes.
do $policy_cleanup$
declare
  profile_policy record;
begin
  for profile_policy in
    select policyname
      from pg_policies
     where schemaname = 'public'
       and tablename = 'profiles'
       and cmd in ('SELECT', 'UPDATE', 'ALL')
  loop
    execute format('drop policy %I on public.profiles', profile_policy.policyname);
  end loop;
end
$policy_cleanup$;

create policy "customers read own profile"
on public.profiles for select to authenticated
using (id = auth.uid());

create or replace function public.is_active_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and account_status = 'active'
  );
$$;
revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

create policy "active admins read customer profiles"
on public.profiles for select to authenticated
using (role = 'customer' and public.is_active_admin());

-- Customers receive no direct UPDATE privilege or policy. Profile edits must
-- use narrowly-scoped RPCs rather than permitting role/status writes.
revoke update on public.profiles from authenticated;
grant select on public.profiles to authenticated;

-- Drop the earlier signature explicitly because PostgreSQL cannot change a
-- function's return type with CREATE OR REPLACE. This also keeps reruns safe.
drop function if exists public.admin_set_customer_status(uuid, text);
create function public.admin_set_customer_status(
  target_user_id uuid,
  new_status text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed_status text;
begin
  if auth.uid() is null or not public.is_active_admin() then
    raise exception 'Only an authenticated active admin may change customer status'
      using errcode = '42501';
  end if;
  if new_status is null or new_status not in ('active', 'inactive', 'suspended') then
    raise exception 'Invalid customer account status' using errcode = '22023';
  end if;

  update public.profiles
     set account_status = new_status
   where id = target_user_id
     and role = 'customer'
  returning account_status into changed_status;

  if changed_status is null then
    raise exception 'Customer profile not found' using errcode = 'P0002';
  end if;
  return changed_status;
end;
$$;
revoke all on function public.admin_set_customer_status(uuid, text) from public;
grant execute on function public.admin_set_customer_status(uuid, text) to authenticated;
