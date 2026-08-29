---
name: ngd-design
description: New Grown Diamond's brand, design system, voice and accessibility rules. Load this before ANY design work on this repo — design critique, design-system changes, UX writing and microcopy, accessibility audits, research synthesis, or developer handoff — including every run of the `design` plugin's commands. Triggers on design, UI, mockup, layout, styleguide, component, token, palette, typography, copy, microcopy, tone, wording, a11y, accessibility, contrast, WCAG, motion, handoff, spec, or redesign work on any page, `ngd-` class, or `assets/css/main.css`.
---

# New Grown Diamond — design context

This is the company layer for the `design` plugin. Every one of its workflows
(critique, design-system management, UX writing, accessibility audits, research
synthesis, dev handoff) must run against the facts below rather than generic
design defaults.

## The company in one paragraph

New Grown Diamond manufactures polished **CVD and HPHT lab-grown diamonds** at
its own facilities in **Surat, India**, and supplies them worldwide. The team
carries roughly **four decades in the natural-diamond trade** and moved into
lab-grown manufacturing in **2012**. It is a **manufacturer, wholesaler and
supplier** — the primary customer is a **B2B buyer** (retailers, jewellery
traders, manufacturers, global diamond buyers), not a consumer buying an
engagement ring. The commercial promise is deliberately unglamorous:
**consistency in quality, quantity and supply at competitive prices.**

That B2B-first reality is the single most common thing generic design advice
gets wrong here. See `references/brand.md` before writing any copy or judging
any layout.

## The five hard rules

These come from `docs/DESIGN_SYSTEM.md` and are enforced by `tests/`. Never
propose a design that breaks one without saying plainly that it breaks it.

1. **Reuse, don't duplicate.** There are ~295 `ngd-` classes in
   `assets/css/main.css`. Page stylesheets may add layout glue only. A new
   shared pattern belongs in `main.css`. Before designing a component, check
   whether one already exists — `references/tokens.md` has the inventory.
2. **Elegant, not loud.** No neon, no saturated glows. **Gold is trim, not
   paint.** A design that fills areas with gold is off-brand even if it
   passes contrast.
3. **Motion is optional.** Everything honours `prefers-reduced-motion`; pointer
   tilt is off on touch. Any motion proposal needs its reduced-motion
   behaviour specified alongside it.
4. **Test at three widths** — ≥1200px desktop, ~834px tablet, ~390px phone.
   **No horizontal scrolling at any width**, ever. Wide content scrolls inside
   its own container.
5. **No build step.** Plain HTML + CSS + Bootstrap 5.3 + vanilla JS, served as
   static files. Never propose React, Tailwind, Sass, a bundler, or a
   framework component library. Never add a package to the site itself
   (`tests/` is the only place with an npm install).

## Never fake state

The strongest convention in this codebase, and the one worth defending in
critique: **the UI never claims something happened that did not happen.** No
fake "check your inbox", no invented success toast, no placeholder metric shown
as if it were real. Unbuilt routes are chipped `Soon`; demo values are chipped
`Demo`; prices the database hides render as **"Price on Request"**, not `—` and
not a guess. Loading / empty / error are designed states, not afterthoughts,
and every one of them ships with the feature.

If a design or a piece of copy would let a user believe something untrue, that
is a defect, and it outranks any aesthetic note in the same review.

## Where to read next

Load the reference you actually need — don't read all five.

| Working on | Read |
|---|---|
| Copy, microcopy, tone, naming, research framing | `references/brand.md` |
| Tokens, palette, type, spacing, component inventory | `references/tokens.md` |
| Contrast, motion, focus, keyboard, WCAG audits | `references/accessibility.md` |
| Reviewing or critiquing a page or component | `references/critique.md` |
| Specs, redlines, handing work to implementation | `references/handoff.md` |

The living visual reference is **`styleguide.html`** (serve over HTTP and open
it). `docs/DESIGN_SYSTEM.md` is the full prose spec — this skill is the
opinionated summary, that file is the authority when the two disagree.
