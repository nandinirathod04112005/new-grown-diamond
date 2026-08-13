# Automated browser tests (optional dev tooling)

These tests drive the real site files in headless Chromium. They are **development
tooling only** — the website itself is plain HTML/CSS/JS and has no Node backend.

- `design-system.test.cjs` — loads `styleguide.html` at desktop (1440), tablet (834)
  and mobile (390) widths; asserts no horizontal overflow, no JS errors, and that the
  navbar-glass / scroll-reveal / collapse behaviours work. Saves screenshots to
  `tests/screens/`.
- `auth-flow.test.cjs` — 22 end-to-end auth scenarios (login, signup, role redirects,
  suspended accounts, guards, logout, network failures) against a **mocked Supabase
  backend** via request interception, so no real credentials are needed.
  Manual testing against your real Supabase project is described in
  `docs/SUPABASE_AUTH_TEST.md`.
- `hero.test.cjs` — 8 homepage 3D-hero scenarios: WebGL diamond renders (canvas,
  desktop/mobile profiles, parallax flags), reduced-motion still frame, static SVG
  fallback when WebGL or the three.js CDN is unavailable, content + CTA navigation.
- `shapes.test.cjs` — 8 homepage Diamond-section scenarios: heading + all eight
  cut cards in order, pointer tilt applies/resets, shape links + View-all CTA
  navigate, scroll reveal, 4-per-row desktop / 2-per-row mobile with no overflow.
- `featured.test.cjs` — 9 Featured-Diamonds scenarios: six demo cards with full
  Shape/Carat/Colour/Clarity/Laboratory spec sheets, tilt + sheen hover effects,
  View Details / View All links, 3-2-1 responsive grid at 1440/768/390.
- `jewellery-section.test.cjs` — 9 Fine-Jewellery scenarios: six category cards
  (Rings…Bangles) with art/description/CTA, tilt + float/zoom hover, links, and
  the 3/2/1 responsive grid at 1440/768/390.
- `story.test.cjs` — 9 manufacturing-journey scenarios: six numbered stages with
  art and copy, alternating desktop layout, vertical mobile journey, parallax
  drift (plus its reduced-motion and mobile opt-outs), scroll reveal, and the
  Discover Our Manufacturing CTA.
- `footer.test.cjs` — 10 global-footer scenarios: identical footer on all eleven
  public pages, navigation groups per spec, social placeholders, live year +
  legal links, every link target resolves, hover nudge, back-to-top (smooth +
  reduced-motion instant), responsive layout at 1440/768/390.
- `inventory.test.cjs` — 13 Diamond-Inventory scenarios: 28 demo stones, search,
  all eight filter groups (AND-combined), sorting, grid/table switch, pagination,
  navigation to the details page, URL params (?shape=, legacy ?id= redirect),
  mobile offcanvas filters and responsive behaviour at 1440/768/390.
- `details.test.cjs` — 12 Diamond-Details scenarios: ?id= resolution with
  fallback and not-found states, three-view gallery, zoom interaction, all 17
  spec fields, CTAs + favourite toggle, certificate card, grouped spec table,
  similar stones, inventory integration, sticky mobile CTA at 1440/768/390.
- `header-nav.test.cjs` — 12 header/navigation scenarios on every public page:
  sticky glass header, Collections dropdown (open/close/navigate), login button,
  hamburger morph, offcanvas mobile menu (open, stagger, close button, Escape,
  backdrop tap, link navigation) and no-overflow checks at all three widths.

## Run

```bash
cd tests
npm install                     # installs playwright + pinned CDN assets locally
npx playwright install chromium # once, if you don't already have a browser
npm test
```

If your Chromium lives somewhere unusual, point the tests at it with
`NGD_CHROMIUM=/path/to/chrome npm test`.
