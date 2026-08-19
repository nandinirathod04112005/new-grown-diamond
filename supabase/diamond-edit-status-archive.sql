-- Diamond Edit + Status + Archive (Backend Step 5).
-- Run this file in the Supabase SQL editor after the diamonds table exists.
-- It adds soft-archive support and makes the browser update path admin-only.

alter table public.diamonds
  add column if not exists archived_at timestamptz;

create index if not exists diamonds_archived_at_idx
  on public.diamonds (archived_at);

alter table public.diamonds enable row level security;

-- The caller's authority comes from the protected profiles row, never from
-- URL parameters or editable user metadata. Keeping this helper here makes
-- this setup file safe to apply independently of the other backend modules.
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

-- PostgreSQL combines policies for the same operation with OR. Remove every
-- existing UPDATE policy so an older permissive customer policy cannot bypass
-- the active-admin rule, then install the single intended update policy.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
      from pg_policies
     where schemaname = 'public'
       and tablename = 'diamonds'
       and cmd = 'UPDATE'
  loop
    execute format('drop policy %I on public.diamonds', policy_row.policyname);
  end loop;
end;
$$;

create policy "active admins update diamonds"
on public.diamonds
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

revoke update on public.diamonds from anon;
grant update on public.diamonds to authenticated;

