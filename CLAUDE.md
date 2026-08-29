# New Grown Diamond — working rules

Permanent constraints for this frontend. These are not style preferences; each
one exists because breaking it has already cost a rebuild, shipped a defect, or
would expose the business. Read before changing anything in `src/`.

Stack: React 19 · Vite 8 · React Router 7 · GSAP + `@gsap/react` · Lenis ·
three + R3F + drei + postprocessing · SplitType · maath · Supabase JS.
Lint is **oxlint**, not ESLint. Tests are **Playwright**.

---

## 1. Design must be distinctive, not merely tasteful

The first homepage was rejected for being generic, and it is worth being
precise about why: centred headings over full-width alternating bands, a
`repeat(auto-fill, minmax(290px, 1fr))` card grid, a four-icon feature row.
Nothing was ugly. The failure was that **the sections were interchangeable in
order** — the composition made no argument.

**Rules**

- The page is a narrative in chapters. Section order must be meaningful; if two
  sections could swap without loss, at least one of them is not pulling weight.
- Use the 12-column grid in `styles/grid.css` **asymmetrically**. Content spans
  named columns. Centring everything is what makes a luxury page look like
  every other luxury page.
- **No card grids.** A repeating rounded rectangle is the default answer and is
  therefore almost always the wrong one. Reach for the form the content already
  has: a dealer's ledger, a specification sheet, a magazine spread, a plate
  with a caption.
- **No icon feature rows.** A shield glyph beside the word "trust" adds nothing
  a buyer can verify.
- Large negative space is load-bearing, not filler. Do not fill it.
- Two type registers, held in tension: `--font-display` (Cormorant Garamond)
  for the luxury voice, `--font-body` (Jost, wide-tracked, uppercase) for the
  laboratory voice. The brand lives in the gap between them.
- Spectral colour (`--fire-*`) appears only as narrow highlights — the fire a
  real stone throws. Never as a fill, never as a gradient across a surface.
  No purple SaaS aesthetic, no rainbow.
- Every colour comes from `styles/tokens.css`. No component hard-codes a hex.

## 2. Animation quality

**Ownership**

- `lib/motion/gsap.js` is the only place plugins are registered.
- `lib/motion/media.js` owns the single `gsap.matchMedia()`. Every animation
  registers through one of `MQ.motion` / `MQ.still` / `MQ.desktop` / `MQ.pointer`.
- Lenis drives `gsap.ticker`, never the reverse. One instance, in
  `SmoothScrollProvider`.
- Every animation lives in `useGSAP` with a `scope`. This is what makes
  StrictMode's double mount revert cleanly instead of stacking a second
  timeline.

**Traps that have already bitten this codebase — do not repeat them**

- **Animations must fail visible.** Never build a timeline `paused` and play it
  on a flag: `from()` tweens render their start values immediately, so the copy
  sits at `opacity: 0` until something plays it, and if that play is ever
  missed the page ships blank. Build the timeline only when you are ready to
  run it, so the untouched state is the visible one.
- **A scrubbed `to()` captures its start value at creation time.** If an intro
  `from()` has just set opacity to 0 in the same tick, the scrubbed tween
  inherits 0 as its resting value and the element never appears. Use
  `fromTo(..., { immediateRender: false })` with explicit start values.
- **A tween that names an explicit value is breakpoint-specific.** If the
  resting value differs by media query, register the tween inside the matching
  `matchMedia` context — otherwise it forces the other breakpoint's value.
- **SplitType must `revert()` in cleanup**, and must re-split inside
  `matchMedia` so a resize re-splits against the new line breaks rather than
  animating stale lines.
- Pin only where the scroll *is* the story. Both current pins qualify: the
  scroll is the CVD growth, and the scroll is the production traverse. Pins are
  desktop-only — on a phone a pin hijacks the one gesture the user has.
- **Scrubbed scenes read scroll, they do not hold state.** Diamond Genesis
  derives its entire six-stage scene from one `progress` ref every frame, so
  scrubbing backwards is exact and a resize cannot desynchronise two
  animations from each other. React state holds only the caption index —
  never per-frame values, or the tree re-renders sixty times a second.
- **Rough and cut share vertex ordering** so the transition is a per-vertex
  lerp: the stone is *cut down* to its finished form rather than cross-fading
  into it. That one-to-one correspondence is what makes it read as cutting.
  Per-frame buffer writes go through the mesh ref (the live scene object),
  never through a memoised or stateful binding.
- Custom cursor and magnetic effects register only under `MQ.pointer`
  (`pointer: fine` **and** motion allowed). Never on touch.
- No decorative bouncing, spinning or infinite motion. Motion carries meaning
  or it does not ship.

## 3. Real NGD assets only

**A finished diamond on this site is always a photograph of a real,
company-owned stone.** Never a render, never an illustration, never generated
imagery. Procedural geometry cannot carry real facets, inclusions,
transparency, colour or proportions, and no material setting makes it a
photograph — it reads as glass or as plaster. Genuine photography outranks
WebGL for this subject, always.

- The hero contains **no canvas at all**, by decision rather than capability.
  A test asserts this so it cannot creep back in.
- Generated geometry may depict ROUGH crystal only — genuinely blocky, stepped
  and opaque, where nobody is being shown a gem. The moment cutting begins,
  the real photograph takes over.
- No bloom, dispersion or post-processing may be applied to anything standing
  in for a real stone: an effect that changes the diamond's appearance
  misrepresents the goods.
- A real photograph may receive only presentation effects that leave the stone
  as photographed — background isolation, masking, slow scale and parallax, a
  light sweep travelling across the PLATE (never composited into the stone),
  contrast beneath it, editorial crop, or a genuine 360° frame sequence.
- **Never** invent gemstone illustrations, use stock photography, hotlink
  third-party images, or ship framework artwork (`react.svg`, `vite.svg`, the
  Vite template `hero.png`).
- If no suitable real asset exists, do not substitute one. Record the exact
  requirement in `lib/assetRequirements.js` and report it.
- The only real NGD photograph currently in the repository is
  `src/assets/diamonds/ngd-brilliant-macro.webp` (754×541 RGBA, from the
  production site). Prefer it wherever a diamond is shown.
- When photography does not exist, use `components/media/AssetSlot.jsx`. It
  renders a designed placeholder that states the exact shot required — subject,
  orientation, minimum resolution, treatment — so the shot list is readable off
  the page and nobody mistakes it for finished work. Every slot must also be
  reported in the handover.
- Supabase Storage buckets (`diamond-images`, `jewellery-images`, `site-media`)
  are the destination for real product imagery. Read them through
  `storagePublicUrl()`.
- Every `<img>` carries explicit `width` and `height`, plus `loading="lazy"`
  and `decoding="async"` unless it is the LCP image (then `fetchPriority="high"`).

## 4. Mobile performance

- The initial JS bundle must stay near ~165 kB gzip. `three` is ~275 kB gzip on
  its own and **must never enter the initial load** — it is a manual chunk,
  reached only through `React.lazy`.
- Phones get the photograph, not a canvas. `components/three/capability.js`
  returns `off` / `low` / `high`; the hero canvas mounts only on `high`,
  because without dispersion, bloom and antialiasing the render reads as
  plaster and a photograph of a real stone is the better image. **3D has to
  beat the photograph to earn the screen, not merely be possible.**
- The gate resolves downward on anything uncertain: reduced motion, narrow
  viewport, `saveData`, 2G, `deviceMemory < 4`, `hardwareConcurrency < 4`, no
  WebGL2.
- Every canvas: cap DPR, pause rendering off-screen and on `visibilitychange`,
  and dispose geometries, materials, textures and the renderer on unmount.
- No particle system for decoration. The Genesis field is permitted because
  every particle's destination is sampled from the brilliant's own geometry —
  it condenses into the actual stone, which is the argument the chapter is
  making.
- No horizontal overflow at any width down to 320px. `html` and `body` carry
  `overflow-x: clip`, but that hides the symptom — fix the cause.
- Reserve space for anything asynchronous. Layout shift is a defect.

## 5. Reduced motion and accessibility

- `prefers-reduced-motion: reduce` is a first-class rendering mode, not a
  degraded one: Lenis is never constructed, no canvas mounts, no custom cursor,
  pins never register, and reveals resolve to their final state. Nothing may be
  left invisible or stranded mid-transition.
- Semantic HTML first. A control that navigates is an `<a>`; a control that
  acts is a `<button>`. Never a `<div>` with a handler.
- **`[hidden]` must always win.** A class-level `display` silently defeats the
  UA stylesheet's `[hidden]` rule — this once left the mobile drawer covering
  every page below 1024px. `reset.css` carries
  `[hidden] { display: none !important; }`; keep it.
- A scrollable region needs keyboard access (WCAG 2.1.1): give it `tabIndex={0}`,
  a `role`, and a label, or put focusable content inside it.
- Overlays trap focus, close on Escape, restore focus on close, and keep
  `aria-expanded` in sync.
- Visible focus rings everywhere. Never remove an outline without replacing it.
- Content hidden behind hover must also be reachable by focus.

## 6. Supabase security

- **Never** commit a `.env`. `.gitignore` excludes `.env` and `.env.*` and
  keeps only `.env.example`.
- **`VITE_` means public.** Vite inlines every `VITE_` variable into the shipped
  bundle, readable by anyone with devtools. Correct for the project URL and the
  publishable key; a service-role or `sb_secret_` key must never carry that
  prefix. `lib/supabase/env.js` actively rejects one that does.
- `lib/supabase/client.js` owns the **only** `createClient` call.
- **Do not modify the database.** No migrations, no RLS changes, no Storage
  policy edits, no Edge Function changes. The schema is owned by the deployment
  on `main`.
- Storefront reads must repeat the RLS filters — `.eq('active', true)` and
  `.is('archived_at', null)` — and name their columns explicitly.
  `select('*')` is banned: it would fetch `internal_notes` and `created_by`.
- All data access goes through `lib/data/source.js`. Components never import
  the Supabase client directly.

## 7. Automated browser testing

The suite in `tests-e2e/` is the acceptance gate. `npm run test:e2e` runs every
spec across all five specified viewports: 320×568, 375×812, 768×1024,
1440×900, 1920×1080.

- Tests run against the **production build** (`vite preview`), because that is
  what ships and the only place chunking and asset hashing are exercised.
- **`walkPage()` before asserting.** ScrollTrigger only fires for content that
  has actually passed through the viewport. A full-page screenshot does *not*
  do this — Playwright captures beyond the viewport without scrolling, so every
  reveal below the fold stays at its start value and the page looks blank. This
  produces both false failures and false confidence.
- **Look at the screenshots.** `npm run test:shots` captures every chapter at
  every viewport into `tests-e2e/screenshots/`. Assertions only catch what
  someone thought to describe; the 320px headline sitting unreadable over the
  diamond was found by looking, not by a passing test.
- When a test fails, decide honestly whether the page or the test is wrong.
  Several checks here were wrong first: `scrollHeight > clientHeight` only
  means clipped when overflow is non-visible; counting dark pixels measures
  darkness, not emptiness, on a deliberately near-black design.
- A file-level `test.use({ launchOptions })` **replaces** the config object
  wholesale — re-supply `executablePath` via `tests-e2e/browser.js` or the
  browser will not launch.
- New chapters go in the `CHAPTERS` array in `tests-e2e/ngd.js`; the whole
  suite picks them up.

## Definition of done

`npm run lint` clean · `npm run build` green · `npm run test:e2e` green across
all five viewports · screenshots reviewed by eye · no console errors · no
horizontal overflow at 320px.
