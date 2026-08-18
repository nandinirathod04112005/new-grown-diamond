-- Customer favourites. Run in the Supabase SQL editor after the product tables exist.
create table if not exists public.favourites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  product_type text not null check (product_type in ('diamond', 'jewellery')),
  diamond_id uuid references public.diamonds(id) on delete cascade,
  jewellery_id uuid references public.jewellery(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint favourites_product_matches_type check (
    (product_type = 'diamond' and diamond_id is not null and jewellery_id is null) or
    (product_type = 'jewellery' and jewellery_id is not null and diamond_id is null)
  )
);

create unique index if not exists favourites_user_diamond_unique
  on public.favourites (user_id, diamond_id) where diamond_id is not null;
create unique index if not exists favourites_user_jewellery_unique
  on public.favourites (user_id, jewellery_id) where jewellery_id is not null;
create index if not exists favourites_user_created_idx
  on public.favourites (user_id, created_at desc);

alter table public.favourites enable row level security;

drop policy if exists "Customers read own favourites" on public.favourites;
create policy "Customers read own favourites" on public.favourites
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "Customers add own favourites" on public.favourites;
create policy "Customers add own favourites" on public.favourites
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "Customers remove own favourites" on public.favourites;
create policy "Customers remove own favourites" on public.favourites
  for delete to authenticated using ((select auth.uid()) = user_id);
