import { useState } from 'react';

import { fmt, longDate, niceScale, shortDate, slotColor, tick, useWidth } from './chartUtils.js';
import s from './Charts.module.css';

/**
 * A daily series, or two on the same scale.
 *
 *   data    [{ date: 'YYYY-MM-DD', views: 12, sessions: 7 }, …] — one entry per
 *           day, oldest first, zero days included (a quiet day is a 0, not a gap)
 *   series  [{ key: 'views', label: 'Page views' }, { key: 'sessions', label: … }]
 *   label   what the chart shows; used for the accessible summary and caption
 *
 * One series is drawn in the console accent with a wash beneath it and needs
 * no legend — the panel title names it. Two or more take the categorical slots
 * (or `slot` per series) and get a legend. One y-axis only: series that are
 * not the same kind of number belong in separate charts.
 *
 * Pointer or arrow keys move a crosshair that reads every series for that
 * day. The same values are in a visually-hidden table, so nothing is gated
 * behind hovering.
 */
export default function LineChart({ data, series, label, height = 190 }) {
  const [ref, width] = useWidth();
  const [hover, setHover] = useState(null);
  const [keyed, setKeyed] = useState(false);

  const rows = data ?? [];
  const n = rows.length;
  if (!n || !series?.length) return <p className={s.empty}>Nothing recorded yet.</p>;

  const multi = series.length > 1;
  const colour = (sr, i) => (multi ? slotColor(sr.slot ?? i + 1) : 'var(--cx-single)');
  const val = (r, k) => Number(r[k]) || 0;

  const max = Math.max(0, ...rows.flatMap((r) => series.map((sr) => val(r, sr.key))));
  const integer = rows.every((r) => series.every((sr) => Number.isInteger(val(r, sr.key))));
  const { top, ticks } = niceScale(max, { integer });

  /* Geometry in real pixels: the SVG is drawn at its measured width. */
  const padL = Math.ceil(Math.max(...ticks.map((t) => tick(t).length)) * 6.4 + 10);
  const padR = 10;
  const padT = 8;
  const padB = 24;
  const plotW = Math.max(40, width - padL - padR);
  const plotH = Math.max(40, height - padT - padB);
  const step = n > 1 ? plotW / (n - 1) : 0;
  const x = (i) => padL + (n > 1 ? i * step : plotW / 2);
  const y = (v) => padT + plotH - (v / top) * plotH;
  const base = padT + plotH;

  /*
   * As many date labels as fit at ~58px apiece, and the last day always named.
   * When the final regular label sits closer than one full step to the end it
   * gives up its place to today's — the end label is right-anchored, so it
   * reaches back over its neighbour and two close labels would collide.
   */
  const every = Math.max(1, Math.ceil(n / Math.max(1, Math.floor(plotW / 58))));
  const xLabels = [];
  for (let i = 0; i < n; i += every) xLabels.push(i);
  if (n > 1 && xLabels[xLabels.length - 1] !== n - 1) {
    if (xLabels.length === 1 || n - 1 - xLabels[xLabels.length - 1] >= every) xLabels.push(n - 1);
    else xLabels[xLabels.length - 1] = n - 1;
  }

  const paths = series.map((sr) => rows
    .map((r, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(val(r, sr.key)).toFixed(1)}`)
    .join(' '));

  const peakOf = (sr) => rows.reduce((best, r) => (val(r, sr.key) > val(best, sr.key) ? r : best), rows[0]);
  const summary = `${label}. ${n} ${n === 1 ? 'day' : 'days'}, ${shortDate(rows[0].date)} to ${shortDate(rows[n - 1].date)}. `
    + series.map((sr) => {
      const peak = peakOf(sr);
      return val(peak, sr.key) === 0
        ? `${sr.label}: none recorded`
        : `${sr.label}: peak ${fmt(val(peak, sr.key))} on ${shortDate(peak.date)}`;
    }).join('; ')
    + '.';

  const pick = (px) => (n > 1 ? Math.min(n - 1, Math.max(0, Math.round((px - padL) / step))) : 0);
  const onPointer = (e) => {
    const box = e.currentTarget.getBoundingClientRect();
    setKeyed(false);
    setHover(pick(e.clientX - box.left));
  };

  const onKey = (e) => {
    const moves = { ArrowLeft: -1, ArrowRight: 1 };
    let next = null;
    if (e.key in moves) next = Math.min(n - 1, Math.max(0, (hover ?? n - 1) + moves[e.key]));
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    else if (e.key === 'Escape') { setHover(null); return; }
    if (next == null) return;
    e.preventDefault();
    setKeyed(true);
    setHover(next);
  };

  const at = hover != null ? rows[hover] : null;
  const tipLeft = hover != null && x(hover) < width * 0.6;
  const readout = at
    ? `${longDate(at.date)}: ${series.map((sr) => `${sr.label} ${fmt(val(at, sr.key))}`).join(', ')}`
    : '';

  return (
    <div className={s.chart}>
      {multi && (
        <div className={s.legend} aria-hidden="true">
          {series.map((sr, i) => (
            <span key={sr.key} className={s.legendItem}>
              <span className={s.lineKey} style={{ background: colour(sr, i) }} />
              {sr.label}
            </span>
          ))}
        </div>
      )}

      <div
        ref={ref}
        className={s.plot}
        tabIndex={0}
        role="group"
        aria-label={`${label}. Use the left and right arrow keys to read each day.`}
        onKeyDown={onKey}
        onBlur={() => { setHover(null); setKeyed(false); }}
      >
        <svg
          className={s.svg}
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={summary}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={() => setHover(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line className={t === 0 ? s.baseline : s.grid} x1={padL} x2={padL + plotW} y1={y(t)} y2={y(t)} />
              <text className={s.tick} x={padL - 6} y={y(t)} dy="0.32em" textAnchor="end">{tick(t)}</text>
            </g>
          ))}

          {xLabels.map((i) => (
            <text
              key={i}
              className={s.tick}
              x={x(i)}
              y={height - 6}
              textAnchor={n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
            >
              {shortDate(rows[i].date)}
            </text>
          ))}

          {!multi && n > 1 && (
            <path
              className={s.area}
              d={`${paths[0]} L${x(n - 1).toFixed(1)} ${base} L${x(0).toFixed(1)} ${base} Z`}
              style={{ fill: colour(series[0], 0) }}
            />
          )}

          {series.map((sr, i) => (n > 1
            ? <path key={sr.key} className={s.line} d={paths[i]} style={{ stroke: colour(sr, i) }} />
            : null))}

          {/* End markers: where each line finishes today. */}
          {hover == null && series.map((sr, i) => (
            <circle
              key={sr.key}
              className={s.dot}
              cx={x(n - 1)}
              cy={y(val(rows[n - 1], sr.key))}
              r={4}
              style={{ fill: colour(sr, i) }}
            />
          ))}

          {at && (
            <g>
              <line className={s.cross} x1={x(hover)} x2={x(hover)} y1={padT} y2={base} />
              {series.map((sr, i) => (
                <circle
                  key={sr.key}
                  className={s.dot}
                  cx={x(hover)}
                  cy={y(val(at, sr.key))}
                  r={4.5}
                  style={{ fill: colour(sr, i) }}
                />
              ))}
            </g>
          )}

          <rect className={s.hit} x={padL - 6} y={0} width={plotW + 12} height={height} />
        </svg>

        {at && (
          <div
            className={s.tip}
            style={tipLeft ? { left: x(hover) + 10 } : { right: width - x(hover) + 10 }}
            aria-hidden="true"
          >
            <span className={s.tipDate}>{longDate(at.date)}</span>
            {series.map((sr, i) => (
              <span key={sr.key} className={s.tipRow}>
                <span className={s.lineKey} style={{ background: colour(sr, i) }} />
                <span className={s.tipValue}>{fmt(val(at, sr.key))}</span>
                <span className={s.tipLabel}>{sr.label}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* What the crosshair shows, spoken when it is moved from the keyboard. */}
      <p className={s.srOnly} aria-live="polite">{keyed ? readout : ''}</p>

      {/* Wrapped, because a table ignores width: 1px and would still widen the page. */}
      <div className={s.srOnly}>
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              {series.map((sr) => <th key={sr.key} scope="col">{sr.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date}>
                <th scope="row">{longDate(r.date)}</th>
                {series.map((sr) => <td key={sr.key}>{fmt(val(r, sr.key))}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
