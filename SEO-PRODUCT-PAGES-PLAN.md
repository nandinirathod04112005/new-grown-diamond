# Plan — Indexable diamond detail pages (audit finding H-3)

**Status:** designed, not built. Scoped out of the current pass at the user's direction.
**Why it matters:** the most commercially valuable content on the site currently has no URL.

---

## The problem, stated precisely

Every stone renders as a card in `src/pages/InventoryPage.jsx` that opens `StoneViewer` — a **modal**. There is no route, no URL, no `Product` schema. A buyer searching *"2 carat radiant CVD IGI certified"* has nothing to land on, nothing to share with a colleague, and nothing an AI answer engine can cite.

The data is already complete. `DIAMOND_DETAIL_COLUMNS` in `src/lib/supabase/columns.js` exposes:

```
public_id · stock_number · shape · carat · color · clarity · cut · polish
symmetry · fluorescence · laboratory · report_number · certificate_number
certificate_url · measurements · depth_percentage · table_percentage · ratio
growth_method · availability · image_path · total_price · price_per_carat
currency · price_visible
```

That is a full product record with no address.

---

## Proposed URL

```
/diamonds/DIA-XXXXXXXX
```

`public_id` is already the stable, database-constrained identifier (`DIA-` plus eight uppercase alphanumerics, enforced by a Postgres constraint — see `newPublicId()` in `src/lib/supabase/queries/diamonds.js`). It is the right slug: stable, unique, already public, and never reused.

**Do not** use `stock_number` — it falls back to `public_id` when absent, so it is not guaranteed unique or stable.

Consider `/diamonds/2-01-carat-radiant-DIA-XXXXXXXX` for keyword value, with the `DIA-` id as the authoritative part and a 301 from the bare id form. Only worth it if someone owns the redirect logic; the plain id form is perfectly indexable.

---

## Implementation outline

### 1. Route

`src/App.jsx` — add alongside the existing `adminRoute()` pattern:

```js
const stone = path.match(/^\/diamonds\/(DIA-[A-Z0-9]{8})$/);
if (stone) return <DiamondDetailPage publicId={stone[1]} />;
```

`getDiamond(publicId)` already exists and already filters `active` and `archived_at`. A miss must render the **404 path**, not an empty product page — an archived or sold-out stone that returns 200 with no content is a soft 404 at scale.

### 2. Page

New `src/pages/DiamondDetailPage.jsx`. Reuse `StoneViewer`'s existing presentation rather than designing a second one — the modal keeps working as the fast path from the grid, and the page is the canonical, linkable version of the same content.

Must include, as **visible** content (schema describing invisible content is against Google's guidance):
- one `<h1>`, e.g. *"2.00 ct Radiant Lab-Grown Diamond — DIA-XXXXXXXX"*
- the full grading table
- the certificate link where `certificate_url` exists
- growth method (CVD/HPHT) stated plainly
- a link back to `/diamonds` and to the relevant `/shapes` section

### 3. SEO wiring

`src/config/seo.js` — `seoForPath()` is currently a **static lookup** and cannot describe a database row. Add a branch:

```js
export function seoForDiamond(stone) { … }   // title, description, canonical, image
```

- **canonical:** `${SITE_URL}/diamonds/${stone.publicId}` — self-referencing
- **title:** `2.00 ct Radiant CVD Lab Grown Diamond | IGI ${report}` — built from real fields, truncated to ~60 chars
- **og:image:** the stone's own `diamondImageUrl(image_path)`, which is a stable Supabase URL — this is the per-route override `DEFAULT_OG_IMAGE` was structured to allow

### 4. Structured data — and the honesty constraints

`Product` schema, emitted through the existing `pageSchemas()` helper. **Only fields that genuinely exist:**

| Emit | From | Condition |
|---|---|---|
| `name`, `sku` | `stock_number` / `public_id` | always |
| `image` | `image_path` | only if present |
| `material`, `size`, `color` | carat, colour, clarity | always |
| `brand` | `{ '@id': SITE_URL + '/#organization' }` | always |
| `offers` | `total_price`, `currency`, `availability` | **only if `price_visible === true`** |

Hard rules, restating the brief:

- **Never** emit `aggregateRating` or `review` — there are no reviews. Fabricating them is a manual action risk, not merely bad practice.
- **Never** emit `offers` when `price_visible` is false. The column exists precisely because trade pricing is often withheld; a schema that invents a price contradicts the page and misleads the buyer.
- `availability` must map honestly from the `availability` column (`In Stock` → `InStock`, `Sold` → `SoldOut`, `On Request`/`Reserved` → omit `offers` or use `PreOrder` only if that is genuinely true).

### 5. Sitemap

`scripts/generate-seo-pages.mjs` runs at build time and already imports from `src/config/seo.js`. Extend it to fetch active stone ids from Supabase and emit them into `sitemap.xml` alongside `PUBLIC_ROUTES`.

Two cautions:
- The build needs Supabase credentials. If CI lacks them, **fail soft** — emit the static routes and log a warning, rather than shipping an empty sitemap.
- Inventory turns over. Either rebuild on inventory change, or serve the sitemap from a small serverless endpoint instead of a static file.

### 6. Prerendering

The existing prerender writes one shell per known route. Diamond URLs are dynamic and numerous, so either:
- **(a)** prerender them too, at build time, from the same Supabase fetch — consistent with the current approach and keeps the no-JS guarantee; or
- **(b)** leave them client-rendered, accepting that Google renders JS but other crawlers and social scrapers may not.

**(a) is recommended** — it is a loop over the same `render()` function that already exists, and it is what makes the `og:image` per stone actually work for WhatsApp and LinkedIn.

### 7. Duplicate-content guard

Cross-reference audit finding **M-2**. If filter state ever moves into the URL, `/diamonds?shape=Round` must carry `noindex,follow` with the canonical pointing at bare `/diamonds`. Detail pages are the indexable surface; filtered lists are not.

---

## Effort and sequencing

| Step | Effort | Risk |
|---|---|---|
| Route + page | ~half a day | low — reuses `getDiamond` and `StoneViewer` |
| SEO wiring | ~2 hours | low |
| Product schema | ~2 hours | **medium** — the honesty conditions must be right |
| Sitemap from Supabase | ~2 hours | medium — build-time credentials |
| Prerender detail pages | ~2 hours | medium — build time grows with inventory |

Do **not** ship the schema before the visible page. A `Product` markup describing a page a user cannot see is exactly the pattern Google penalises.

---

## What this unlocks

- Long-tail commercial queries (*"1.5 ct oval CVD IGI"*) get a landing page
- `Product` rich results become possible where pricing is genuinely public
- Every stone becomes shareable with its own image card — the reason `og:image` was built to support per-route overrides
- AI answer engines gain a citable URL per stone rather than an opaque modal
