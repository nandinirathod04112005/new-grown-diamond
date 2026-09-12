import { useState } from 'react';

import { fmt, pct, slotColor, tick } from './chartUtils.js';
import s from './Charts.module.css';

const R = 40;
const STROKE = 12;
const C = 2 * Math.PI * R;
/* ~2px at the rendered size: the surface gap between touching segments. */
const GAP = 1.6;
const MAX_SEGMENTS = 6;

/**
 * Part-to-whole at a glance, with the total in the middle.
 *
 *   data   [{ key, label, value, slot? }] in a FIXED order — colour follows
 *          the item (its slot, or its position), never its rank, so a value
 *          that falls to zero keeps its row and every other item its colour
 *   label  what the whole is, for the accessible summary and caption
 *
 * Zero items stay in the legend at 0 — "Sold 0" is information. More than six
 * items fold the smallest into "Other" (neutral grey): past that, a donut
 * stops being readable and a ranked list is the better form.
 */
export default function Donut({ data, label, centreLabel = 'Total', unit = '', formatValue = fmt, empty = 'Nothing recorded yet.' }) {
  const [active, setActive] = useState(null);

  let items = (data ?? []).map((d, i) => ({ ...d, key: d.key ?? d.label, value: Number(d.value) || 0, slot: d.slot ?? i + 1 }));
  const total = items.reduce((t, d) => t + d.value, 0);
  if (!total) return <p className={s.empty}>{empty}</p>;

  if (items.length > MAX_SEGMENTS) {
    const keep = new Set(
      [...items].sort((a, b) => b.value - a.value).slice(0, MAX_SEGMENTS - 1).map((d) => d.key),
    );
    const rest = items.filter((d) => !keep.has(d.key));
    items = [
      ...items.filter((d) => keep.has(d.key)),
      { key: '__other', label: `Other (${rest.length})`, value: rest.reduce((t, d) => t + d.value, 0), slot: 0 },
    ];
  }

  const lens = items.map((d) => (d.value / total) * C);
  const segments = items
    .map((d, i) => ({ ...d, len: lens[i], start: lens.slice(0, i).reduce((t, l) => t + l, 0) }))
    .filter((d) => d.len > 0);
  const gap = segments.length > 1 ? GAP : 0;

  const words = unit ? ` ${unit}` : '';
  const summary = `${label}: ${items.map((d) => `${d.label} ${formatValue(d.value)} (${pct(d.value, total)})`).join(', ')}. Total ${formatValue(total)}${words}.`;
  const centre = formatValue(total).length > 7 ? tick(total) : formatValue(total);

  return (
    <div className={s.chart}>
      <div className={s.donut}>
        <svg
          className={s.ring}
          viewBox="0 0 100 100"
          role="img"
          aria-label={summary}
          data-active={active != null ? '' : undefined}
        >
          <g transform="rotate(-90 50 50)">
            {segments.map((d) => {
              const visible = Math.max(d.len - gap, Math.min(d.len, 0.8));
              return (
                <circle
                  key={d.key}
                  className={s.seg}
                  data-on={active === d.key ? '' : undefined}
                  cx="50"
                  cy="50"
                  r={R}
                  strokeWidth={STROKE}
                  strokeDasharray={`${visible} ${C - visible}`}
                  strokeDashoffset={-(d.start + gap / 2)}
                  style={{ stroke: slotColor(d.slot) }}
                  onPointerEnter={() => setActive(d.key)}
                  onPointerLeave={() => setActive(null)}
                >
                  <title>{`${d.label}: ${formatValue(d.value)} (${pct(d.value, total)})`}</title>
                </circle>
              );
            })}
          </g>
          <text className={s.centreValue} x="50" y="52">{centre}</text>
          <text className={s.centreLabel} x="50" y="63">{centreLabel}</text>
        </svg>

        <ul className={s.dlegend} aria-hidden="true">
          {items.map((d) => (
            <li
              key={d.key}
              data-on={active === d.key ? '' : undefined}
              onPointerEnter={() => d.value > 0 && setActive(d.key)}
              onPointerLeave={() => setActive(null)}
            >
              <span className={s.swatch} style={{ background: slotColor(d.slot) }} />
              <span className={s.dname} title={d.label}>{d.label}</span>
              <span className={s.dvalue}>{formatValue(d.value)}</span>
              <span className={s.dshare}>{pct(d.value, total)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Wrapped, because a table ignores width: 1px and would still widen the page. */}
      <div className={s.srOnly}>
        <table>
          <caption>{label}</caption>
          <thead>
            <tr><th scope="col">Item</th><th scope="col">{unit ? unit[0].toUpperCase() + unit.slice(1) : 'Value'}</th><th scope="col">Share</th></tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.key}><th scope="row">{d.label}</th><td>{formatValue(d.value)}</td><td>{pct(d.value, total)}</td></tr>
            ))}
            <tr><th scope="row">{centreLabel}</th><td>{formatValue(total)}</td><td>100%</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
