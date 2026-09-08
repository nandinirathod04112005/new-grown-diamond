# New Grown Diamond — Technical SEO QA

Audit date: 7 September 2026  
Production origin verified: `https://newgrowndiamond.com`  
Scope: current React/Vite repository, 11 public routes, authentication/account routes, admin route family, production build output, hosting rules, assets, headings, links, structured data and performance architecture.

These scores measure implementation quality. They are not Google ranking predictions and do not imply a Top 5 result.

| Area | Score |
|---|---:|
| Technical SEO | 88/100 |
| On-page SEO | 79/100 |
| Content SEO | 63/100 |
| Performance SEO | 74/100 |
| Structured Data | 84/100 |
| Crawlability | 87/100 |
| Overall implementation | 80/100 |

## CRITICAL ISSUES

### Resolved: every URL returned the same generic HTML metadata

- Files: `index.html`, `src/App.jsx`, `src/components/seo/SeoHead.jsx`, `src/config/seo.js`, `scripts/generate-seo-pages.mjs`
- Previous problem: Vite emitted one empty-root HTML document with a generic title and description. Route titles were changed only in a React effect. Canonicals, robots metadata, Open Graph, X/Twitter metadata and JSON-LD were absent.
- Impact: crawlers and social unfurlers that do not execute the app saw identical metadata for every URL. Even rendering crawlers had to execute JavaScript before understanding page identity.
- Fix: build-time route HTML shells now contain unique titles, descriptions, canonicals, robots directives, Open Graph, X/Twitter metadata and valid JSON-LD. Client navigation updates the same fields synchronously.

### Resolved: private routes inherited indexable homepage metadata

- Files: `src/config/seo.js`, `src/components/seo/SeoHead.jsx`, `scripts/generate-seo-pages.mjs`, `public/robots.txt`
- Previous problem: login, registration, password recovery, account and admin URLs could inherit the site's generic indexable metadata.
- Impact: low-value utility URLs could enter the index and dilute crawl/index signals.
- Fix: private route families now emit `noindex,nofollow`, omit canonicals and are excluded from the sitemap. `robots.txt` also discourages crawling, while meta robots remains the index-control mechanism.

## HIGH PRIORITY

### Important page body content remains client-rendered

- Files: `src/main.jsx`, `src/App.jsx`
- Finding: route metadata is now present in the initial response, but the meaningful visual page body is still mounted by React into an initially empty root. A concise `<noscript>` fallback is emitted; it is not a substitute for full HTML prerendering.
- Impact: Google can normally render this app, but rendering is slower and less reliable than receiving primary copy, headings and links in the first HTML response. Non-rendering crawlers get only metadata and the fallback.
- Recommendation: use a controlled static prerender pass for public routes after browser-safe component boundaries have been established. Do not migrate frameworks solely for this. Inventory and blog content sourced at runtime need a separate data-aware build or server-rendering strategy.

### No approved social sharing image exists

- Files: site-wide
- Finding: titles, descriptions and URLs are present, but `og:image` and `twitter:image` were deliberately not fabricated from a tiny favicon or cursor asset.
- Impact: social cards will be text-only or select an unpredictable page image.
- Recommendation: commission/approve a 1200×630 brand image, place it in `public/`, and add its absolute URL to centralized SEO configuration.

### Blog detail pages are not implemented

- Files: `src/pages/BlogsPage.jsx`, `src/lib/supabase/queries/blogs.js`
- Finding: the query layer anticipates detail records, but the router had no `/blogs/:slug` renderer. Published cards previously linked to guaranteed Not Found pages.
- Fix: removed the broken links while retaining cards and excerpts.
- Recommendation: add an actual article template, stable slug route, per-post metadata, Article schema, sitemap generation and real 404 handling before restoring links. The database is documented as not yet created, so fabricating routes or articles would be inappropriate.

### Product landing URLs and Product schema do not exist

- Files: `src/pages/InventoryPage.jsx`, `src/components/product/StoneViewer.jsx`
- Finding: stones open in a modal and have no stable crawlable URL. Pricing can be hidden and availability is runtime data.
- Impact: individual stones cannot rank as product pages, be linked externally, or safely support Product/Offer schema.
- Recommendation: if individual inventory indexing is commercially desired, create stable public IDs/slugs, server-accessible product HTML, canonical URLs and a lifecycle for sold/removed stock. Add Product and Offer only where the visible page supports every claimed property. No fake Product schema was added.

### Production 404 and redirect behavior requires deployment verification

- Files: `vercel.json`, `public/_redirects`, generated `dist/404.html`
- Previous problem: a catch-all 200 rewrite made every unknown URL a soft 404.
- Fix: static public route files are now emitted; Vercel only rewrites the admin route family, and Netlify/Cloudflare rules return generated `404.html` with status 404 for unmatched paths. Trailing slashes are disabled on Vercel.
- Manual verification: confirm the selected host serves `/about` from `/about/index.html`, redirects `/about/` to `/about`, and returns a real 404 status for a random URL. Hosting behavior cannot be proven from a local Vite preview server.

## MEDIUM PRIORITY

- Several images rely on CSS-sized containers without explicit intrinsic dimensions. The homepage's first-view polished diamond now has dimensions and high fetch priority, and important inventory/jewellery images already have dimensions. Add accurate dimensions to remaining content images after verifying their source pixels; do not use placeholder dimensions.
- `src/sections/diamonds/StageFilm.jsx` places the same 1.33 MB autoplay video in two frames. Browser transfer should be cached, but two video elements may add decode and compositing cost. Profile on mid-range mobile hardware before refactoring the animation.
- `src/assets/diamonds/ngd-diamond-hourglass-v2.png` is about 1.50 MB. It belongs to the currently unused alternate `Hero.jsx`, so it is not in the active build. Keep it out of the active path or convert it to AVIF/WebP before reuse.
- The first HTML does not preload a route-specific LCP image. Because the active homepage image is discovered after the module executes, a generated preload using the final hashed asset could improve LCP. Validate with lab and field data before adding preloads globally.
- There is no approved real-user monitoring for LCP, INP or CLS. Build inspection can identify risks but cannot produce trustworthy Core Web Vitals scores.
- `npm run lint` reports one pre-existing `react(set-state-in-effect)` warning in `src/components/chrome/ContinueNext.jsx`. It is not introduced by this work and is not presently an SEO blocker.
- No privacy or terms routes are present in the current React route table. Add them only when approved legal copy is available.
- Page breadcrumbs are represented in structured data but not visually rendered. Visible breadcrumbs would be useful on deeper future content and product pages; the current two-level editorial routes do not require extra chrome.

## PASSED CHECKS

- 11 canonical, indexable public routes are explicitly enumerated.
- Every public route has a unique build-time title and meta description.
- Every public route has one self-referencing absolute canonical using the verified production origin.
- Query strings are excluded from canonical construction; client routing normalizes trailing slashes.
- Private/admin/error pages use `noindex,nofollow` and have no canonical.
- `robots.txt` allows public pages, does not block assets and names the sitemap.
- `sitemap.xml` contains only canonical public URLs; auth, account, admin, errors, query/filter states and nonexistent product/blog detail URLs are excluded.
- Each public page renders one primary H1 in the React view. The unused alternate hero does not render alongside the active homepage.
- Public page H1s are unique. H2/H3 structure is generally logical within editorial sections, inventory cards and homepage chapters.
- Organization facts used in schema are backed by repository-visible contact content. No ratings, reviews, prices, availability, founders, awards or unverified social profiles were invented.
- Organization, WebSite, WebPage and BreadcrumbList JSON-LD parse successfully in generated HTML.
- Product/Offer and FAQ rich-result schema were withheld because the current URL/content model does not support them reliably.
- Meaningful in-repository images generally have contextual alt text; decorative overlays, duplicated echoes, cursor art and compositing images correctly use empty alt text.
- Below-fold images generally use lazy loading and async decoding. The likely homepage LCP image is eager and high priority.
- Fonts are local WOFF2 files and use `font-display: swap`.
- Internal navigation uses real `<a href>` elements, so links remain discoverable without relying on click handlers.
- All hard-coded public internal links resolve to implemented public routes after removal of the premature blog detail links.
- External GIA educational citation opens safely with a non-opener relationship.
- Mobile navigation retains crawlable anchors and has keyboard/focus handling.
- Reduced-motion paths exist throughout the major scroll, pointer, GSAP and media experiences.
- Heavy Three.js modules are currently dead code and do not enter the production bundle. Raw WebGL effects remain, so runtime profiling is still required.
- Vite production build succeeds with no broken imports or JSX errors.
- SEO validation confirms unique metadata, canonical correctness, index controls, sitemap membership and parseable JSON-LD.

## FIXES APPLIED

1. Added a centralized production origin, route inventory, unique metadata and schema helpers.
2. Added synchronous route-head updates for in-app navigation and browser back/forward navigation.
3. Added build-time HTML generation for all public routes and noindex utility routes.
4. Added valid Organization, WebSite, WebPage and BreadcrumbList JSON-LD without unsupported claims.
5. Added `robots.txt` and a canonical-only XML sitemap; the build regenerates the sitemap from the same public-route source used for route shells.
6. Replaced catch-all 200 deployment routing with static route delivery and true-404 fallbacks where the host supports the checked configuration.
7. Added route-level code splitting for inventory, jewellery, editorial, blog, auth and admin views while keeping the homepage in the initial graph to avoid delaying its LCP candidate.
8. Marked the active homepage diamond image with accurate dimensions, eager loading and high fetch priority.
9. Removed article links to an unimplemented route.
10. Added an automated SEO build-output validator.

## MANUAL TASKS

1. Verify ownership and canonical host choice (`https://newgrowndiamond.com`, non-www) at the CDN and redirect HTTP/www variants with one permanent hop.
2. Approve and supply a 1200×630 social image; then add Open Graph and X/Twitter image metadata.
3. Confirm all office addresses and phone numbers with the business before launch. The schema uses the Surat details already shown in the repository.
4. Confirm which certification laboratories and Type IIa claims apply to each inventory item. Keep claims conditional and product-specific.
5. Implement blog storage and detail pages only when real editorial content is ready.
6. Decide whether live stones need indexable product URLs; define sold-item retention/redirect rules before implementation.
7. Run Rich Results Test and Schema Markup Validator against the deployed URLs.
8. Run Lighthouse and WebPageTest on representative mobile hardware, then monitor CrUX/Search Console field data.
9. Verify Vercel or chosen-host status codes, cache headers, MIME types, redirects and deep links after deployment.
10. Create/verify a Google Business Profile only for customer-facing eligible locations and keep NAP details consistent.

## CONTENT OPPORTUNITIES

The current site has useful introductory content but not enough depth to cover every commercial topic without cannibalization. Add pages only with company-specific expertise, original process detail, approved photography and factual sourcing.

| Recommended URL | Primary intent | Notes |
|---|---|---|
| `/lab-grown-diamond-manufacturing` | Lab grown diamond manufacturer India / Surat | Explain actual capabilities, QC, ranges, order process and B2B support. Avoid a thin location doorway page. |
| `/cvd-diamonds` | CVD diamond manufacturer / supplier | Expand the existing technical material with company-specific production and purchasing guidance. |
| `/hpht-diamonds` | HPHT diamond manufacturer | Separate only if NGD has enough verified HPHT expertise and commercial offering to support a full page. |
| `/wholesale-lab-grown-diamonds` | Wholesale lab grown diamonds | Address MOQ, range, inspection, certification, fulfilment and international buyer workflow using verified facts. |
| `/lab-grown-diamond-certification` | IGI certified lab grown diamonds | Explain report fields and verification with links to primary grading-lab sources. |
| `/type-iia-lab-grown-diamonds` | Type IIA lab grown diamonds | Publish only after a qualified expert approves the scientific and inventory-specific claims. |
| `/custom-lab-grown-diamond-jewellery` | Custom lab grown diamond jewellery | Expand the existing jewellery page once approved work, materials, lead times and process evidence are available. |

Intent ownership should remain: homepage = brand + broad manufacturer; about = entity/Surat; diamonds = live loose inventory; jewellery = custom service; education = learning hub; comparison = CVD/lab-grown versus natural; shapes = shape selection; why = purchase rationale; FAQ = concise questions; blog = original expertise/news.

## PERFORMANCE FINDINGS

- Baseline build: one approximately 413.28 KB JavaScript app chunk (128.67 KB gzip), plus GSAP at 77.86 KB and Supabase at 208.64 KB vendor chunks.
- Final build: approximately 301.43 KB initial app chunk (95.66 KB gzip), with inventory (~37.11 KB), auth, admin and editorial functionality separated into on-demand chunks. This is about a 27% reduction in the main app chunk before gzip and about a 26% reduction after gzip.
- CSS is also split by route. The homepage stays in the initial graph deliberately so its main image and presentation code are not delayed by an extra dynamic-import round trip.
- The 1.33 MB CVD furnace video is the largest active media asset. It loads on `/diamonds`, not on the homepage, but mobile decode/compositing should be measured.
- Supabase remains a separate cacheable vendor chunk. It is required by shared/auth/inventory paths; further deferral would require a larger architectural change and should be driven by a network trace.
- Three.js source exists but is not referenced by the active component tree and does not appear in the final bundle. No Three/WebGL initial-load penalty was found from those modules.
- GSAP remains intentionally present. Major effects use scoped cleanup and reduced-motion checks. Continuous animation loops and raw WebGL still warrant INP/thermal profiling on real devices.
- CLS protections are good on several key images, but not universal. The homepage LCP candidate now has a stable intrinsic ratio.
- No numerical LCP/INP/CLS claim is made without a deployed origin and field/lab measurement.

## SEARCH CONSOLE CHECKLIST

1. Add both Domain property and canonical URL-prefix property.
2. Verify DNS ownership and preferred host redirects.
3. Submit `https://newgrowndiamond.com/sitemap.xml`.
4. Inspect `/`, `/diamonds`, `/about`, `/education`, `/jewellery` and `/contact`; compare fetched HTML and rendered screenshot.
5. Confirm selected canonical equals the declared self-canonical and watch for duplicate-without-user-selected-canonical reports.
6. Confirm login, account, password and admin URLs report Excluded by `noindex`, not Blocked by robots alone.
7. Monitor Page indexing for soft 404s and Crawled/Discovered — currently not indexed.
8. Review Core Web Vitals separately for mobile and desktop after enough field data accumulates.
9. Review HTTPS, Mobile Usability and rich-result/structured-data enhancement reports.
10. Check query/filter URLs under `/diamonds`; they should consolidate to `/diamonds` and stay out of the sitemap.
11. Request indexing only for important canonical pages after live HTML, redirects and status codes pass QA.
12. Track branded and non-branded queries by landing page to identify cannibalization; do not treat average position as a ranking guarantee.

## FILES CHANGED

### Created

- `CODEX-SEO-QA.md` — audit, priorities, fixes, manual work, content plan, performance findings, checklist and engineering scores.
- `src/config/seo.js` — one source of truth for routes, metadata, canonical origin, index controls and schema.
- `src/components/seo/SeoHead.jsx` — route metadata/schema updates during SPA navigation.
- `scripts/generate-seo-pages.mjs` — build-time route HTML, sitemap, private noindex shells and 404 generation.
- `scripts/validate-seo.mjs` — automated production-output SEO assertions.
- `public/robots.txt` — public crawl policy, private route exclusions and sitemap discovery.
- `public/sitemap.xml` — canonical public route inventory.

### Modified

- `index.html` — accurate homepage fallback title, description, canonical, robots, Open Graph and X/Twitter metadata.
- `package.json` — runs SEO route generation after Vite and exposes `seo:validate`.
- `src/App.jsx` — central SEO head integration and route-level lazy loading.
- `src/pages/BlogsPage.jsx` — removes links to nonexistent blog detail routes.
- `src/sections/home/Atelier.jsx` — stabilizes and prioritizes the likely homepage LCP image.
- `vercel.json` — removes the public catch-all soft-404 rewrite, normalizes trailing slashes and keeps the admin SPA rewrite.
- `public/_redirects` — returns a real 404 fallback while preserving the admin SPA route family.

## COMMANDS TO TEST

```powershell
npm.cmd run build
npm.cmd run seo:validate
npm.cmd run lint
npm.cmd run preview
```

Expected result: build and SEO validation pass. Lint currently completes with one pre-existing warning in `ContinueNext.jsx`.
