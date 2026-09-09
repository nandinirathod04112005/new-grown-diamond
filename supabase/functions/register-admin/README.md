# Admin registration Edge Function

Called by the React sign-up form (`src/lib/supabase/registerAdmin.js`) when
"Administrator" is chosen. It checks the staff code against the
`ADMIN_SIGNUP_CODE` secret, creates the auth user already confirmed, and
writes the `public.profiles` row with `role = 'admin'`. Nothing in the
browser can do any of those three things, which is why this exists.

**Status on the live project:** deployed and configured (an OPTIONS preflight
answers 200; a request with a wrong code answers `403 invalid_admin_code`,
which is only reachable when every secret is present).

To change the staff code (this is the one the sign-up form is checked
against — not `VITE_ADMIN_CODE`, which only opens the desk in the browser):

```sh
read -rsp "Admin signup code: " ADMIN_SIGNUP_CODE && echo
supabase secrets set ADMIN_SIGNUP_CODE="$ADMIN_SIGNUP_CODE"
unset ADMIN_SIGNUP_CODE
```

No redeploy is needed after changing a secret. To (re)deploy the function
itself: `supabase functions deploy register-admin`. The rate-limit table it
writes is `public.admin_signup_attempts` (supabase/migrations/0004).

Original notes:

# Admin registration Edge Function

Deploy this function and set its code as a Supabase secret (never in frontend code):

```sh
read -rsp "Admin signup code: " ADMIN_SIGNUP_CODE && echo
supabase secrets set ADMIN_SIGNUP_CODE="$ADMIN_SIGNUP_CODE"
unset ADMIN_SIGNUP_CODE
supabase functions deploy register-admin
```

Choose and enter the code only at the prompt. Do not save it in this repository,
frontend configuration, shell history, or deployment documentation.

Apply the migration in `supabase/migrations` before deployment. Supabase provides
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to hosted functions automatically;
the service-role value must never be copied into browser files.
