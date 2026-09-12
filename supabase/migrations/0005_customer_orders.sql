-- =============================================================================
-- Customer orders: what a customer has bought, so the dashboard can show it.
--
-- STATUS: NOT APPLIED. Written for review.
--
-- WHY. The customer dashboard (src/pages/account/AccountDashboard.jsx) has a
-- Purchases panel and "Diamonds bought" / "Total spent" figures. There is no
-- table on the project that records a sale — only enquiries, quotes, holds and
-- inspections — so today those figures read "—" with "not recorded online".
-- The dashboard already queries `orders` with its `order_items`; applying this
-- file is all it takes for real purchases to appear, with no code change.
--
-- WHO WRITES ORDERS. The desk, never the customer. Customers get SELECT on
-- their own rows and nothing else: no insert, no update, no delete. An order
-- is a record of a sale the business confirmed, and nothing a browser sends
-- should be able to create or alter one. Admins (public.is_active_admin(), the
-- same helper 0001 uses) can do everything.
--
-- HOW ORDERS GET IN. There is no admin screen for orders yet. Until there is,
-- add them in Dashboard > Table Editor > orders, then order_items. See the
-- example at the bottom.
--
-- CHECK FIRST:
--   * public.is_active_admin() must exist (created by 0001). Verify:
--       select proname from pg_proc where proname = 'is_active_admin';
--   * public.jewellery.id is assumed to be uuid, like public.diamonds.id
--     (diamonds.id was confirmed uuid; no jewellery row is public to check).
--     If it is not, the whole file fails inside its transaction and nothing
--     is created. Change jewellery_id's type to match and re-run.
-- =============================================================================

begin;

create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  -- The reference the customer sees: ORD- plus eight characters.
  public_id    text not null unique
               default ('ORD-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  user_id      uuid not null references auth.users (id) on delete restrict,
  status       text not null default 'confirmed'
               check (status in ('confirmed', 'invoiced', 'paid', 'shipped', 'delivered', 'cancelled')),
  -- Rupees unless the desk says otherwise. Amounts are never converted.
  currency     text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  total_amount numeric(14, 2) not null default 0 check (total_amount >= 0),
  -- Visible to the customer. Anything internal belongs somewhere else.
  customer_note text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.orders is
  'Confirmed sales. Written by the desk (admins); customers may only read their own.';

create table if not exists public.order_items (
  id           bigint generated always as identity primary key,
  order_id     uuid not null references public.orders (id) on delete cascade,
  diamond_id   uuid references public.diamonds (id) on delete set null,
  jewellery_id uuid references public.jewellery (id) on delete set null,
  -- What the customer bought, in words, so the line survives the stone being
  -- archived or deleted later.
  description  text not null,
  carat        numeric(8, 2),
  unit_price   numeric(14, 2) not null check (unit_price >= 0),
  quantity     integer not null default 1 check (quantity > 0)
);

create index if not exists orders_user_id_idx on public.orders (user_id, created_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- Anonymous visitors have no business with orders at all.
revoke all on public.orders from anon;
revoke all on public.order_items from anon;

-- ---- customers: read their own, nothing else --------------------------------
drop policy if exists orders_customer_read on public.orders;
create policy orders_customer_read on public.orders
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists order_items_customer_read on public.order_items;
create policy order_items_customer_read on public.order_items
  for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id and o.user_id = auth.uid()
  ));

-- ---- the desk: everything ----------------------------------------------------
drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders
  for all to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

drop policy if exists order_items_admin_all on public.order_items;
create policy order_items_admin_all on public.order_items
  for all to authenticated
  using (public.is_active_admin())
  with check (public.is_active_admin());

commit;

-- =============================================================================
-- VERIFY after applying, signed in as a customer (browser console on the site):
--   await supabase.from('orders').select('public_id, order_items(description)')
-- A customer sees only their own orders; an insert from the same console must
-- fail with a row-level security error.
--
-- EXAMPLE, as an admin in the SQL editor (replace the ids):
--   with o as (
--     insert into public.orders (user_id, status, currency, total_amount)
--     values ('<customer auth uid>', 'paid', 'INR', 125000)
--     returning id
--   )
--   insert into public.order_items (order_id, diamond_id, description, carat, unit_price)
--   select o.id, '<diamond uuid>', 'HJH-777 · 0.23 ct Round · D FL', 0.23, 125000 from o;
--
-- ROLLBACK
--   drop table if exists public.order_items;
--   drop table if exists public.orders;
-- =============================================================================
