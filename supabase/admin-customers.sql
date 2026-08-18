-- Secure customer administration. Run in the Supabase SQL editor.
-- This script deliberately grants no direct profile UPDATE privilege to the browser.
alter table public.profiles enable row level security;

drop policy if exists "customers read own profile" on public.profiles;
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

drop policy if exists "active admins read customer profiles" on public.profiles;
create policy "active admins read customer profiles"
on public.profiles for select to authenticated
using (role = 'customer' and public.is_active_admin());

-- Existing own-profile SELECT policies remain in place, so customers can read
-- themselves. Remove known unsafe UPDATE policies; profile edits should use a
-- separate column-limited RPC rather than permitting role/status writes.
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "users update own profile" on public.profiles;
drop policy if exists "Customers can update own profile" on public.profiles;
drop policy if exists "customers update own profile" on public.profiles;
revoke update on public.profiles from authenticated;

create or replace function public.admin_set_customer_status(
  target_user_id uuid,
  new_status text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  changed public.profiles;
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
  returning * into changed;

  if changed.id is null then
    raise exception 'Customer profile not found' using errcode = 'P0002';
  end if;
  return changed;
end;
$$;
revoke all on function public.admin_set_customer_status(uuid, text) from public;
grant execute on function public.admin_set_customer_status(uuid, text) to authenticated;
