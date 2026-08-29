# Brand, audience and voice

## Positioning

New Grown Diamond is a **manufacturer**, not a boutique. The site's job is to
make a trade buyer confident enough to open an enquiry, and to make the
manufacturing story credible while doing it. Luxury styling serves that
credibility — it is not there to romanticise a purchase.

Founded on around four decades of natural-diamond trade experience; moved into
polished lab-grown manufacturing in 2012; CVD and HPHT; own facilities in
Surat, India; clientele worldwide.

## Who is actually looking at this

Design decisions get ranked against these four, in this order:

1. **B2B partners sourcing at scale** — care about consistency of supply,
   grading accuracy, and whether they can get the same goods again next month.
2. **Jewellery retailers** stocking certified and non-certified stones — care
   about inventory breadth, certification, and photography they can trust.
3. **Traders and manufacturers** building with polished goods — care about
   specs, tolerances, and fast filtering to an exact stone.
4. **Global buyers needing dependable supply** — care about lead time,
   communication, and whether the enquiry actually reaches someone.

A retail consumer browsing for a gift is **not** the primary audience. Copy
that says "your forever moment" or "the ring of her dreams" is wrong for this
site. Copy that says "consistent supply of certified CVD goods" is right.

Where a page genuinely serves consumers (`education.html`, parts of
`jewellery.html`), warmth is fine — but never at the cost of precision.

## Voice

**Confident, plain, specific.** The brand's own words are "integrity and
honesty", "strong business values", "straightforward and commercial". Write
like a serious supplier who has nothing to hide, not like a marketing team.

- **Say the number.** "17 specification fields", "up to four stones
  side-by-side", "IGI-certified" beat "comprehensive details", "compare
  multiple", "fully certified".
- **Short sentences carry the weight.** The prose is already restrained. Match
  it. One idea per sentence.
- **British spelling** throughout — *jewellery*, *colour*, *favourites*,
  *personalised*, *organised*. `jewellery` is also a URL and a table name;
  never let American spelling into a path, class, or column.
- **Sentence case for UI**, Title Case only for page and section names. Eyebrow
  labels (`.ngd-eyebrow`) are short and small-caps: "Our Legacy", "The Range",
  "Who We Serve".
- **Serif for emotion, sans for information.** Playfair carries headings and
  story beats; Inter carries every spec, label, table and form.

## Words we use / don't use

| Use | Don't use |
|---|---|
| lab-grown diamond | synthetic, artificial, fake, simulant |
| CVD / HPHT | "man-made process" |
| stone, goods, piece | "product" in customer-facing prose |
| Price on Request | "Contact for price", "$—", "N/A" |
| enquiry | inquiry (British spelling), "lead" |
| certified / non-certified | "guaranteed authentic" |
| consistent supply | "unlimited stock", "always available" |
| Surat, India | vague "our global facilities" |

Never imply a lab-grown diamond is a mined diamond, and never imply the
reverse is inferior. `education.html` compares them factually and that framing
is the house position: same material, different origin, different price.

## Microcopy patterns already in use — match them

- **Empty state**: says what would be here and what to do, never "Oops!".
- **Error state**: says what failed and offers **Retry**; never blames the user,
  never exposes a raw Supabase error.
- **Destructive action**: `confirm()` first, and archive is a *soft* delete —
  copy should say "Archive", never "Delete", because nothing is destroyed.
- **Unbuilt route**: `.is-soon` + a `Soon` chip. Honest, not hidden.
- **Demo data**: a `Demo` chip on every value that isn't real.
- **Password reset**: non-disclosing — never confirms whether an email exists.

## Research synthesis framing

When synthesising research or feedback for this company, segment by the four
audiences above, not by demographics. The questions that matter are: *could
they find the exact stone?*, *did they trust the specs?*, *did the enquiry feel
like it reached a person?* Consumer-funnel language (awareness, consideration,
delight) maps poorly onto a wholesale relationship — use sourcing language
instead: discovery, qualification, quotation, repeat supply.
