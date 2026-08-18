-- Run once in the Supabase SQL editor. The existing jewellery_images table is
-- retained; this adds the bucket, integrity guarantees, and least-privilege RLS.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'jewellery-images', 'jewellery-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.jewellery_images enable row level security;

create or replace function public.is_active_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and account_status = 'active'
  );
$$;

drop policy if exists "Public can view jewellery images" on public.jewellery_images;
create policy "Public can view jewellery images" on public.jewellery_images
for select using (true);
drop policy if exists "Active admins manage jewellery images" on public.jewellery_images;
create policy "Active admins manage jewellery images" on public.jewellery_images
for all using (public.is_active_admin()) with check (public.is_active_admin());

drop policy if exists "Public can view jewellery image files" on storage.objects;
create policy "Public can view jewellery image files" on storage.objects
for select using (bucket_id = 'jewellery-images');
drop policy if exists "Active admins upload jewellery image files" on storage.objects;
create policy "Active admins upload jewellery image files" on storage.objects
for insert with check (bucket_id = 'jewellery-images' and public.is_active_admin());
drop policy if exists "Active admins update jewellery image files" on storage.objects;
create policy "Active admins update jewellery image files" on storage.objects
for update using (bucket_id = 'jewellery-images' and public.is_active_admin())
with check (bucket_id = 'jewellery-images' and public.is_active_admin());
drop policy if exists "Active admins delete jewellery image files" on storage.objects;
create policy "Active admins delete jewellery image files" on storage.objects
for delete using (bucket_id = 'jewellery-images' and public.is_active_admin());

-- A partial unique index makes the one-primary rule race-safe.
create unique index if not exists jewellery_images_one_primary
on public.jewellery_images (jewellery_id) where is_primary;
create index if not exists jewellery_images_order
on public.jewellery_images (jewellery_id, sort_order);
