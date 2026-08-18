# First Admin Setup — Step 3

There is deliberately **no admin signup** anywhere in the site — a browser
can never grant roles, and new registrations always become `customer`
through the database trigger. The very first admin is promoted once, by
you, in the Supabase SQL Editor, using the safe template in
[`supabase/first-admin.sql`](../supabase/first-admin.sql).

## What you need first

1. The account you want to promote must already exist:
   - open the site → `register.html` → sign up with the email you want
     to use as admin;
   - if email confirmation is on, click the link in the confirmation
     email (the account must be able to sign in normally).
2. You must be able to open your Supabase project dashboard.

The SQL never creates a user and never sets a password — it only changes
`role` and `account_status` on the matching `public.profiles` row.

## Running first-admin.sql

1. Open [supabase.com/dashboard](https://supabase.com/dashboard) and
   select the project.
2. In the left sidebar choose **SQL Editor** → **New query** (or “New
   snippet”).
3. Open `supabase/first-admin.sql` from this repository and copy the
   whole file into the editor.
4. Replace the placeholder — one line near the top:

   ```sql
   target_email text := 'YOUR_ADMIN_EMAIL_HERE';
   ```

   becomes, for example:

   ```sql
   target_email text := 'owner@yourcompany.com';
   ```

   Keep the quotes. Nothing else needs editing.
5. Press **Run**.

## What you should see

- **Success:** a notice like `Done: "owner@yourcompany.com" is now an
  active admin.`
- **Placeholder left in:** the script stops with a message telling you to
  replace `YOUR_ADMIN_EMAIL_HERE` — nothing is changed.
- **Email not registered:** the script stops with `No auth user found…` —
  register the account on the site first, then run it again.
- **No profiles row:** the script stops and points at the signup trigger —
  the account exists in auth but the `public.profiles` row was never
  created.

To double-check, run the optional `select` at the bottom of the file
(replace the email there too): the row should show `role = admin`,
`account_status = active`.

## Signing in as the admin

Sign out if you are signed in, then log in at `login.html` with the
promoted account. The role is read from `public.profiles` on every
sign-in and page load — never from the browser — so you will land on
`admin/dashboard.html`, and the admin header shows the account's real
name, email and role. Customers who try to open any `admin/…` page are
redirected to their own dashboard; visitors without a session go to
`login.html`.

## Security notes

- Run this template only for accounts you own/trust — it is the manual,
  owner-only path until a proper admin-management flow exists.
- The publishable key in the frontend cannot change roles; Row Level
  Security remains the database's real enforcement layer.
- Never put a service_role key, secret key or database password into any
  frontend file — promoting an admin happens in the SQL Editor only.
