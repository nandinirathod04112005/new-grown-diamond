# Supabase Auth Testing — Step 4A

Two layers of testing exist for the login/signup build:

1. **Automated browser tests** (already run, all passing) — exercise the real
   page files end-to-end against a *mocked* Supabase backend.
2. **Manual tests against your real Supabase project** — follow the checklist
   below after entering your credentials. *(No real-credential login was
   performed during development, because only you hold the project keys —
   nothing here claims otherwise.)*

---

## 1. Automated tests (mocked Supabase) — status: ✅ 22/22 passed

`tests/auth-flow.test.cjs` drives headless Chromium through the actual site
files; Supabase network calls are intercepted and answered with realistic
GoTrue/PostgREST responses. Covered scenarios:

| # | Scenario | Result |
|---|---|---|
| 1 | Supabase client initializes once, helpers exposed | ✅ |
| 2 | Placeholder config → setup banner, no crash, safe warning on submit | ✅ |
| 3 | Empty login submit blocked locally (no network request) | ✅ |
| 4 | Wrong password → “Incorrect email or password”, button re-enabled | ✅ |
| 5 | Unconfirmed email → “verify your email” message | ✅ |
| 6 | Customer login → `account/dashboard.html`, profile fields filled | ✅ |
| 7 | Admin login → `admin/dashboard.html` | ✅ |
| 8 | `account_status = suspended` → signed out + exact support message | ✅ |
| 9 | `account_status = inactive` → signed out + support message | ✅ |
| 10 | Missing profiles row → signed out + safe message | ✅ |
| 11 | Auth endpoint unreachable → friendly network message | ✅ |
| 12 | Signup password mismatch blocked locally (no request) | ✅ |
| 13 | Signup (confirmation ON) → exact “Account created. Please verify your email before signing in.”; request contained **only** `full_name`/`company_name`/`phone`/`country`, **no role** | ✅ |
| 14 | Signup with existing email → safe “already exists” message | ✅ |
| 15 | Signup (confirmation OFF, session returned) → customer dashboard | ✅ |
| 16 | Customer dashboard without session → redirected to login | ✅ |
| 17 | Admin dashboard without session → redirected to login | ✅ |
| 18 | Customer visiting admin page → own dashboard | ✅ |
| 19 | Signed-in customer on login page → customer dashboard | ✅ |
| 20 | Signed-in admin on login page → admin dashboard | ✅ |
| 21 | Logout → login notice; dashboards locked afterwards | ✅ |
| 22 | Status flipped to suspended mid-session → signed out on next guard | ✅ |

`tests/design-system.test.cjs` additionally verifies the pages at desktop/
tablet/mobile widths (no horizontal overflow, no JS errors). How to run
both suites: see `tests/README.md`.

---

## 2. Manual test checklist (your real Supabase project)

Prerequisites: credentials entered in `assets/js/supabase-config.js`
(see `docs/SUPABASE_AUTH_SETUP.md`) and the site served over HTTP.

### A. Client initializes
1. Open `login.html` with the browser console open.
2. ✅ No dark “not configured” banner, no red errors.
3. Type `window.ngdIsSupabaseConfigured()` in the console → `true`.

### B. Customer signup
1. Open `register.html`, submit with a mismatched confirm password →
   ✅ inline “Passwords do not match.” and no request sent.
2. Fill everything correctly with a real email you control → submit.
3. With **Confirm email ON**: ✅ “Account created. Please verify your email
   before signing in.” Check Dashboard → Authentication → Users: the user
   exists; `public.profiles` has a row with `role = customer` after
   confirmation flow completes.
4. Click the confirmation link in the email, then sign in.
5. (If Confirm email is OFF: ✅ you land directly on `account/dashboard.html`.)

### C. Login + role lookup
1. `login.html` → wrong password → ✅ “Incorrect email or password.”
2. Correct password → ✅ redirected to `account/dashboard.html`; name,
   email, company and mobile shown from `public.profiles`.
3. In SQL Editor, promote a test account to admin
   (`update public.profiles set role='admin' where id = …`), sign in with
   it → ✅ lands on `admin/dashboard.html`.

### D. Page protection
1. In a private/incognito window (no session), open
   `account/dashboard.html` directly → ✅ bounced to `login.html`.
2. Same for `admin/dashboard.html` → ✅ bounced to `login.html`.
3. Signed in as customer, open `admin/dashboard.html` → ✅ sent to
   `account/dashboard.html`.
4. Signed in, open `login.html` → ✅ forwarded to your role's dashboard.

### E. Logout
1. On a dashboard, click **Sign out** → ✅ back on `login.html` with
   “You have signed out.”
2. Press the browser Back button / reopen the dashboard URL → ✅ bounced to
   `login.html` (the page never renders its content).

### F. Account status
1. In SQL Editor:
   `update public.profiles set account_status = 'suspended' where id = …;`
2. Sign in with that account → ✅ signed out with
   “Your account is currently unavailable. Please contact support.”
3. While that account is signed in on a dashboard, run the update, then
   reload the dashboard → ✅ same message on the login page.
4. Set it back to `active` → sign-in works again.

### G. Failure handling
1. With DevTools → Network set to **Offline**, submit the login form →
   ✅ “Unable to reach the sign-in service…” and the button re-enables.
2. Delete a test user's `profiles` row, sign in → ✅ signed out with the
   safe support message (then restore the row).

If any step behaves differently, copy the browser-console output — every
handled failure logs its raw cause there with the `[NGD …]` prefix while
users only ever see the safe messages above.
