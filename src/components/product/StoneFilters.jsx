import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { useLocale, interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import ShapeGlyph from './ShapeGlyph.jsx';
import { shapeName } from './shapeNames.js';
import {
  CARAT_BANDS, CLARITIES, COLOURS, CUTS, EMPTY, FINISHES, FLUORESCENCES,
  GROWTHS, SHAPES, facetCounts, fluorCode, gradeCode, isActive,
  labCode, matches, shapeCode,
} from './stoneFilter.js';
import COPY from './StoneFilters.copy.js';
import styles from './StoneFilters.module.css';

/**
 * The stock finder.
 *
 * A trade buyer arrives knowing the stone they want and wants to say so in one
 * pass — shape, weight, colour, clarity, then the finish grades. The column
 * is ordered that way, and the groups named first stand open.
 *
 * WHERE IT SITS. On a desk the groups stand in a column BESIDE the stones — a
 * sidebar that stays put while the results scroll, so a choice and its effect
 * are on screen together. Stacked above the results, as it was, the panel put
 * twelve hundred pixels between the buyer and the first stone. In a hand the
 * same column slides in from the edge as a drawer over the results, opened
 * from the bar that also carries the count and the applied choices.
 *
 * HOW IT READS. Each group is a toggle (see Group below); the first four
 * open, the rest folded, and a folded group carries its chosen count. The
 * graded groups — weight, colour, clarity, cut, polish, symmetry,
 * fluorescence — are two-handle scales (ScaleRange, CaratRange), the way the
 * large diamond catalogues set them; laboratory, growth and stock stage are
 * checkbox rows; shape keeps its glyph tiles.
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

/* The codes a buyer scans for, spelled out beside them where a row has room.
   These are the grades' trade names and stay English in every language. */
const GRADE_NAME = { ID: 'Ideal', EX: 'Excellent', VG: 'Very Good', G: 'Good' };
const FLUOR_NAME = { NON: 'None', FNT: 'Faint', MED: 'Medium', STG: 'Strong', VST: 'Very Strong' };

/*
 * One group of the column: a toggle that opens onto its options.
 *
 * A native disclosure — details/summary — because that is the control a
 * keyboard and a screen reader already know how to work: Enter or Space on
 * the heading, announced as expanded or collapsed, no script involved. The
 * groups a buyer names first (shape, weight, colour, clarity) open by
 * default; the finish grades and the rest start folded, as the large
 * catalogues do, so the column reads as a table of contents before it reads
 * as a wall. A folded group still shows how many of its options are chosen,
 * so nothing narrowing the results is ever out of sight.
 *
 * The fieldset inside keeps the grouping semantics for the checkboxes; its
 * legend is the toggle's own label, hidden visually because the summary
 * already shows it.
 */
function Group({ title, count = 0, defaultOpen = false, extra, children }) {
  const c = useCopy(COPY);
  return (
    <details className={styles.group} open={defaultOpen || undefined}>
      <summary className={styles.summary}>
        <span className={styles.groupName}>{title}</span>
        {count > 0 && <b className={styles.groupCount} aria-label={interpolate(c.chosen, { count })}>{count}</b>}
        <svg className={styles.chevron} viewBox="0 0 10 6" aria-hidden="true" focusable="false">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </summary>
      <fieldset className={styles.groupBody}>
        <legend className="u-visually-hidden">{title}</legend>
        {extra}
        {children}
      </fieldset>
    </details>
  );
}

/*
 * A graded scale with two handles.
 *
 * Colour, clarity and the finish grades are ORDERED, and a buyer asks for a
 * span of them — "D to F", "VS1 and better" — not for a scattering. The
 * large diamond catalogues all settle on the same control for this: a bar
 * divided into the grades, best on the left, with a handle at each end of the
 * chosen span. That is what this is, built from two native range inputs laid
 * over one track, so the keyboard already works (arrow keys move a handle,
 * Home and End send it to an end) and a screen reader hears the grade at
 * each handle, not a number.
 *
 * The state stays what it was — the array of chosen grades — so the matching
 * and the facet counts are untouched: a span is simply the contiguous slice
 * of the list, and the whole list means no filter at all. A grade can also be
 * tapped: outside the span it extends the span to it; inside, it narrows the
 * span to that one grade.
 */
function ScaleRange({ label, items, value, onChange, counts, loading, format = (item) => item }) {
  const words = useCopy(COPY);
  const n = items.length;
  const positions = value.map((v) => items.indexOf(v)).filter((i) => i >= 0);
  const chosen = positions.length > 0;
  const lo = chosen ? Math.min(...positions) : 0;
  const hi = chosen ? Math.max(...positions) : n - 1;
  const commit = (a, b) => onChange(a === 0 && b === n - 1 ? [] : items.slice(a, b + 1));
  const tap = (i) => {
    if (!chosen) return commit(i, i);
    if (i < lo) return commit(i, hi);
    if (i > hi) return commit(lo, i);
    return commit(i, i);
  };
  const reading = !chosen ? words.any : lo === hi ? format(items[lo]) : `${format(items[lo])} – ${format(items[hi])}`;

  return (
    <div className={styles.scale} style={{ '--n': n, '--lo': lo / (n - 1), '--hi': hi / (n - 1) }} data-chosen={chosen ? '' : undefined}>
      <p className={styles.reading}>{reading}</p>
      <div className={styles.track}>
        <span className={styles.fill} aria-hidden="true" />
        {/* The handles cannot cross: each is clamped at the other. */}
        <input
          className={styles.thumb}
          type="range"
          min={0}
          max={n - 1}
          step={1}
          value={lo}
          aria-label={interpolate(words.from, { label })}
          aria-valuetext={format(items[lo])}
          onChange={(e) => commit(Math.min(Number(e.target.value), hi), hi)}
        />
        <input
          className={styles.thumb}
          type="range"
          min={0}
          max={n - 1}
          step={1}
          value={hi}
          aria-label={interpolate(words.to, { label })}
          aria-valuetext={format(items[hi])}
          onChange={(e) => commit(lo, Math.max(Number(e.target.value), lo))}
        />
      </div>
      <ol className={styles.ticks} aria-label={interpolate(words.grades, { label })}>
        {items.map((item, i) => {
          const c = counts?.get(item) ?? 0;
          const within = chosen && i >= lo && i <= hi;
          return (
            <li key={item} data-in={within ? '' : undefined} data-dead={!loading && c === 0 ? '' : undefined}>
              <button type="button" onClick={() => tap(i)} aria-pressed={within}>
                <span>{format(item)}</span>
                <em aria-hidden="true">{loading ? '' : c}</em>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/* The slider's reach. Stones above ten carats are typed into the box. */
const CARAT_LO = 0.2;
const CARAT_HI = 10;

/*
 * Weight: the same two-handle bar over a continuous scale, with the two
 * boxes beneath it for a buyer who knows the number. A handle pushed to an
 * end of the bar clears that end of the filter, so the bar at full width is
 * the same state as two empty boxes.
 */
function CaratRange({ value, set }) {
  const { t } = useLocale();
  const c = useCopy(COPY);
  const caratFrom = interpolate(c.from, { label: t('terms.carat') });
  const caratTo = interpolate(c.to, { label: t('terms.carat') });
  const lo = value.caratMin === '' ? CARAT_LO : Math.min(Math.max(Number(value.caratMin) || CARAT_LO, CARAT_LO), CARAT_HI);
  const hi = value.caratMax === '' ? CARAT_HI : Math.min(Math.max(Number(value.caratMax) || CARAT_HI, CARAT_LO), CARAT_HI);
  const at = (v) => (v - CARAT_LO) / (CARAT_HI - CARAT_LO);
  return (
    <div className={styles.scale} style={{ '--lo': at(lo), '--hi': at(hi) }} data-chosen={value.caratMin !== '' || value.caratMax !== '' ? '' : undefined}>
      <p className={styles.reading}>
        {value.caratMin === '' && value.caratMax === '' ? c.anyWeight : `${value.caratMin || CARAT_LO} – ${value.caratMax || `${CARAT_HI}+`} ct`}
      </p>
      <div className={`${styles.track} ${styles.trackFull}`}>
        <span className={styles.fill} aria-hidden="true" />
        <input
          className={styles.thumb}
          type="range"
          min={CARAT_LO}
          max={CARAT_HI}
          step={0.01}
          value={lo}
          aria-label={caratFrom}
          aria-valuetext={interpolate(c.caratValue, { value: band(lo) })}
          onChange={(e) => {
            const v = Math.min(Number(e.target.value), hi);
            set({ caratMin: v <= CARAT_LO ? '' : band(v) });
          }}
        />
        <input
          className={styles.thumb}
          type="range"
          min={CARAT_LO}
          max={CARAT_HI}
          step={0.01}
          value={hi}
          aria-label={caratTo}
          aria-valuetext={interpolate(c.caratValue, { value: band(hi) })}
          onChange={(e) => {
            const v = Math.max(Number(e.target.value), lo);
            set({ caratMax: v >= CARAT_HI ? '' : band(v) });
          }}
        />
      </div>
      <div className={styles.range}>
        <label>
          <span className="u-visually-hidden">{caratFrom}</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder={c.placeholderFrom}
            value={value.caratMin}
            onChange={(e) => set({ caratMin: e.target.value })}
          />
        </label>
        <span aria-hidden="true">–</span>
        <label>
          <span className="u-visually-hidden">{caratTo}</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            placeholder={c.placeholderTo}
            value={value.caratMax}
            onChange={(e) => set({ caratMax: e.target.value })}
          />
        </label>
      </div>
    </div>
  );
}

/* The groups that are graded scales; the rest are lists. */
const SCALES = ['colour', 'clarity', 'cut', 'polish', 'symmetry', 'fluorescence'];

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
  const { locale, t } = useLocale();
  const c = useCopy(COPY);
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
    colour: t('terms.colour'), clarity: t('terms.clarity'), cut: t('terms.cut'), polish: t('terms.polish'),
    symmetry: t('terms.symmetry'), fluorescence: t('terms.fluorescence'), lab: t('terms.lab'), growth: c.groups.growth,
  };
  /* What a chip says for one chosen option. The option itself — the value
     that is matched and removed — is untouched. */
  const said = (key, item) => {
    if (key === 'shape') return shapeName(item, locale);
    if (key === 'lab' && item === 'NONE') return c.none;
    return item;
  };
  const applied = [];
  const ORDER = { colour: COLOURS, clarity: CLARITIES, cut: CUTS, polish: FINISHES, symmetry: FINISHES, fluorescence: FLUORESCENCES };
  for (const [key, label] of Object.entries({ shape: '', ...GROUP_LABEL })) {
    if (SCALES.includes(key) && value[key].length > 0) {
      // A span is one choice, said once: "Colour D – G", removed as one.
      const ordered = ORDER[key].filter((g) => value[key].includes(g));
      const first = ordered[0];
      const last = ordered[ordered.length - 1];
      const name = (g) => (key === 'fluorescence' ? FLUOR_NAME[g] : GRADE_NAME[g]) ?? g;
      applied.push({
        id: key,
        label: `${label} ${first === last ? name(first) : `${name(first)} – ${name(last)}`}`,
        remove: () => set({ [key]: [] }),
      });
      continue;
    }
    for (const item of value[key]) {
      applied.push({ id: `${key}:${item}`, label: label ? `${label} ${said(key, item)}` : said(key, item), remove: () => toggle(key, item) });
    }
  }
  if (value.caratMin !== '' || value.caratMax !== '') {
    applied.push({
      id: 'carat',
      label: `${value.caratMin || '0'} – ${value.caratMax || '∞'} ct`,
      remove: () => set({ caratMin: '', caratMax: '' }),
    });
  }
  if (value.inStockOnly) applied.push({ id: 'stock', label: c.inStockOnly, remove: () => set({ inStockOnly: false }) });
  /* Choices, not grades: a span of five colours is one filter, said once. */
  const activeCount = applied.length;

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
    /*
     * Only what can actually take focus: enabled, and rendered. The column's
     * desk-only Clear all is first in the DOM but display:none in the drawer,
     * and focusing it silently did nothing — focus stayed on the opener
     * behind the veil, and the first Tab walked out of the dialog.
     */
    const focusables = () => (node
      ? [...node.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href], summary')]
        .filter((el) => el.offsetParent !== null)
      : []);
    focusables()[0]?.focus();

    const onKey = (event) => {
      if (event.key === 'Escape') { close(); return; }
      if (event.key !== 'Tab' || !node) return;
      const items = focusables();
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

  /*
   * One option per row: a checkbox, its label and, at the end of the row,
   * how many stones it would leave. The list a buyer reads down rather than
   * a cloud they scan across — the shape every large catalogue settles on
   * for a column, because a column is read top to bottom.
   *
   * A dead end (nothing behind it) stays in the list, greyed, so the buyer
   * learns the house holds none this week rather than wondering where the
   * option went. While the stock is still arriving nothing is a dead end.
   */
  const rows = (key, items, counted, format = (item) => item) => (
    <ul className={styles.rows}>
      {items.map((item) => {
        const n = counted.get(item) ?? 0;
        const on = value[key].includes(item);
        const dead = !loading && n === 0 && !on;
        return (
          <li key={item}>
            <label className={styles.row} data-on={on ? '' : undefined} data-dead={dead ? '' : undefined}>
              <input type="checkbox" checked={on} disabled={dead} onChange={() => toggle(key, item)} />
              <span>{format(item)}</span>
              <em aria-hidden="true">{loading ? '' : n}</em>
            </label>
          </li>
        );
      })}
    </ul>
  );

  /* Shown on the toggle so a collapsed group still says what it is doing to
     the results: how many options are chosen, or 1 for a graded span, which
     is one choice however many grades it covers. */
  const chosen = (key) => (SCALES.includes(key) ? Math.min(1, value[key].length) : value[key].length);

  const tally = loading
    ? c.loadingStock
    : interpolate(stones.length === 1 ? c.tally.one : c.tally.other, { shown, total: stones.length });

  /* The results bar: what is being looked at, how many, what narrows it,
     and — in a hand — the way into the drawer. */
  const bar = (
    <div className={`${styles.f} ${styles.bar}`}>
      <div className={styles.head}>
        <h2 className={styles.title}>{c.title}</h2>
        <p className={styles.tally} role="status">
          {tally}
          {!loading && activeCount > 0 && (
            <span> · {interpolate(activeCount === 1 ? c.filterCount.one : c.filterCount.other, { n: activeCount })}</span>
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
          {c.filters}
          {activeCount > 0 && <b aria-hidden="true">{activeCount}</b>}
        </button>
        <button
          type="button"
          className={styles.clear}
          onClick={clearAll}
          disabled={!active}
        >
          {c.clearAll}
        </button>
      </div>

      {applied.length > 0 && !loading && (
        <ul className={styles.applied} aria-label={c.applied}>
          {applied.map((chip) => (
            <li key={chip.id}>
              <button type="button" onClick={chip.remove} aria-label={interpolate(c.remove, { label: chip.label })}>
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
      /*
       * The smooth scroller must keep its hands off this box.
       *
       * Lenis listens for wheel on the window and scrolls the document with
       * it, so a wheel over this column moved the page behind instead of the
       * list under the pointer: on desktop nine of the eleven filter groups
       * could not be reached with a mouse at all, and over the open drawer the
       * page scrolled behind the modal. This attribute is Lenis's own opt-out,
       * and it hands the wheel back to the element that is actually scrollable.
       */
      data-lenis-prevent=""
      inert={!wide && !open}
      role={wide ? undefined : 'dialog'}
      aria-modal={wide ? undefined : 'true'}
      aria-label={c.filters}
    >
      <div className={styles.sideHead}>
        <p className={styles.sideTitle}>{c.filters}</p>
        {/* Two controls for two places: the desk's column offers Clear all
            at its top; the drawer offers the way out. CSS shows one each. */}
        <button type="button" className={styles.sideClear} onClick={clearAll} disabled={!active}>
          {c.clearAll}
        </button>
        <button type="button" className={styles.closer} onClick={close} aria-label={c.closeFilters}>
          <span aria-hidden="true">×</span>
        </button>
      </div>

      <form
        className={styles.panel}
        onSubmit={(e) => e.preventDefault()}
        aria-busy={loading || undefined}
      >
        <Group title={t('terms.shape')} count={chosen('shape')} defaultOpen>
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
                    <span>{shapeName(item, locale)}</span>
                    <em aria-hidden="true">{loading ? '' : n}</em>
                  </button>
                </li>
              );
            })}
          </ul>
        </Group>

        <Group title={c.groups.weight} count={value.caratMin !== '' || value.caratMax !== '' ? 1 : 0} defaultOpen>
          <CaratRange value={value} set={set} />
          {/* The bands a stock sheet is ruled in, as quick picks under the bar. */}
          <ul className={styles.bands} aria-label={c.weightBands}>
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
                    /* Pressing the band already chosen clears it. */
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
        </Group>

        <Group title={t('terms.colour')} count={chosen('colour')} defaultOpen>
          <ScaleRange label={t('terms.colour')} items={COLOURS} value={value.colour} onChange={(v) => set({ colour: v })} counts={counts.colour} loading={loading} />
        </Group>

        <Group title={t('terms.clarity')} count={chosen('clarity')} defaultOpen>
          <ScaleRange label={t('terms.clarity')} items={CLARITIES} value={value.clarity} onChange={(v) => set({ clarity: v })} counts={counts.clarity} loading={loading} />
        </Group>

        <Group
          title={t('terms.cut')}
          count={chosen('cut')}
          extra={(
            <div className={styles.quick}>
              <button
                type="button"
                onClick={() => triple(['ID', 'EX'])}
                title={c.quick.tripleEx}
              >
                3X
              </button>
              <button
                type="button"
                onClick={() => triple(['ID', 'EX', 'VG'])}
                title={c.quick.vgPlus}
              >
                VG+
              </button>
              <button
                type="button"
                onClick={() => set({ cut: [], polish: [], symmetry: [] })}
              >
                {c.quick.reset}
              </button>
            </div>
          )}
        >
          <ScaleRange label={t('terms.cut')} items={CUTS} value={value.cut} onChange={(v) => set({ cut: v })} counts={counts.cut} loading={loading} format={(g) => GRADE_NAME[g] ?? g} />
        </Group>

        <Group title={t('terms.polish')} count={chosen('polish')}>
          <ScaleRange label={t('terms.polish')} items={FINISHES} value={value.polish} onChange={(v) => set({ polish: v })} counts={counts.polish} loading={loading} format={(g) => GRADE_NAME[g] ?? g} />
        </Group>

        <Group title={t('terms.symmetry')} count={chosen('symmetry')}>
          <ScaleRange label={t('terms.symmetry')} items={FINISHES} value={value.symmetry} onChange={(v) => set({ symmetry: v })} counts={counts.symmetry} loading={loading} format={(g) => GRADE_NAME[g] ?? g} />
        </Group>

        <Group title={t('terms.fluorescence')} count={chosen('fluorescence')}>
          <ScaleRange label={t('terms.fluorescence')} items={FLUORESCENCES} value={value.fluorescence} onChange={(v) => set({ fluorescence: v })} counts={counts.fluorescence} loading={loading} format={(f) => FLUOR_NAME[f] ?? f} />
        </Group>

        <Group title={c.groups.laboratory} count={chosen('lab')}>
          {rows('lab', labs, counts.lab, (l) => (l === 'NONE' ? c.noReport : l))}
        </Group>

        {/* Not on the sheet this answers to, because that sheet is not for
            lab-grown stock. Here it is among the first things asked. */}
        <Group title={c.groups.growth} count={chosen('growth')}>
          {rows('growth', GROWTHS, counts.growth)}
        </Group>

        <Group title={c.groups.stage} count={value.inStockOnly ? 1 : 0}>
          <ul className={styles.rows}>
            <li>
              <label className={styles.row} data-on={value.inStockOnly ? '' : undefined}>
                <input
                  type="checkbox"
                  checked={value.inStockOnly}
                  onChange={(e) => set({ inStockOnly: e.target.checked })}
                />
                <span>{c.inStockOnly}</span>
              </label>
            </li>
          </ul>
        </Group>
      </form>

      {/* The drawer's own foot: the choices are already applied, so the
          primary action only takes the buyer back to what they narrowed. */}
      <div className={styles.sideFoot}>
        <button type="button" className={styles.clear} onClick={clearAll} disabled={!active}>
          {c.clearAll}
        </button>
        <button type="button" className={styles.apply} onClick={close}>
          {loading ? c.showStones : interpolate(shown === 1 ? c.show.one : c.show.other, { n: shown })}
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
