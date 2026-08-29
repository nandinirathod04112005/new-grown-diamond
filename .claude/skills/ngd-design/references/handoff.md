# Developer handoff

There is **no build step and no design tool in the loop**. The design system
*is* the code, so handoff here means writing a spec someone can implement by
editing HTML and `main.css` directly — not a Figma link and not a component API.

## Repository map

| Path | What it is |
|---|---|
| `assets/css/main.css` | All tokens + every shared `ngd-` class. Shared patterns land here. |
| `assets/css/cinematic.css` | Scroll-driven homepage / manufacturing sequences |
| `assets/js/ui.js` | Navbar glass, scroll reveal, pointer tilt, parallax, back-to-top |
| `assets/js/home-motion.js`, `atom-story.js`, `auto-journey.js` | GSAP cinematics |
| `assets/js/diamond-card.js`, `jewellery-card.js` | Shared product card renderers (`window.NGDDiamondCard` / `NGDJewelCard`) |
| `assets/js/gem-art.js`, `jewellery-art.js` | Inline SVG fallback art when there's no photo |
| `assets/vendor/gsap` | Vendored GSAP — not a CDN |
| `styleguide.html` | The living visual reference |
| `docs/DESIGN_SYSTEM.md` | The full prose spec — the authority |
| `tests/` | Playwright suites, the only place with an npm install |
| `supabase/*.sql` | Schema + RLS policies, one file per feature |

Pages inside `admin/` and `account/` prefix asset paths with `../`.

## What a spec must contain

1. **The classes to use**, named. Not "a card" — `.ngd-card.ngd-card-3d` with
   `data-ngd-tilt` and `.ngd-depth-1` on the media child.
2. **Tokens, never values.** `var(--ngd-space-5)`, not `2.5rem`.
3. **Light or dark context**, and therefore which twin and which gold.
4. **All four UI states** — loading (`.ngd-skeleton`), empty, error with Retry,
   and data. A spec that only describes the happy path is incomplete and will
   come back.
5. **Reduced-motion behaviour** for anything that moves.
6. **Behaviour at 1200 / 834 / 390**, including where a table starts scrolling
   inside its card and where it becomes stacked cards.
7. **The data seam** — see below.

## The data seam convention

Every page that shows real data has **one function** that is the single point
where Supabase is called: `loadDiamonds()`, `loadJewellery()`,
`loadFavourites()`, `loadRequests()`, `loadAdminDiamonds()`,
`loadAdminCustomers()`, `loadAdminEnquiries()`, `submitEnquiry()`,
`saveDiamond()`. A handoff for a data-backed component should say which seam it
hangs off, and the UI must never call Supabase from anywhere else.

Field names in admin forms **are the database column names** (`color`,
`depth_percentage`, `table_percentage`, `price_visible`). Don't rename a field
in a design without saying it's a schema change.

## Non-negotiables to restate in every handoff

- **No new dependency on the site.** No framework, no bundler, no CSS
  preprocessor, no component library. Bootstrap 5.3 + vanilla JS is the stack.
- **No fourth font family, no new weight.**
- **Public ids are the identifiers** — `DIA-XXXXXXXX`, `JEW-XXXXXXXX`,
  `ENQ-…`. Never expose or link by a database row id.
- **Archive is `archived_at` + `active = false`.** Never a hard `DELETE`.
- **Images go to Storage under a random filename**, never the user's original
  name: `diamonds/<public_id>/<random>.<ext>`. JPG/JPEG/PNG/WEBP, ≤5MB,
  validated before upload. Rendered via `ngdStorageUrl()` into
  `.ngd-media-photo`, falling back to the inline SVG art.
- **The footer block is byte-identical across every public page.** Copy it, do
  not retype it.
- **RLS is the real enforcement.** A design that relies on hiding a control for
  security is wrong — the policy is the gate, the UI just reflects it.

## Verifying before handing off

```bash
python3 -m http.server 8080          # serve the site; open styleguide.html
cd tests && npm install && npx playwright install chromium && npm test
```

Screenshots land in `tests/screens/`. If a change touches a shared class, say
which of the 62 suites should be re-run — `design-system`, `footer` and
`header-nav` are the ones shared components almost always affect.
