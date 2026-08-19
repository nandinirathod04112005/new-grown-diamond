-- Jewellery Edit + Status + Archive.
-- Apply after public.jewellery and public.profiles exist.

alter table public.jewellery
  add column if not exists archived_at timestamptz;

create index if not exists jewellery_archived_at_idx
  on public.jewellery (archived_at);

alter table public.jewellery enable row level security;

-- Authority is derived from the caller's protected profile, never browser data.
create or replace function public.is_active_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
     where id = auth.uid()
       and role = 'admin'
       and account_status = 'active'
  );
$$;

revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

-- Remove older UPDATE policies: PostgreSQL ORs permissive policies, so leaving
-- one in place could accidentally allow a customer to mutate jewellery.
do $$
declare policy_row record;
begin
  for policy_row in
    select policyname from pg_policies
     where schemaname = 'public' and tablename = 'jewellery' and cmd = 'UPDATE'
  loop
    execute format('drop policy %I on public.jewellery', policy_row.policyname);
  end loop;
end;
$$;

create policy "active admins update jewellery"
on public.jewellery
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

revoke update on public.jewellery from anon;
grant update on public.jewellery to authenticated;
