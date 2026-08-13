# New Grown Diamond — Global Design System

Premium **white / black luxury** theme with champagne-gold trim, subtle glass and
restrained 3D depth. Built on **Bootstrap 5.3 + vanilla CSS/JS** — no build step.

Live reference: open **`styleguide.html`** in a browser (serve the folder over
HTTP, e.g. VS Code *Live Server*).

## Files

| File | Purpose |
|---|---|
| `assets/css/main.css` | All design tokens + reusable `ngd-` classes |
| `assets/js/ui.js` | Navbar glass-on-scroll, scroll reveal, pointer tilt |
| `styleguide.html` | Visual reference / test page for every class |

## Page boilerplate

```html
<!-- <head> -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/css/bootstrap.min.css" rel="stylesheet">
<link href="assets/css/main.css" rel="stylesheet">

<!-- before </body> -->
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js"></script>
<script src="assets/js/ui.js"></script>
```

Give `<body>` the class **`ngd-backdrop`** for the ambient ivory/champagne wash.
Pages inside a subfolder (`admin/`, `account/`) prefix asset paths with `../`.

## Design tokens (CSS variables on `:root`)

- **Colours** — `--ngd-white`, `--ngd-ivory`, `--ngd-pearl`, `--ngd-black`,
  `--ngd-charcoal`, `--ngd-ink`, `--ngd-slate`, `--ngd-line`, `--ngd-line-light`,
  `--ngd-gold`, `--ngd-gold-deep`, `--ngd-gold-soft`, `--ngd-gold-grad`
- **Shadows** — `--ngd-shadow-soft`, `--ngd-shadow-deep`, `--ngd-shadow-float`, `--ngd-shadow-gold`
- **Radii** — `--ngd-radius-sm`, `--ngd-radius`, `--ngd-radius-lg`, `--ngd-radius-pill`
- **Motion** — `--ngd-ease`, `--ngd-fast` (220 ms), `--ngd-slow` (480 ms)
- **Spacing** — `--ngd-space-1` … `--ngd-space-8`
- **Fonts** — `--ngd-font-display` (Playfair Display), `--ngd-font-body` (Inter)

Always reference tokens (`var(--ngd-gold)`) instead of hard-coding values.

## Class reference

### Typography
| Class | Use |
|---|---|
| `.ngd-display-1` / `.ngd-display-2` | Hero / section headings (fluid `clamp()` sizes) |
| `.ngd-title` | Card & panel headings |
| `.ngd-eyebrow` | Small-caps gold label above headings |
| `.ngd-lead` | Intro paragraph |
| `.ngd-text-muted` / `.ngd-text-gold` | Secondary / accent text |
| `.ngd-italic-accent` | Serif-italic gold word inside a heading |

### Layout
| Class | Use |
|---|---|
| `.ngd-section` / `.ngd-section-tight` | Vertical rhythm for page bands |
| `.ngd-section-dark` | Near-black band with champagne aura (light text) |
| `.ngd-section-pearl` | Soft alternate wash |
| `.ngd-divider` (+ `.ngd-divider-center`) | 64 px gold rule |
| `.ngd-hairline` | Full-width 1 px rule |

Use Bootstrap's `container` / `row` / `col-*` for responsive structure.

### Surfaces
| Class | Use |
|---|---|
| `.ngd-card` | Base white card (hairline border, soft shadow) |
| `.ngd-card-3d` | + hover lift & perspective; add `data-ngd-tilt` for pointer tilt |
| `.ngd-depth-1` | Child element that floats above a hovered 3D card |
| `.ngd-card-dark` | Charcoal card for dark contexts |
| `.ngd-glass` / `.ngd-glass-dark` | Frosted glass panels (with `@supports` fallback) |
| `.ngd-icon-tile` | Small gold-framed icon square |

### Buttons & links
| Class | Use |
|---|---|
| `.ngd-btn` | Base (always pair with a variant) |
| `.ngd-btn-gold` | Primary CTA (champagne gradient) |
| `.ngd-btn-dark` | Secondary on light surfaces |
| `.ngd-btn-outline` | Tertiary on light surfaces |
| `.ngd-btn-ghost` | On dark surfaces |
| `.ngd-btn-lg` / `.ngd-btn-sm` / `.ngd-btn-block` | Sizes / full width |
| `.ngd-link` | Text link with animated gold underline |

Loading state: disable the button and prepend Bootstrap's
`<span class="spinner-border spinner-border-sm"></span>`.

### Navbar
`nav.navbar.sticky-top.ngd-navbar` — transparent at top, frosted glass +
hairline once scrolled (`ui.js` toggles `.is-scrolled`). Use `.ngd-brand` +
`.ngd-brand-mark` for the logo and `.ngd-nav` on the `navbar-nav` list.
`.ngd-navbar-dark` variant for dark pages.

### Forms
Wrap any form in **`.ngd-form`** — labels become small-caps, inputs get soft
radii and a gold focus ring; checkboxes check in gold. Works with Bootstrap's
`.form-control`, `.form-select`, `.form-check`, and `.was-validated` states.

### Feedback & misc
`.ngd-badge` (+ `.ngd-badge-dark`), `.ngd-alert` with `.ngd-alert-info` /
`.ngd-alert-success` / `.ngd-alert-danger`, `.ngd-stat-value` + `.ngd-stat-label`.

### Utilities & motion
`.ngd-shadow-soft|deep|float`, `.ngd-hover-lift`, `.ngd-radius`, `.ngd-radius-lg`,
`.ngd-backdrop`, and `.ngd-reveal` (+ `.ngd-reveal-delay-1..3`) for scroll-in
fades — `ui.js` powers the reveal via `IntersectionObserver`.

## Rules

1. **Reuse, don't duplicate** — page stylesheets may add layout glue only; new
   shared patterns belong in `main.css`.
2. **Elegant, not loud** — no neon, no saturated glows; gold is trim, not paint.
3. **Motion is optional** — everything honours `prefers-reduced-motion`; tilt is
   disabled on touch devices automatically.
4. **Test at three widths** — ≥1200 px desktop, ~834 px tablet, ~390 px phone.
   No horizontal scrolling is allowed at any width.
