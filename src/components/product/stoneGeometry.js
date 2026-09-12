/**
 * Shape, size and proportion helpers for the stone detail views.
 *
 * Everything here is either read from the stone's own record or labelled as
 * an estimate by the component that uses it. Nothing invents a measurement.
 */
import { FACETS } from './facets.js';

/* ---------------- shape ---------------- */

const ALIASES = {
  round: 'Round', 'round brilliant': 'Round', brilliant: 'Round',
  oval: 'Oval', emerald: 'Emerald', 'square emerald': 'Emerald',
  pear: 'Pear', princess: 'Princess', cushion: 'Cushion', radiant: 'Radiant',
  'rectangular radiant': 'Radiant', 'rec radiant': 'Radiant', 'square radiant': 'Radiant',
  marquise: 'Marquise', heart: 'Heart',
};

/** The facet-drawing key for a stored shape name, or null if there is no drawing for it. */
export function shapeKey(shape) {
  const k = ALIASES[String(shape ?? '').trim().toLowerCase()];
  return k && FACETS[k] ? k : null;
}

/* The face-up facet polygons are straight segments only (M … L … Z), so the
   bounding box comes from their vertices — no path maths needed. */
const boxes = {};
export function facetBox(key) {
  if (boxes[key]) return boxes[key];
  let minX = Infinity; let minY = Infinity; let maxX = -Infinity; let maxY = -Infinity;
  for (const f of FACETS[key].f) {
    const nums = f.d.match(/-?\d+(\.\d+)?/g).map(Number);
    for (let i = 0; i < nums.length; i += 2) {
      minX = Math.min(minX, nums[i]); maxX = Math.max(maxX, nums[i]);
      minY = Math.min(minY, nums[i + 1]); maxY = Math.max(maxY, nums[i + 1]);
    }
  }
  boxes[key] = { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
  return boxes[key];
}

/* ---------------- measurements ---------------- */

const plausible = (n) => Number.isFinite(n) && n > 0.5 && n < 60;

/**
 * Read a measurements string the way labs print it.
 *   "6.23 x 6.19 x 3.85"      length x width x depth
 *   "6.19 - 6.23 x 3.85"      round stones: min – max diameter x depth
 * Returns { length, width, depth } in millimetres, or null if the string does
 * not say that. A value of "66" is not a measurement and returns null.
 */
export function parseMeasurements(text) {
  if (!text) return null;
  const s = String(text).toLowerCase().replace(/mm/g, '').replace(/[×*]/g, 'x');
  const round = s.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
  if (round) {
    const [a, b, c] = round.slice(1).map(Number);
    if ([a, b, c].every(plausible)) return { length: Math.max(a, b), width: Math.min(a, b), depth: c };
  }
  const three = s.match(/(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)/);
  if (three) {
    const [a, b, c] = three.slice(1).map(Number);
    if ([a, b, c].every(plausible)) return { length: Math.max(a, b), width: Math.min(a, b), depth: c };
  }
  return null;
}

/* ---------------- size from weight ---------------- */

/*
 * A round brilliant's diameter from its weight: d = 6.5 × ct^(1/3) mm.
 * Weight goes with volume, volume with the cube of the diameter, and a
 * well-cut one-carat round is about 6.5 mm across. Checked against the size
 * table on the education page (sizeData.js): 0.5 ct gives 5.16 mm (table
 * 5.10–5.30), 2 ct gives 8.19 mm (8.10–8.30), 3 ct gives 9.37 mm (9.20–9.40).
 */
export const roundDiameter = (ct) => 6.5 * Math.cbrt(Math.max(0, ct));

/*
 * Typical face-up length and width for each shape, as multiples of the round
 * diameter at the same weight. Approximate by nature — cutting varies — and
 * the size view says so wherever these are used.
 */
const SHAPE_FACTOR = {
  Round: [1, 1], Princess: [0.87, 0.87], Cushion: [0.9, 0.9], Heart: [1, 1],
  Oval: [1.18, 0.88], Pear: [1.2, 0.8], Marquise: [1.54, 0.77],
  Emerald: [1.08, 0.77], Radiant: [1.02, 0.85],
};

export function estimatedSize(key, ct) {
  const d = roundDiameter(ct);
  const [l, w] = SHAPE_FACTOR[key] ?? [1, 1];
  return { length: d * l, width: d * w };
}

/* ---------------- proportions ---------------- */

/* Outside these, a table or depth cannot be drawn as a real stone; the side
   view falls back to standard proportions and says so. */
export const TABLE_RANGE = [40, 80];
export const DEPTH_RANGE = [45, 85];
export const inRange = (v, [lo, hi]) => Number.isFinite(v) && v >= lo && v <= hi;

/* ---------------- lab verification ---------------- */

/**
 * The laboratory's own report-check page for a report number, or null for a
 * laboratory without a public one. Both are the labs' published verification
 * pages; the number is passed in the link so a buyer does not have to retype
 * it, and the dialog also offers it to copy in case a lab page ignores it.
 */
export function verifyLink(lab, reportNumber) {
  const n = String(reportNumber ?? '').trim();
  const l = String(lab ?? '').toUpperCase();
  if (!n) return null;
  if (l.includes('GIA')) return { lab: 'GIA', href: `https://www.gia.edu/report-check?reportno=${encodeURIComponent(n)}` };
  if (l.includes('IGI')) return { lab: 'IGI', href: `https://www.igi.org/verify-your-report/?r=${encodeURIComponent(n)}` };
  return null;
}
