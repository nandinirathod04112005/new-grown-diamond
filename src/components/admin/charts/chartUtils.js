import { useCallback, useState } from 'react';

/**
 * Shared arithmetic for the console's charts. No component lives here, so
 * the chart files each export exactly one.
 */

/** 1,284 — the viewer's own grouping, like every other figure in the console. */
export function fmt(n, decimals = 0) {
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/** Axis ticks only: 12.9K rather than 12,900, so a narrow plot keeps its labels. */
export function tick(n) {
  if (Math.abs(n) < 10000) return fmt(n, Number.isInteger(n) ? 0 : 1);
  return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
}

/** Share of a whole, rounded; never NaN. */
export function pct(part, whole) {
  if (!whole) return '0%';
  const p = (part / whole) * 100;
  return `${p > 0 && p < 1 ? '<1' : Math.round(p)}%`;
}

/**
 * A clean axis: 0 to a round top in 3–5 even steps. Counts step in whole
 * numbers, so a quiet week reads 0 1 2 3 rather than 0 0.75 1.5 2.25.
 */
export function niceScale(max, { count = 4, integer = true } = {}) {
  if (!(max > 0)) return { top: 1, ticks: [0, 1] };
  const raw = max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  let step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  if (integer) step = Math.max(1, Math.ceil(step));
  const top = Math.ceil(max / step - 1e-9) * step;
  const ticks = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { top, ticks };
}

/** "2026-09-11" as "11 Sep", read as a LOCAL date so it never shifts a day. */
export function shortDate(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  if (!y || !m || !d) return String(key);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function longDate(key) {
  const [y, m, d] = String(key).split('-').map(Number);
  if (!y || !m || !d) return String(key);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Categorical colour by SLOT, never by rank: callers pass items in a fixed
 * order (or pin `slot` per item), so a value that drops to zero or a filter
 * that removes one never repaints the others. Past eight there is no ninth
 * hue — callers fold the tail into "Other", which takes the neutral.
 */
export const slotColor = (slot) => (slot > 0 && slot <= 8 ? `var(--cx-${slot})` : 'var(--cx-other)');

/**
 * The element's rendered width, kept current by a ResizeObserver, so an SVG
 * can be drawn 1:1 in pixels — text in a stretched viewBox is distorted
 * text, and axis labels are the part of a chart that must stay readable.
 */
export function useWidth(fallback = 560) {
  const [width, setWidth] = useState(fallback);

  /*
   * A callback ref rather than an effect: a chart that first renders its empty
   * state and only later gets a plot must still start measuring when the plot
   * appears. React 19 calls the returned cleanup when the node goes away.
   */
  const ref = useCallback((el) => {
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.floor(entry.contentRect.width);
      if (w > 0) setWidth((prev) => (prev === w ? prev : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, width];
}
