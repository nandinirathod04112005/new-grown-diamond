import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
 * WHERE IT SITS. On a desk the groups stand in a column BESIDE the stones — a
 * sidebar that stays put while the results scroll, so a choice and its effect
 * are on screen together. Stacked above the results, as it was, the panel put
 * twelve hundred pixels between the buyer and the first stone. In a hand the
 * same column slides in from the edge as a drawer over the results, opened
 * from the bar that also carries the count and the applied choices.
 *
 * Results update as each option is pressed. The stock sheet this answers to has
 * a Search button because it goes to a server; every stone here is already in
 * hand, so a button that re-applies filters already applied would be a step
 * that costs a click and returns nothing. The drawer's "Show N stones" only
 * closes it.
 *
 * This component renders TWO siblings — the results bar and the column — and
 * the page lays them out: on a desk the column takes the first grid column and
 * the bar heads the second; in a hand the bar is sticky and the column is the
 * drawer, portalled to the body.
 */

const band = (n) => n.toFixed(2);

const WIDE = '(min-width: 1024px)';

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
  const clearAll = useCallback(() => onChange(EMPTY), [onChange]);

  /*
   * What is applied, said back in one row.
   *
   * With eleven groups in the column, the only record of a choice was the
   * inverted chip somewhere inside them — a buyer reading the results had no
   * way to see, or undo, what was narrowing them without going back through
   * every group. Each entry here removes exactly the one choice it names.
   */
  const GROUP_LABEL = {
    colour: 'Colour', clarity: 'Clarity', cut: 'Cut', polish: 'Polish',
    symmetry: 'Symmetry', fluorescence: 'Fluorescence', lab: 'Lab', growth: 'Growth',
  };
  const applied = [];
  for (const [key, label] of Object.entries({ shape: '', ...GROUP_LABEL })) {
    for (const item of value[key]) {
      applied.push({ id: `${key}:${item}`, label: label ? `${label} ${item}` : item, remove: () => toggle(key, item) });
    }
  }
  if (value.caratMin !== '' || value.caratMax !== '') {
    applied.push({
      id: 'carat',
      label: `${value.caratMin || '0'} – ${value.caratMax || '∞'} ct`,
      remove: () => set({ caratMin: '', caratMax: '' }),
    });
  }
  if (value.inStockOnly) applied.push({ id: 'stock', label: 'In stock only', remove: () => set({ inStockOnly: false }) });

  /*
   * Sidebar or drawer.
   *
   * Read from the media query at initialisation rather than corrected in an
   * effect, so the first render is already the settled state — a desk never
   * paints a closed drawer and then a column. The listener keeps a window
   * that is resized across the breakpoint honest: a drawer left open becomes
   * the column, and the column is never announced as a dialog.
   */
  const [wide, setWide] = useState(
    () => typeof window === 'undefined' || window.matchMedia(WIDE).matches,
  );
  useEffect(() => {
    const query = window.matchMedia(WIDE);
    const update = () => setWide(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panel = useRef(null);
  const opener = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  const drawer = !wide && open;

  /*
   * The drawer is a real dialog while it is open: focus moves into it, Tab
   * stays inside it, Escape closes it, the page behind does not scroll, and
   * focus returns to the button that opened it. The same four rules as the
   * site menu, for the same reason — without them a panel over the page is
   * something a keyboard can fall out of and never get back into.
   */
  useEffect(() => {
    if (!drawer) return undefined;
    const node = panel.current;
    const opened = opener.current;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    node?.querySelector('button, input, a')?.focus();

    const onKey = (event) => {
      if (event.key === 'Escape') { close(); return; }
      if (event.key !== 'Tab' || !node) return;
      const items = [...node.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href]')]
        .filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      opened?.focus();
    };
  }, [drawer, close]);

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

  const tally = loading ? 'Loading stock' : `${shown} of ${stones.length} ${stones.length === 1 ? 'stone' : 'stones'}`;

  /* The results bar: what is being looked at, how many, what narrows it,
     and — in a hand — the way into the drawer. */
  const bar = (
    <div className={`${styles.f} ${styles.bar}`}>
      <div className={styles.head}>
        <h2 className={styles.title}>Find a stone</h2>
        <p className={styles.tally} role="status">
          {tally}
          {!loading && activeCount > 0 && (
            <span> · {activeCount} filter{activeCount === 1 ? '' : 's'}</span>
          )}
        </p>
        <button
          ref={opener}
          type="button"
          className={styles.opener}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen(true)}
        >
          Filters
          {activeCount > 0 && <b aria-hidden="true">{activeCount}</b>}
        </button>
        <button
          type="button"
          className={styles.clear}
          onClick={clearAll}
          disabled={!active}
        >
          Clear all
        </button>
      </div>

      {applied.length > 0 && !loading && (
        <ul className={styles.applied} aria-label="Applied filters">
          {applied.map((chip) => (
            <li key={chip.id}>
              <button type="button" onClick={chip.remove} aria-label={`Remove ${chip.label}`}>
                <span>{chip.label}</span>
                <em aria-hidden="true">×</em>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  /*
   * The column. A sidebar beside the stones on a desk; over them, as a
   * drawer, in a hand. `inert` keeps a closed drawer out of the tab order and
   * away from assistive technology without unmounting it, so it keeps its
   * scroll position and the page keeps its selections.
   *
   * In a hand it is PORTALLED to the body, for the reason NavMenu is: the
   * page content sits in a stacking context of its own (`.u-above-film`),
   * and nothing inside it — whatever its z-index — can paint over the fixed
   * header. Left in place, the header's mark and menu control sat on top of
   * the drawer's title and close button.
   */
  const column = (
    <aside
      id={panelId}
      ref={panel}
      className={`${styles.f} ${styles.side}`}
      data-open={drawer ? '' : undefined}
      inert={!wide && !open}
      role={wide ? undefined : 'dialog'}
      aria-modal={wide ? undefined : 'true'}
      aria-label="Filters"
    >
      <div className={styles.sideHead}>
        <p className={styles.sideTitle}>Filters</p>
        <button type="button" className={styles.closer} onClick={close} aria-label="Close filters">
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <form
        className={styles.panel}
        onSubmit={(e) => e.preventDefault()}
        aria-busy={loading || undefined}
      >
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

        <fieldset className={styles.group}>
          <legend>Colour</legend>
          {chips('colour', COLOURS, counts.colour)}
        </fieldset>

        <fieldset className={styles.group}>
          <legend>Clarity</legend>
          {chips('clarity', CLARITIES, counts.clarity)}
        </fieldset>

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
          <legend>Polish</legend>
          {chips('polish', FINISHES, counts.polish)}
        </fieldset>

        <fieldset className={styles.group}>
          <legend>Symmetry</legend>
          {chips('symmetry', FINISHES, counts.symmetry)}
        </fieldset>

        <fieldset className={styles.group}>
          <legend>Fluorescence</legend>
          {chips('fluorescence', FLUORESCENCES, counts.fluorescence)}
        </fieldset>

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

      {/* The drawer's own foot: the choices are already applied, so the
          primary action only takes the buyer back to what they narrowed. */}
      <div className={styles.sideFoot}>
        <button type="button" className={styles.clear} onClick={clearAll} disabled={!active}>
          Clear all
        </button>
        <button type="button" className={styles.apply} onClick={close}>
          {loading ? 'Show stones' : `Show ${shown} ${shown === 1 ? 'stone' : 'stones'}`}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {bar}
      {wide ? column : createPortal(
        <>
          {column}
          {drawer && <div className={styles.veil} onClick={close} aria-hidden="true" />}
        </>,
        document.body,
      )}
    </>
  );
}
