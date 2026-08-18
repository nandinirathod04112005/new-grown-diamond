-- Customer hold requests. Run in the Supabase SQL editor after the inventory
-- and profiles tables have been created.
create extension if not exists pgcrypto;

create table if not exists public.holds (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique check (public_id ~ '^HLD-[A-Z0-9]{8}$'),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_type text not null check (product_type in ('diamond', 'jewellery')),
  diamond_id uuid references public.diamonds(id) on delete restrict,
  jewellery_id uuid references public.jewellery(id) on delete restrict,
  customer_message text,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'released', 'expired', 'rejected')),
  requested_at timestamptz not null default now(),
  expires_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint holds_one_product check (
    (product_type = 'diamond' and diamond_id is not null and jewellery_id is null)
    or
    (product_type = 'jewellery' and jewellery_id is not null and diamond_id is null)
  )
);

create index if not exists holds_user_requested_idx
  on public.holds (user_id, requested_at desc);
create index if not exists holds_status_requested_idx
  on public.holds (status, requested_at desc);

create or replace function public.set_holds_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists holds_set_updated_at on public.holds;
create trigger holds_set_updated_at before update on public.holds
for each row execute function public.set_holds_updated_at();

alter table public.holds enable row level security;

-- Role is always derived from the protected profile belonging to auth.uid().
create or replace function public.is_active_admin()
returns boolean language sql stable security definer
set search_path = public, pg_temp as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and account_status = 'active'
  );
$$;
revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

drop policy if exists "Customers create own pending holds" on public.holds;
create policy "Customers create own pending holds" on public.holds
for insert to authenticated
with check (
  user_id = auth.uid() and status = 'pending'
  and expires_at is null and admin_note is null
  and exists (select 1 from public.profiles where id = auth.uid()
              and role = 'customer' and account_status = 'active')
);

drop policy if exists "Customers read own holds" on public.holds;
create policy "Customers read own holds" on public.holds
for select to authenticated using (user_id = auth.uid());

drop policy if exists "Admins read all holds" on public.holds;
create policy "Admins read all holds" on public.holds
for select to authenticated using (public.is_active_admin());

drop policy if exists "Admins update all holds" on public.holds;
create policy "Admins update all holds" on public.holds
for update to authenticated using (public.is_active_admin())
with check (public.is_active_admin());

-- There is deliberately no customer UPDATE or DELETE policy. Consequently a
-- customer cannot alter status, expiry, admin notes, ownership, or product.
grant select, insert, update on public.holds to authenticated;
