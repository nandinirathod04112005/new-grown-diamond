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

## Run

```bash
cd tests
npm install                     # installs playwright + pinned CDN assets locally
npx playwright install chromium # once, if you don't already have a browser
npm test
```

If your Chromium lives somewhere unusual, point the tests at it with
`NGD_CHROMIUM=/path/to/chrome npm test`.
