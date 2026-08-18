-- New Grown Diamond: Admin Diamond Add + List security
-- Run this file in the Supabase SQL Editor for the existing project.
-- It keeps Row Level Security enabled and does not grant diamond writes to customers.

alter table public.diamonds enable row level security;

-- Admin Inventory needs a read policy. Existing storefront SELECT policies can
-- continue to coexist with this policy.
drop policy if exists "active admins can list diamonds" on public.diamonds;
create policy "active admins can list diamonds"
on public.diamonds
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.account_status = 'active'
  )
);

-- RESTRICTIVE is intentional: even if another permissive INSERT policy exists,
-- every authenticated insert must still satisfy this active-admin check.
drop policy if exists "only active admins can insert diamonds" on public.diamonds;
create policy "only active admins can insert diamonds"
on public.diamonds
as restrictive
for insert
to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.account_status = 'active'
  )
);

