-- Admin Jewellery edit/status/archive RLS policies.
-- Run in the Supabase SQL editor after the jewellery table and profiles table exist.
-- These policies never trust browser-supplied role data: authorization is resolved
-- from the authenticated user's public.profiles row for every statement.

alter table public.jewellery enable row level security;

drop policy if exists "ngd active admins can read jewellery" on public.jewellery;
create policy "ngd active admins can read jewellery"
on public.jewellery for select
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.account_status = 'active'
  )
);

drop policy if exists "ngd active admins can update jewellery" on public.jewellery;
create policy "ngd active admins can update jewellery"
on public.jewellery for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.account_status = 'active'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.account_status = 'active'
  )
);

-- Defense in depth: this restrictive policy is combined with every permissive
-- UPDATE policy already on the table, preventing a broad legacy policy from
-- accidentally granting mutation access to customers.
drop policy if exists "ngd jewellery updates require active admin" on public.jewellery;
create policy "ngd jewellery updates require active admin"
on public.jewellery as restrictive for update
to authenticated
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.account_status = 'active'
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'admin'
      and profiles.account_status = 'active'
  )
);
