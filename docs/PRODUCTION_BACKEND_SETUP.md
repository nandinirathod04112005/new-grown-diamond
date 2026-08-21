# Production Backend Setup — New Grown Diamond

Exact manual steps to take the Supabase backend live. The browser only ever
holds the **Project URL** and the **publishable/anon key**; every privileged
credential stays server-side. Row Level Security is the enforcement layer on
every table and bucket — never disable it.

> No secrets appear in this document or anywhere in the repository. Where a
> value is needed it is referred to **by name only**.

---

## 1. SQL files to run (Supabase Dashboard → SQL Editor)

Run each file once, **in this order** (they are idempotent — re-running is
safe):

| # | File | Provides |
|---|---|---|
| 1 | `docs/SUPABASE_AUTH_SETUP.md` §SQL | `public.profiles` table + signup trigger (role always `customer`) |
| 2 | `supabase/admin-customers.sql` | profile RLS (own-row + admin reads), `is_active_admin()`, `admin_set_customer_status()` RPC |
| 3 | `supabase/profiles.sql` | `country`/`updated_at` columns + `customer_update_own_profile()` RPC (safe fields only) |
| 4 | `supabase/first-admin.sql` | promote ONE existing verified account to admin (edit the placeholder email first) |
| 5 | `supabase/migrations/20260818000000_admin_signup_attempts.sql` | rate-limit table for the register-admin Edge Function |
| 6 | *diamonds table* — created in `docs/SUPABASE_AUTH_SETUP.md` / earlier backend steps; then `supabase/diamond-edit-status-archive.sql` | `archived_at` + admin-only diamond updates |
| 7 | `supabase/diamond-images-storage.sql` | `diamond-images` bucket + storage policies |
| 8 | `supabase/jewellery-add-list.sql` | jewellery RLS + unique SKU + admin insert/read |
| 9 | `supabase/jewellery-edit-status-archive.sql` | jewellery `archived_at` + admin-only updates |
| 10 | `supabase/jewellery-images.sql` | `public.jewellery_images` table + `jewellery-images` bucket + policies |
| 11 | `supabase/public-product-reads.sql` | storefront reads: active + non-archived products only, for anon + customers |
| 12 | `supabase/favourites.sql` | customer favourites (own rows only, duplicate-proof) |
| 13 | `supabase/quotes.sql` | quote requests (QTE-…) |
| 14 | `supabase/holds.sql` | hold requests (HLD-…) |
| 15 | `supabase/inspections.sql` | inspection requests (INS-…) |
| 16 | `supabase/enquiries.sql` | guest + customer enquiries (ENQ-…), guest INSERT-only |
| 17 | `supabase/site-media.sql` | `site-media` bucket + policies for the admin Media Library |
| 18 | `supabase/site-content.sql` | `site_content` CMS table (public reads active rows, admin writes) |

## 2. Storage buckets

Created by the SQL above — verify both exist and stay **RLS-enabled**:

- `diamond-images` — public read, active-admin write, 5 MB, jpeg/png/webp
- `jewellery-images` — public read, active-admin write, 5 MB, jpeg/png/webp
- `site-media` — public read, active-admin write, 5 MB, jpeg/png/webp/svg (admin Media Library)

## 3. Edge Functions to deploy

- `supabase/functions/register-admin` — secure admin registration
  (validates the admin code server-side, rate-limits attempts, creates the
  admin profile with the service role). Deploy with
  `supabase functions deploy register-admin` after setting its secret.

## 4. Supabase secrets to configure (names only)

| Secret | Where | Purpose |
|---|---|---|
| `ADMIN_SIGNUP_CODE` | Edge Function secrets | the admin registration code |
| `SUPABASE_URL` | provided automatically to hosted functions | — |
| `SUPABASE_SERVICE_ROLE_KEY` | provided automatically to hosted functions | never copy into any frontend file |

## 5. Auth redirect URLs + recovery email template

Supabase Dashboard → Authentication → URL Configuration:

- **Site URL**: the production origin (e.g. `https://your-domain.example`)
- **Redirect URLs**: add
  - `https://your-domain.example/reset-password.html`
  - `https://your-domain.example/login.html`
  - each local origin while testing, e.g.
    `http://127.0.0.1:5500/reset-password.html`

Also set the scanner-safe **Reset Password email template** — exact template
and why in [`docs/SUPABASE_AUTH_SETUP.md`](SUPABASE_AUTH_SETUP.md) §10b.

## 6. Site URL in the frontend

`assets/js/supabase-config.js` carries the Project URL and the
**publishable** key only. Replace with your project's values if they differ.

## 7. Email confirmation

Authentication → Providers → Email: keep **Confirm email** enabled. Signup
shows “Account created. Please check your email to verify your account.” and
unverified accounts cannot sign in.

## 8. First admin

1. Sign up normally with the future admin's email and verify it.
2. Edit `supabase/first-admin.sql`, replace the placeholder email, run it once.
3. Sign in — the account now lands on `admin/dashboard.html`.
   Further admins can register through the Admin option on the register page,
   which calls the `register-admin` Edge Function with the admin code.

## 9. RLS verification

**One-shot check**: run [`supabase/verify-production.sql`](../supabase/verify-production.sql)
in the SQL Editor. It is strictly read-only and reports one grid covering
required tables, RLS, every policy, the two Storage buckets, the RPC
functions and `updated_at` triggers, the signup→profiles trigger
(including that it assigns `role = 'customer'`), and the unique/CHECK
constraints — each row marked PASS / MISSING / FAIL / CHECK / INFO with
the exact `supabase/*.sql` file to run when something is missing.

Or run the individual spot checks below — confirm every table reports
`rowsecurity = true`:

```sql
select tablename, rowsecurity from pg_tables
 where schemaname = 'public'
   and tablename in ('profiles','diamonds','jewellery','jewellery_images',
                     'favourites','quotes','holds','inspections','enquiries');
```

Then review the policies per table:

```sql
select tablename, policyname, cmd, roles from pg_policies
 where schemaname = 'public' order by tablename, cmd;
```

Expected shape:

- **profiles** — customers read own row; admins read customer rows; NO browser
  UPDATE (writes go through `customer_update_own_profile` /
  `admin_set_customer_status`).
- **diamonds / jewellery** — storefront SELECT only `active = true AND
  archived_at IS NULL`; active admins read + write everything; archive is
  `archived_at` + `active=false`, never DELETE.
- **jewellery_images** — public read; active-admin writes; single primary per
  piece enforced by a partial unique index.
- **favourites** — own rows only (select/insert/delete), duplicate-proof.
- **quotes / holds / inspections** — customers insert `pending` rows for
  themselves and read their own; admins read/update all; customers have NO
  update policy (admin fields unreachable from the browser).
- **enquiries** — guests INSERT only (no read); customers read their own;
  admins read/update all.
- **site_content** — everyone reads ACTIVE rows only; active admins read
  drafts and are the only writers; public pages fall back to built-in copy.

## 10. Final smoke test

1. `supabase-status.html` — all four checks green.
2. Sign up a customer → verify email → sign in → lands on the customer
   dashboard with zero counts.
3. Admin: add a diamond (TEST-001) with a photo → public inventory shows it;
   deactivate → it disappears from the public inventory; archive → gone from
   the admin list too (still in Table Editor).
4. Admin: add a jewellery piece, upload 3 photos, re-star the primary,
   reorder, delete one — Storage and `jewellery_images` stay in step.
5. Customer: favourite a diamond, request a quote, a hold and an inspection —
   each appears in the matching account page and on the admin consoles.
6. Guest: send a contact enquiry → visible in Admin → Enquiries; the guest can
   never read enquiries back.
7. `price_visible = false` on any product → the public page shows
   “Price on Request” and the amount is absent from the page source.

---

## Manual test matrix

**AUTH** — customer signup · email verification · login (customer → account
dashboard, admin → admin dashboard) · logout · forgot/reset password ·
inactive/suspended accounts blocked.

**DIAMONDS** — add · edit by `DIA-…` · image upload/replace · feature ·
activate/deactivate · archive (soft) · public listing/details respect
active+non-archived and `price_visible`.

**JEWELLERY** — add · edit by `JEW-…` · multi-image upload · exactly one
primary · reorder persists after refresh · delete promotes the next primary ·
status/archive · public listing/details show the primary first.

**CUSTOMER** — profile edit (safe fields only) · dashboard counts ·
favourites add/remove/list · quotes · holds · inspections · enquiries.

**ADMIN** — dashboard KPIs + activity · customers (status via RPC) · quotes ·
holds · inspections · enquiries consoles.

**SECURITY** — customer cannot open `/admin/*` (redirected) · customer cannot
read another customer's rows (RLS) · guest cannot read enquiries · customer
cannot modify admin-only fields (no UPDATE policy) · no `service_role`/secret
key anywhere in the frontend (`grep -ri service_role *.html assets/`).
