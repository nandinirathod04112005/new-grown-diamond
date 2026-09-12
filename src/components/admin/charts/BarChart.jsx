import { fmt, useWidth } from './chartUtils.js';
import s from './Charts.module.css';

/** A column with a 4px rounded data-end and a square foot on the baseline. */
function column(x, y, w, h, r) {
  const rr = Math.min(r, h, w / 2);
  return `M${x} ${y + h}V${y + rr}Q${x} ${y} ${x + rr} ${y}H${x + w - rr}Q${x + w} ${y} ${x + w} ${y + rr}V${y + h}Z`;
}

/**
 * Vertical bars, every one labelled with its value.
 *
 *   data   [{ label: 'Apr', title: 'April 2026', value: 3 }, …] in display order
 *   label  what the chart shows, for the accessible summary and caption
 *   unit   optional word for the summary ("orders")
 *
 * Because every bar carries its number there is no y-axis to read; the
 * baseline stays so the bars have something to stand on. Bars are capped at
 * 24px so a six-month chart on a wide panel stays a chart and not a wall.
 * A zero is a zero: no bar, and a 0 on the baseline.
 */
export default function BarChart({ data, label, unit = '', height = 170, formatValue = fmt }) {
  const [ref, width] = useWidth();
  const items = data ?? [];
  const n = items.length;
  if (!n) return <p className={s.empty}>Nothing recorded yet.</p>;

  const value = (d) => Number(d.value) || 0;
  const max = Math.max(0, ...items.map(value));
  const padT = 20;
  const padB = 22;
  const padX = 4;
  const plotW = Math.max(40, width - padX * 2);
  const plotH = Math.max(30, height - padT - padB);
  const band = plotW / n;
  const barW = Math.max(4, Math.min(24, band * 0.62));
  const base = padT + plotH;
  const h = (v) => (max > 0 ? (v / max) * plotH : 0);
  /* Category labels thin out on a very narrow panel rather than overlap. */
  const labelEvery = band >= 30 ? 1 : Math.ceil(30 / band);

  const words = unit ? ` ${unit}` : '';
  const summary = `${label}: ${items.map((d) => `${d.title ?? d.label} ${formatValue(value(d))}${words}`).join(', ')}.`;

  return (
    <div className={s.chart} ref={ref}>
      <svg className={s.svg} width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={summary}>
        <line className={s.baseline} x1={padX} x2={padX + plotW} y1={base} y2={base} />
        {items.map((d, i) => {
          const v = value(d);
          const cx = padX + band * (i + 0.5);
          const bh = h(v);
          return (
            <g key={d.key ?? d.label} className={s.barGroup}>
              <title>{`${d.title ?? d.label}: ${formatValue(v)}${words}`}</title>
              {bh > 0 && (
                <path
                  className={s.bar}
                  d={column(cx - barW / 2, base - bh, barW, bh, 4)}
                  style={{ fill: 'var(--cx-single)', animationDelay: `${i * 40}ms` }}
                />
              )}
              <text className={s.barValue} x={cx} y={base - bh - 6}>{formatValue(v)}</text>
              {i % labelEvery === 0 && (
                <text className={s.tick} x={cx} y={height - 6} textAnchor="middle">{d.label}</text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Wrapped, because a table ignores width: 1px and would still widen the page. */}
      <div className={s.srOnly}>
        <table>
          <caption>{label}</caption>
          <thead>
            <tr><th scope="col">Period</th><th scope="col">{unit ? unit[0].toUpperCase() + unit.slice(1) : 'Value'}</th></tr>
          </thead>
          <tbody>
            {items.map((d) => (
              <tr key={d.key ?? d.label}><th scope="row">{d.title ?? d.label}</th><td>{formatValue(value(d))}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
