# NGD Design System

This document is the reference for extending New Grown Diamond without weakening its visual identity, accessibility, or performance.

## Design intent

NGD should feel like a precise diamond atelier rather than a generic ecommerce template. The experience combines editorial restraint, manufacturing credibility, controlled theatrical motion, and clear evidence for trade buyers.

The central idea is transformation: carbon becomes crystal, rough becomes planned, and a stone becomes a finished setting. Animation supports this sequence; it is not independent decoration.

## Brand principles

1. **Precision over excess.** Use measured spacing, fine rules, structured grids, and specific product information.
2. **Proof over unsupported claims.** Show certificates, inspection media, process explanations, and origin information.
3. **Editorial luxury over conventional retail.** Use large typography and deliberate pacing while keeping actions obvious.
4. **Motion with purpose.** Movement should reveal transformation, depth, or navigation state.
5. **Global presentation, local credibility.** Surat manufacturing is the origin; international offices establish reach.

## Visual language

### Colour

The house accent is muted gold: `#bda06a` on ink, with darker gold text in light mode. Technical process sections retain blue route accents. Shared controls have a 44px minimum target token. The footer, journal cards, and journal notices use theme surfaces instead of fixed dark backgrounds.

`src/styles/tokens.css` is the source of truth. Components should use shared custom properties instead of introducing near-duplicate values.

- Dark ink grounds create a controlled showroom atmosphere.
- Ivory surfaces provide the light editorial mode.
- Gold is the primary luxury and interaction accent.
- Cyan/blue light can represent technical CVD energy and optical effects.
- Muted slate supports secondary specifications and metadata.
- Error and success colours are reserved for system feedback.

Colour must never be the only way to communicate status.

### Typography

- Cormorant Garamond: major titles, expressive statements, and editorial contrast.
- Jost: navigation, body copy, labels, controls, and specifications.
- Italic display words may create material contrast inside headlines.
- Uppercase, widely tracked labels are for eyebrows, metadata, navigation, and technical markers.
- Body copy stays readable and direct; avoid long uppercase passages.

Fonts are self-hosted from `src/assets/fonts`.

### Controls and body copy

- Body copy reads at `--t-body` (16px on a phone, 17px on a wide screen); components that set their own size are unaffected.
- Every control reads `--control-h`, `--radius-control` and `--line-firm`; raised surfaces read `--surface-1` / `--surface-2`. All derive from theme tokens and flip with the theme.
- `.u-button` (primary, inverting against the ground) and `.u-button--ghost` (hairline) carry hover, focus, active, disabled and busy states. Reach for them before writing a new button.

### Spacing, grid, and media

- Use the global gutter and spacing tokens.
- Create hierarchy through whitespace before adding ornament.
- Editorial pages use a stable hero followed by numbered sections.
- Product data aligns consistently for quick comparison.
- Full-bleed media may break the grid only when it has narrative importance.
- Label technical illustrations when they could be mistaken for documentary photography.
- Decorative layers remain `aria-hidden` and cannot obstruct controls.
- Avoid generic stock imagery that weakens manufacturing credibility.

## Theme system

Dark is the authored default. The stored theme is applied synchronously in `index.html` before first paint to prevent a flash.

Every component must be tested in both themes, use semantic tokens where surfaces change, maintain readable contrast, and preserve visible focus indicators.

## Motion system

### Hierarchy

1. Route transitions communicate leaving and arrival.
2. Scroll chapters explain a process or story.
3. Reveals establish reading order.
4. Parallax and light effects add depth.
5. Hover and magnetic treatments confirm interactivity.

Lower-level motion must not compete with higher-level motion.

### Implementation rules

- Use shared durations and easing tokens.
- Prefer one shared pointer or scroll listener over one listener per component.
- Update continuous animation through requestAnimationFrame or animation libraries, not React state.
- Prefer transforms and opacity over properties that trigger layout.
- Start below-fold canvas and video work only near the viewport.
- Keep route departure faster than arrival.
- Short staggered reveals are acceptable; content must not feel locked.
- Homepage chapters approach in 20vh, hold for `max(58vh, 14vh per line)` and leave in 26vh; the atelier leaves in 34vh. Longer spacers left most of a viewport empty between chapters.

### Reduced motion

Every animation feature needs a `prefers-reduced-motion: reduce` path. Reduced motion removes theatre while retaining navigation, content, hierarchy, and feedback. Simplify or disable the custom cursor, route cover, smooth scroll, marquees, looping backgrounds, and large parallax effects. Page banners become a still photograph with its scrim in place: no opening, no drift, no light sweep, and scroll progress fixed at zero. Scenes are held at the `view` phase, so any scene with its own phase names (the atelier) must also style `view` — otherwise its headline never appears.

## Page patterns

### Header

The closed mobile sheet uses `display: none` so its links leave the tab order. Its focus loop includes the header close button, Escape restores focus and body overflow, and resizing to desktop closes the sheet. Mobile language selection remains in the menu; the header retains a 44px theme control.

Fixed, blending with `difference`, and never changing height. Once the page has scrolled 40px a gradient of the page's own scrim colour fades in beneath it (outside the blend) so the nav keeps its contrast over passing photographs and headlines. The current page carries `aria-current="page"`: a held underline on desktop, the accent colour in the phone sheet; Education counts as current on every page it lists. The path comes from the router's `subscribePath` store, not from a prop.

### Home

The homepage forms one transformation narrative: atelier opening, origin, independent grading, material truth, jewellery application, international supply, then a closing reel and action. Each chapter should make one clear claim with one supporting visual.

The atelier is a darkened stage in both themes (`u-stage-dark`). Chapter headings are capped at 4.4rem and balanced to two lines beside their plate; chapter copy reads at a paragraph size on a 56ch measure.

### Editorial pages

Photographic shared headers extend to the page edges and own their top spacing; their parent page does not add a second top gutter. Below 900px, decorative banner motifs are hidden and the banner uses a 36rem minimum height. Existing About story composition is preserved. Section prose uses an explicit paragraph selector so its decorative trailing rule cannot disable the reading styles.

`EditorialPage.jsx` is the shared structure for About, Education, Shapes, and Why Lab-Grown. `PageHero` receives an eyebrow, title, introduction, motif, accent, and a `backdrop` photograph (see Page banners); `PAGE_MOTIF` in `App.jsx` holds the per-route choice. Numbered sections should not duplicate content already explained by an interactive experience.

### Page banners

Every page opening except the homepage stands in front of a full-bleed photograph. One component does it everywhere — `components/layout/HeroBackdrop.jsx` — inside `PageHero`, the journal's opening, and the inventory's opening, so the pictures move the same way on every page.

**Layers, back to front:** photograph → accent wash (`soft-light`, from the page accent) → legibility scrim built from `--ink`, heavy on the left and at the bottom edge, open on the right → the page's tinted field and grain, settled lower over a photograph → the drawn motif as an etched ornament (`opacity .55`) → copy. Building the scrim from `--ink` is what makes one treatment hold in both themes; do not introduce a hard-coded dark overlay.

**Motion:** the photograph is visible immediately and settles with a small 0.8-second scale change. Continuous drift, blur opening, and the light sweep are disabled. Pointer/scroll transforms remain on the photograph; copy in photographic PageHero banners stays on a steady reading plane with brief, fully opaque entrance offsets. `useHeroProgress` schedules a frame on scroll or resize only while the banner intersects the viewport, and reacts to live reduced-motion preference changes. No ScrollTrigger scrub or pin is involved.

**Photographs in use:** About — Surat-to-world globe; Education — seed to stone; CVD vs natural — lattice cut; Price & size and Shapes — cut stone; Why lab-grown and Journal — grading bench; Contact — stone in tweezers; FAQ — CVD technical schematic; Jewellery — ring assembly; Inventory — cut stone; 404 — brilliant macro. All are existing assets; none were generated for the purpose.

**Rules.**
- The backdrop is decorative: `aria-hidden`, empty alt, never focusable. A photograph with something to say is passed as `PageHero`'s `image`, which keeps its alt text.
- Banner grade is roughly 1000 px wide or more; the 526 × 292 rough-crystal JPEG and the 351 × 439 PNGs are not banner material.
- `backdropFocus="x% y%"` and `backdropMobileFocus` set desktop and mobile crops. Editorial routes pass these from `PAGE_MOTIF`; Price & size and Shapes use different crops of their shared asset. Check at 1440 and 390 px.
- Do not layer screen-blended light effects (caustics) over a photograph — they flare white and take the headline with them.
- One eager, high-priority image per route: the banner photograph is the LCP element.
- Check every new banner in both themes and under reduced motion before merging.

### Inventory

Inventory is a trade tool inside an editorial site. Its opening carries the cut-stone banner one layer above the ambient field and below the copy and the hero stone. Information takes priority over atmosphere once the results begin.

- Filters reflect published stock. The finder is two parts: a results bar (title, count, Clear all, and every applied choice as a removable pill) and the filter column. From 1024px the column is a sticky sidebar beside the stones, scrolling within itself under the header; below that it is a drawer portalled to the body (dialog semantics, focus trap, Escape, scroll lock, focus restored), opened from a "Filters" button in the bar that carries the active count. The bar is sticky under the header on phones. Inside the column each group is a native details/summary toggle — Shape, Weight, Colour and Clarity open by default, the rest folded, a folded group showing its chosen count. The graded groups (weight, colour, clarity, cut, polish, symmetry, fluorescence) are two-handle scales: a hairline bar with the grades beneath it, best on the left, the chosen span in the accent, a reading above ("D – G", "Any"), and the count of stones under each grade; two native range inputs over one track, so arrow keys move a handle and a screen reader hears the grade. A span is one filter: one pill in the bar, one on the toggle. Weight adds From/To boxes and the trade's bands as quick picks. Laboratory, growth and stock stage are checkbox rows; Shape keeps its glyph tiles. Choices apply as they are pressed; "Show N stones" only closes the drawer.
- Cards expose comparable attributes.
- The viewer provides media, specifications, and certificates.
- Loading, empty, error, and unconfigured states tell the truth.
- Product enquiries carry the stone reference.

### Contact and journal

The contact page asks for actionable B2B information: shape, carat, colour, clarity, quantity, company, country, and contact details. The form is two named groups — "Who you are" and "What you need" — with labels at `--t-xs` and controls at `--control-h`. Direct phone and email methods remain available if the database is unavailable.

Both openings use the shared banner: the stone in tweezers behind the contact copy, the grading bench behind the journal's. The journal's former caustic-light layer is gone for the reason above.

The journal only renders real published records. It must show honest empty/configuration/error states. Cards link to `/blogs/:slug`; the detail page (`BlogPostPage`) reads the same published row, renders the body as paragraphs from plain text through text nodes only, and tells the truth in five states — loading, table not published, deployment unconfigured, request failed, and slug not found. Article metadata is still to do.

### Authentication and admin

Task screens use a quieter form of the brand system. Authentication and administration stay outside decorative storefront flows where motion could interfere with forms or tables. The account pages share one stage (`AuthShell`) in two halves: on the left a photograph (the stone in tweezers, through `HeroBackdrop` with a bottom-weighted scrim) carrying the mark, "Trade desk", one line of what an account is for and three things the desk keeps — enquiries with a reference, quotes/holds/inspections, grading reports and inspection media — all of which the account page actually provides; on the right the card on a still built ground. The panel is sticky and one screen tall from 900px so a long form scrolls beside it; in a hand it is a short band above the card; on the wide account workspace it stays a band. The caustic light and drafting drawing are gone from these pages.

Form conventions established on the sign-up and sign-in pages:

- Validation runs in JavaScript before the network; each message sits on its field (`aria-describedby`, `aria-invalid`), and focus moves to the first field that failed. Email is trimmed and lower-cased; passwords are never trimmed.
- Password fields carry a reveal toggle (a real button, outside the label, `aria-pressed`). The staff access code gets the same treatment and is not presented as a numeric PIN.
- Outcome screens replace the form and take focus themselves, so the heading is read and the tab sequence resumes there. Each outcome says what actually happened: "Account created successfully", "Check your email", or "No account was created" with a hand-off to the desk. Customer-facing copy never names SMTP, Supabase, or HTTP codes.
- Sign-in reports "Email or password is incorrect." for either mistake; the unconfirmed-address case is named, with a resend that happens only on its button.
- "Administrator" on sign-up asks for the staff access code, phone, and country; the code is checked on the server. The desk's own gate is labelled "Desk unlock code" so the two codes are not confused, and an active administrator lands on `/admin` directly after sign-in.

## Component boundaries

- `components/chrome`: navigation, footer, theme, preload, transitions, continuation.
- `components/layout`: page composition, motifs, and the shared banner photograph (`HeroBackdrop`).
- `components/motion`: reusable reveal and text animation.
- `components/media`: progressive image, video, canvas, and atmosphere.
- `components/product`: comparison, shapes, and diamond inspection.
- `components/three`: optional WebGL enhancement and fallback.
- `sections`: page-specific narrative compositions.

The console states what the database can actually do, and the statement has to stay true. Each module in `adminModules.js` carries a state â€” `ready` (the tables exist and a screen reads them), `partial` (the tables exist, the screen does not), `setup` (the table is absent, and the module names it). The sidebar marks `partial` as "Soon" and keeps the link live; `setup` is disabled. Re-verified against the live project on 10 September 2026, after migrations 0001 and 0002 were applied: `media`, `audit_log`, `notifications`, `site_content`, `homepage_sections`, `seo_settings` and `analytics_events` exist and moved out of `setup`; `orders`, `categories`, `collections`, `activity_log`, `page_views` and `settings` are still absent. A stale claim here is worse than none, because "no migration has been applied" about a table the operator already added reads as the backend being broken.

Activity & Audit Log is live. Every publish, edit, archive and restore the console makes writes one `audit_log` row naming who made it and which columns moved, as `{column: [before, after]}` over an allow-list that excludes internal notes and anything a customer wrote. The table is append-only by policy â€” no update, no delete, for anyone â€” so the screen is a reading surface with no actions on it. The audit write happens after the operation and can never fail it: a refused entry warns to the console and the save still succeeds, which is verified in the console harness alongside the refusal cases.

Analytics and Notifications stay `partial` on purpose. Both tables exist and are empty because nothing writes to them, and both would need a decision rather than a screen: analytics means turning on visitor collection, notifications means writing rows the queues already answer live. Neither is switched on by a screen that happens to exist.

General components should not own page-specific copy. Pages and sections assemble primitives and content.

## Content rules

- Use specific, verifiable language.
- Distinguish lab-grown diamonds from simulants without overstating claims.
- Never describe an illustration as factory photography.
- Explain CVD, HPHT, and IGI on first relevant use.
- Prefer trade actions: request inventory, inspect a certificate, discuss a requirement, or book an appointment.
- Preserve the distinction between shape and cut.
- Keep spelling consistent per market; US pages may use `jewelry` and `color`.
- Do not publish environmental, price, delivery, or certification claims the business cannot substantiate.

## Accessibility requirements

- One descriptive `h1` per page and logical heading order.
- Informative alt text for meaningful images; empty alt text for decoration.
- Hide duplicated animated text and provide one readable equivalent.
- All actions work by keyboard with visible focus.
- Dialogs manage focus, close with Escape, and restore focus.
- Use `aria-live` only for meaningful route, loading, form, and inventory status.
- Maintain practical touch targets; do not disable zoom or depend on hover.
- Test at 320px width, 200% zoom, and reduced motion.

## Responsive behaviour

- Compose mobile layouts intentionally rather than shrinking desktop.
- Use the accessible full-screen navigation on narrow screens.
- Remove ornament before compromising type or controls.
- Keep critical copy and actions above ambient effects.
- Give images explicit dimensions and use responsive formats.
- Disable expensive WebGL/pointer effects on unsupported or coarse-pointer devices.

## Performance guidance

Current production references are approximately 121 KB gzip for main JavaScript, 54 KB for Supabase, 30 KB for GSAP, 31 KB for CSS, and 1.33 MB for the largest video.

Future changes should route-split major pages, lazy-load Supabase, keep Three.js outside the entry bundle, avoid large PNG files, prioritize only the actual LCP image (on banner routes that is the `HeroBackdrop` photograph, eager and `fetchpriority="high"`), use conservative video preload settings, and check Core Web Vitals on throttled mobile.

## SEO requirements

Each indexable page needs a unique title and description, canonical URL, social metadata, one clear heading, crawlable copy, descriptive links, and appropriate Organization, LocalBusiness, Product, FAQPage, Breadcrumb, or Article structured data.

Public marketing routes should be prerendered or server-rendered. Authentication/admin routes should be `noindex`. Unknown routes should return an actual 404 where hosting permits it.

## Design QA checklist

1. Review at 320, 375, 768, 1440, and 1920 pixel widths.
2. Test dark and light themes.
3. Test keyboard navigation and visible focus.
4. Test reduced-motion mode.
5. Check contrast and content at 200% zoom.
6. Verify image alt text and dimensions.
7. Ensure effects do not block selection, scrolling, or controls.
8. Run lint and a production build.
9. Inspect payloads for unexpected large assets.
10. Capture QA screenshots for material layout changes.
11. For any banner change, screenshot the route at 1440 and 390 px in both themes, settled and mid-scroll, and confirm reduced motion shows a still.

## Current design backlog

- Add Article structured data and social metadata to the journal detail page.
- Add a US wholesale landing experience with New York trust signals.
- Define page metadata and social share imagery.
- Establish a consistent large-table admin pattern.
- Validate missing, portrait, landscape, video, and certificate product-media cases.
- Review preloader frequency for repeat visitors.
- Measure motion performance on low-power mobile hardware.
- Replace the 754 × 541 brilliant macro behind the 404 banner with a banner-grade photograph when one exists.
- Give Price & size, Shapes, and Inventory (cut stone) and Why lab-grown and Journal (grading bench) distinct photographs so adjacent pages do not share an opening.
- Run the full adversarial review of the banner change; the first run did not complete.

## Governance

Treat `tokens.css`, this document, and established reusable components as the default system. Make one-off exceptions only for clear narrative or functional needs. When an exception repeats, promote it into a token or reusable component and update this document.
- Give Website Content, Homepage Manager and SEO Manager a screen, or a storefront read path; their tables exist and nothing reads them.
- Record media upload and delete in the audit log; the actions exist and the log already allows them.
