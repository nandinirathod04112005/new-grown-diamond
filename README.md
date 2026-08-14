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
| Jewellery Listing page (search, category chips, sort, pagination) | ✅ done — demo data |
| Jewellery Details page (gallery, zoom, 15-field specs, 360° slot) | ✅ done — demo data |
| Manufacturing page (9-stage cinematic journey) | ✅ done |
| Education page (comparison, 4Cs, shapes, certification, FAQ) | ✅ done |
| About page (story, mission/vision, journey, trust, responsibility) | ✅ done |
| Contact page (7-field enquiry form, info cards, trade desk, map slot) | ✅ done — connect your inbox |
| Login page premium UI (split card, show/hide, remember me) | ✅ done |
| Signup page premium UI (country, strength meter, terms, toggles) | ✅ done |
| Forgot Password page UI (honest no-send, reset-seam ready) | ✅ done |
| Customer Dashboard UI (sidebar shell, metrics, UI states) | ✅ done — demo/preview data only |
| Admin management, storage, quotes, enquiries backend | ⏳ upcoming steps |

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
| `jewellery.html` | Jewellery Listing — search, category chips, sort, pagination (demo data) |
| `jewellery-details.html` | Jewellery Details — gallery + zoom + prepared 360° slot, 15-field specs, certificate, similar pieces (`?id=<sku>`) |
| `manufacturing.html` | Manufacturing — cinematic 9-stage journey, quality control, certification, inventory CTA |
| `education.html` | Diamond Education — natural vs lab-grown, CVD vs HPHT, the 4Cs, shapes, certification, report guide, care, FAQ |
| `about.html` | About — story, mission & vision, four-movement journey, why choose us, quality & trust, innovation, responsibility |
| `contact.html` | Contact — info cards, validated 7-field enquiry form (no fake sends; optional mailto-draft via `assets/js/contact.js`), business desk, map placeholder |
| `privacy.html` / `terms.html` | Placeholder pages behind the footer navigation |
| `login.html` | Sign in → role-based redirect from `public.profiles` |
| `register.html` | Customer signup (`role` is assigned by the DB trigger, never the browser) |
| `forgot-password.html` | Reset-request UI — honest “not connected yet” notice; `requestReset()` seam awaits `resetPasswordForEmail()` |
| `account/dashboard.html` | Customer dashboard (guarded) — sidebar shell, summary metrics, previews with designed empty/loading/error states; demo values clearly chipped |
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
