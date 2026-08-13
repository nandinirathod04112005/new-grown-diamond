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
| Homepage Featured Diamonds showcase (6 demo stones) | ✅ done |
| Homepage Fine Jewellery section (6 category cards) | ✅ done |
| Homepage manufacturing story (6-stage journey, parallax) | ✅ done |
| Global footer + back-to-top (all public pages) | ✅ done |
| Diamond Inventory page (search, filters, views, pagination) | ✅ done — demo data |
| Diamond Details page (gallery, zoom, specs, certificate) | ✅ done — demo data |
| Remaining homepage sections, catalogue, admin management, storage, quotes | ⏳ upcoming steps |

## Quick start

1. Enter your Supabase **Project URL** and **Publishable key** in
   `assets/js/supabase-config.js` — full walkthrough in
   [`docs/SUPABASE_AUTH_SETUP.md`](docs/SUPABASE_AUTH_SETUP.md).
2. Serve the folder over HTTP (VS Code Live Server, or
   `python -m http.server 8080`).
3. Open `register.html` to create a customer account, `login.html` to sign in.

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Homepage with 3D diamond hero (Three.js + static SVG fallback) |
| `diamonds.html` | Diamond Inventory — search, 8 filters, grid/table views, pagination (demo data) |
| `diamond-details.html` | Diamond Details — gallery + zoom, 17-field specs, certificate, similar stones (`?id=<stock no>`) |
| `jewellery.html` | Collection placeholder ("arriving soon") linked from the header dropdown |
| `manufacturing.html` | Manufacturing placeholder linked from the homepage journey CTA |
| `education.html` / `about.html` / `contact.html` / `privacy.html` / `terms.html` | Placeholder pages behind the footer navigation |
| `login.html` | Sign in → role-based redirect from `public.profiles` |
| `register.html` | Customer signup (`role` is assigned by the DB trigger, never the browser) |
| `account/dashboard.html` | Customer dashboard (guarded) |
| `admin/dashboard.html` | Admin console shell (guarded) |
| `styleguide.html` | Living reference for the design system |

## Documentation

- [`docs/DESIGN_SYSTEM.md`](docs/DESIGN_SYSTEM.md) — tokens & reusable `ngd-` classes
- [`docs/SUPABASE_AUTH_SETUP.md`](docs/SUPABASE_AUTH_SETUP.md) — auth configuration & behaviour
- [`docs/SUPABASE_AUTH_TEST.md`](docs/SUPABASE_AUTH_TEST.md) — automated results + manual test checklist
- [`tests/README.md`](tests/README.md) — optional automated browser tests

## Security model

The browser only ever holds the **publishable/anon key**. Roles and account
status live in `public.profiles`, read through RLS — never from
`localStorage`, never from a form. Page guards are navigation UX;
**Row Level Security is the enforcement layer**. `service_role`/secret keys
must never appear in this repository.
