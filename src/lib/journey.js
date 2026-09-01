/**
 * THE JOURNEY — one continuous scroll, six chapters, one normalized progress.
 *
 * Every chapter, every scene stage, the rail and the tests read this file. It
 * exists so there is exactly one definition of "where are we", rather than a
 * ScrollTrigger per section each with its own idea of progress. That was the
 * previous architecture and it is what made two animations able to disagree
 * about the same element.
 *
 * `at` is the normalized position (0..1) across the WHOLE journey at which a
 * chapter begins. `to` is derived, so the ranges can never drift apart.
 */

/**
 * `label` is the chapter's full name, used in the panels. `short` is what the
 * fixed rail shows.
 *
 * The rail is an overlay pinned to the right edge, and its width was set by
 * whichever label happened to be active — "Certified Brilliance" expanded it
 * leftward far enough to sit on the photograph, at every desktop width. A rail
 * whose footprint depends on its content cannot be laid out around; short
 * forms make it bounded and predictable.
 */
const RAW = [
  {
    key: 'carbon',
    short: 'Carbon',
    n: '01',
    label: 'Carbon',
    at: 0,
    title: 'It starts as gas.',
    blurb:
      'Methane and hydrogen, and nothing else. Carbon in its most ordinary form — the same element as soot, differing only in what it is about to be persuaded to do.',
    data: [['Feedstock', 'CH₄ / H₂'], ['Purity', '99.9995%'], ['Chamber', 'Sealed']],
  },
  {
    key: 'plasma',
    short: 'Plasma',
    n: '02',
    label: 'Plasma',
    at: 0.17,
    title: 'Microwaves break the bonds.',
    blurb:
      'The gas is excited to eight hundred degrees. Bonds break. Carbon separates from hydrogen and drifts, looking for somewhere ordered to sit.',
    data: [['Temperature', '800 °C'], ['Frequency', '2.45 GHz'], ['Pressure', '120 torr']],
  },
  {
    key: 'growth',
    short: 'Growth',
    n: '03',
    label: 'Crystal Growth',
    at: 0.36,
    title: 'Atom by atom, onto a seed.',
    blurb:
      'It finds the seed plate. In the cubic lattice the earth uses at depth, the crystal thickens by a fraction of a millimetre an hour, for nine weeks together.',
    data: [['Rate', '0.007 mm/h'], ['Duration', '9 weeks'], ['Lattice', 'Cubic Fd3̄m']],
  },
  {
    key: 'rough',
    short: 'Rough',
    n: '04',
    label: 'Rough Diamond',
    at: 0.56,
    title: 'What comes out is blocky.',
    blurb:
      'Stepped, opaque and square-shouldered. Nothing about it yet suggests what it will become. It is scanned in three dimensions before anyone touches it.',
    data: [['Form', 'Tabular'], ['Scan', '3D inclusion map'], ['Yield', 'Modelled first']],
  },
  {
    key: 'cut',
    short: 'Cutting',
    n: '05',
    label: 'Precision Cut',
    at: 0.74,
    title: 'Fifty-seven facets, indexed.',
    blurb:
      'Each one held to a tolerance finer than a human hair. The cut is decided before the first facet is touched, and it cannot be revisited afterwards.',
    data: [['Facets', '57'], ['Table', '57%'], ['Crown', '34.5°']],
  },
  {
    key: 'certified',
    short: 'Certified',
    n: '06',
    label: 'Certified Brilliance',
    at: 0.9,
    title: 'Graded, inscribed, in the vault.',
    blurb:
      'By IGI or GIA, with the report number inscribed on the girdle. The stone you can ask to see today began as gas in a sealed chamber.',
    data: [['Grading', 'IGI · GIA'], ['Inscription', 'Girdle'], ['Location', 'Surat']],
  },
  {
    key: 'jewellery',
    short: 'Jewellery',
    n: '07',
    label: 'Jewellery',
    at: 1,
    title: 'And then it is worn.',
    blurb:
      'Set by hand in our own atelier, in platinum or eighteen carat. The stone decides the setting — never the other way round, which is how a good stone ends up in a mounting that fights it.',
    data: [['Metals', 'Pt · 18k'], ['Setting', 'By hand'], ['Made', 'In house']],
  },
];

/**
 * Where the six-chapter scene finishes, as a fraction of the director's whole
 * span.
 *
 * The director covers Hero through Atelier so there is one controller for the
 * page. The SCENE, though, is done once the stone is certified — Manufacture,
 * Inventory and Atelier are content read against a finished diamond, not more
 * stages of its making. So scene progress is the director's progress
 * remapped into 0..SCENE_END, and past that the stage simply holds.
 */
export const SCENE_END = 0.58;

/** Director progress → scene progress. */
export function sceneProgressOf(p) {
  return Math.min(1, Math.max(0, p / SCENE_END));
}

/**
 * Chapters with derived, non-overlapping, EQUAL ranges.
 *
 * `at` was hand-authored (0, 0.17, 0.36, 0.56, 0.74, 0.9) while each chapter
 * renders into a panel of identical height. Scene progress and panel index
 * therefore disagreed, and the rail would say "Crystal Growth" while the copy
 * on screen read "It starts as gas". One chapter is one panel is one equal
 * share of the scene; the ranges are computed so they cannot drift apart.
 */
export const CHAPTERS = RAW.map((c, i) => ({
  ...c,
  at: i / RAW.length,
  to: (i + 1) / RAW.length,
}));

/**
 * The point at which procedural geometry stops depicting the diamond and the
 * REAL PHOTOGRAPH takes over, and the window over which it crossfades.
 *
 * This is a hard product rule, not a styling choice: generated geometry may
 * depict rough crystal only. The moment cutting begins, the stone on screen is
 * a photograph of an actual company-owned diamond.
 */
/**
 * Where generated geometry stops and the REAL PHOTOGRAPH takes over — on a
 * chapter boundary, not a hand-picked number: the crystal is gone as Precision
 * Cutting begins, and the photograph is fully present by Certified Brilliance,
 * which then carries through Jewellery.
 */
export const HANDOFF = { from: 4 / 7, to: 5 / 7 };

/** Which chapter index a normalized progress falls in. */
export function chapterAt(p) {
  let i = 0;
  for (let k = 0; k < CHAPTERS.length; k += 1) if (p >= CHAPTERS[k].at) i = k;
  return i;
}

/** Smooth 0→1 ramp between two progress points (smoothstep). */
export function ramp(p, a, b) {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/** Local 0→1 position inside a chapter. */
export function within(p, i) {
  const c = CHAPTERS[i];
  return Math.min(1, Math.max(0, (p - c.at) / (c.to - c.at)));
}

/** Seeded PRNG (mulberry32) — deterministic, so the scene is identical on
 *  every load rather than a different scatter each visit. */
export function makeRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
