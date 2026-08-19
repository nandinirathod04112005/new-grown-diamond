-- ============================================================
-- NEW GROWN DIAMOND — DIAMOND IMAGES STORAGE BUCKET + POLICIES
-- ------------------------------------------------------------
-- Run in: Supabase Dashboard → SQL Editor (whole file, once).
--
-- Creates/updates the `diamond-images` bucket the Add/Edit
-- Diamond pages upload to, and the Storage RLS policies:
--
--   - ONLY an active admin (public.profiles.role = 'admin',
--     account_status = 'active') may upload, replace or delete
--   - everyone may view (the bucket is public, so product
--     images are served from the public URL the site builds
--     with ngdStorageUrl('diamond-images', image_path))
--
-- The browser only ever uses the publishable key — these
-- policies are the enforcement. Storage RLS stays ON.
-- Uploads are placed at:  diamonds/<public_id>/<random>.<ext>
-- and the object path is saved into public.diamonds.image_path.
-- ============================================================

-- 1. The bucket (5 MB per file, image types only — the same rules
--    the form enforces client-side before uploading)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'diamond-images', 'diamond-images', true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- 2. Helper condition used by every write policy: the signed-in
--    user must be an ACTIVE ADMIN. (Inline in each policy below.)

-- 3. Policies on storage.objects, scoped to this bucket only.
drop policy if exists "diamond images public read" on storage.objects;
create policy "diamond images public read"
  on storage.objects for select
  using (bucket_id = 'diamond-images');

drop policy if exists "diamond images admin insert" on storage.objects;
create policy "diamond images admin insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'diamond-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.account_status = 'active'
    )
  );

drop policy if exists "diamond images admin update" on storage.objects;
create policy "diamond images admin update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'diamond-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.account_status = 'active'
    )
  )
  with check (
    bucket_id = 'diamond-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.account_status = 'active'
    )
  );

drop policy if exists "diamond images admin delete" on storage.objects;
create policy "diamond images admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'diamond-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'admin'
        and p.account_status = 'active'
    )
  );

-- Customers and anonymous visitors match none of the write policies
-- above, so they can only READ — uploads, replacements and deletes
-- from non-admin accounts are rejected by Storage RLS.

-- Optional check — see the bucket and its policies:
-- select id, public, file_size_limit, allowed_mime_types
--   from storage.buckets where id = 'diamond-images';
-- select policyname, cmd from pg_policies
--  where tablename = 'objects' and policyname like 'diamond images%';
