-- Customer and guest enquiries. Run in the Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  company_name text,
  email text not null,
  mobile text,
  country text,
  subject text not null,
  message text not null,
  product_type text check (product_type is null or product_type in ('diamond', 'jewellery')),
  diamond_id uuid references public.diamonds(id) on delete set null,
  jewellery_id uuid references public.jewellery(id) on delete set null,
  status text not null default 'new' check (status in ('new', 'in_progress', 'responded', 'closed')),
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enquiries_public_id_format check (public_id ~ '^ENQ-[A-Z0-9]{8}$'),
  constraint enquiries_message_length check (char_length(btrim(message)) >= 20),
  constraint enquiries_product_reference check (
    (product_type is null and diamond_id is null and jewellery_id is null) or
    (product_type = 'diamond' and diamond_id is not null and jewellery_id is null) or
    (product_type = 'jewellery' and jewellery_id is not null and diamond_id is null)
  )
);

create index if not exists enquiries_user_created_idx on public.enquiries(user_id, created_at desc);
create index if not exists enquiries_status_created_idx on public.enquiries(status, created_at desc);

create or replace function public.set_enquiries_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists enquiries_set_updated_at on public.enquiries;
create trigger enquiries_set_updated_at before update on public.enquiries
for each row execute function public.set_enquiries_updated_at();

alter table public.enquiries enable row level security;

-- Kept here as well as the other backend modules so this script is safe to
-- install independently. The caller's role comes only from the protected profile.
create or replace function public.is_active_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and account_status = 'active'
  );
$$;
revoke all on function public.is_active_admin() from public;
grant execute on function public.is_active_admin() to authenticated;

-- Inserts may set only customer-facing fields. Defaults and this check prevent
-- callers from creating an enquiry that already contains an admin response.
drop policy if exists "guest submits safe enquiry" on public.enquiries;
create policy "guest submits safe enquiry" on public.enquiries for insert to anon
with check (user_id is null and status = 'new' and admin_note is null);

drop policy if exists "customer submits own safe enquiry" on public.enquiries;
create policy "customer submits own safe enquiry" on public.enquiries for insert to authenticated
with check (user_id = auth.uid() and status = 'new' and admin_note is null);

drop policy if exists "customer reads own enquiries" on public.enquiries;
create policy "customer reads own enquiries" on public.enquiries for select to authenticated
using (user_id = auth.uid());

drop policy if exists "active admin reads all enquiries" on public.enquiries;
create policy "active admin reads all enquiries" on public.enquiries for select to authenticated
using (public.is_active_admin());

drop policy if exists "active admin updates enquiries" on public.enquiries;
create policy "active admin updates enquiries" on public.enquiries for update to authenticated
using (public.is_active_admin()) with check (public.is_active_admin());

grant insert on public.enquiries to anon;
grant select, insert, update on public.enquiries to authenticated;
