-- =============================================================================
-- Create a public.profiles row the moment an auth user is created.
--
-- STATUS: NOT APPLIED. Written for review.
--
-- WHY THIS IS THE NEXT WALL. Supabase Auth writes auth.users itself, but
-- public.profiles is an ordinary table — nothing fills it unless a trigger
-- does. Every screen in this site reads the role from profiles (useAuth, the
-- admin guard, the account page), so an auth user with no profiles row
-- resolves to "no access" everywhere. Sign-up would look like it worked and
-- then nothing would.
--
-- I could not verify from the client whether such a trigger already exists —
-- pg_trigger is not readable with the publishable key. So this is written to
-- be SAFE TO APPLY EITHER WAY:
--
--   * `on conflict (id) do nothing` — if another trigger already inserts the
--     row, this one quietly does nothing rather than raising a unique
--     violation. A unique violation inside an auth trigger aborts the whole
--     sign-up with "Database error saving new user", which would be strictly
--     worse than the problem it was meant to fix.
--   * `create or replace` + `drop trigger if exists` — re-runnable.
--
-- CHECK FIRST (Dashboard > SQL Editor):
--   select tgname, tgrelid::regclass from pg_trigger where tgrelid = 'auth.users'::regclass;
-- If a row already appears there that inserts into profiles, you do not need
-- this file.
-- =============================================================================

begin;

-- SECURITY DEFINER is genuinely required here, and this is the one place in
-- these migrations it is used: the trigger fires inside Supabase Auth's own
-- transaction, where there is no signed-in user, so an invoker-rights
-- function would have no permission to insert into profiles at all. The
-- function is narrow — one insert, columns named explicitly — and its
-- search_path is pinned so it cannot be redirected to a different `profiles`.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, account_status)
  values (
    new.id,
    new.email,
    -- The name the sign-up form put in user_metadata. Nullable: an account
    -- created by other means has no metadata and must still get a row.
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    -- ALWAYS 'customer'. Never read from metadata: the sign-up form sends
    -- only full_name, and nothing here can be talked into granting admin by
    -- a value the browser sent. Staff accounts are created by the
    -- register-admin Edge Function, which writes its own row.
    'customer',
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

comment on function public.handle_new_user() is
  'Creates the profiles row for a new auth user. Role is always customer; metadata is never trusted for it.';

-- Nothing but the auth system should be able to call this.
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

commit;

-- =============================================================================
-- Verify after applying: sign up once, then
--   select id, email, role, account_status from public.profiles order by created_at desc limit 3;
-- The new user should be there with role = 'customer'.
--
-- ROLLBACK
--   drop trigger if exists on_auth_user_created on auth.users;
--   drop function if exists public.handle_new_user();
-- =============================================================================
