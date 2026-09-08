# SEO Audit — New Grown Diamond

**Audited:** 7 September 2026
**Repository:** `nandinirathod04112005/new-grown-diamond`, branch `react-frontend-2026`
**Method:** static inspection of the repository, a production build, a headless crawl of all 15 routes at 1440px and 390px, and live HTTP checks against the company's current domain.

---

## Important context before reading

An SEO implementation **landed in the working tree while this audit was running**, and it is not part of this audit's changes. Evidence: the first crawl found meta tags on only the last route visited; a re-crawl minutes later found them on all fifteen.

Uncommitted at the time of writing:

```
 M index.html          M package.json        M src/App.jsx
?? public/robots.txt   ?? public/sitemap.xml ?? scripts/
?? src/config/         ?? src/components/seo/
```

That work is **good** and covers a large part of Phases 3, 4, 5, 8, 14, 15 and 16. This audit therefore reports the *current* state, credits what is already done under **ALREADY GOOD**, and concentrates the findings on what is still open.

Items marked **✅ FIXED** were then implemented in this pass, at the user's direction, scoped to CRITICAL and HIGH only. Everything else is left as a recommendation.

**A note on method.** Three findings changed materially once measured rather than read. H-1 and H-2 were overstated — the code smells are real but their impact is nil. The genuinely severe defect (H-2b, `/diamonds` CLS 1.0) was invisible to static reading and only surfaced under a `PerformanceObserver`. The corrections are kept in place rather than quietly deleted, because the difference between a plausible finding and a measured one is the whole point of an audit.

---

## Architecture summary

| Aspect | Finding |
|---|---|
| Framework | React 19 + Vite 8 (Rolldown bundler), JavaScript (not TypeScript) |
| Routing | **Custom** router — `src/lib/router.js`, path held in state, one delegated click listener. `react-router-dom` is a dependency but **imported nowhere** |
| Rendering | SPA, **plus** a post-build prerender step (`scripts/generate-seo-pages.mjs`) emitting a static HTML shell per route |
| Styling | CSS Modules + design tokens (`src/styles/tokens.css`), light/dark themes |
| Animation | GSAP + Lenis + CSS/scroll-driven scenes. **No Three.js at runtime** — see MEDIUM-1 |
| Data | Supabase (diamond inventory, blogs, enquiries) |
| Public routes | 11 · Private 5 · Admin 3 |
| Build output | 4.5 MB total; main bundle 301 kB (96 kB gzip) |

---

## Scoring

Internal audit score, **not** a prediction of Google ranking.

| Area | Score | Note |
|---|---|---|
| Indexability & crawl | 9 / 10 | prerendered shells, robots, sitemap all correct |
| Metadata | 10 / 10 | complete, image included |
| Structured data | 8 / 10 | valid, factual, centralised; no Product coverage |
| Canonicalisation | 5 / 10 | correct in code, **broken at the host** |
| Content depth | 5 / 10 | several thin pages, no product pages |
| Performance / CWV | 9 / 10 | *(was 4/10 before measuring — `/diamonds` CLS was 1.0)* now CLS 0 site-wide, LCP 220–540 ms |
| Images | 8 / 10 | 100% alt coverage; missing dimensions verified harmless (CSS reserves space) |
| Internal linking | 6 / 10 | good hubs, no crawlable breadcrumbs |
| **Overall** | **7.6 / 10** | *(6.6 at audit time)* — remaining gaps are C-1 (host), H-3 (product pages) and H-4 (content) |

---

# CRITICAL

### C-1 · The domain serves the same site on two hostnames with no redirect

- **File:** hosting/DNS (outside the repo); `src/config/seo.js` line 2 chooses the target
- **Problem:** Verified live — `https://newgrowndiamond.com/` and `https://www.newgrowndiamond.com/` **both return HTTP 200** with no redirect in either direction (`Server: Microsoft-IIS/10.0`). `SITE_URL` is set to the non-www form, so every canonical, every sitemap entry and every `og:url` points at non-www while the site is equally reachable on www.
- **SEO impact:** Textbook duplicate content across hostnames. Link equity splits between two hosts, Google picks a canonical host itself and may not pick yours, and Search Console reports two separate properties. This is the single highest-value fix in this document and **no amount of code can fix it** — canonical tags are a hint, a 301 is an instruction.
- **Recommended change:** Pick one host (non-www matches the code as written), then add a permanent **301 from www → non-www at the host**, covering every path. Keep `SITE_URL` and the chosen host identical for ever after. Verify with `curl -I https://www.newgrowndiamond.com/` returning `301` and a `Location:` on the non-www host.

### C-2 · No `og:image` or `twitter:image` on any page ✅ FIXED

- **File:** `src/components/seo/SeoHead.jsx`, `index.html`, `scripts/generate-seo-pages.mjs`
- **Problem:** The crawl found 5 `og:` tags (`site_name`, `type`, `title`, `description`, `url`) and 3 `twitter:` tags (`card`, `title`, `description`) on every indexable route. There is **no image tag of any kind**, and `twitter:card` is `summary` rather than `summary_large_image`.
- **SEO impact:** Every share of this site on WhatsApp, LinkedIn, X, Slack, Facebook or Pinterest renders as a bare text link with no picture. For a **diamond** business — where the product is purely visual and B2B buyers routinely forward links to colleagues — this is the most costly missing tag on the site. It also removes the image Google may use in social/discover surfaces.
- **Change made:** `public/og-cover.jpg` — 1200×630, 52 kB, composed from the company's own `ngd-brilliant-macro.webp` stone photograph on the site's ink ground. Served from `public/` so the URL never changes (a hashed bundle asset would break every link already shared), and JPEG rather than WebP because several link scrapers still refuse WebP. Wired through `src/config/seo.js` → `SeoHead.jsx` → `index.html` → `scripts/generate-seo-pages.mjs` so all four stay in sync and a per-route override is possible later. `twitter:card` raised to `summary_large_image`. **Verified: 9 `og:` and 5 `twitter:` tags per public route, present in the prerendered HTML before any JS runs.**
- **Original recommendation:** Add a `DEFAULT_OG_IMAGE` to `src/config/seo.js` and a per-route override where a genuinely representative image exists (`/diamonds` → a real inventory stone, `/shapes` → the shape guide). Emit `og:image`, `og:image:width`, `og:image:height`, `og:image:alt` and `twitter:image`, and switch `twitter:card` to `summary_large_image`. The asset must be an absolute URL on `SITE_URL`, ideally 1200×630. **A real photograph the company owns** — `src/assets/diamonds/ngd-brilliant-macro.webp` is a genuine NGD stone and a good candidate.

---

# HIGH

### H-1 · Hero image marked `loading="lazy"` — real code smell, no measured impact ✅ FIXED

- **File:** `src/components/layout/PageHero.jsx`
- **Problem:** `<img src={image} … loading="lazy" />` on what is structurally the hero image.
- **Correction after measurement:** the finding as first written **overstated the impact**. `image` is passed to `PageHero` by **no caller** — `grep` finds `image=` only in `Home.jsx`, and that goes to `Chapter`, not `PageHero` — so the branch never renders and the site has zero lazy hero images today. Measured LCP (mobile, 390px) is **text on every route**: `/` 540 ms, `/about` 244 ms, `/diamonds` 248 ms, `/education` 220 ms, `/shapes` 224 ms. All well inside the 2 500 ms "good" threshold.
- **SEO impact:** none today. The defect is latent: the first page to pass a hero photograph would silently get a deprioritised LCP image.
- **Change made:** `loading="eager"`, `fetchPriority="high"`, `decoding="async"`. Defensive hygiene, not a measured win — recorded here so the numbers are not overclaimed.

### H-2 · Missing image dimensions — largely a false alarm ✅ VERIFIED, NO CHANGE NEEDED

- **File:** site-wide
- **Problem as first written:** 28 of 36 homepage images carry no `width`/`height`, therefore CLS.
- **Correction after measurement:** the attribute count is accurate but the conclusion was wrong. The CSS already reserves space — `aspect-ratio` on containers, absolute positioning, fixed cell heights. Measured CLS: **homepage 0.0007**, `/about` **0**, `/shapes` **0**. There is no layout-shift problem to fix here.
- **Recommendation:** add `width`/`height` opportunistically as files are touched, for robustness if the CSS changes. Do **not** undertake a site-wide sweep for CLS reasons; the evidence does not support it. The nine partner-logo marks are the only genuinely unreserved images and they contribute nothing measurable.

### H-2b · `/diamonds` had a Cumulative Layout Shift of 1.0 ✅ FIXED

*Found only by measuring — no static reading of the code would have surfaced it.*

- **File:** `src/pages/InventoryPage.jsx`
- **Problem:** the stock finder panel rendered only once `stage === 'ready'`, i.e. after the Supabase fetch resolved. Traced frame by frame: at 300 ms the document was 18 554 px tall with three skeletons; at 900 ms the panel mounted and it became 19 748 px — a **1 194 px** jump that pushed every card and the entire footer down the page. Measured **CLS 1.0**, four times the 0.25 "poor" threshold.
- **SEO impact:** a direct, severe Core Web Vitals failure on the single most commercially important page on the site. This was by far the worst performance defect found, and it was introduced earlier in this same session by the filter work.
- **Change made:** the panel now mounts during `loading` as well, in an `aria-busy` state with counts withheld and nothing disabled. Its height is identical before and after the rows arrive, so the space is reserved correctly from first paint. **Re-measured: CLS 0 on `/`, `/diamonds`, `/about` and `/shapes`.**

### H-3 · No indexable product pages for the diamond inventory

- **File:** `src/pages/InventoryPage.jsx`, `src/components/product/StoneViewer.jsx`, `src/App.jsx`
- **Problem:** Every stone is rendered as a card that opens a **modal** (`StoneViewer`). There is no `/diamonds/:publicId` route, no URL per stone, and therefore no `Product` schema anywhere. The inventory carries `public_id`, `stock_number`, carat, colour, clarity, cut, polish, symmetry, fluorescence, laboratory, certificate URL and an image — a complete product record with no address.
- **SEO impact:** The most commercially valuable content on the site is entirely invisible to search. Queries like *"1.5 carat CVD radiant IGI certified"* have nothing to land on. No `Product`/`Offer` rich results are possible, and nothing can be linked to, shared or cited by an AI answer engine.
- **Recommended change:** Add a canonical `/diamonds/:publicId` route rendering the existing detail data as a real page (the modal can stay as the fast path from the grid). Then: self-referencing canonical, `Product` schema with only **factually present** fields, and `Offer` **only where genuine price data exists** — `price_visible` already exists in the schema, so honour it. Generate these URLs into the sitemap at build time from Supabase rather than hardcoding. Note the filter query strings must **not** produce indexable duplicates — see M-2.

### H-4 · Thin content on commercially important pages

- **File:** `src/pages/siteContent.js`, `src/pages/JewelleryPage.jsx`, `src/pages/BlogsPage.jsx`
- **Problem:** Rendered word counts from the crawl: `/blogs` **46**, `/jewellery` **141**, `/why-lab-grown` **151**, `/shapes` **197**, `/education` **234**, `/cvd-vs-natural` **277**. For comparison `/` is 858 and `/diamonds` 1039.
- **SEO impact:** `/jewellery` and `/why-lab-grown` carry high commercial intent and cannot compete at 141–151 words. `/shapes` targets a genuinely high-volume informational query with 197 words and no per-shape depth.
- **Recommended change:** Deepen, do not pad. `/shapes` deserves a section per shape (it already has photography and a wheel to hang it on). `/jewellery` needs the actual custom process, materials and MOQ reality. `/why-lab-grown` should carry the manufacturing specifics only this company can state. `/blogs` at 46 words is an empty shell — it needs posts, not copy. See `SEO-CONTENT-PLAN.md` (to be written in Phase 11).

---

# MEDIUM

### M-1 · Three.js and two other packages ship as dependencies but are never used

- **File:** `package.json`, `src/components/three/` (whole directory)
- **Problem:** Traced by import: `postprocessing`, `react-router-dom` and `framer-motion` are imported by **zero** files. `three`, `@react-three/fiber`, `@react-three/drei` and `@react-three/postprocessing` are imported only by `src/components/three/{Canvas3D,ProcessScene,Stone,Stone360}.jsx` and `src/lib/three/*`, and **nothing imports those components** — confirmed by the build emitting no `three-vendor` chunk despite `vite.config.js` defining one.
- **SEO impact:** None directly — tree-shaking keeps them out of the bundle. The impact is on install size, `npm audit` surface and maintenance clarity. It also corrects a common assumption: **this site's performance cost is not WebGL**, it is images and video.
- **Recommended change:** Delete `src/components/three/` and `src/lib/three/` if genuinely abandoned (check with the team first — this may be paused work), then drop the unused packages and the now-dead `three-vendor` entry in `vite.config.js`. Low risk, no user-visible change.

### M-2 · Filter state is not reflected in the URL — good today, a trap tomorrow

- **File:** `src/pages/InventoryPage.jsx`, `src/components/product/StoneFilters.jsx`
- **Problem:** The stock finder holds all state in React. No query strings are produced, so there is currently no duplicate-URL problem.
- **SEO impact:** None today. But the moment filters become shareable URLs (a very likely next request), `/diamonds?shape=Round&colour=D` becomes thousands of near-duplicate crawlable URLs.
- **Recommended change:** Decide the policy **before** adding URL state. Recommended: keep the self-referencing canonical on `/diamonds` for all filtered views, and add `<meta name="robots" content="noindex,follow">` for any URL carrying filter parameters. `normalizePath()` in `src/config/seo.js` already strips query strings, which is the right base.

### M-3 · No crawlable breadcrumb navigation

- **File:** `src/config/seo.js` (`pageSchemas`), all page components
- **Problem:** `BreadcrumbList` schema is emitted on every non-home page, but **no visible breadcrumb exists in the DOM**. The schema describes a navigation the user cannot see.
- **SEO impact:** Google's guidance is that structured data should describe visible content. A `BreadcrumbList` with no on-page equivalent risks being ignored, and the site loses a real internal-linking and orientation benefit. Also note the breadcrumb currently derives its label from `seo.title.split(' | ')[0]`, which produces *"Loose Lab Grown Diamonds"* rather than a short crumb.
- **Recommended change:** Add a small visible breadcrumb to the editorial template (`EditorialPage`) and the inventory page, and give each route an explicit short `breadcrumb` label in `SEO_BY_ROUTE` instead of slicing the title.

### M-4 · Sitemap has no `lastmod` and is hand-maintained

- **File:** `public/sitemap.xml`
- **Problem:** 11 `<url>` entries, `<loc>` only. It is a static file that must be edited by hand whenever a route is added — `/cvd-vs-natural` was added recently and is present, but nothing enforces that.
- **SEO impact:** Minor. `lastmod` helps crawl scheduling when accurate; a hand-maintained sitemap drifts.
- **Recommended change:** `scripts/generate-seo-pages.mjs` already iterates `PUBLIC_ROUTES` at build time — generate the sitemap there from the same constant, so the sitemap and the prerendered shells can never disagree. Add `lastmod` only if a truthful date is available (git commit date per route, or omit it — a fabricated `lastmod` is worse than none).

### M-5 · `supabase-vendor` (209 kB) loads on every route

- **File:** `vite.config.js`, `src/lib/supabase/client.js`
- **Problem:** The Supabase client is in a vendor chunk requested on all routes, though only `/diamonds`, `/blogs`, `/account` and `/admin` need it. 209 kB raw / 54 kB gzip.
- **SEO impact:** Adds parse/execute time to the main thread on every page, affecting **INP** and to a lesser extent LCP, including on pure-content pages like `/about` and `/faq` where it is never used.
- **Recommended change:** Route-level code splitting has already begun (a `Suspense` boundary is now in `App.jsx` and the main bundle dropped from 413 kB to 301 kB). Extend it so Supabase-dependent pages are dynamically imported and the vendor chunk loads only with them.

### M-6 · A 1.3 MB video ships in the bundle

- **File:** `src/assets/process/cvd-furnace.webm` → `dist/assets/cvd-furnace-*.webm` (1,298 kB)
- **Problem:** Largest single asset by a wide margin — nearly 30% of the 4.5 MB build. Also `cut-stone.jpg` at 381 kB (a JPEG among otherwise WebP assets) and `cvd-technical-schematic.webp` at 236 kB.
- **SEO impact:** Bandwidth on mobile connections; if the video is anywhere near the initial viewport it competes with the LCP resource.
- **Recommended change:** Confirm the video is `preload="metadata"` or lazy-mounted below the fold (`Process.jsx` and `Exhibit.jsx` already use `preload="metadata"`; `ScrubVideo.jsx` and `StageFilm.jsx` use `preload="auto"` — check those two). Re-encode `cut-stone.jpg` to WebP and cap the schematic's dimensions.

---

# LOW

### L-1 · Unknown routes return HTTP 200 (soft 404)
- **File:** `public/_redirects`, `vercel.json`, `src/App.jsx`
- **Problem:** `/no-such-page` returns **200** with the 404 page body. Inherent to SPA hosting rewrites.
- **Impact:** Minor. Google treats a "not found" body as a soft 404 and drops it, and `noindex,nofollow` is correctly applied.
- **Recommendation:** Accept and document, or serve a real 404 status from the host for paths outside the known set. Not worth architectural risk.

### L-2 · `twitter:card` is `summary`
- **File:** `src/components/seo/SeoHead.jsx`
- **Recommendation:** Change to `summary_large_image` once C-2 supplies an image.

### L-3 · No `theme-color`, no `apple-touch-icon`, no web manifest
- **File:** `index.html`, `public/`
- **Impact:** Not a ranking factor; affects mobile bookmarking and browser chrome only.
- **Recommendation:** Low priority. `favicon.svg` exists; a 180×180 `apple-touch-icon.png` is a five-minute addition.

### L-4 · No `hreflang`
- **Impact:** None currently — one language, one market set. Only relevant if a localised version is ever added.

### L-5 · Breadcrumb schema label derived by string-splitting the title
- Covered under M-3; listed separately because it is a one-line fix independent of the visible breadcrumb.

---

# ALREADY GOOD

These are correct and should be **preserved**. Most arrived in the parallel implementation described at the top.

| # | Finding | Evidence |
|---|---|---|
| G-1 | **Every route prerenders to static HTML.** `npm run build` emits `dist/<route>/index.html` for all 11 public and 5 private routes, each with the correct `<title>`, canonical and JSON-LD **before any JavaScript runs**. This removes the single biggest JS-SEO risk for a Vite SPA. | `dist/diamonds/index.html` contains `<title>Loose Lab Grown Diamonds | CVD &amp; HPHT Inventory</title>` and a canonical |
| G-2 | **Unique, keyword-aligned title and description on all 11 public routes**, centralised in `SEO_BY_ROUTE`. No duplicates, no stuffing, sensible lengths. | crawl of 15 routes |
| G-3 | **Self-referencing canonicals** on all public routes; correctly **absent** on private and 404 routes. | crawl |
| G-4 | **`noindex,nofollow` on `/login`, `/register`, `/account`, `/forgot-password`, `/reset-password`, `/admin` and unknown routes**, plus matching `Disallow` rules in `robots.txt`. Correctly uses both layers. | crawl + `public/robots.txt` |
| G-5 | **Valid, factual JSON-LD** — `Organization`, `WebSite`, `WebPage`, `BreadcrumbList`, centralised in `src/config/seo.js` with `@id` cross-references. **No fabricated ratings, reviews, prices or awards.** The address and phone match `siteContent.js`. | crawl: 3 schemas on `/`, 4 elsewhere |
| G-6 | **Exactly one `<h1>` per route**, on all 15 routes, with no heading-level jumps. | crawl |
| G-7 | **100% `alt` coverage** — zero images missing the attribute across the whole site; decorative images correctly use `alt=""`; no lazy `alt="image"` placeholders. | crawl |
| G-8 | **`robots.txt` and `sitemap.xml` exist, are correct, and exclude private routes.** Sitemap contains exactly the 11 canonical public URLs. | `public/` |
| G-9 | **Trailing-slash and query normalisation.** `normalizePath()` and `currentPath()` both strip trailing slashes and query/hash, so `/about/` and `/about` cannot diverge. | `src/config/seo.js`, `src/lib/router.js` |
| G-10 | **Self-hosted fonts with `font-display: swap`** and no render-blocking third-party font request. | `src/styles/fonts.css` |
| G-11 | **Semantic HTML** — one `<main>` per page, real `<nav>` landmarks, `<details>/<summary>` for the FAQ with **answers present in the DOM** (crawlable while collapsed). | crawl; `FaqPage.jsx` |
| G-12 | **Genuine accessibility work already in place** — focus-trapped mobile dialog, `prefers-reduced-motion` respected throughout, visually-hidden route announcements, `aria-expanded`/`aria-pressed` on controls. | `Header.jsx`, `*.module.css` |
| G-13 | **No render-blocking third-party scripts.** No analytics, tag manager, chat widget or ad script anywhere. | `index.html` |
| G-14 | **Theme applied pre-paint** via a synchronous inline script — avoids a flash without blocking. | `index.html` |
| G-15 | **Educational content is factually careful.** The CVD/HPHT and comparison copy describes growth chemistry, identification and certification accurately, and explicitly distinguishes diamond from simulants — real expertise, not AI filler. | `siteContent.js` |

---

## Recommended order of work

1. **C-1** — host-level 301. Nothing else in this list matters as much, and it is not a code change.
2. **C-2** — `og:image`. Cheapest high-value fix in the repo.
3. **H-1**, **H-2** — Core Web Vitals: eager hero, image dimensions.
4. **H-3** — diamond detail pages. Largest commercial gain, largest effort.
5. **H-4** — content depth on `/shapes`, `/jewellery`, `/why-lab-grown`.
6. **M-3**, **M-4**, **M-5** — breadcrumbs, generated sitemap, Supabase splitting.
7. **M-1**, **M-6**, **L-*** — cleanup.

## Explicitly not recommended

- **FAQ schema for rich results** — the user's brief rules it out and the FAQ page does not warrant it.
- **Programmatic city/keyword landing pages** — doorway pages, against the brief and against Google's guidelines.
- **`llms.txt`** — not a ranking factor; the prerendered HTML already serves AI crawlers.
- **Migrating to Next.js/SSR** — the prerender step already solves the crawlability problem. See `SEO-RENDERING-DECISION.md`.
