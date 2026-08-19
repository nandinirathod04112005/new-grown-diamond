-- Public product photography. Object mutations remain restricted to active admins.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'diamond-images', 'diamond-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "public reads diamond images" on storage.objects;
drop policy if exists "active admins insert diamond images" on storage.objects;
drop policy if exists "active admins update diamond images" on storage.objects;
drop policy if exists "active admins delete diamond images" on storage.objects;

create policy "public reads diamond images" on storage.objects
for select to public using (bucket_id = 'diamond-images');

create policy "active admins insert diamond images" on storage.objects
for insert to authenticated with check (
  bucket_id = 'diamond-images' and (storage.foldername(name))[1] = 'diamonds'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.account_status = 'active')
);
create policy "active admins update diamond images" on storage.objects
for update to authenticated using (
  bucket_id = 'diamond-images' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.account_status = 'active')
) with check (
  bucket_id = 'diamond-images' and (storage.foldername(name))[1] = 'diamonds'
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.account_status = 'active')
);
create policy "active admins delete diamond images" on storage.objects
for delete to authenticated using (
  bucket_id = 'diamond-images' and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin' and p.account_status = 'active')
);

revoke insert, update, delete on storage.objects from anon;
