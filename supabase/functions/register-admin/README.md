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
