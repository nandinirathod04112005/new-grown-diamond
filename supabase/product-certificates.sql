-- ============================================================
-- PRODUCT CERTIFICATES — jewellery columns + storage bucket
-- ============================================================
-- Run once in the Supabase SQL Editor (idempotent).
--
-- 1) public.jewellery gains the two certificate fields diamonds
--    already have equivalents of: certificate_lab and
--    certificate_url (certificate_number already exists).
--    Existing rows stay valid — both columns are nullable and
--    nothing is rewritten.
-- 2) A public product-certificates storage bucket for uploaded
--    grading certificates (PDF/JPEG/PNG/WEBP, 10 MB): public
--    read, writes for ACTIVE ADMINS only. Files are stored under
--    diamonds/<public_id>/<random>.<ext> and
--    jewellery/<public_id>/<random>.<ext> — the admin console
--    never trusts an original filename.
--
-- Certificates are public product documents; nothing private
-- belongs in this bucket. RLS remains the enforcement layer and
-- no service_role key is ever needed by the frontend.
--
-- Requires public.is_active_admin() from supabase/admin-customers.sql.
-- ============================================================

-- 1 · jewellery certificate fields --------------------------------------
alter table public.jewellery add column if not exists certificate_lab text;
alter table public.jewellery add column if not exists certificate_url text;

-- a certificate URL is either absent or a real absolute web address
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'jewellery_certificate_url_shape'
  ) then
    alter table public.jewellery
      add constraint jewellery_certificate_url_shape
      check (certificate_url is null or certificate_url ~* '^https?://');
  end if;
end $$;

-- 2 · storage bucket ----------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-certificates', 'product-certificates', true,
  10485760,
  array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = true,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product certificates public read" on storage.objects;
create policy "product certificates public read"
  on storage.objects for select
  using (bucket_id = 'product-certificates');

drop policy if exists "product certificates admin insert" on storage.objects;
create policy "product certificates admin insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'product-certificates'
    and public.is_active_admin()
  );

drop policy if exists "product certificates admin update" on storage.objects;
create policy "product certificates admin update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'product-certificates'
    and public.is_active_admin()
  )
  with check (
    bucket_id = 'product-certificates'
    and public.is_active_admin()
  );

drop policy if exists "product certificates admin delete" on storage.objects;
create policy "product certificates admin delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'product-certificates'
    and public.is_active_admin()
  );

-- Optional check:
-- select id, public, file_size_limit, allowed_mime_types
--   from storage.buckets where id = 'product-certificates';
