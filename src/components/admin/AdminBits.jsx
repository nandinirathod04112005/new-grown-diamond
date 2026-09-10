import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Minus, RotateCw } from 'lucide-react';

import { prefersReducedMotion } from '@/lib/motion/media.js';
import styles from './AdminBits.module.css';

/**
 * The pieces the console is assembled from.
 *
 * Charts are hand-drawn SVG rather than a charting library: what is needed
 * here is a sparkline and a bar row, both of which are a path and a rect, and
 * neither of which justifies shipping a charting runtime to a page that is
 * already lazy-loading a table. Nothing was installed for this file.
 */

/* ---------------- animated number ---------------- */

/**
 * Tweens whenever the VALUE changes, not when it scrolls into view.
 *
 * That difference is the whole reason this exists beside the storefront's
 * CountUp: on a dashboard the number changes under a stationary card every
 * time the range switches from 7 to 30 days, and an observer-driven counter
 * fires once on entry and then sits still through every one of those.
 */
export function Num({ value, decimals = 0, duration = 520 }) {
  /* Settled once, at mount: the setting does not change mid-session, and
     reading it per render would ask the browser to match a media query on
     every frame of the very animation it is meant to suppress. */
  const [still] = useState(() => prefersReducedMotion());
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  const raf = useRef(0);

  useEffect(() => {
    /* Under reduced motion nothing is tweened and nothing is stored — the
       value is rendered straight through below, so there is no state to set
       and no cascading render to cause. */
    if (still) return undefined;
    const start = performance.now();
    const a = from.current;
    const b = value;
    if (a === b) return undefined;

    const step = (now) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic: most of the distance early, so the figure is readable
      // well before it finally settles.
      const e = 1 - (1 - t) ** 3;
      setShown(a + (b - a) * e);
      if (t < 1) raf.current = requestAnimationFrame(step);
      else from.current = b;
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [value, duration, still]);

  const n = Number.isFinite(still ? value : shown) ? (still ? value : shown) : 0;
  return (
    <span className={styles.num}>
      {n.toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}

/* ---------------- movement against the previous period ---------------- */

function Delta({ now, previous, days }) {
  if (previous == null || !Number.isFinite(previous)) return null;
  const diff = now - previous;
  /*
   * A percentage against zero is infinity, which renders as "∞%" or "NaN%"
   * depending on how it is formatted — neither of which is a fact. When the
   * previous period was empty the absolute change is the only honest thing to
   * show.
   */
  const pct = previous === 0 ? null : Math.round((diff / previous) * 100);
  const Icon = diff > 0 ? ArrowUpRight : diff < 0 ? ArrowDownRight : Minus;
  const tone = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';

  return (
    <span className={styles.delta} data-tone={tone}>
      <Icon size={12} aria-hidden="true" />
      {pct == null ? `${diff >= 0 ? '+' : ''}${diff}` : `${pct > 0 ? '+' : ''}${pct}%`}
      <span className={styles.deltaNote}>vs previous {days}d</span>
    </span>
  );
}

/* ---------------- a single figure ---------------- */

/**
 * Four states, and they are genuinely different things.
 *
 *   loading     — we have not asked yet
 *   unavailable — we asked and were refused; the reason is shown
 *   zero        — we asked, and the answer is none
 *   a number    — we asked, and this is it
 *
 * The third and second are the pair that must never be confused: "no pending
 * enquiries" and "the enquiries table could not be read" look identical if
 * both render 0, and they call for opposite responses.
 */
export function Stat({ label, metric, days, decimals = 0, suffix, loading, hint }) {
  if (loading) {
    return (
      <article className={styles.stat} aria-busy="true">
        <p className={styles.statLabel}>{label}</p>
        <div className={styles.skelNum} />
      </article>
    );
  }

  if (!metric?.ok) {
    return (
      <article className={styles.stat} data-bad="">
        <p className={styles.statLabel}>{label}</p>
        <p className={styles.statOff}>
          <AlertTriangle size={13} aria-hidden="true" /> Unavailable
        </p>
        <p className={styles.statWhy}>{metric?.error ?? 'Not readable with this account.'}</p>
      </article>
    );
  }

  return (
    <article className={styles.stat}>
      <p className={styles.statLabel}>{label}</p>
      <p className={styles.statValue}>
        <Num value={metric.value} decimals={decimals} />
        {suffix && <span className={styles.suffix}>{suffix}</span>}
      </p>
      <Delta now={metric.value} previous={metric.previous} days={days} />
      {hint && <p className={styles.statHint}>{hint}</p>}
    </article>
  );
}

/* ---------------- sparkline ---------------- */

export function Spark({ series, label }) {
  if (!series?.length) return null;
  const max = Math.max(1, ...series.map((p) => p.value));
  const w = 100;
  const h = 28;
  const step = series.length > 1 ? w / (series.length - 1) : w;
  const pts = series.map((p, i) => [i * step, h - (p.value / max) * (h - 3) - 1.5]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`).join(' ');
  const area = `${line} L${w} ${h} L0 ${h} Z`;

  return (
    <svg
      className={styles.spark}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label ?? `Trend across ${series.length} days, peak ${max}`}
    >
      <path d={area} className={styles.sparkFill} />
      <path d={line} className={styles.sparkLine} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/* ---------------- status breakdown ---------------- */

/**
 * Bars for whatever statuses the data actually contains.
 *
 * The buckets are passed in as read from the rows, so this never asserts that
 * a queue has an "open" or a "pending" state. If the project uses different
 * words, these are those words.
 */
export function Bars({ buckets, empty = 'Nothing recorded yet.' }) {
  if (!buckets?.length) return <p className={styles.empty}>{empty}</p>;
  const total = buckets.reduce((s, [, n]) => s + n, 0) || 1;
  return (
    <dl className={styles.bars}>
      {buckets.map(([name, n]) => (
        <div key={String(name)} className={styles.bar}>
          <dt>{String(name)}</dt>
          <dd>
            <span className={styles.barTrack}>
              <span className={styles.barFill} style={{ '--w': `${(n / total) * 100}%` }} />
            </span>
            <b>{n}</b>
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------------- containers and states ---------------- */

export function Panel({ title, action, children, className = '' }) {
  return (
    <section className={`${styles.panel} ${className}`}>
      {(title || action) && (
        <header className={styles.panelHead}>
          {title && <h2>{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Skeleton({ rows = 4 }) {
  return (
    <div className={styles.skelRows} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className={styles.skelRow} style={{ '--i': i }} />
      ))}
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className={styles.errorBox} role="alert">
      <AlertTriangle size={16} aria-hidden="true" />
      <p>{message}</p>
      {onRetry && (
        <button type="button" className={styles.retry} onClick={onRetry}>
          <RotateCw size={13} aria-hidden="true" /> Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({ children }) {
  return <p className={styles.empty}>{children}</p>;
}

/**
 * "Setup required" — the honest face of a module with no table behind it.
 *
 * Names the tables that are missing and says what would have to be added,
 * rather than rendering an empty dashboard that implies the feature works and
 * simply has no data in it.
 */
export function SetupRequired({ module: m }) {
  /*
   * Two different sentences, because they are two different situations and an
   * operator acts on them differently. 'setup' means the database is missing
   * something and a migration is the next step. 'partial' means the database
   * is ready and the SCREEN is what is missing — telling that operator to run
   * a migration sends them to look for a problem that is not there.
   */
  const waiting = m.state === 'partial';

  return (
    <div className={styles.setup}>
      <p className={styles.setupTag}>{waiting ? 'Not built yet' : 'Setup required'}</p>
      <h2>{m.label}</h2>
      <p className={styles.setupNote}>{m.note}</p>
      {waiting
        ? m.tables?.length > 0 && (
            <p className={styles.setupTables}>
              {m.tables.length === 1 ? 'Table ready' : 'Tables ready'}:{' '}
              {m.tables.map((t) => <code key={t}>{t}</code>)}
            </p>
          )
        : m.missing?.length > 0 && (
            <p className={styles.setupTables}>
              Missing {m.missing.length === 1 ? 'table' : 'tables'}:{' '}
              {m.missing.map((t) => <code key={t}>{t}</code>)}
            </p>
          )}
      <p className={styles.setupFoot}>
        {waiting
          ? 'The table exists and the policies are in place. What is missing is this screen, so nothing is shown rather than a dashboard of zeros.'
          : 'No migration has been applied. Nothing on this screen is simulated — the module stays disabled until the table exists.'}
      </p>
    </div>
  );
}
