-- Customer inspection requests. Run in the Supabase SQL editor after the
-- catalogue and profiles migrations.
create extension if not exists pgcrypto;

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_type text not null check (product_type in ('diamond', 'jewellery')),
  diamond_id uuid references public.diamonds(id) on delete restrict,
  jewellery_id uuid references public.jewellery(id) on delete restrict,
  inspection_type text not null check (inspection_type in ('In-Person', 'Video Inspection', 'Detailed Quality Review')),
  preferred_date date,
  customer_message text,
  status text not null default 'requested' check (status in ('requested', 'scheduled', 'completed', 'cancelled', 'rejected')),
  scheduled_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspections_one_product check (
    (product_type = 'diamond' and diamond_id is not null and jewellery_id is null) or
    (product_type = 'jewellery' and jewellery_id is not null and diamond_id is null)
  )
);

create index if not exists inspections_user_created_idx on public.inspections (user_id, created_at desc);
create index if not exists inspections_status_idx on public.inspections (status);

create or replace function public.set_inspection_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists inspections_set_updated_at on public.inspections;
create trigger inspections_set_updated_at before update on public.inspections
for each row execute function public.set_inspection_updated_at();

alter table public.inspections enable row level security;

-- Role is server-owned profile data; it is never accepted from browser input.
create or replace function public.is_active_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
      and coalesce(account_status, 'active') = 'active'
  );
$$;
revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

drop policy if exists "customers insert own inspections" on public.inspections;
create policy "customers insert own inspections" on public.inspections
for insert to authenticated
with check (
  user_id = auth.uid()
  and status = 'requested'
  and scheduled_at is null
  and admin_note is null
  and not public.is_active_admin()
);

drop policy if exists "customers read own inspections" on public.inspections;
create policy "customers read own inspections" on public.inspections
for select to authenticated using (user_id = auth.uid());

-- There is deliberately no customer UPDATE policy: protected workflow fields
-- (and all other request fields after submission) cannot be changed by customers.
drop policy if exists "admins read all inspections" on public.inspections;
create policy "admins read all inspections" on public.inspections
for select to authenticated using (public.is_active_admin());

drop policy if exists "admins update inspections" on public.inspections;
create policy "admins update inspections" on public.inspections
for update to authenticated using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists "admins delete inspections" on public.inspections;
create policy "admins delete inspections" on public.inspections
for delete to authenticated using (public.is_active_admin());

grant select, insert, update, delete on public.inspections to authenticated;
