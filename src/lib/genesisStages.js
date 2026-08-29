/**
 * The six stages of Diamond Genesis, and where each begins on the scroll.
 *
 * Kept apart from the scene component so the section, the WebGL scene and the
 * tests all read the same source, and so neither file mixes constants with
 * component exports.
 */
export const STAGES = [
  { key: 'Carbon',    at: 0.00, blurb: 'Methane and hydrogen, and nothing else. Carbon in its most ordinary form — the same element as soot, differing only in what it is about to be persuaded to do.' },
  { key: 'Plasma',    at: 0.18, blurb: 'Microwaves excite the gas to eight hundred degrees. Bonds break. Carbon separates from hydrogen and drifts, looking for somewhere ordered to sit.' },
  { key: 'Growth',    at: 0.36, blurb: 'It finds the seed. Atom by atom, in the cubic lattice the earth uses at depth, the crystal thickens by a fraction of a millimetre an hour, for nine weeks.' },
  { key: 'Rough',     at: 0.58, blurb: 'What comes out of the chamber is blocky, stepped and opaque. Nothing about it yet suggests what it will become.' },
  { key: 'Precision', at: 0.74, blurb: 'Fifty-seven facets, each indexed to a tolerance finer than a human hair. The cut is decided before the first one is touched, and cannot be revisited.' },
  { key: 'Inventory', at: 0.92, blurb: 'Graded by IGI or GIA, inscribed on the girdle, and in our vault. The stone you can ask to see today began as gas.' },
];

/** Smooth 0→1 ramp between two progress points. */
export function ramp(p, a, b) {
  const t = Math.min(1, Math.max(0, (p - a) / (b - a)));
  return t * t * (3 - 2 * t);
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
