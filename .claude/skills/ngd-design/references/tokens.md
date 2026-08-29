# Tokens and component inventory

Everything lives in `assets/css/main.css` (tokens in the `:root` block at the
top) plus `assets/css/cinematic.css` for the scroll-driven homepage and
manufacturing sequences. **Always reference a token — never hard-code a hex,
radius, duration or spacing value.**

## Palette — exact values

```
--ngd-white       #ffffff
--ngd-ivory       #faf9f7   default page background
--ngd-pearl       #f3f1ec   alternate section wash
--ngd-black       #0c0c0e   near-black surfaces
--ngd-charcoal    #17171b   dark cards / navbars
--ngd-ink         #1b1b1f   primary text
--ngd-slate       #6e6e76   muted text
--ngd-line        rgba(12,12,14,0.10)     hairline on light
--ngd-line-light  rgba(255,255,255,0.16)  hairline on dark

--ngd-gold        #b48c47   the accent
--ngd-gold-deep   #8f6d31   the readable-on-light gold
--ngd-gold-soft   #d9c08a   the readable-on-dark gold
--ngd-gold-grad   linear-gradient(135deg, #cfae6e 0%, #b48c47 55%, #9a763a 100%)
```

There are **three golds and they are not interchangeable.** Picking the wrong
one is the most common design defect in this repo — it is a contrast failure,
not a taste question. `references/accessibility.md` has the measured ratios and
the rule for each surface. Short version: `--ngd-gold-deep` for text on
white/ivory, `--ngd-gold-soft` for text on black/charcoal, plain `--ngd-gold`
for trim, borders, icons and large display text only.

There is **no brand blue, green or red** in the palette. Status colour comes
from `.ngd-alert-info` / `-success` / `-danger` and the `.ngd-status-chip`
variants — use those classes rather than inventing a hex.

## Type

```
--ngd-font-display  "Playfair Display", Georgia, "Times New Roman", serif
--ngd-font-body     "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif
```

Loaded from Google Fonts with `preconnect`; weights Playfair 500/600/700 + 500
italic, Inter 400/500/600. **Do not add a third family or a new weight** — each
one costs a render-blocking request on a site with no build step.

Scale classes, not raw font sizes: `.ngd-display-1` / `.ngd-display-2` (fluid
`clamp()`), `.ngd-title`, `.ngd-eyebrow`, `.ngd-lead`, `.ngd-text-muted`,
`.ngd-text-gold`, `.ngd-italic-accent` (the serif-italic gold word inside a
heading — a signature move, one per heading at most).

## Shape, depth, motion, space

```
--ngd-radius-sm 0.65rem   --ngd-radius 1.15rem   --ngd-radius-lg 1.75rem   --ngd-radius-pill 999px
--ngd-shadow-soft / -deep / -float / -gold        layered and soft, never a single harsh drop
--ngd-ease cubic-bezier(0.22,0.61,0.36,1)   --ngd-fast 220ms   --ngd-slow 480ms
--ngd-space-1 .25 / -2 .5 / -3 1 / -4 1.5 / -5 2.5 / -6 4 / -7 6 / -8 8.5  (rem)
--ngd-nav-height 72px     the hero slides up behind the transparent navbar by this much
```

The spacing scale is **not linear** — it jumps deliberately at `-5`. Section
rhythm uses `-6`/`-7`/`-8`; component padding uses `-3`/`-4`. Don't interpolate
new steps.

## Component inventory — check here before designing anything new

~295 `ngd-` classes already exist. The largest families:

| Family | Covers |
|---|---|
| `ngd-cmp-*` (20) | Diamond compare table |
| `ngd-dash-*` (16) | Customer + admin dashboard shell — topbar, sidebar, metrics, panels, states |
| `ngd-btn-*` (11) | `-gold` primary, `-dark`, `-outline`, `-ghost` (on dark), `-lg`/`-sm`/`-block` |
| `ngd-req-*` (9) | Quote / hold / inspection tables, cards, drawers, thumbs |
| `ngd-story-*` (8) | Manufacturing timeline — spine, node, media, numeral |
| `ngd-find-*` (8) | Smart Diamond Finder |
| `ngd-detail-*` (8) | Dark product stage, zoom, thumbs, specs, sticky CTA |
| `ngd-jewel-*` / `ngd-jd-*` (11) | Light atelier cards and the light product stage |
| `ngd-diamond-*` (6) | Dark showcase product card |
| `ngd-auth-*` (6) | Split auth card, side panel, art, strength meter |
| `ngd-footer-*` (5) | The shared footer — **copy it byte-identical**, `footer.test.cjs` compares it across pages |

Plus the foundations: `.ngd-card` / `-card-3d` / `-card-dark` / `-depth-1`,
`.ngd-glass` / `-glass-dark`, `.ngd-section` / `-section-dark` / `-section-pearl`
/ `-section-tight`, `.ngd-divider`, `.ngd-hairline`, `.ngd-icon-tile`,
`.ngd-form`, `.ngd-table` / `-table-card` / `-admin-table`, `.ngd-badge`,
`.ngd-chip`, `.ngd-status-chip`, `.ngd-alert`, `.ngd-pagination`,
`.ngd-skeleton`, `.ngd-reveal` (+ `-delay-1..3`), `.ngd-backdrop`,
`.ngd-hover-lift`, `.ngd-media-photo`.

To confirm what a class looks like: `grep -n "\.ngd-thing" assets/css/main.css`,
or open `styleguide.html`.

## Signature interactions — reuse, don't reinvent

- **3D tilt**: `.ngd-card-3d` + `data-ngd-tilt`, with `.ngd-depth-1` on the
  child that should float. Powered by `assets/js/ui.js`. Fine pointers only.
- **Scroll reveal**: `.ngd-reveal` + `IntersectionObserver` in `ui.js`.
- **Parallax**: `data-ngd-parallax="-0.045"`, desktop only.
- **Navbar glass**: `ui.js` toggles `.is-scrolled`; add `.ngd-navbar-dark` on
  pages that open on a dark hero.
- **Cinematic scroll**: GSAP, vendored locally at `assets/vendor/gsap` (not a
  CDN). `assets/js/home-motion.js`, `atom-story.js`, `auto-journey.js`.

## Dark vs light contexts

Sections are one or the other, never a gradient between. On dark
(`.ngd-section-dark`, `.ngd-card-dark`, `.ngd-glass-dark`) text goes near-white,
gold becomes `--ngd-gold-soft`, hairlines become `--ngd-line-light`, and the
button variant becomes `.ngd-btn-ghost`. Several components have explicit light
and dark twins — `.ngd-jd-stage` (light) vs `.ngd-detail-stage` (dark),
`.ngd-thumb-light` vs `.ngd-thumb`. Use the twin; don't override the wrong one.

The site is **light-first with dark bands** — it has no dark mode and no
`prefers-color-scheme` handling. Don't propose one as a side effect of another
change.
