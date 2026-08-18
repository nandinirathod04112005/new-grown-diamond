# Admin registration Edge Function

Deploy this function and set its code as a Supabase secret (never in frontend code):

```sh
supabase secrets set ADMIN_SIGNUP_CODE=123456
supabase functions deploy register-admin
```

Apply the migration in `supabase/migrations` before deployment. Supabase provides
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to hosted functions automatically;
the service-role value must never be copied into browser files.
