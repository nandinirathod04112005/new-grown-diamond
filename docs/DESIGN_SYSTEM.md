# New Grown Diamond — Global Design System

Premium **white / black luxury** theme with champagne-gold trim, subtle glass and
restrained 3D depth. Built on **Bootstrap 5.3 + vanilla CSS/JS** — no build step.

Live reference: open **`styleguide.html`** in a browser (serve the folder over
HTTP, e.g. VS Code *Live Server*).

## Files

| File | Purpose |
|---|---|
| `assets/css/main.css` | All design tokens + reusable `ngd-` classes |
| `assets/js/ui.js` | Navbar glass-on-scroll, scroll reveal, pointer tilt |
| `styleguide.html` | Visual reference / test page for every class |

## Page boilerplate

```html
<!-- <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="assets/css/main.css" rel="stylesheet">

<!-- before </body> -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>
<script src="assets/js/ui.js"></script>
```

Give `<body>` the class **`ngd-backdrop`** for the ambient ivory/champagne wash.
Pages inside a subfolder (`admin/`, `account/`) prefix asset paths with `../`.

## Design tokens (CSS variables on `:root`)

- **Colours** — `--ngd-white`, `--ngd-ivory`, `--ngd-pearl`, `--ngd-black`,
  `--ngd-charcoal`, `--ngd-ink`, `--ngd-slate`, `--ngd-line`, `--ngd-line-light`,
  `--ngd-gold`, `--ngd-gold-deep`, `--ngd-gold-soft`, `--ngd-gold-grad`
- **Shadows** — `--ngd-shadow-soft`, `--ngd-shadow-deep`, `--ngd-shadow-float`, `--ngd-shadow-gold`
- **Radii** — `--ngd-radius-sm`, `--ngd-radius`, `--ngd-radius-lg`, `--ngd-radius-pill`
- **Motion** — `--ngd-ease`, `--ngd-fast` (220 ms), `--ngd-slow` (480 ms)
- **Spacing** — `--ngd-space-1` … `--ngd-space-8`
- **Fonts** — `--ngd-font-display` (Playfair Display), `--ngd-font-body` (Inter)

Always reference tokens (`var(--ngd-gold)`) instead of hard-coding values.

## Class reference

### Typography
| Class | Use |
|---|---|
| `.ngd-display-1` / `.ngd-display-2` | Hero / section headings (fluid `clamp()` sizes) |
| `.ngd-title` | Card & panel headings |
| `.ngd-eyebrow` | Small-caps gold label above headings |
| `.ngd-lead` | Intro paragraph |
| `.ngd-text-muted` / `.ngd-text-gold` | Secondary / accent text |
| `.ngd-italic-accent` | Serif-italic gold word inside a heading |

### Layout
| Class | Use |
|---|---|
| `.ngd-section` / `.ngd-section-tight` | Vertical rhythm for page bands |
| `.ngd-section-dark` | Near-black band with champagne aura (light text) |
| `.ngd-section-pearl` | Soft alternate wash |
| `.ngd-divider` (+ `.ngd-divider-center`) | 64 px gold rule |
| `.ngd-hairline` | Full-width 1 px rule |

Use Bootstrap's `container` / `row` / `col-*` for responsive structure.

### Surfaces
| Class | Use |
|---|---|
| `.ngd-card` | Base white card (hairline border, soft shadow) |
| `.ngd-card-3d` | + hover lift & perspective; add `data-ngd-tilt` for pointer tilt |
| `.ngd-depth-1` | Child element that floats above a hovered 3D card |
| `.ngd-card-dark` | Charcoal card for dark contexts |
| `.ngd-glass` / `.ngd-glass-dark` | Frosted glass panels (with `@supports` fallback) |
| `.ngd-icon-tile` | Small gold-framed icon square |

### Buttons & links
| Class | Use |
|---|---|
| `.ngd-btn` | Base (always pair with a variant) |
| `.ngd-btn-gold` | Primary CTA (champagne gradient) |
| `.ngd-btn-dark` | Secondary on light surfaces |
| `.ngd-btn-outline` | Tertiary on light surfaces |
| `.ngd-btn-ghost` | On dark surfaces |
| `.ngd-btn-lg` / `.ngd-btn-sm` / `.ngd-btn-block` | Sizes / full width |
| `.ngd-link` | Text link with animated gold underline |

Loading state: disable the button and prepend Bootstrap's
`<span class="spinner-border spinner-border-sm"></span>`.

### Site header & navigation
`nav.navbar.navbar-expand-lg.sticky-top.ngd-navbar` — transparent at top,
frosted glass + hairline once scrolled (`ui.js` toggles `.is-scrolled`).
Use `.ngd-brand` + `.ngd-brand-mark` for the logo and `.ngd-nav` on the
`navbar-nav` list (keep `navbar-expand-lg` — Bootstrap needs it to position
dropdowns absolutely). `.ngd-navbar-dark` variant for dark pages.
Copy the full header + mobile menu block from `index.html` for new pages.

- **Desktop nav** — wrap links/buttons in `div.d-none.d-lg-flex`; dropdowns
  are Bootstrap dropdowns skinned by `.ngd-nav .dropdown-menu` (glass card,
  fade/slide entrance, rotating chevron). `.ngd-item-note` adds a small
  description line inside a `.dropdown-item`.
- **Hamburger** — `button.ngd-burger-btn.d-lg-none` containing
  `span.ngd-burger > span×3`; the lines morph into an ✕ when the menu is
  open (`ui.js` syncs `.is-open` + `aria-expanded` with the offcanvas).
- **Mobile menu** — Bootstrap offcanvas `div.offcanvas.offcanvas-end.ngd-mobile-menu`:
  dark-glass panel, `.ngd-mobile-link` (serif links), `.ngd-mobile-group` +
  `.ngd-mobile-sublink` for grouped items, `.ngd-mobile-close` for the ✕.
  Give each row `.ngd-menu-item` and an inline `--ngd-menu-i: n` for the
  staggered entrance. Requires `bootstrap.bundle.min.js`; links inside the
  panel auto-close it. All of it respects `prefers-reduced-motion`.

### Forms
Wrap any form in **`.ngd-form`** — labels become small-caps, inputs get soft
radii and a gold focus ring; checkboxes check in gold. Works with Bootstrap's
`.form-control`, `.form-select`, `.form-check`, and `.was-validated` states.

### Homepage 3D hero
`section.ngd-hero.ngd-section-dark` — full-viewport dark hero that slides up
behind the transparent navbar (`--ngd-nav-height` sets the overlap). Put the
visual in `div.ngd-hero3d-stage[data-ngd-hero3d]` with the inline SVG fallback
inside; `assets/js/hero-3d.js` (ES module, Three.js pinned `0.185.1` via the
import map in `index.html`) mounts the WebGL canvas and adds `.is-3d`, which
hides the SVG. Pages opening on a dark hero also add `.ngd-navbar-dark` to the
navbar for light brand/links/burger. The hero module handles: slow rotation,
sparkle particles, pointer parallax (fine pointers only), mobile profile
(fewer particles, lower DPR), `prefers-reduced-motion` (single still frame)
and full static fallback when WebGL or the CDN is unavailable.

### Diamond shape cards
`a.ngd-card.ngd-card-3d.ngd-shape-card[data-ngd-tilt]` — homepage cut-collection
card: `.ngd-shape-media.ngd-depth-1` (pearl medallion holding an inline SVG cut
outline drawn with `currentColor`), `.ngd-shape-name`, `.ngd-shape-note`, and a
hover-revealed `.ngd-shape-cta` (always visible on touch devices via
`@media (hover: none)`). The tilt + hover float come from the existing
`.ngd-card-3d` / `data-ngd-tilt` / `.ngd-depth-1` mechanics.

### Featured diamond cards
`article.ngd-card.ngd-card-dark.ngd-card-3d.ngd-diamond-card[data-ngd-tilt]` —
dark showcase product card: `.ngd-diamond-media.ngd-depth-1` (velvet stage with a
floor-glow `::before`, hover sheen-sweep `::after`, and a filled-facet SVG stone
with drop-shadow depth), `.ngd-diamond-title` + `.ngd-diamond-carat`, a
`.ngd-diamond-specs` definition-list grid (use `.ngd-spec-wide` for a full-width
row) and a `.ngd-btn` CTA. Cards carry `data-diamond-id` / `data-shape` hooks so
the future Supabase catalogue can render the same markup from the diamonds table.

### Jewellery category cards
`article.ngd-card.ngd-card-3d.ngd-jewel-card[data-ngd-tilt]` — light atelier
card: `.ngd-jewel-media` (pearl stage) holds `.ngd-jewel-figure`, which floats
and zooms on hover with its own transform (kept separate from the card tilt),
around a gold line-art SVG drawn with `currentColor`; `.ngd-jewel-name`,
`.ngd-jewel-desc` and a `.ngd-btn` CTA. `data-category` hooks keep the markup
ready for the future Supabase jewellery table.

### Manufacturing story timeline
`.ngd-story` wraps `.ngd-story-stage` articles around a `.ngd-story-spine`
(gold line — left on mobile, centred from lg). Each stage: `.ngd-story-node`
(numbered spine badge), `.ngd-story-media` (velvet cinematic panel holding the
stage SVG; give it `data-ngd-parallax="-0.045"` for scroll drift), and a text
block of `.ngd-story-num` (ghost numeral), `.ngd-story-title`, `.ngd-story-text`.
Alternate sides with Bootstrap `order-lg-*`/`offset-lg-*`. `data-ngd-parallax`
is powered by `ui.js` — desktop only, skipped under `prefers-reduced-motion`.

### Global footer
`footer.ngd-footer` — dark band with a champagne top hairline shared by every
public page (copy the block from `index.html`; keep it byte-identical so the
footer test's cross-page comparison passes). Pieces: brand block +
`.ngd-footer-desc`, `.ngd-social` placeholder icon buttons, four link columns
(`.ngd-footer-heading` + `.ngd-footer-links` with a hover nudge), and
`.ngd-footer-bottom` (live year via `[data-ngd-year]`, Privacy/Terms links).
The floating `.ngd-totop` button sits after the footer; `ui.js` shows it past
480px of scroll and scrolls smoothly to the top (instant under
`prefers-reduced-motion`).

### Inventory components
Diamond-inventory building blocks (see `diamonds.html` + `assets/js/inventory.js`):
`.ngd-inv-toolbar` (search `.ngd-search`, sort select, `.ngd-view-btn` grid/table
toggle), `.ngd-inv-filters` sidebar card with `.ngd-filter-group`/`-legend`
fieldsets (the single filter form relocates into the `.ngd-filter-canvas`
offcanvas below 992px), `.ngd-stock-no` + `.ngd-avail`(`-stock`/`-request`)
badges, `.ngd-table-card` + `.ngd-table` for the readable table view,
`.ngd-pagination` + `.ngd-page-btn`, and the dark `.ngd-modal` details dialog.
Demo data lives in `diamonds-data.js`; gem art in `gem-art.js`; the controller's
`loadDiamonds()` is the single seam for the future Supabase select.

### Diamond details components
Details-page building blocks (`diamond-details.html` + `diamond-details.js`):
`.ngd-detail-stage` (velvet product stage with `.ngd-detail-badge` lab chip,
zoom via `.is-zoomed` on click with pointer-steered transform-origin, and the
`.ngd-detail-float` gentle float), `.ngd-thumbs`/`.ngd-thumb` view switcher,
`.ngd-detail-specs` light spec grid, `.ngd-fav-btn` toggle, `.ngd-cert-card` +
`.ngd-cert-seal` glass certificate panel, `.ngd-spec-table` with
`.ngd-spec-group-title`/`.ngd-spec-row`, and the mobile `.ngd-sticky-cta` bar
(pair with `body.ngd-detail-page` for bottom padding). The shared dark product
card lives in `assets/js/diamond-card.js` (window.NGDDiamondCard) and is used
by both the inventory grid and the Similar-stones row.

### Jewellery listing components
Listing building blocks (`jewellery.html` + `assets/js/jewellery.js`):
`.ngd-chip-row`/`.ngd-chip` category pills (gold when `.is-active`),
`.ngd-jewel-cat` category eyebrow and `.ngd-weight-chip` optional diamond-weight
tag on the atelier cards, light-context `.ngd-avail` overrides scoped to
`.ngd-jewel-card`, and a hover sheen on `.ngd-jewel-media::after`. Demo data in
`jewellery-data.js`; category art in `jewellery-art.js`; the controller's
`loadJewellery()` is the seam for the future Supabase `jewellery` select.
Toolbar + pagination reuse the inventory classes.

### Jewellery details components
Details-page building blocks (`jewellery-details.html` + `jewellery-details.js`):
`.ngd-jd-stage` — light pearl product stage (dark twin: `.ngd-detail-stage`)
with a realistic floor shadow, hover metallic sheen, click-to-zoom via
`.is-zoomed`, and `.is-static` for non-zoomable views; wrap it in a
`div[data-ngd-tilt]` for the subtle gallery tilt. `.ngd-thumb-light` skins the
shared `.ngd-thumb` for light stages, `.ngd-thumb-tag` marks the prepared 360°
slot, and `.ngd-jd-360` is its coming-soon panel. `.ngd-jd-desc` styles the
long-form description. The shared light product card lives in
`assets/js/jewellery-card.js` (window.NGDJewelCard) and is used by both the
listing grid and the Similar-pieces row. Spec table, sticky CTAs and favourite
button reuse the diamond-details classes.

### Education components
Learning-page building blocks (`education.html`): `.ngd-accordion` skins the
Bootstrap accordion (Playfair questions, gold active state and chevron) for the
FAQ; `.ngd-compare-table` relaxes the `.ngd-table` skin for the prose
natural-vs-lab-grown comparison (wrapping cells, styled row headers);
`.ngd-4c-visual` is the fixed-height art band inside each 4C card with
`.ngd-colour-scale` (+ `-labels`) for the D→K gradient and `.ngd-carat-dots`
for the size comparison; `.ngd-report-list` renders the numbered
how-to-read-a-report lines; `.ngd-edu-note` is the soft gold aside and
`.ngd-edu-bullet` its small diamond marker; `a.ngd-chip` reuses the listing
chips as chapter anchor links (`[data-edu-section]` adds `scroll-margin-top`
so anchors clear the sticky navbar).

### About page
`about.html` is assembled entirely from existing pieces: a dark split hero
pairing copy with a `.ngd-story-media` visual (parallax + `[data-ngd-tilt]`),
`.ngd-glass` mission/vision cards, a four-stage `.ngd-story` timeline on a
dark band (the story timeline is designed for `.ngd-section-dark` — its
titles are near-white), `.ngd-icon-tile` reason/responsibility cards and the
`.ngd-edu-note` aside. `[data-about-section]` hooks mirror the education
chapters for future CMS hydration. In-prose links inside `.ngd-lead`,
`.ngd-text-muted` and `.ngd-edu-note` pick up the gold trim automatically
(gold-soft variant inside `.ngd-section-dark`).

### Auth split card
`login.html` / `register.html` / `forgot-password.html` share the
`.ngd-auth-wrap` → `.ngd-auth-card` split layout: a dark `.ngd-auth-side` brand panel (with `.ngd-auth-points`
and the `.ngd-auth-art` diamond line art) beside the white `.ngd-auth-main`
form. `.ngd-pass-wrap` + `.ngd-pass-toggle` add the show/hide password eye
(two SVGs switched purely by the button's `aria-pressed` state; the signup
page carries one on both password fields). `.ngd-strength` is the signup
four-segment strength hint driven by `data-level="0…4"` — palette colours
only, and `minlength=8` remains the real gate. The login remember-me stores
the **email only** under `ngd_login_email` — never the password, session or
role — and the forgot-password link shows an honest "reset arrives later"
notice because no reset flow exists yet. Signup metadata is limited to
`full_name` / `company_name` / `phone` / `country` — there is no role
selector, and the tests enforce that. NB: HTML `pattern` attributes compile
with the regex v-flag — escape `(` `)` `-` inside character classes or the
whole pattern is silently ignored.

### Customer dashboard
`account/dashboard.html` (guarded) uses the `.ngd-dash-*` shell:
`.ngd-dash-topbar` sticky glass bar, `.ngd-dash-shell` grid with the
`.ngd-dash-sidebar` (static ≥992px via Bootstrap's `offcanvas-lg`, a drawer
below), `.ngd-dash-nav` routes with `.is-active` / `.is-soon` +
`.ngd-soon-chip`, `.ngd-dash-metric` summary cards (`data-dash-metric`
hooks, `.ngd-demo-chip` labels), `.ngd-dash-panel` previews whose
`[data-dash-show="loading|empty|error|data"]` blocks are switched by the
state machine in `customer-dashboard.js` (`.ngd-skeleton` shimmer,
`.ngd-dash-empty` / `.ngd-dash-error` designs, `.ngd-status-chip`
variants). The `#dash-state-switch` control is a clearly-labelled demo
preview: Live shows honest “—” metrics and empty states because no account
backend exists; Demo rows/values are always chipped DEMO.
`loadDashboardData()` is the seam the Supabase phase replaces.

`account/favourites.html` reuses the same shell (sidebar Favourites route
active). Cards reuse the inventory/jewellery card skins with a
`.ngd-fav-card` modifier: `.ngd-fav-chip` DEMO overlay on the media and
`.ngd-fav-actions` paired View/Remove buttons. `assets/js/favourites.js`
resolves a sample list from the public demo catalogue, runs tabs/search/
sort, and its Remove edits only the in-memory preview (with Undo + an
honest toast). `loadFavourites()` / `removeFavourite()` are the seams for
the future Supabase `favourites` table (user_id, item_type, item_id,
created_at).

`account/quotes.html` / `holds.html` / `inspections.html` share one
controller (`assets/js/account-requests.js`, selected by
`body[data-requests-page]`): demo rows resolved from the catalogue render
as a `.ngd-req-table` (≥992px) and stacked `.ngd-req-card`s below, with
`.ngd-req-thumb` art, `.ngd-status-chip` variants (+ `.is-dim` for
closed/expired/cancelled), a `[data-req-toggle]` drawer per row
(`.ngd-req-detail`, chipped “Demo record”, catalogue link), search +
status + date-range filters and the labelled loading/empty/error
previews. `loadRequests()` is the seam for the future Supabase
quotes/holds/inspections tables.

### Admin dashboard
`admin/dashboard.html` (guarded by `requireAdmin`) reuses the same
`.ngd-dash-*` shell: topbar with the admin profile area, a 13-route
`data-admin-route` sidebar where every unbuilt management page is an
honest `.is-soon` item, `[data-admin-kpi]` metric cards (diamond and
jewellery counts computed from the demo catalogue, the rest static
samples — every value chipped Demo), Soon-chipped quick-action buttons
that navigate nowhere plus a live storefront link, and a `[data-admin-feed]`
sample activity list. `loadAdminData()` in `assets/js/admin-dashboard.js`
is the seam the Supabase phase replaces with real counts and an activity
query.

`admin/diamonds.html` is the LIVE inventory manager: rows load from
`public.diamonds` through the shared client (`loadAdminDiamonds()` in
`assets/js/admin-diamonds.js`), newest first, into the dense
`.ngd-admin-table` (12 columns fitting 1440px; tablet overflow scrolls
inside the table card, never the page; stacked `.ngd-req-card`s below
768px). Search (stock, report and public id), the ten filters, sort and
pagination run client-side over the loaded rows, and the loading / empty
/ error states are real — Retry re-queries Supabase, and arriving with
`?added=<stock>` shows the insert confirmation. Feature, status and
archive actions write through Supabase and refresh after success; archived
rows are excluded from the normal list. Shapes render `NGD_GEM_ART` thumbnails until photography
uploads exist.

`admin/add-diamond.html` / `edit-diamond.html` share one generated form
(`assets/js/admin-diamond-form.js`, mode from `body[data-diamond-form]`);
field names ARE the `public.diamonds` columns (`color`,
`depth_percentage`, `table_percentage`, boolean `price_visible`, …).
ADD is live: a valid submit (only stock number, shape and carat are
required) generates a `DIA-XXXXXXXX` `public_id`, stamps `created_by`
with the signed-in admin, pre-checks the stock number and inserts
through `saveDiamond()` — duplicates (pre-check or the 23505
constraint), RLS denials, check-constraint rejections and network
failures all map to safe messages, and success redirects to the
inventory where the new stone appears in the re-read list. EDIT is live
too: it loads the record by its immutable `public_id`, updates with
duplicate protection and row verification, and Archive is a soft delete
(`archived_at` + inactive — never a hard DELETE). The `.ngd-drop` image
picker is LIVE: JPG/JPEG/PNG/WEBP up to 5 MB, validated before upload,
stored in the `diamond-images` bucket as
`diamonds/<public_id>/<random>.<ext>` (never the original filename) with
the path saved into `diamonds.image_path`. Adds upload first and insert
second (an upload failure saves nothing; a rejected insert cleans up the
orphan file); replacements upload the new file, update the row, and only
then remove the old one — a failed upload keeps the old image. Bucket +
admin-only write policies live in `supabase/diamond-images-storage.sql`.
Everywhere a diamond renders, `image_path` becomes an `.ngd-media-photo`
via `ngdStorageUrl()` with the gem art as fallback (admin thumbs, the
edit page's current photo, and the shared public card/details renderer).
A dirty form warns via `beforeunload`.

`admin/jewellery.html` mirrors the diamond manager for the jewellery
collection, now fully live: `assets/js/admin-jewellery.js` reads
`public.jewellery` through the shared client with archived rows excluded
(`archived_at is null`), renders the 12-column `.ngd-admin-table` (SKU,
name, category, subcategory, metal, diamond weight with an em-dash for
all-metal pieces, availability, price, featured, active, updated,
actions) plus stacked `.ngd-req-card`s below 768px, and runs client-side
search / category–availability–active filters / sort / pagination over
the loaded rows. The `.ngd-icon-btn` row actions write through Supabase
with the diamond console's `mutateRow` pattern — `updated_at` stamped,
PATCH verified against exactly one row, re-read after success, truthful
toasts, `confirm()` before deactivation and archive, and archive as a
soft delete (`archived_at` + inactive, never a DELETE). Edit links carry
the piece's immutable `public_id`; `?added/?updated/?archived` arrivals
toast over the refreshed list, and loading/empty/error states are real
with a Retry that re-queries.

`admin/add-jewellery.html` / `edit-jewellery.html` share one generated
form (`assets/js/admin-jewellery-form.js`, mode from
`body[data-jewellery-form]`): nine numbered `.ngd-form-sec-title`
sections whose 23 snake_case field names ARE the live `public.jewellery`
columns, with the sku/product_name/category required trio and the same
inline-validation / sticky `.ngd-form-actions` patterns as the diamond
form. ADD generates a `JEW-XXXXXXXX` public id, stamps `created_by`,
pre-checks the SKU case-insensitively (the DB's unique index is the real
enforcement) and inserts; EDIT loads the row by `public_id` (exactly-one
verified, not-found otherwise), prefills every column, and updates with
`updated_at` plus a duplicate-SKU check that ignores the piece itself.
Archive asks `confirm()` then stamps `archived_at` + `active=false` —
a soft delete, never a DELETE — and returns to the list's arrival toast.
Real Supabase errors map to safe messages (duplicate, RLS admin-only,
column mismatch); the update policy lives in
`supabase/jewellery-edit-status-archive.sql`. Product Images stays a
validated local preview (`.ngd-drop` → `.ngd-img-tile` gallery with the
gold `Primary` chip, reorder and remove; JPG/JPEG/PNG/WEBP ≤ 10 MB,
nothing uploaded) until the jewellery photo upload phase. A dirty form
warns via `beforeunload`.

`admin/customers.html` and `admin/enquiries.html` reuse the same list
shell for people: the dense `.ngd-admin-table` (long text cells truncate
via the inline `.ngd-clip` span), stacked `.ngd-req-card`s below 768px
(customers cards carry an `.ngd-init-avatar` initials disc), the
collapse toolbar, count line, pagination and UI-state switch. Customers
(9 columns over the invented `customers-data.js` accounts) offers an
honest activate/deactivate toggle plus a details panel — identity meta
and Recent Quotes / Holds / Inspections (deterministic samples) and
Recent Enquiries (joined from `enquiries-data.js`), every row chipped
Demo; View Quotes opens that panel at its quotes list and View Enquiries
deep-links to `enquiries.html?customer=…`. Enquiries (10 columns, guests
flagged, related products linking to the storefront) filters by status /
type / date range and moves rows through New → In Progress → Responded →
Closed with truthful toasts — no email is ever sent or faked — and its
details panel shows the full message, status actions and an internal
notes textarea that says plainly nothing is saved yet.
`loadAdminCustomers()` / `loadAdminEnquiries()` are the Supabase seams
(profiles + enquiries tables).

### Contact page
`contact.html` reuses the `.ngd-form` skin (Bootstrap `.is-invalid` +
`.invalid-feedback` like the auth pages) on a `.ngd-glass` card, four
`.ngd-icon-tile` information cards with `[data-contact-slot]` CMS hooks
(email/phone/address/hours), a `.ngd-glass-dark` trade card in the dark
business section, the `.ngd-map-panel` placeholder strip (a wide
`.ngd-story-media` variant with stylised map art — no real embed), the
`.ngd-report-list` next-steps and the `.ngd-edu-note` aside.
`assets/js/contact.js` owns validation (seven fields, company optional),
subject shortcuts (`?subject=` deep link + `[data-contact-subject]`
triggers) and the honest no-backend submit: it never fakes a send — it
either prepares a `mailto:` draft (one constant to configure, mirroring
`supabase-config.js`) or says plainly that nothing was sent. The enquiry
keys mirror the future Supabase `enquiries` columns and `submitEnquiry()`
is the single seam that phase replaces.

### Feedback & misc
`.ngd-badge` (+ `.ngd-badge-dark`), `.ngd-alert` with `.ngd-alert-info` /
`.ngd-alert-success` / `.ngd-alert-danger`, `.ngd-stat-value` + `.ngd-stat-label`.

### Utilities & motion
`.ngd-shadow-soft|deep|float`, `.ngd-hover-lift`, `.ngd-radius`, `.ngd-radius-lg`,
`.ngd-backdrop`, and `.ngd-reveal` (+ `.ngd-reveal-delay-1..3`) for scroll-in
fades — `ui.js` powers the reveal via `IntersectionObserver`.

## Rules

1. **Reuse, don't duplicate** — page stylesheets may add layout glue only; new
   shared patterns belong in `main.css`.
2. **Elegant, not loud** — no neon, no saturated glows; gold is trim, not paint.
3. **Motion is optional** — everything honours `prefers-reduced-motion`; tilt is
   disabled on touch devices automatically.
4. **Test at three widths** — ≥1200 px desktop, ~834 px tablet, ~390 px phone.
   No horizontal scrolling is allowed at any width.
