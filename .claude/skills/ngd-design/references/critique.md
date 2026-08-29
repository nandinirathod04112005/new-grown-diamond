# Critique rubric

Review in this order. A finding higher on the list outranks anything below it,
and saying so is part of the critique — don't hand back a flat list where a
broken empty state sits next to a spacing nit.

## 1. Honesty (blocking)

- Does anything claim a thing happened that didn't? A fake success message, a
  faked send, a metric that looks live but isn't.
- Is demo or placeholder data chipped `Demo`? Is an unbuilt route chipped
  `Soon` rather than looking finished?
- Does a hidden price render as **"Price on Request"**, not `—`, `$0` or a
  guess?
- Are loading, empty and error all designed? An error state without a **Retry**
  is incomplete. An error that shows a raw Supabase message is a leak.
- Does "Archive" say Archive? It is a soft delete — copy that says Delete is
  wrong, and a `confirm()` is required before it.

## 2. Accessibility (blocking)

Run the checks in `references/accessibility.md`. The two that catch real bugs
here almost every time:

- **Which gold, on which surface.** `--ngd-gold` as body text on light fails.
  `--ngd-gold-deep` on dark fails. Anything muted or gold on a
  `.ngd-section-pearl` band is a near-miss worth flagging.
- **Reduced motion.** Any new motion without its reduced-motion end state.

Then: visible focus, keyboard reach, 44px targets, alt text, colour-only
signals, table headers.

## 3. Responsive integrity (blocking)

- **Any horizontal scroll at 1200 / 834 / 390 is a defect, full stop.**
- Do dense tables (`.ngd-admin-table`, `.ngd-cmp-*`) scroll *inside their card*
  rather than moving the page?
- Below 768px, do admin tables become stacked `.ngd-req-card`s?
- Below 992px, do inventory filters relocate into `.ngd-filter-canvas`?
- Do sticky elements (navbar at 72px, `.ngd-sticky-cta`, dashboard topbar,
  compare bar) overlap or fight each other on a short viewport?

## 4. System fidelity

- Is this component **already in `main.css`**? ~295 `ngd-` classes exist. A
  bespoke re-implementation of an existing card, chip, table or button is the
  most common finding in this repo — name the class it should have used.
- Are values **tokens**, or hard-coded hexes, pixels and durations?
- Is it using the correct **light or dark twin** of the component?
- Did new shared CSS land in a page stylesheet instead of `main.css`?
- Is the footer block still byte-identical? `footer.test.cjs` compares it
  across pages.

## 5. Brand judgement

- **Is gold trim, or has it become paint?** Gold fills, gold backgrounds and
  gold-on-gold are off-brand even when they pass contrast. Ask what percentage
  of the viewport is gold — it should be small.
- Is the **serif/sans split** respected — Playfair for headings and story,
  Inter for every spec, label, table and form? A spec table in Playfair is
  wrong.
- Is the motion **slow and restrained**? Fast, bouncy or springy easing fights
  the brand. Use `--ngd-ease` at `--ngd-fast` / `--ngd-slow`.
- Does the copy address a **trade buyer** (see `references/brand.md`)? Consumer
  romance language on a wholesale page is a brand defect, not a preference.
- Is there **one focal point per band**? The house style is one strong idea per
  section with generous space, not a dense grid of competing cards.
- British spelling — *jewellery*, *colour*, *favourites*.

## 6. Craft

Spacing off the `--ngd-space-*` scale, optical alignment, orphaned words in
headings, inconsistent radii, shadow that's too harsh for
`--ngd-shadow-soft/deep/float`, `.ngd-italic-accent` used more than once in a
heading.

## How to write it up

Lead with what works and why — this design system is coherent and a critique
that ignores that is less useful. Then findings in the order above, each with
**the specific file and class**, the reason it matters, and a concrete fix
using existing tokens and classes. Separate "this breaks a rule" from "I would
do it differently"; the second is advice and should be labelled as such.
