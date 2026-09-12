import { fmt, pct } from './chartUtils.js';
import s from './Charts.module.css';

/**
 * A ranked list: label, value, share, and a bar scaled to the largest row.
 *
 *   items   [{ key?, label, value, note? }] — `note` is a second, quieter line
 *           (e.g. the language split of one page)
 *   label   what the list ranks, for the accessible summary and caption
 *   limit   rows shown; the rest fold into one "Other" row rather than
 *           scrolling away or being dropped
 *   ranked  false keeps the given order (funnel stages, say) instead of sorting
 *   share   false hides the percentage of the whole
 *   keepZero  true keeps zero rows (a funnel stage nobody reached is a fact)
 *
 * Otherwise zero rows are left out: a ranking of things that did not happen
 * is noise. HTML rather than SVG, so long labels ellipsise, never overflow.
 */
export default function HBarList({
  items,
  label,
  limit = 8,
  ranked = true,
  share = true,
  keepZero = false,
  unit = '',
  formatValue = fmt,
  empty = 'Nothing recorded yet.',
}) {
  const all = (items ?? []).map((d) => ({ ...d, value: Number(d.value) || 0 }));
  const clean = keepZero ? all : all.filter((d) => d.value > 0);
  if (!clean.some((d) => d.value > 0)) return <p className={s.empty}>{empty}</p>;

  const ordered = ranked
    ? [...clean].sort((a, b) => b.value - a.value || String(a.label).localeCompare(String(b.label)))
    : clean;

  let rows = ordered;
  if (ordered.length > limit) {
    const head = ordered.slice(0, limit - 1);
    const tail = ordered.slice(limit - 1);
    rows = [
      ...head,
      { key: '__other', label: `Other (${tail.length})`, value: tail.reduce((t, d) => t + d.value, 0), other: true },
    ];
  }

  const total = clean.reduce((t, d) => t + d.value, 0);
  const max = Math.max(...rows.map((d) => d.value));
  const words = unit ? ` ${unit}` : '';
  const summary = `${label}: ${rows.map((d) => `${d.label} ${formatValue(d.value)}${words}${share ? ` (${pct(d.value, total)})` : ''}`).join(', ')}.`;

  return (
    <div className={s.chart}>
      <div className={s.hlist} role="img" aria-label={summary}>
        {rows.map((d, i) => (
          <div key={d.key ?? d.label} className={s.hrow} data-other={d.other ? '' : undefined}>
            <div className={s.hhead}>
              <span className={s.hlabel} title={d.label}>{d.label}</span>
              <span className={s.hvalue}>
                {formatValue(d.value)}
                {share && <span className={s.hshare}>{pct(d.value, total)}</span>}
              </span>
            </div>
            {d.note && <span className={s.hnote} title={d.note}>{d.note}</span>}
            <span className={s.htrack}>
              {d.value > 0 && (
                <span className={s.hfill} style={{ '--w': `${(d.value / max) * 100}%`, animationDelay: `${i * 35}ms` }} />
              )}
            </span>
          </div>
        ))}
      </div>

      {/* Wrapped, because a table ignores width: 1px and would still widen the page. */}
      <div className={s.srOnly}>
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">{unit ? unit[0].toUpperCase() + unit.slice(1) : 'Value'}</th>
              {share && <th scope="col">Share</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.key ?? d.label}>
                <th scope="row">{d.note ? `${d.label} (${d.note})` : d.label}</th>
                <td>{formatValue(d.value)}</td>
                {share && <td>{pct(d.value, total)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
