-- Customer profile self-service. Run in the Supabase SQL editor
-- (after supabase/admin-customers.sql, which owns the profile policies).
--
-- The browser holds NO direct UPDATE privilege on public.profiles —
-- supabase/admin-customers.sql revokes it. Customers edit their own safe
-- fields exclusively through this narrowly-scoped, security-definer RPC:
-- it touches only full_name / company_name / phone / country on the
-- CALLER's own active customer row. role and account_status can never be
-- reached from here (admins change status via admin_set_customer_status).

alter table public.profiles add column if not exists country text;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

drop function if exists public.customer_update_own_profile(text, text, text, text);
create function public.customer_update_own_profile(
  new_full_name text,
  new_company_name text,
  new_phone text,
  new_country text
)
returns public.profiles
language plpgsql
security definer
set search_path = ''
as $$
declare
  updated_row public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Sign in to update your profile' using errcode = '42501';
  end if;
  if new_full_name is null or char_length(btrim(new_full_name)) < 2 then
    raise exception 'Please provide your full name' using errcode = '22023';
  end if;
  if char_length(new_full_name) > 160 or coalesce(char_length(new_company_name), 0) > 160
     or coalesce(char_length(new_phone), 0) > 40 or coalesce(char_length(new_country), 0) > 80 then
    raise exception 'A field is longer than allowed' using errcode = '22023';
  end if;

  update public.profiles
     set full_name = btrim(new_full_name),
         company_name = nullif(btrim(coalesce(new_company_name, '')), ''),
         phone = nullif(btrim(coalesce(new_phone, '')), ''),
         country = nullif(btrim(coalesce(new_country, '')), ''),
         updated_at = now()
   where id = auth.uid()
     and role = 'customer'
     and account_status = 'active'
  returning * into updated_row;

  if updated_row.id is null then
    raise exception 'Only an active customer can update this profile' using errcode = '42501';
  end if;
  return updated_row;
end;
$$;
revoke all on function public.customer_update_own_profile(text, text, text, text) from public;
grant execute on function public.customer_update_own_profile(text, text, text, text) to authenticated;
