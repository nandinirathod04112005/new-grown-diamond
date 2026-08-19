-- Jewellery photographs: public reads, active-admin writes, no secret key required.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('jewellery-images', 'jewellery-images', true, 5242880,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.jewellery_images enable row level security;

drop policy if exists "public reads jewellery images" on public.jewellery_images;
create policy "public reads jewellery images" on public.jewellery_images
for select to anon, authenticated using (true);

drop policy if exists "active admins insert jewellery images" on public.jewellery_images;
create policy "active admins insert jewellery images" on public.jewellery_images
for insert to authenticated with check (public.is_active_admin());
drop policy if exists "active admins update jewellery images" on public.jewellery_images;
create policy "active admins update jewellery images" on public.jewellery_images
for update to authenticated using (public.is_active_admin()) with check (public.is_active_admin());
drop policy if exists "active admins delete jewellery images" on public.jewellery_images;
create policy "active admins delete jewellery images" on public.jewellery_images
for delete to authenticated using (public.is_active_admin());

drop policy if exists "public reads jewellery image files" on storage.objects;
create policy "public reads jewellery image files" on storage.objects for select to anon, authenticated
using (bucket_id = 'jewellery-images');
drop policy if exists "active admins upload jewellery image files" on storage.objects;
create policy "active admins upload jewellery image files" on storage.objects for insert to authenticated
with check (bucket_id = 'jewellery-images' and public.is_active_admin());
drop policy if exists "active admins delete jewellery image files" on storage.objects;
create policy "active admins delete jewellery image files" on storage.objects for delete to authenticated
using (bucket_id = 'jewellery-images' and public.is_active_admin());

-- Enforce the one-primary invariant even under concurrent clients.
create unique index if not exists jewellery_images_one_primary
on public.jewellery_images (jewellery_id) where is_primary;
