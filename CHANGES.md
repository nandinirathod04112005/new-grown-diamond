# UI refinement — September 10, 2026

## Substantial showroom redesign (latest pass)

Implemented a new 40/60 homepage composition with oversized type, a dominant framed diamond, original rotating headlines and stronger existing CTAs. Replaced repetitive pinned homepage chapter cards with natural-flow editorial spreads, including an ivory grading section, full-width material visual and asymmetric jewellery composition. Reworked the transparent/solid header, framed shared banners, journal cards, catalogue/filter presentation, contact forms, authentication theme surfaces and ivory footer. No business copy, media, links, form logic or product behavior was changed by this pass.

Actual changed UI files: `src/sections/home/Atelier.jsx`, `Atelier.module.css`, `Chapter.jsx`, `Chapter.module.css`; `src/components/chrome/Header.jsx`, `Header.module.css`, `Footer.module.css`; `src/components/layout/PageHero.module.css`, `HeroBackdrop.module.css`; `src/components/product/DiamondCard.module.css`, `StoneFilters.module.css`; `src/pages/EditorialPage.module.css`, `InventoryPage.module.css`, `JewelleryPage.module.css`, `BlogsPage.module.css`, `UtilityPages.module.css`; `src/pages/auth/AuthShell.jsx`, `Auth.module.css`; `src/styles/tokens.css`.

Latest evidence:

- Desktop hero: [before](tests-e2e/showroom/before/home-1440-dark.png) / [after](tests-e2e/showroom/after/home-1440-dark.png).
- Mobile hero: [before](tests-e2e/showroom/before/home-390-dark.png) / [after](tests-e2e/showroom/after/home-390-dark.png).
- [Ivory grading spread](tests-e2e/showroom/after/settled-precision-1440.png), [framed education banner](tests-e2e/showroom/after/education-1440-dark.png), [light authentication](tests-e2e/showroom/after/login-390-light.png).
- Browser verified the loaded hero's actual computed layout: 506.875px/760.344px columns at 1440px, 82.08px headline, 580px photograph. This confirms the changed imported frontend styles are rendering.
- Seven routes captured at 390/1440px in both themes; no document overflow and one H1 each. Additional home/education/contact/login checks passed at 320/768/1920px in both themes, including invalid sign-in and mobile Escape/focus restoration. Normal-motion hero and settled chapter screenshots were inspected; no live enquiry was sent.
- Production build passed with the existing optional Three.js size warning. Lint passed with warnings in `ContinueNext.jsx`, `AdminOverview.jsx` and unused imports in concurrently edited `queries/jewellery.js`.
- Asset/public/schema hashes match the start-of-pass snapshot. The initial whole-source preservation assertion detected concurrent admin/backend edits outside this redesign; those edits were left intact and are listed separately by `showroom-checks.mjs --preservation-only`. Browser assertions passed before that audit assertion; the updated preservation-only check then passed.

External data requests were blocked for deterministic screenshots. Live inventory, successful authentication/email delivery and protected admin workflows are not certified by this design review. No deployment was performed; the existing development server serves the changes.

---

Implemented in the existing React/Vite app. Existing uncommitted About/story and motion-foundation work was retained. No deployment, dependency additions, asset replacement, production submissions, account creation, or backend configuration changes were made.

## Findings and changes

- **Closed mobile navigation remained in the tab order.** The sheet's `display: grid` overrode its native `hidden` attribute. Closed sheets now use `display: none`; the focus loop includes the close button, Escape restores focus/scroll, and desktop resize closes the sheet. Mobile language selection remains available inside the menu. Theme controls and submenu links have 44px minimum targets.
- **Shared banners had doubled top spacing.** Editorial/contact page padding compounded banner padding. Photographic shared banners now own their spacing and extend to page edges. Mobile decorative motifs are hidden so the heading and photograph take priority. Existing About story architecture remains intact.
- **Banner effects competed with the image and delayed the opening.** Removed the blur/fade opening, continuous drift and shine. Images stay visible during a small scale settle; shared banner copy stays fully opaque during short offsets. Scroll progress now schedules frames on scroll/resize only while visible and responds to changed reduced-motion preferences. Route-specific desktop/mobile focal positions distinguish reused imagery.
- **The house accent was cyan despite the brief's gold direction.** Shared tokens now use muted gold on ink and darker gold on ivory. Existing technical route accents remain. Cormorant Garamond, Jost, dark default and the light theme remain.
- **The light footer used dark text on a fixed black background.** It now follows theme surfaces, with a controlled heading scale, wrapping contact links and generous link targets.
- **Journal cards and notices retained hard-coded dark surfaces.** They now use theme surfaces, more readable metadata/excerpts, equal-height cards and a quieter focus treatment. The existing `/blogs/:slug` page was verified in source; no replacement route or invented articles were added.
- **Editorial paragraph styling never matched.** Its `:last-child` selector missed paragraphs followed by a decorative rule. A direct paragraph selector restores the intended measure, size and leading.
- **Task details needed consistency.** Contact selects inherit the theme's native control scheme; jewellery closing copy/actions use the panel's paired foreground; shared admin tables have larger labels, targets, tabular figures and mobile wrapping for long references.

## Changed implementation files

- Shared system: `src/styles/tokens.css`, `src/styles/global.css`.
- Navigation/footer: `Header.jsx`, `Header.module.css`, `ThemeToggle.module.css`, `Footer.module.css` under `src/components/chrome/`.
- Banners: `HeroBackdrop.jsx`, `HeroBackdrop.module.css`, `PageHero.jsx`, `PageHero.module.css` under `src/components/layout/`; `src/hooks/useHeroProgress.js`; crop props in `src/App.jsx` and `src/pages/EditorialPage.jsx`.
- Pages: `EditorialPage.module.css`, `BlogsPage.module.css`, `BlogPostPage.module.css`, `JewelleryPage.module.css`, `UtilityPages.module.css` under `src/pages/`.
- Administration: `src/components/admin/DataTable.module.css`.
- Documentation: `DESIGN.md`, this report. QA scripts: `tests-e2e/atelier-review.mjs`, `atelier-interactions.mjs`, `atelier-final-checks.mjs`.

## Visual evidence

| View | Before | After |
| --- | --- | --- |
| Mobile education, dark | [Before](tests-e2e/atelier-review/before/education-390-dark.png) | [After](tests-e2e/atelier-review/after/education-390-dark.png) |
| Mobile education, light | [Before](tests-e2e/atelier-review/before/education-390-light.png) | [After](tests-e2e/atelier-review/after/education-390-light.png) |
| Journal and footer, light | [Before](tests-e2e/atelier-review/before/blogs-full-390-light.png) | [After](tests-e2e/atelier-review/after/blogs-full-390-light.png) |
| Desktop contact, dark | [Before](tests-e2e/atelier-review/before/contact-1440-dark.png) | [After](tests-e2e/atelier-review/after/contact-1440-dark.png) |

Additional desktop/mobile captures are in `tests-e2e/atelier-review/`. The interaction folder contains initial, settled and mid-scroll banner captures, menu, viewer and local admin-table evidence. Captures were visually sampled; automated layout checks covered the full route matrix. Early interaction captures preceded the final parent-padding adjustment; refreshed after screenshots show the final layout.

## Verification

- `npm.cmd run lint`: passes with two existing `set-state-in-effect` warnings in `ContinueNext.jsx` and `AdminOverview.jsx`.
- `npm.cmd run build`: passes, including SEO shell generation. The existing optional Three.js chunk-size warning remains.
- `motion-foundation-smoke.mjs`: passes at 360, 768, 1440 and 1920px, including reduced motion and StrictMode cleanup.
- Responsive browser review: 15 routes × six widths (320, 375, 390, 768, 1440, 1920) × two themes. No document overflow; one H1 per settled route. Final affected screenshots were refreshed after the spacing adjustment. JSON reports are beside the captures.
- Keyboard menu, Escape/focus restoration, resize dismissal, invalid contact/sign-in forms and viewer missing-certificate/reference checks pass. No valid enquiry or authentication request was submitted.
- Eleven banner routes captured at 390/1440px in both themes, initial/settled/mid-scroll; changed high-priority images become still under reduced motion.
- Direct production-preview loads for education, contact, nested journal, login and diamonds return HTTP 200 and render their main region.
- Local synthetic admin-table component checks exercise long-reference wrapping at 320/1440px and sorting without opening protected records. Empty inventory filters retain a local test stone. These are component tests, not evidence of live inventory or administrator access.
- Contact reflow checked at 720×450 CSS pixels, equivalent to a 1440×900 viewport at 200% zoom; this is a viewport-equivalence check, not a browser zoom-setting test.
- All 95 protected asset/public/backend files in the existing preservation baseline match their hashes. No images, business data queries, schema or access policies were changed.
- Before/after compressed JS+CSS totals (Node zlib gzip): 627,233 → 624,527 bytes, a reduction of 2,706 bytes. Entry JS: 111,468 → 111,624 bytes gzip (+156 bytes). Complete measurements are in `bundle-before.json` and `bundle-after.json`; these are bundle sizes, not performance scores. Optional Three.js remains a separate chunk.

## Limits

External requests were blocked during deterministic browser checks. Journal captures therefore show loading/failure presentation rather than verified published content; inventory and authenticated account/admin data were not validated live. Real certificate/video endpoints, portrait/landscape remote product media and successful form outcomes still need an authorized connected environment. No Lighthouse or low-power-device performance score is claimed, and this is not a full accessibility conformance audit.

The existing 754×541 brilliant macro remains the 404 backdrop and may look soft at large sizes. Some banner routes still reuse existing imagery; crops distinguish them without introducing replacement assets.
