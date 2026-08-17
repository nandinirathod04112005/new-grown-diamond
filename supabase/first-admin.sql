-- ============================================================
-- NEW GROWN DIAMOND — FIRST ADMIN PROMOTION (STEP 31)
-- ------------------------------------------------------------
-- Promotes ONE existing, already-registered account to admin.
-- Run it in: Supabase Dashboard → SQL Editor.
-- Full walkthrough: docs/FIRST_ADMIN_SETUP.md
--
-- WHAT THIS DOES
--   1. Finds the user in auth.users by email
--   2. Updates that user's public.profiles row to
--        role           = 'admin'
--        account_status = 'active'
--
-- WHAT THIS NEVER DOES
--   - it creates NO auth user and NO password — register the
--     account normally on the site first (register.html)
--   - it touches no other row
--   - it involves no service_role key and no frontend code;
--     this file is run by you, in the SQL Editor, once
--
-- BEFORE RUNNING
--   Replace YOUR_ADMIN_EMAIL_HERE below with the email address
--   of the account you registered on the site. Keep the quotes.
-- ============================================================

do $$
declare
  target_email text := 'YOUR_ADMIN_EMAIL_HERE';
  target_id    uuid;
  updated_rows int;
begin
  if target_email = 'YOUR_ADMIN_EMAIL_HERE' then
    raise exception
      'Replace YOUR_ADMIN_EMAIL_HERE with the real account email before running.';
  end if;

  select id into target_id
  from auth.users
  where lower(email) = lower(target_email)
  limit 1;

  if target_id is null then
    raise exception
      'No auth user found for "%". Register that account on the site first (register.html), confirm its email, then run this again.',
      target_email;
  end if;

  update public.profiles
     set role           = 'admin',
         account_status = 'active'
   where id = target_id;

  get diagnostics updated_rows = row_count;

  if updated_rows = 0 then
    raise exception
      'Auth user "%" exists but has no public.profiles row — check the signup trigger, then run this again.',
      target_email;
  end if;

  raise notice 'Done: "%" is now an active admin.', target_email;
end $$;

-- Optional check — confirm the promoted row (replace the email again):
-- select id, email, role, account_status
--   from public.profiles
--  where lower(email) = lower('YOUR_ADMIN_EMAIL_HERE');
