/**
 * The stock finder's vocabulary and its matching rule.
 *
 * Kept apart from the panel that draws it because these are two different
 * concerns: what "VG" means against a row the admin typed is a data question,
 * and it should be readable — and correctable — without reading any JSX.
 */

/* ---------------- vocabulary ---------------- */

export const SHAPES = [
  'Round', 'Pear', 'Princess', 'Cushion', 'Radiant',
  'Emerald', 'Asscher', 'Oval', 'Marquise', 'Heart',
];

export const COLOURS = ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

export const CLARITIES = ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1'];

export const CUTS = ['ID', 'EX', 'VG'];

/* Polish and symmetry are graded a step lower than cut in the trade, and the
   stock sheet this mirrors offers them one step lower too. */
export const FINISHES = ['EX', 'VG', 'G'];

export const FLUORESCENCES = ['NON', 'FNT', 'MED', 'STG', 'VST'];

export const GROWTHS = ['CVD', 'HPHT'];

/**
 * Weight bands, as a stock sheet lists them.
 *
 * Deliberately not evenly spaced: the trade prices in these steps, and the
 * jumps at 0.90, 1.00 and 2.00 are where the market actually breaks.
 */
export const CARAT_BANDS = [
  [0.3, 0.39], [0.4, 0.49], [0.5, 0.69], [0.7, 0.89], [0.9, 0.99],
  [1, 1.49], [1.5, 1.99], [2, 2.99], [3, 3.99], [4, 4.99],
  [5, 9.99], [10, 99],
];

/* ---------------- reading what the admin typed ---------------- */

const clean = (v) => String(v ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

/*
 * Grades arrive spelled out ("Very Good") because that is what the admin form
 * offers, but a stock filter is labelled in trade codes ("VG") because that is
 * what a buyer scans for. Both spellings map to one code here, so a row typed
 * either way still matches — and a row typed as something else matches nothing
 * rather than silently landing in the wrong bucket.
 */
const GRADE_CODES = {
  id: 'ID', ideal: 'ID',
  ex: 'EX', excellent: 'EX',
  vg: 'VG', verygood: 'VG',
  g: 'G', good: 'G',
};

const FLUOR_CODES = {
  non: 'NON', none: 'NON', nil: 'NON', no: 'NON',
  fnt: 'FNT', faint: 'FNT',
  med: 'MED', medium: 'MED',
  stg: 'STG', strong: 'STG',
  vst: 'VST', verystrong: 'VST',
};

export const gradeCode = (v) => GRADE_CODES[clean(v)] ?? '';
export const fluorCode = (v) => FLUOR_CODES[clean(v)] ?? '';

/*
 * A missing value reads as blank, never as a value.
 *
 * `toCard` fills empty columns with an em dash so a card never renders a hole,
 * which is right for a card and wrong here: counted as a value it would put a
 * "—" button in the colour row and offer it as something to filter by.
 */
const plain = (v) => {
  const out = String(v ?? '').trim().toUpperCase();
  return out === '—' || out === '-' ? '' : out;
};

/* Shapes are matched by identity, not by spelling, so a row entered as "round"
   still lands under Round. Anything the canonical list does not know keeps its
   own name and is offered alongside — the stock decides, not this file. */
const SHAPE_BY_CLEAN = Object.fromEntries(SHAPES.map((s) => [clean(s), s]));
export const shapeCode = (v) => SHAPE_BY_CLEAN[clean(v)] ?? String(v ?? '').trim();

/* An uncertificated stone is a filterable state, not a gap. */
export const labCode = (v) => plain(v) || 'NONE';

/* ---------------- state ---------------- */

export const EMPTY = {
  shape: [], colour: [], clarity: [], cut: [], polish: [], symmetry: [],
  fluorescence: [], lab: [], growth: [],
  caratMin: '', caratMax: '',
  inStockOnly: false,
};

export function isActive(f) {
  return (
    f.inStockOnly
    || f.caratMin !== ''
    || f.caratMax !== ''
    || Object.values(f).some((v) => Array.isArray(v) && v.length > 0)
  );
}

export function countActive(f) {
  let n = Object.values(f).reduce((sum, v) => sum + (Array.isArray(v) ? v.length : 0), 0);
  if (f.caratMin !== '' || f.caratMax !== '') n += 1;
  if (f.inStockOnly) n += 1;
  return n;
}

/* ---------------- matching ---------------- */

/*
 * An empty group means "no opinion", not "nothing matches". That is what makes
 * the panel additive: a buyer who has chosen three shapes and no colour is
 * asking about three shapes, not about three shapes and zero colours.
 *
 * `skip` exists for the facet counts. To label the Colour buttons with how many
 * stones each would return, colour itself must be left out of the test —
 * otherwise every colour but the chosen one counts zero and the numbers only
 * ever tell you what you already clicked.
 */
export function matches(stone, f, skip) {
  const on = (key, value) => {
    if (skip === key) return true;
    const chosen = f[key];
    return chosen.length === 0 || chosen.includes(value);
  };

  if (!on('shape', shapeCode(stone.shape))) return false;
  if (!on('colour', plain(stone.colour))) return false;
  if (!on('clarity', plain(stone.clarity))) return false;
  if (!on('cut', gradeCode(stone.cut))) return false;
  if (!on('polish', gradeCode(stone.polish))) return false;
  if (!on('symmetry', gradeCode(stone.symmetry))) return false;
  if (!on('fluorescence', fluorCode(stone.fluorescence))) return false;
  if (!on('lab', labCode(stone.lab))) return false;
  if (!on('growth', plain(stone.growth))) return false;

  if (skip !== 'carat') {
    const min = Number.parseFloat(f.caratMin);
    const max = Number.parseFloat(f.caratMax);
    if (Number.isFinite(min) && stone.carat < min) return false;
    if (Number.isFinite(max) && stone.carat > max) return false;
  }

  if (skip !== 'inStockOnly' && f.inStockOnly && plain(stone.availability) !== 'IN STOCK') {
    return false;
  }

  return true;
}

/**
 * How many stones each option would return, given everything chosen elsewhere.
 *
 * Counting this way is what stops the panel leading anyone into an empty
 * result: an option showing 0 is visibly a dead end before it is clicked, not
 * after.
 */
export function facetCounts(stones, f, key, readValue) {
  const pool = stones.filter((s) => matches(s, f, key));
  const out = new Map();
  for (const stone of pool) {
    const value = readValue(stone);
    if (!value) continue;
    out.set(value, (out.get(value) ?? 0) + 1);
  }
  return out;
}
