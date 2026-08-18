-- Customer quote requests. Run in the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  product_type text not null check (product_type in ('diamond', 'jewellery')),
  diamond_id uuid references public.diamonds(id) on delete restrict,
  jewellery_id uuid references public.jewellery(id) on delete restrict,
  customer_message text,
  status text not null default 'pending'
    check (status in ('pending', 'reviewed', 'responded', 'closed')),
  admin_note text,
  quoted_price numeric check (quoted_price is null or quoted_price >= 0),
  currency text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quotes_one_product check (
    (product_type = 'diamond' and diamond_id is not null and jewellery_id is null) or
    (product_type = 'jewellery' and jewellery_id is not null and diamond_id is null)
  ),
  constraint quotes_public_id_format check (public_id ~ '^QTE-[A-Z0-9]{8}$')
);

create index if not exists quotes_user_created_idx on public.quotes(user_id, created_at desc);
create index if not exists quotes_status_idx on public.quotes(status);

create or replace function public.set_quotes_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists quotes_set_updated_at on public.quotes;
create trigger quotes_set_updated_at before update on public.quotes
for each row execute function public.set_quotes_updated_at();

alter table public.quotes enable row level security;

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

drop policy if exists "customer creates own safe quote" on public.quotes;
create policy "customer creates own safe quote" on public.quotes for insert to authenticated
with check (
  user_id = auth.uid() and status = 'pending' and admin_note is null and
  quoted_price is null and currency is null
);

drop policy if exists "admin creates quotes" on public.quotes;
create policy "admin creates quotes" on public.quotes for insert to authenticated
with check (public.is_active_admin());

drop policy if exists "customer reads own quotes" on public.quotes;
create policy "customer reads own quotes" on public.quotes for select to authenticated
using (user_id = auth.uid());

drop policy if exists "admin reads all quotes" on public.quotes;
create policy "admin reads all quotes" on public.quotes for select to authenticated
using (public.is_active_admin());

drop policy if exists "admin updates all quotes" on public.quotes;
create policy "admin updates all quotes" on public.quotes for update to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists "admin deletes all quotes" on public.quotes;
create policy "admin deletes all quotes" on public.quotes for delete to authenticated
using (public.is_active_admin());

grant select, insert, update, delete on public.quotes to authenticated;
