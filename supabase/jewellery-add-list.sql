-- Admin Jewellery — Add + List.
-- Apply this file in the Supabase SQL editor after public.jewellery exists.
-- It keeps RLS enabled and makes jewellery creation an active-admin-only action.

alter table public.jewellery enable row level security;

-- Duplicate SKUs must also be rejected at the database boundary.  Normalising
-- whitespace and case prevents variants such as "test-jew-001" from bypassing
-- the browser's friendly duplicate check.
create unique index if not exists jewellery_sku_unique_ci
  on public.jewellery (lower(btrim(sku)));

-- Reuse the protected profile-backed helper when the Diamonds setup has
-- already installed it; CREATE OR REPLACE also makes this script standalone.
create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.profiles
     where id = auth.uid()
       and role = 'admin'
       and account_status = 'active'
  );
$$;

revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

-- Policies are permissive (OR-ed), so leaving an older INSERT policy in place
-- could let a customer bypass the new rule. Replace every jewellery INSERT
-- policy with the one intended policy.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
      from pg_policies
     where schemaname = 'public'
       and tablename = 'jewellery'
       and cmd = 'INSERT'
  loop
    execute format('drop policy %I on public.jewellery', policy_row.policyname);
  end loop;
end;
$$;

create policy "active admins create jewellery"
on public.jewellery
for insert
to authenticated
with check (
  public.is_active_admin()
  and created_by = auth.uid()
);

-- The inventory page is guarded in JavaScript. This policy provides the read
-- needed by an active admin without removing any pre-existing storefront read
-- policy (public/customer jewellery reads are outside this change's scope).
drop policy if exists "active admins read jewellery inventory" on public.jewellery;
create policy "active admins read jewellery inventory"
on public.jewellery
for select
to authenticated
using (public.is_active_admin());

revoke insert on public.jewellery from anon;
grant select, insert on public.jewellery to authenticated;
