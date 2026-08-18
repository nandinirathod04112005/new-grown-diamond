-- Run once in the Supabase SQL editor. Product images are public to read,
-- while object writes are restricted to active administrators by Storage RLS.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'diamond-images', 'diamond-images', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.is_active_admin()
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and account_status = 'active'
  );
$$;

revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

drop policy if exists "diamond images admin insert" on storage.objects;
create policy "diamond images admin insert" on storage.objects for insert to authenticated
with check (bucket_id = 'diamond-images' and public.is_active_admin());

drop policy if exists "diamond images admin update" on storage.objects;
create policy "diamond images admin update" on storage.objects for update to authenticated
using (bucket_id = 'diamond-images' and public.is_active_admin())
with check (bucket_id = 'diamond-images' and public.is_active_admin());

drop policy if exists "diamond images admin delete" on storage.objects;
create policy "diamond images admin delete" on storage.objects for delete to authenticated
using (bucket_id = 'diamond-images' and public.is_active_admin());

-- SELECT needs no object policy because this bucket is public. Mutating policies
-- deliberately have no customer/anon equivalent; Storage RLS denies those users.
