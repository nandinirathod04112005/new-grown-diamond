import { useCallback, useMemo, useState } from 'react';

import ShapeGlyph from './ShapeGlyph.jsx';
import {
  CARAT_BANDS, CLARITIES, COLOURS, CUTS, EMPTY, FINISHES, FLUORESCENCES,
  GROWTHS, SHAPES, countActive, facetCounts, fluorCode, gradeCode, isActive,
  labCode, matches, shapeCode,
} from './stoneFilter.js';
import styles from './StoneFilters.module.css';

/**
 * The stock finder.
 *
 * A trade buyer arrives knowing the stone they want and wants to say so in one
 * pass — shape, weight, colour, clarity, then the finish grades. That is why
 * every group is open at once rather than folded behind a disclosure: the panel
 * is long, but it is scanned rather than read, and a collapsed group is a
 * filter the buyer never learns exists.
 *
 * Results update as each option is pressed. The stock sheet this answers to has
 * a Search button because it goes to a server; every stone here is already in
 * hand, so a button that re-applies filters already applied would be a step
 * that costs a click and returns nothing.
 */

const band = (n) => n.toFixed(2);

/*
 * `onChange` is a state setter, and every write goes through its updater form.
 *
 * Spreading the `value` prop instead looks equivalent and is not: the prop is
 * captured at render, so two writes that land before React re-renders both
 * build on the same stale object and the second silently discards the first.
 * Pressing a shape and a colour in the same tick kept only the colour. Reading
 * `prev` takes each write from the state as it actually stands.
 */
export default function StoneFilters({ stones, value, onChange, shown, loading = false }) {
  const set = useCallback(
    (patch) => onChange((prev) => ({ ...prev, ...patch })),
    [onChange],
  );

  const toggle = useCallback(
    (key, item) => onChange((prev) => ({
      ...prev,
      [key]: prev[key].includes(item)
        ? prev[key].filter((v) => v !== item)
        : [...prev[key], item],
    })),
    [onChange],
  );

  /*
   * The canonical trade list, plus anything in stock it does not name.
   *
   * A fixed list alone would hide a shape the company actually holds; deriving
   * purely from stock, as this page used to, made the row change shape every
   * time an item sold. Both together mean the row reads the same week to week
   * and still cannot omit real stock.
   */
  const shapes = useMemo(() => {
    const extra = [...new Set(stones.map((s) => shapeCode(s.shape)))]
      .filter((s) => s && !SHAPES.includes(s))
      .sort();
    return [...SHAPES, ...extra];
  }, [stones]);

  const labs = useMemo(() => {
    const found = new Set(stones.map((s) => labCode(s.lab)));
    const extra = [...found].filter((l) => !['IGI', 'GIA', 'NONE'].includes(l)).sort();
    return ['IGI', 'GIA', ...extra, 'NONE'];
  }, [stones]);

  // One pass per group, each blind to its own group — see facetCounts.
  const counts = useMemo(() => ({
    shape: facetCounts(stones, value, 'shape', (s) => shapeCode(s.shape)),
    colour: facetCounts(stones, value, 'colour', (s) => String(s.colour ?? '').trim().toUpperCase()),
    clarity: facetCounts(stones, value, 'clarity', (s) => String(s.clarity ?? '').trim().toUpperCase()),
    cut: facetCounts(stones, value, 'cut', (s) => gradeCode(s.cut)),
    polish: facetCounts(stones, value, 'polish', (s) => gradeCode(s.polish)),
    symmetry: facetCounts(stones, value, 'symmetry', (s) => gradeCode(s.symmetry)),
    fluorescence: facetCounts(stones, value, 'fluorescence', (s) => fluorCode(s.fluorescence)),
    lab: facetCounts(stones, value, 'lab', (s) => labCode(s.lab)),
    growth: facetCounts(stones, value, 'growth', (s) => String(s.growth ?? '').trim().toUpperCase()),
  }), [stones, value]);

  const caratPool = useMemo(
    () => stones.filter((s) => matches(s, value, 'carat')),
    [stones, value],
  );

  /*
   * "3X" is excellent cut, polish and symmetry, and it selects Ideal too:
   * this table grades a step above Excellent, and a buyer asking for the best
   * finish would not thank us for hiding the better stones on a technicality.
   */
  const triple = useCallback(
    (grades) => set({
      cut: grades.filter((g) => CUTS.includes(g)),
      polish: grades.filter((g) => FINISHES.includes(g)),
      symmetry: grades.filter((g) => FINISHES.includes(g)),
    }),
    [set],
  );

  const active = isActive(value);
  const activeCount = countActive(value);

  /*
   * Every group open at once is right on a desk and wrong in a hand: at phone
   * width the panel runs some two thousand pixels before the first stone, so a
   * visitor who came to look at diamonds scrolls past ten fieldsets to reach
   * one. Below the two-column breakpoint it collapses behind its own summary.
   *
   * Read from the media query at initialisation rather than corrected in an
   * effect, so the first render is already the settled state — the desktop
   * never paints a collapsed panel and then opens it.
   */
  const [open, setOpen] = useState(
    () => typeof window === 'undefined' || window.matchMedia('(min-width: 720px)').matches,
  );

  const chips = (key, items, counted) => (
    <ul className={styles.chips}>
      {items.map((item) => {
        const n = counted.get(item) ?? 0;
        const on = value[key].includes(item);
        return (
          <li key={item}>
            <button
              type="button"
              className={on ? styles.on : ''}
              aria-pressed={on}
              /* A dead end stays visible and legible — it is information about
                 the stock — but it cannot be walked into. While the stock is
                 still arriving nothing is a dead end yet, and greying the whole
                 panel would read as broken rather than as loading. */
              disabled={!loading && n === 0 && !on}
              onClick={() => toggle(key, item)}
            >
              <span>{item}</span>
              <em aria-hidden="true">{loading ? '' : n}</em>
            </button>
          </li>
        );
      })}
    </ul>
  );
  return (
    <form
      className={open ? styles.panel : `${styles.panel} ${styles.shut}`}
      onSubmit={(e) => e.preventDefault()}
      aria-busy={loading || undefined}
    >
      <div className={styles.head}>
        <h2 className={styles.title}>Find a stone</h2>
        <p className={styles.tally} role="status">
          {loading ? 'Loading stock' : (
            <>
              {shown} of {stones.length} {stones.length === 1 ? 'stone' : 'stones'}
              {activeCount > 0 && (
                <span> · {activeCount} filter{activeCount === 1 ? '' : 's'}</span>
              )}
            </>
          )}
        </p>
        <button
          type="button"
          className={styles.clear}
          onClick={() => onChange(EMPTY)}
          disabled={!active}
        >
          Clear all
        </button>
        <button
          type="button"
          className={styles.disclose}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Hide filters' : 'Filters'}
        </button>
      </div>

      <fieldset className={styles.group}>
        <legend>Shape</legend>
        <ul className={styles.shapes}>
          {shapes.map((item) => {
            const n = counts.shape.get(item) ?? 0;
            const on = value.shape.includes(item);
            return (
              <li key={item}>
                <button
                  type="button"
                  className={on ? styles.on : ''}
                  aria-pressed={on}
                  disabled={!loading && n === 0 && !on}
                  onClick={() => toggle('shape', item)}
                >
                  <ShapeGlyph shape={item} className={styles.glyph} />
                  <span>{item}</span>
                  <em aria-hidden="true">{loading ? '' : n}</em>
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <fieldset className={styles.group}>
        <legend>Weight</legend>
        <div className={styles.range}>
          <label>
            <span className="u-visually-hidden">Carat from</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="From"
              value={value.caratMin}
              onChange={(e) => set({ caratMin: e.target.value })}
            />
          </label>
          <span aria-hidden="true">–</span>
          <label>
            <span className="u-visually-hidden">Carat to</span>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              placeholder="To"
              value={value.caratMax}
              onChange={(e) => set({ caratMax: e.target.value })}
            />
          </label>
        </div>
        <ul className={styles.chips}>
          {CARAT_BANDS.map(([lo, hi]) => {
            const on = value.caratMin === band(lo) && value.caratMax === band(hi);
            const n = caratPool.filter((s) => s.carat >= lo && s.carat <= hi).length;
            return (
              <li key={lo}>
                <button
                  type="button"
                  className={on ? styles.on : ''}
                  aria-pressed={on}
                  disabled={!loading && n === 0 && !on}
                  /* Pressing the band already chosen clears it, so the row
                     behaves as switches rather than a one-way trip. */
                  onClick={() => set(on
                    ? { caratMin: '', caratMax: '' }
                    : { caratMin: band(lo), caratMax: band(hi) })}
                >
                  <span>{band(lo)} – {band(hi)}</span>
                  <em aria-hidden="true">{loading ? '' : n}</em>
                </button>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className={styles.pair}>
        <fieldset className={styles.group}>
          <legend>Colour</legend>
          {chips('colour', COLOURS, counts.colour)}
        </fieldset>

        <fieldset className={styles.group}>
          <legend>Clarity</legend>
          {chips('clarity', CLARITIES, counts.clarity)}
        </fieldset>
      </div>

      <div className={styles.pair}>
        <fieldset className={styles.group}>
          <legend>
            <span>Cut</span>
            <span className={styles.quick}>
              <button
                type="button"
                onClick={() => triple(['ID', 'EX'])}
                title="Excellent or better in cut, polish and symmetry"
              >
                3X
              </button>
              <button
                type="button"
                onClick={() => triple(['ID', 'EX', 'VG'])}
                title="Very Good or better in cut, polish and symmetry"
              >
                VG+
              </button>
              <button
                type="button"
                onClick={() => set({ cut: [], polish: [], symmetry: [] })}
              >
                Reset
              </button>
            </span>
          </legend>
          {chips('cut', CUTS, counts.cut)}
        </fieldset>

        <fieldset className={styles.group}>
          <legend>Fluorescence</legend>
          {chips('fluorescence', FLUORESCENCES, counts.fluorescence)}
        </fieldset>
      </div>

      <div className={styles.pair}>
        <fieldset className={styles.group}>
          <legend>Polish</legend>
          {chips('polish', FINISHES, counts.polish)}
        </fieldset>

        <fieldset className={styles.group}>
          <legend>Symmetry</legend>
          {chips('symmetry', FINISHES, counts.symmetry)}
        </fieldset>
      </div>

      <div className={styles.pair}>
        <fieldset className={styles.group}>
          <legend>Laboratory</legend>
          {chips('lab', labs, counts.lab)}
        </fieldset>

        <fieldset className={styles.group}>
          {/* Not on the sheet this answers to, because that sheet is not for
              lab-grown stock. Here it is among the first things asked. */}
          <legend>Growth</legend>
          {chips('growth', GROWTHS, counts.growth)}
        </fieldset>
      </div>

      <fieldset className={styles.group}>
        <legend>Stone stage</legend>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={value.inStockOnly}
            onChange={(e) => set({ inStockOnly: e.target.checked })}
          />
          <span>In stock only</span>
        </label>
      </fieldset>
    </form>
  );
}
