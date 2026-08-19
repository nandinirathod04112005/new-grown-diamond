-- Admin Diamond Add + List.
-- The browser uses the authenticated user's JWT; RLS remains the authority.

alter table public.diamonds enable row level security;

-- Stock numbers identify inventory rows. Normalising whitespace and case in
-- the index prevents visually duplicate values such as TEST-001/test-001.
create unique index if not exists diamonds_stock_number_unique_ci
  on public.diamonds (lower(btrim(stock_number)));

-- This helper reads authority only from the protected profile belonging to
-- auth.uid(). It intentionally ignores editable user metadata.
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

-- INSERT policies are permissive (ORed), so remove older INSERT policies
-- before installing the one active-admin-only rule. This guarantees that a
-- customer cannot inherit insert access from an obsolete policy.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
      from pg_policies
     where schemaname = 'public'
       and tablename = 'diamonds'
       and cmd = 'INSERT'
  loop
    execute format('drop policy %I on public.diamonds', policy_row.policyname);
  end loop;
end;
$$;

create policy "active admins insert diamonds"
on public.diamonds
for insert
to authenticated
with check (
  public.is_active_admin()
  and created_by = auth.uid()
  and stock_number is not null
  and btrim(stock_number) <> ''
  and shape is not null
  and btrim(shape) <> ''
  and carat is not null
  and carat > 0
  and public_id ~ '^DIA-[A-Z2-9]{8}$'
);

-- This policy is additive so existing storefront/customer read policies are
-- preserved, while an active admin is always able to load the full inventory.
drop policy if exists "active admins list diamonds" on public.diamonds;
create policy "active admins list diamonds"
on public.diamonds
for select
to authenticated
using (public.is_active_admin());

revoke insert on public.diamonds from anon;
grant select, insert on public.diamonds to authenticated;
