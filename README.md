# New Grown Diamond

Premium lab-grown diamond & jewellery storefront — plain **HTML + CSS +
Bootstrap 5 + vanilla JavaScript** frontend backed by **Supabase**
(Auth, PostgreSQL, Row Level Security). No PHP, no Node backend, no build step.

## Current status

| Phase | Status |
|---|---|
| Global premium design system (white/black luxury theme) | ✅ done — see `styleguide.html` |
| Supabase Step 4A — login, customer signup, session guards | ✅ done — needs your credentials |
| Premium header + mobile navigation (glass, dropdown, offcanvas) | ✅ done |
| Homepage 3D hero (Three.js diamond, SVG/WebGL fallback) | ✅ done |
| Homepage Diamond section (8 cut cards, 3D tilt) | ✅ done |
| Homepage Featured Diamonds showcase | ✅ live — featured `public.diamonds`, newest-active fallback |
| Homepage Fine Jewellery section (6 category cards + live featured row) | ✅ live |
| Homepage manufacturing story (6-stage journey, parallax) | ✅ done |
| Global footer + back-to-top (all public pages) | ✅ done |
| Diamond Inventory page (search, filters, views, pagination) | ✅ live — active, non-archived `public.diamonds` |
| Diamond Details page (gallery, zoom, specs, certificate) | ✅ live — loads by `DIA-` public id, price gated by `price_visible` |
| Jewellery Listing page (search, category chips, sort, pagination) | ✅ live — primary photos from `jewellery_images` |
| Jewellery Details page (gallery, zoom, 15-field specs, 360° slot) | ✅ live — gallery primary-first then `sort_order` |
| Manufacturing page (9-stage cinematic journey) | ✅ done |
| Education page (comparison, 4Cs, shapes, certification, FAQ) | ✅ done |
| About page (story, mission/vision, journey, trust, responsibility) | ✅ done |
| Contact page (7-field enquiry form, info cards, trade desk, map slot) | ✅ live — guest + customer enquiries into `public.enquiries` |
| Login page premium UI (split card, show/hide, remember me) | ✅ done |
| Signup page premium UI (country, strength meter, terms, toggles) | ✅ done |
| Forgot + Reset Password (recovery session, non-disclosing copy) | ✅ live |
| Customer Dashboard (real counts, panels, profile editing via RPC) | ✅ live |
| Customer Favourites (own `public.favourites`, live remove) | ✅ live |
| Customer Quotes / Holds / Inspections (own rows, live statuses) | ✅ live |
| Admin Dashboard (head+count KPIs, merged live activity feed) | ✅ live |
| Admin Diamond Inventory (12-col table, filters, pagination) | ✅ live — reads `public.diamonds` |
| Admin Add/Edit Diamond + status/archive (`DIA-` public id, duplicate guard) | ✅ live |
| Diamond image upload (`diamond-images` bucket, 5 MB, safe replace) | ✅ live — run `supabase/diamond-images-storage.sql` once |
| Admin Jewellery Inventory (13-col table, primary photos, live actions) | ✅ live |
| Admin Add/Edit Jewellery + live multi-image gallery (`jewellery-images`) | ✅ live |
| Admin Customers (real profiles, status via `admin_set_customer_status`) | ✅ live |
| Admin Enquiries (guest + customer enquiries, live status + notes) | ✅ live |
| Supabase client connection + `supabase-status.html` diagnostics | ✅ done — paste keys in `supabase-config.js` |
| Login / Signup / Logout connected to Supabase Auth | ✅ done — role + status checked from `profiles` |
| First Admin promotion (`supabase/first-admin.sql`) + admin protection | ✅ done — see `docs/FIRST_ADMIN_SETUP.md` |
| Admin Quotes / Holds / Inspections consoles | ✅ live |
| Admin Media Library (`site-media` bucket, categories, drag-drop) | ✅ live — run `supabase/site-media.sql` once |
| Admin Content Manager (`site_content` CMS + live public wiring) | ✅ live — run `supabase/site-content.sql` once |
| Favourites, quote/hold/inspection requests, enquiries, secure admin registration (Edge Function) | ✅ live — see `docs/PRODUCTION_BACKEND_SETUP.md` |

## Quick start

1. Enter your Supabase **Project URL** and **Publishable key** in
   `assets/js/supabase-config.js` — full walkthrough in
   [`docs/SUPABASE_AUTH_SETUP.md`](docs/SUPABASE_AUTH_SETUP.md).
2. Serve the folder over HTTP (VS Code Live Server, or
   `python -m http.server 8080`).
3. Open `supabase-status.html` to confirm the connection — four safe,
   read-only checks; an RLS-protected empty table correctly shows as
   Reachable, and no key is ever displayed.
4. Open `register.html` to create a customer account, `login.html` to sign in.

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Homepage (LIVE showcases) — 3D diamond hero, Signature Stones from featured `public.diamonds` (newest-active fallback, safe empty/error states), Fine Jewellery categories plus a featured-pieces row from `public.jewellery` with primary photos |
| `diamonds.html` | Diamond Inventory (LIVE) — active, non-archived `public.diamonds` with real photos, search, 8 filters, grid/table views, pagination, and real loading/empty/error states |
| `diamond-details.html` | Diamond Details (LIVE) — one stone by `?id=DIA-XXXXXXXX`, real 17-field specs, Storage photo, `price_visible`-gated price ("Price on Request"), live quote/hold/inspection/favourite CTAs, similar stones, clean not-available state |
| `jewellery.html` | Jewellery Listing (LIVE) — active, non-archived `public.jewellery` with primary photos from `jewellery_images`, search, category chips, sort, pagination, real states |
| `jewellery-details.html` | Jewellery Details (LIVE) — one piece by `?id=JEW-XXXXXXXX`, gallery with the primary photo first then `sort_order`, 15-field specs, `price_visible`-gated price, live CTAs, similar pieces, clean not-available state |
| `manufacturing.html` | Manufacturing — cinematic 9-stage journey, quality control, certification, inventory CTA |
| `education.html` | Diamond Education — natural vs lab-grown, CVD vs HPHT, the 4Cs, shapes, certification, report guide, care, FAQ |
| `about.html` | About — story, mission & vision, four-movement journey, why choose us, quality & trust, innovation, responsibility |
| `contact.html` | Contact (LIVE) — info cards, validated 7-field enquiry form inserting real `ENQ-` enquiries (guest or signed-in, honeypot-guarded, honest errors), business desk, map placeholder |
| `privacy.html` / `terms.html` | Placeholder pages behind the footer navigation |
| `login.html` | Sign in → role-based redirect from `public.profiles` |
| `register.html` | Customer signup (`role` is assigned by the DB trigger, never the browser) |
| `forgot-password.html` / `reset-password.html` | Password reset (LIVE) — `resetPasswordForEmail()` with a non-disclosing response, recovery-session password update with validation |
| `account/dashboard.html` | Customer dashboard (guarded, LIVE) — real per-user counts (favourites/quotes/holds/inspections/enquiries), recent-activity panels, per-widget failure isolation, and profile editing through the `customer_update_own_profile` RPC (safe fields only) |
| `account/favourites.html` | My Favourites (guarded, LIVE) — the customer's own `public.favourites` joined to live products, tabs/search/sort, real remove |
| `account/quotes.html` / `holds.html` / `inspections.html` | Request lists (guarded, LIVE) — the customer's own quotes / holds / inspections with statuses, admin responses, quoted price / expiry / inspection type, search + status + date filters and detail drawers |
| `admin/dashboard.html` | Admin Dashboard (guarded, LIVE) — efficient head+count KPIs (non-archived products, customers, pending requests, open enquiries) and a merged recent-activity feed; failed widgets never blank the rest |
| `admin/diamonds.html` | Admin Diamond Inventory (guarded, LIVE) — 12-column table over `public.diamonds`, search by stock/report number, filters, sort, pagination, live feature/status/archive actions, and real loading/empty/error states |
| `admin/add-diamond.html` / `edit-diamond.html` | Add/Edit Diamond (guarded, LIVE) — generated `DIA-` public ids for adds; verified public-id loading, full-field updates, duplicate protection, archive, validation, and safe Supabase errors for edits |
| `admin/jewellery.html` | Admin Jewellery Inventory (active-admin guarded, LIVE) — `public.jewellery` rows with archived pieces excluded, each showing its primary photo from `jewellery_images` (category art fallback), SKU/name search, category/availability/active filters, sorting, pagination, and live feature/status/archive row actions with confirmations |
| `admin/add-jewellery.html` / `edit-jewellery.html` | Add/Edit Jewellery (active-admin guarded, LIVE) — generated `JEW-` public ids and duplicate-SKU protection for adds; verified public-id loading, full-field updates with `updated_at`, soft archive (`archived_at`, never a delete) and safe Supabase errors for edits; multi-image gallery live against the `jewellery-images` bucket + `public.jewellery_images` (JPG/JPEG/PNG/WEBP ≤ 5 MB, unique safe filenames, sort_order reorder, exactly one primary, confirmed delete with primary re-election) |
| `admin/customers.html` | Admin Customers (guarded, LIVE) — real customer profiles, search/status filters, status changes through the `admin_set_customer_status` RPC, details with related request history |
| `admin/quotes.html` / `admin/holds.html` / `admin/inspections.html` | Admin request consoles (guarded, LIVE) — every customer quote / hold / inspection with search + status filters and a detail form to update status, expiry / schedule and the admin note |
| `admin/media.html` | Admin Media Library (guarded, LIVE) — website imagery in the public `site-media` bucket organised by category folders (Diamonds, Jewellery, Homepage, Manufacturing, Education, About, Blog/Content, General); drag-and-drop or click upload (JPG/PNG/WEBP/SVG ≤ 5 MB, sanitized readable filenames, duplicate protection), search + category filter, size/dimensions/date per file, copy-public-URL and confirmed delete; product photos stay on their product records |
| `admin/content.html` | Admin Content Manager (guarded, LIVE) — edits `public.site_content` by stable section key: homepage hero/diamonds/jewellery/story, the About/Manufacturing/Education/Contact intros and the footer line; per-section fields (eyebrow, lead/body, CTAs, image URLs with preview and a site-media picker), Save/Cancel, active switch; public pages apply active rows via text-only rendering and fall back to their built-in copy so nothing can go blank |
| `admin/enquiries.html` | Admin Enquiries (guarded, LIVE) — 10-column inbox over `public.enquiries` (guests flagged, related products joined live), search, status/type/date filters, details panel with the full message, and status + internal admin note saved through a real RLS-guarded update with truthful toasts (no email sent) |
| `supabase-status.html` | Connection diagnostics — Supabase client / Database API / Auth service / session, RLS-aware and secret-free |
| `styleguide.html` | Living reference for the design system |

## Documentation

- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — tokens & reusable `ngd-` classes
- [`docs/SUPABASE_AUTH_SETUP.md`](docs/SUPABASE_AUTH_SETUP.md) — auth configuration & behaviour
- [`docs/FIRST_ADMIN_SETUP.md`](docs/FIRST_ADMIN_SETUP.md) — promoting the first admin with `supabase/first-admin.sql`
- [`supabase/diamond-edit-status-archive.sql`](supabase/diamond-edit-status-archive.sql) — soft-archive column and active-admin-only diamond update policy for Backend Step 5
- [`supabase/jewellery-add-list.sql`](supabase/jewellery-add-list.sql) — case-insensitive SKU uniqueness plus active-admin-only jewellery reads and inserts
- [`supabase/jewellery-edit-status-archive.sql`](supabase/jewellery-edit-status-archive.sql) — `archived_at` soft-archive column and the active-admin-only jewellery update policy
- [`supabase/jewellery-images.sql`](supabase/jewellery-images.sql) — `public.jewellery_images` table (single-primary index, public read, active-admin-only writes) plus the `jewellery-images` Storage bucket and its policies
- [`supabase/site-content.sql`](supabase/site-content.sql) — the `site_content` CMS table (public reads active rows; active-admin writes) behind the admin Content Manager
- [`supabase/site-media.sql`](supabase/site-media.sql) — the public `site-media` bucket + storage policies for the admin Media Library (public read, active-admin writes)
- [`supabase/public-product-reads.sql`](supabase/public-product-reads.sql) — storefront read policies: anyone may read ONLY active, non-archived products
- [`supabase/profiles.sql`](supabase/profiles.sql) — `country`/`updated_at` columns and the `customer_update_own_profile` RPC (safe fields only)
- [`supabase/favourites.sql`](supabase/favourites.sql) · [`supabase/quotes.sql`](supabase/quotes.sql) · [`supabase/holds.sql`](supabase/holds.sql) · [`supabase/inspections.sql`](supabase/inspections.sql) · [`supabase/enquiries.sql`](supabase/enquiries.sql) — the customer request tables (own-rows RLS, admin management, guest enquiry INSERT-only)
- [`docs/PRODUCTION_BACKEND_SETUP.md`](docs/PRODUCTION_BACKEND_SETUP.md) — exact production steps: SQL order, buckets, Edge Functions, secrets (names only), auth URLs, RLS verification and the manual test matrix
- [`supabase/verify-production.sql`](supabase/verify-production.sql) — read-only, one-grid verification of the whole backend: tables, RLS, policies, buckets, functions, the signup trigger and constraints, each row PASS/MISSING/FAIL with the file to run
- [`docs/SUPABASE_AUTH_TEST.md`](docs/SUPABASE_AUTH_TEST.md) — automated results + manual test checklist
- [`tests/README.md`](tests/README.md) — optional automated browser tests

## Security model

The browser only ever holds the **publishable/anon key**. Roles and account
status live in `public.profiles`, read through RLS — never from
`localStorage`, never from a form. Page guards are navigation UX;
**Row Level Security is the enforcement layer**. `service_role`/secret keys
must never appear in this repository. Apply the Step 5 diamond SQL before
using edit, feature, status, or archive actions; it removes older permissive
diamond UPDATE policies so logged-out users and customers cannot mutate the
inventory.
