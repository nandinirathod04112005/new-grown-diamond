-- Customer inspection requests. Run in the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.inspections (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_type text not null check (product_type in ('diamond', 'jewellery')),
  diamond_id uuid references public.diamonds(id) on delete restrict,
  jewellery_id uuid references public.jewellery(id) on delete restrict,
  inspection_type text not null default 'in_person'
    check (inspection_type in ('in_person', 'video_call', 'third_party_lab')),
  preferred_date date,
  customer_message text,
  status text not null default 'pending'
    check (status in ('pending', 'scheduled', 'completed', 'cancelled', 'rejected')),
  scheduled_at timestamptz,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint inspections_one_product check (
    (product_type = 'diamond' and diamond_id is not null and jewellery_id is null) or
    (product_type = 'jewellery' and jewellery_id is not null and diamond_id is null)
  ),
  constraint inspections_public_id_format check (public_id ~ '^INS-[A-Z0-9]{8}$')
);

create index if not exists inspections_user_created_idx on public.inspections(user_id, created_at desc);
create index if not exists inspections_status_idx on public.inspections(status);

create or replace function public.set_inspections_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists inspections_set_updated_at on public.inspections;
create trigger inspections_set_updated_at before update on public.inspections
for each row execute function public.set_inspections_updated_at();

alter table public.inspections enable row level security;

-- Role is always derived from the protected profile, never request input.
create or replace function public.is_active_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and account_status = 'active'
  );
$$;
revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

drop policy if exists "customer creates own safe inspection" on public.inspections;
create policy "customer creates own safe inspection" on public.inspections for insert to authenticated
with check (
  user_id = auth.uid() and status = 'pending' and scheduled_at is null and admin_note is null
);

drop policy if exists "customer reads own inspections" on public.inspections;
create policy "customer reads own inspections" on public.inspections for select to authenticated
using (user_id = auth.uid());

drop policy if exists "admin reads all inspections" on public.inspections;
create policy "admin reads all inspections" on public.inspections for select to authenticated
using (public.is_active_admin());

drop policy if exists "admin updates all inspections" on public.inspections;
create policy "admin updates all inspections" on public.inspections for update to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists "admin deletes all inspections" on public.inspections;
create policy "admin deletes all inspections" on public.inspections for delete to authenticated
using (public.is_active_admin());

-- Customers receive no UPDATE policy, so status, scheduling and admin notes
-- cannot be changed from the browser. The admin policy is the sole update path.
grant select, insert, update, delete on public.inspections to authenticated;
