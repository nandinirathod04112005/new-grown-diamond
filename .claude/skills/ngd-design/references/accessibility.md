# Accessibility — measured, not guessed

Target: **WCAG 2.1 AA**. Body text 4.5:1, large text (≥24px, or ≥19px bold)
3:1, non-text UI (borders, icons, focus indicators, chart marks) 3:1.

## The gold contrast matrix — measured from the real tokens

Contrast ratio of each foreground token against each surface. **Bold = safe for
body text. Everything else fails 4.5:1 and is trim-only.**

| Foreground | on white `#ffffff` | on ivory `#faf9f7` | on pearl `#f3f1ec` | on black `#0c0c0e` | on charcoal `#17171b` |
|---|---|---|---|---|---|
| `--ngd-gold` `#b48c47` | 3.10 | 2.94 | 2.74 | **6.31** | **5.77** |
| `--ngd-gold-deep` `#8f6d31` | **4.77** | **4.54** | 4.23 | 4.09 | 3.75 |
| `--ngd-gold-soft` `#d9c08a` | 1.77 | 1.68 | 1.57 | **11.03** | **10.09** |
| `--ngd-slate` `#6e6e76` | **5.05** | **4.80** | 4.48* | 3.87 | 3.54 |
| `--ngd-ink` `#1b1b1f` | **17.17** | **16.32** | **15.21** | 1.14 | 1.04 |

\* `--ngd-slate` on `--ngd-pearl` measures **4.48** — it misses AA by 0.02.

### The rules that follow

1. **Gold body text on light surfaces must be `--ngd-gold-deep`, and only on
   white or ivory.** Plain `--ngd-gold` at 3.10 fails; it is legal for large
   display text, `.ngd-divider` rules, icon strokes, borders and focus rings.
2. **`--ngd-gold-deep` is not a dark-surface colour.** At 3.75 on charcoal it
   fails even large-text in places. On dark, gold text is `--ngd-gold-soft`
   (10.09) or plain `--ngd-gold` (5.77).
3. **Two known near-misses to watch, both on `--ngd-pearl`:**
   `--ngd-gold-deep` at 4.23 and `--ngd-slate` at 4.48. A `.ngd-section-pearl`
   band is the one place where colours that pass everywhere else stop passing.
   Muted or gold body text inside a pearl section should step up to
   `--ngd-ink`, or the band should be white/ivory instead. **Flag this whenever
   you see it — it is the highest-yield finding on this site.**
4. **`--ngd-gold-soft` is never text on light.** At 1.77 on white it is
   effectively invisible. It is a dark-surface colour and a decorative stroke.
5. **`--ngd-gold-grad` is a fill, never a text colour.** Its lightest stop
   (`#cfae6e`) is ~2.4:1 on white. It belongs on `.ngd-btn-gold`, where the
   label sits on it in near-black — check *that* pairing, not the gradient
   against the page.

Recompute after any palette change:

```bash
python3 - <<'PY'
def lum(h):
    h = h.lstrip('#'); c = [int(h[i:i+2], 16) / 255 for i in (0, 2, 4)]
    c = [x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def cr(a, b):
    l1, l2 = sorted([lum(a), lum(b)], reverse=True)
    return round((l1 + 0.05) / (l2 + 0.05), 2)
print(cr('#8f6d31', '#f3f1ec'))
PY
```

## Motion

`prefers-reduced-motion` is honoured across the whole site and there are tests
that assert it. Any motion you design needs its reduced-motion behaviour stated
in the same breath:

- The 3D hero renders a **single still frame**, not a paused animation.
- Scroll reveals resolve to their final visible state immediately.
- Pointer tilt and parallax are **disabled**, as they already are on touch.
- Back-to-top jumps instantly instead of smooth-scrolling.
- GSAP cinematic sequences (`home-motion.js`, `atom-story.js`,
  `auto-journey.js`) must land on their end state, never mid-sequence.

Nothing may flash more than three times per second. The hero sparkles, sheen
sweeps and searchlight effects are slow by design — keep them that way.

## Keyboard and focus

- **Every interactive element needs a visible focus ring**, and on this site
  the ring is gold. On light surfaces that ring needs 3:1 against the
  *adjacent* colour — plain `--ngd-gold` at 3.10 on white just clears it, so
  don't lighten it. On dark surfaces use `--ngd-gold-soft`.
- Focus must never be removed without a replacement. `outline: none` alone is
  a defect.
- **Dropdowns and the offcanvas mobile menu** are Bootstrap components — they
  bring their own focus management, so use them rather than hand-rolling. The
  burger button must keep `aria-expanded` in sync (`ui.js` does this).
- **`.ngd-thumb` galleries, `.ngd-chip` filter rows and `.ngd-view-btn`
  toggles** are keyboard-reachable controls, not decorations — they need real
  button semantics and a pressed state (`aria-pressed`).
- **Click-to-zoom stages** (`.is-zoomed`) are pointer-driven; the zoomed view
  must not be the only way to read a spec.
- Touch targets ≥44×44px. The `.ngd-icon-btn` admin row actions and
  `.ngd-page-btn` pagination are the tight spots — check them at 390px.

## Content accessibility

- **Diamond and jewellery photography needs real alt text** — shape, carat and
  stock number, not "diamond". Decorative gem art and SVG line art is
  `aria-hidden` with an empty alt.
- **Spec tables** (`.ngd-spec-table`, `.ngd-admin-table`) need proper `<th>`
  scope. The compare table's sticky attribute column is a row header.
- **Colour is never the only signal.** The compare table tints differing rows —
  those rows also need a non-colour marker. `.ngd-status-chip` variants carry
  their status as text, and must keep doing so.
- **The colour scale in `education.html`** (D→K gradient) is decorative;
  the grades must be readable as labels beside it.
- Form errors use Bootstrap `.is-invalid` + `.invalid-feedback` — the message
  is text, tied to the field, not just a red border.

## Testing

`tests/design-system.test.cjs` already asserts no horizontal overflow and no JS
errors at 1440 / 834 / 390. Accessibility findings should be reproduced at those
same three widths.

```bash
cd tests && npm install && npx playwright install chromium && npm test
```
