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

### Reduced motion

Every animation feature needs a `prefers-reduced-motion: reduce` path. Reduced motion removes theatre while retaining navigation, content, hierarchy, and feedback. Simplify or disable the custom cursor, route cover, smooth scroll, marquees, looping backgrounds, and large parallax effects.

## Page patterns

### Home

The homepage forms one transformation narrative: atelier opening, origin, independent grading, material truth, jewellery application, international supply, then a closing reel and action. Each chapter should make one clear claim with one supporting visual.

### Editorial pages

`EditorialPage.jsx` is the shared structure for About, Education, Shapes, and Why Lab-Grown. `PageHero` receives an eyebrow, title, introduction, motif, and accent. Numbered sections should not duplicate content already explained by an interactive experience.

### Inventory

Inventory is a trade tool inside an editorial site. Information takes priority over atmosphere once the results begin.

- Filters reflect published stock.
- Cards expose comparable attributes.
- The viewer provides media, specifications, and certificates.
- Loading, empty, error, and unconfigured states tell the truth.
- Product enquiries carry the stone reference.

### Contact and journal

The contact page asks for actionable B2B information: shape, carat, colour, clarity, quantity, company, country, and contact details. Direct phone and email methods remain available if the database is unavailable.

The journal only renders real published records. It must show honest empty/configuration/error states. The planned detail page should preserve the editorial language and support Article metadata.

### Authentication and admin

Task screens use a quieter form of the brand system. Authentication and administration stay outside decorative storefront flows where motion could interfere with forms or tables.

## Component boundaries

- `components/chrome`: navigation, footer, theme, preload, transitions, continuation.
- `components/layout`: page composition and motifs.
- `components/motion`: reusable reveal and text animation.
- `components/media`: progressive image, video, canvas, and atmosphere.
- `components/product`: comparison, shapes, and diamond inspection.
- `components/three`: optional WebGL enhancement and fallback.
- `sections`: page-specific narrative compositions.

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

Future changes should route-split major pages, lazy-load Supabase, keep Three.js outside the entry bundle, avoid large PNG files, prioritize only the actual LCP image, use conservative video preload settings, and check Core Web Vitals on throttled mobile.

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

## Current design backlog

- Implement the journal article template.
- Add a US wholesale landing experience with New York trust signals.
- Define page metadata and social share imagery.
- Establish a consistent large-table admin pattern.
- Validate missing, portrait, landscape, video, and certificate product-media cases.
- Review preloader frequency for repeat visitors.
- Measure motion performance on low-power mobile hardware.

## Governance

Treat `tokens.css`, this document, and established reusable components as the default system. Make one-off exceptions only for clear narrative or functional needs. When an exception repeats, promote it into a token or reusable component and update this document.
