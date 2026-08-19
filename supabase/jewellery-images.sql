-- ============================================================
-- NEW GROWN DIAMOND — JEWELLERY IMAGES (TABLE + STORAGE BUCKET)
-- ------------------------------------------------------------
-- Run in: Supabase Dashboard → SQL Editor (whole file, once).
--
-- Sets up multiple images per jewellery piece:
--
--   public.jewellery_images  — one row per photo
--     jewellery_id → public.jewellery(id), image_path (Storage
--     object path), sort_order (gallery order), is_primary
--     (exactly ONE per piece, enforced by a partial unique index)
--
--   `jewellery-images` bucket — 5 MB per file, image types only
--
-- Only an ACTIVE ADMIN (public.profiles.role = 'admin',
-- account_status = 'active') may upload, change or delete —
-- everyone may view, so the storefront can serve the photos from
-- the public URL built with ngdStorageUrl('jewellery-images', …).
-- The browser only ever uses the publishable key — these policies
-- are the enforcement. RLS stays ON everywhere.
-- Uploads are placed at:  jewellery/<public_id>/<random>.<ext>
-- ============================================================

-- 1. The table (kept if it already exists).
create table if not exists public.jewellery_images (
  id uuid primary key default gen_random_uuid(),
  jewellery_id uuid not null references public.jewellery (id) on delete cascade,
  image_path text not null,
  sort_order integer not null default 1,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists jewellery_images_jewellery_idx
  on public.jewellery_images (jewellery_id, sort_order);

-- Only ONE primary per piece — the database guarantees it, not the UI.
create unique index if not exists jewellery_images_one_primary
  on public.jewellery_images (jewellery_id)
  where is_primary;

-- 2. Row Level Security on the table. PostgreSQL ORs policies for the
--    same operation, so remove every existing policy first — an older
--    permissive policy must not be able to bypass the active-admin rule.
alter table public.jewellery_images enable row level security;

-- The caller's authority comes from the protected profiles row, never
-- from URL parameters or editable user metadata. Kept here so this file
-- can be applied independently of the other backend modules.
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

do $$
declare
  policy_row record;
begin
  for policy_row in
    select policyname
      from pg_policies
     where schemaname = 'public'
       and tablename = 'jewellery_images'
  loop
    execute format('drop policy %I on public.jewellery_images', policy_row.policyname);
  end loop;
end;
$$;

-- Everyone may read (the storefront shows the photos)…
create policy "jewellery images public read"
on public.jewellery_images
for select
using (true);

-- …but only an active admin may write.
create policy "active admins add jewellery images"
on public.jewellery_images
for insert
to authenticated
with check (public.is_active_admin());

create policy "active admins change jewellery images"
on public.jewellery_images
for update
to authenticated
using (public.is_active_admin())
with check (public.is_active_admin());

create policy "active admins delete jewellery images"
on public.jewellery_images
for delete
to authenticated
using (public.is_active_admin());

grant select on public.jewellery_images to anon, authenticated;
revoke insert, update, delete on public.jewellery_images from anon;
grant insert, update, delete on public.jewellery_images to authenticated;

-- 3. The Storage bucket (5 MB per file, image types only — the same
--    rules the form enforces client-side before uploading).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'jewellery-images', 'jewellery-images', true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 4. Storage policies, scoped to this bucket only.
drop policy if exists "jewellery images storage public read" on storage.objects;
create policy "jewellery images storage public read"
  on storage.objects for select
  using (bucket_id = 'jewellery-images');

drop policy if exists "jewellery images storage admin insert" on storage.objects;
create policy "jewellery images storage admin insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'jewellery-images'
    and public.is_active_admin()
  );

drop policy if exists "jewellery images storage admin update" on storage.objects;
create policy "jewellery images storage admin update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'jewellery-images'
    and public.is_active_admin()
  )
  with check (
    bucket_id = 'jewellery-images'
    and public.is_active_admin()
  );

drop policy if exists "jewellery images storage admin delete" on storage.objects;
create policy "jewellery images storage admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'jewellery-images'
    and public.is_active_admin()
  );

-- Customers and anonymous visitors match none of the write policies, so
-- they can only READ — uploads, changes and deletes from non-admin
-- accounts are rejected by RLS in both the table and Storage.

-- Optional checks:
-- select id, public, file_size_limit, allowed_mime_types
--   from storage.buckets where id = 'jewellery-images';
-- select policyname, cmd from pg_policies
--  where tablename = 'jewellery_images';
