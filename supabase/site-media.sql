-- ============================================================
-- SITE MEDIA LIBRARY — Storage bucket + policies
-- ============================================================
-- Run once in the Supabase SQL Editor (idempotent).
--
-- The admin Media Manager (admin/media.html) stores general website
-- imagery here — homepage art, manufacturing/education/about photos,
-- content images. Product photos are NOT kept here: diamond photos
-- live in the diamond-images bucket on the product record, and
-- jewellery galleries in jewellery-images + public.jewellery_images.
--
-- Categories are folder prefixes inside the bucket:
--   diamonds/ jewellery/ homepage/ manufacturing/ education/
--   about/ content/ general/
--
-- Requires public.is_active_admin() from supabase/admin-customers.sql.
-- ============================================================

-- 1. The Storage bucket (5 MB per file; browser-safe image types only,
--    including SVG for line art — the page enforces the same rules
--    client-side before uploading).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-media', 'site-media', true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Storage policies, scoped to this bucket only. Anyone may read
--    (the files are public website imagery); only active admins may
--    upload, replace or delete.
drop policy if exists "site media public read" on storage.objects;
create policy "site media public read"
  on storage.objects for select
  using (bucket_id = 'site-media');

drop policy if exists "site media admin insert" on storage.objects;
create policy "site media admin insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'site-media'
    and public.is_active_admin()
  );

drop policy if exists "site media admin update" on storage.objects;
create policy "site media admin update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'site-media'
    and public.is_active_admin()
  )
  with check (
    bucket_id = 'site-media'
    and public.is_active_admin()
  );

drop policy if exists "site media admin delete" on storage.objects;
create policy "site media admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'site-media'
    and public.is_active_admin()
  );

-- Customers and anonymous visitors match none of the write policies, so
-- they can only READ — uploads, changes and deletes from non-admin
-- accounts are rejected by Storage RLS regardless of any UI.

-- Optional check:
-- select id, public, file_size_limit, allowed_mime_types
--   from storage.buckets where id = 'site-media';
