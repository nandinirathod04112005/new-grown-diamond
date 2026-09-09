# Admin registration Edge Function

Called by the React sign-up form (`src/lib/supabase/registerAdmin.js`) when
"Administrator" is chosen. It checks the staff code against the
`ADMIN_SIGNUP_CODE` secret, creates the auth user already confirmed, and
writes the `public.profiles` row with `role = 'admin'`. Nothing in the
browser can do any of those three things, which is why this exists — and
why the code it checks is the whole grant.

## Status on the live project

Deployed and configured: an OPTIONS preflight answers 200, and a wrong code
answers `403 invalid_admin_code`, which proves the three secrets
(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_SIGNUP_CODE`) are
present. It does **not** prove the rate-limit table exists — check that in
Dashboard → SQL Editor with `select count(*) from public.admin_signup_attempts;`
and apply `supabase/migrations/0004_admin_signup_attempts.sql` if it is
missing.

**The deployed version predates the limiter fix in this file** — it counted
wrong codes per IP *and* email, so every new email address was a fresh
five-guess budget, and a correct code reset the caller's count. Redeploy
once:

```sh
supabase functions deploy register-admin
```

`supabase/config.toml` sets `verify_jwt = false` for this function and the
CLI applies it at deploy. That is required: sign-up happens before any
session exists, so the request carries only the publishable key.
Authorization is the code and the limiter, not a JWT.

## The code

Set it from a prompt so it never lands in a file or in shell history:

```sh
read -rsp "Admin signup code: " ADMIN_SIGNUP_CODE && echo
supabase secrets set ADMIN_SIGNUP_CODE="$ADMIN_SIGNUP_CODE"
unset ADMIN_SIGNUP_CODE
```

Make it long and random. It must **not** equal `VITE_ADMIN_CODE` (default
`123456`): that value ships in the browser bundle and only locks the desk
screen; this one creates administrators. Do not write it in this repository,
in frontend configuration, or in documentation. Changing the secret needs no
redeploy.

## Limiter

Five wrong codes from one caller address inside fifteen minutes block that
address for fifteen minutes (`public.admin_signup_attempts`). A correct code
does not reset the count. If the table cannot be read or written, the
function refuses the request (503) rather than proceeding without a limit.
