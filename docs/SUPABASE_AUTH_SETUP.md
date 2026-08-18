# Supabase Auth Setup — Step 4A (Login + Customer Signup)

This document explains exactly what you must configure to make the
New Grown Diamond login and signup work against **your** Supabase project.

The site is plain HTML/CSS/Bootstrap/vanilla JS. There is **no PHP, no
XAMPP/MySQL, no Node backend** — the browser talks directly to Supabase
(Auth + PostgREST), and **Row Level Security is the real security layer**.

---

## 1. Enter your project credentials (one file only)

Open **`assets/js/supabase-config.js`**. It is the ONLY file that holds
credentials; every page reads from it.

| Placeholder | Replace with | Where to find it |
|---|---|---|
| `YOUR_SUPABASE_PROJECT_URL` | Project URL, e.g. `https://abcdefghijklm.supabase.co` | Dashboard → **Project Settings → Data API → Project URL** |
| `YOUR_SUPABASE_PUBLISHABLE_KEY` | Publishable key, starts with `sb_publishable_…` | Dashboard → **Project Settings → API Keys → Publishable key** |

Older projects that still use legacy keys can paste the **`anon` public**
key instead — it is equally browser-safe.

```js
window.NGD_SUPABASE_CONFIG = {
  SUPABASE_URL: 'https://abcdefghijklm.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_xxxxxxxxxxxxxxxxxxxx'
};
```

Until real values are entered, every auth page shows a dark banner
reading “Supabase is not configured yet …”. Once configured, the banner
disappears.

> ### ⚠️ Never put these in frontend code
> - `service_role` key
> - secret key (`sb_secret_…`)
> - your database password
>
> The publishable/anon key is designed for browsers; RLS protects the data.

## 2. Serve the site over HTTP

Auth state is stored per-origin, so open the site through a web server,
not by double-clicking files:

- VS Code → **Live Server** extension → “Open with Live Server”, or
- `python -m http.server 8080` in the project folder → http://localhost:8080

GitHub Pages / any static host works the same way.

### Verify the connection first

After pasting both values, open **`supabase-status.html`**
(e.g. http://localhost:8080/supabase-status.html). It runs four safe,
read-only checks — Supabase client, Database API, Auth service and the
current session — and never displays a key. Two things to know:

- An **empty or blocked table read still shows “Reachable”** — Row Level
  Security hiding rows from anonymous visitors is correct behaviour, not
  a broken connection.
- If the placeholders are still in `supabase-config.js`, the page (and a
  site-wide banner) says exactly which file to edit instead of crashing.

## 3. How the pieces fit

| File | Responsibility |
|---|---|
| `assets/js/supabase-config.js` | Your Project URL + publishable key (placeholders) |
| `assets/js/supabase-client.js` | Creates the **single** shared Supabase client (`window.ngdSupabase`) |
| `assets/js/auth-guard.js` | `getCurrentUser`, `getCurrentProfile`, `requireAuth`, `requireAdmin`, `requireCustomer`, `logout`, account-status handling, auth-state listener |
| `assets/js/login.js` | `login.html` → `supabase.auth.signInWithPassword()` |
| `assets/js/register.js` | `register.html` → `supabase.auth.signUp()` |
| `assets/js/customer-dashboard.js` | Guards + fills `account/dashboard.html` |
| `assets/js/admin-dashboard.js` | Guards + fills `admin/dashboard.html` |

Script order on every auth page (all `defer`): Supabase JS v2 (CDN,
pinned `2.112.3`) → config → client → auth → page script.

## 4. Creating a customer account

1. Open `register.html`.
2. Fill in full name, company (optional), email, mobile, password (min 8),
   confirm password, and accept the terms.
3. Submit. The browser calls `supabase.auth.signUp()` sending **only** the
   safe metadata `full_name`, `company_name`, and `phone` — never a role.
   The signup UI (STEP 18) adds show/hide password toggles and a
   four-segment strength hint; `minlength=8`, the confirm-match check and
   the required Terms & Privacy checkbox all validate before Supabase is
   ever called.
4. Your existing database trigger creates the `public.profiles` row with
   `role = 'customer'` and the default `account_status`.

### How email confirmation affects signup

Dashboard → **Authentication → Sign In / Providers → Email → “Confirm email”**:

- **Confirm email ON (default)** — signup returns a user but **no session**.
  The page shows: *“Account created. Please verify your email before signing
  in.”* The customer must click the link in their inbox, then sign in on
  `login.html`.
- **Confirm email OFF** — signup returns a session immediately and the
  customer lands straight on `account/dashboard.html`.

If the email already has an account, a safe “already exists” message is
shown (Supabase deliberately hides whether an email is registered; the page
detects its obfuscated response).

## 5. Signing in, roles and redirects

`login.html` validates the form, calls `signInWithPassword()`, then loads
the user's row from `public.profiles` (RLS-protected) and checks
`account_status`. The **role is always read from the profiles table** —
there is no role dropdown, and nothing trusts `localStorage`.

| Situation | Result |
|---|---|
| `role = 'admin'` | → `admin/dashboard.html` |
| `role = 'customer'` | → `account/dashboard.html` |
| Wrong email/password | “Incorrect email or password.” |
| Email not confirmed yet | “Please verify your email address…” |
| `account_status` = `inactive` / `suspended` | signed out + “Your account is currently unavailable. Please contact support.” |
| No profiles row | signed out + safe support message |
| Network/Supabase down | friendly retry message (raw errors only in the console) |

Already signed in and visiting `login.html` (or `register.html`)? You are
forwarded to the dashboard matching your role — no redirect loops.

Login-page UI extras (STEP 17): the password field has a show/hide eye
toggle; **Remember me** stores only the email address (key
`ngd_login_email`) so it can be pre-filled next visit — never the
password, session or role.

**Forgot password?** (STEP 19) links to `forgot-password.html` — a
UI-only reset-request page that says honestly that no reset email is sent
yet. When you are ready to enable resets, replace `requestReset()` in
`assets/js/forgot-password.js` with
`supabase.auth.resetPasswordForEmail(email, { redirectTo })` and add the
standard auth script stack to that page (see the comment in the file).

## 6. Page protection

- `account/dashboard.html` runs `requireCustomer()`; `admin/dashboard.html`
  runs `requireAdmin()` (authenticated + role match + status not blocked).
- Guarded pages ship hidden (`<body style="visibility:hidden">`) and only
  reveal after the guard passes — anonymous visitors are bounced to
  `login.html` via `location.replace`, so Back doesn't re-open them.
- A customer opening the admin page is sent to their own dashboard, and
  vice versa.
- If the session ends while a protected page is open (expiry, logout in
  another tab), the auth-state listener returns the visitor to `login.html`.
- These guards are navigation UX. **RLS in the database remains the real
  enforcement**; hiding links is never relied on.

## 7. Logging out

Any element with the `data-ngd-logout` attribute is wired automatically to
`supabase.auth.signOut()` and then redirects to `login.html` with a
“You have signed out.” notice. Revisiting a dashboard afterwards redirects
back to login.

## 8. How the Admin role is assigned (First Admin)

There is deliberately **no admin signup** — browsers can never grant roles.
You (the project owner) promote the first account with the safe template
in [`supabase/first-admin.sql`](../supabase/first-admin.sql):

1. Create the account normally via `register.html` (it becomes a customer),
   and confirm its email.
2. Dashboard → **SQL Editor** → paste the template, replace
   `YOUR_ADMIN_EMAIL_HERE` with that account's email, and run it. The
   script refuses to run with the placeholder in place, creates no user
   and no password, and reports clearly if the email is unknown.
3. That user now lands on `admin/dashboard.html` at next sign-in, and the
   admin header shows their real name, email and role.

Step-by-step walkthrough: [`FIRST_ADMIN_SETUP.md`](FIRST_ADMIN_SETUP.md).
A proper in-app admin-management flow (protected by RLS policies that only
admins satisfy) comes later — never expose role changes to the browser.

## 9. Troubleshooting

| Symptom | Cause / fix |
|---|---|
| Dark “not configured” banner | Placeholders still in `assets/js/supabase-config.js` |
| “Unable to reach the sign-in service…” | Offline, wrong Project URL, or Supabase down — check the browser console |
| Login succeeds but bounces back with support message | The `profiles` row is missing, or `account_status` is `inactive`/`suspended` |
| Stuck on a blank dashboard | The Supabase CDN script was blocked — the guard fails closed; check the console/network tab |
