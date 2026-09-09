import { useCallback, useEffect, useState } from 'react';
import { CircleCheck, CircleX, Plus, RefreshCw } from 'lucide-react';

import { overviewStats, recentInventory } from '@/lib/supabase/queries/adminStats.js';
import { Bars, EmptyState, ErrorState, Panel, Skeleton, Spark, Stat } from '@/components/admin/AdminBits.jsx';
import styles from './AdminOverview.module.css';

const RANGES = [7, 30, 90];

const when = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/**
 * The Overview.
 *
 * Every figure on this page is read from the database on load. There is no
 * seeded state, no placeholder series and no illustrative percentage — a tile
 * either shows a number that came back from Supabase, or it says it could not
 * be read and why.
 *
 * The range control re-queries rather than re-slicing a cached payload,
 * because the previous-period comparison needs twice the window and slicing
 * would quietly compare 30 days against nothing.
 */
export default function AdminOverview() {
  const [days, setDays] = useState(30);
  const [state, setState] = useState({ status: 'loading', data: null, error: null });
  const [recent, setRecent] = useState({ status: 'loading', rows: [], error: null });

  /*
   * No state is set before the await.
   *
   * The mount path already starts in 'loading', so flagging it again on the
   * way in only costs a render. The manual Refresh button sets 'refreshing'
   * itself, at the point a person actually asked for it — which is where that
   * feedback belongs anyway.
   */
  const load = useCallback(async (range) => {
    try {
      const data = await overviewStats(range);
      setState({ status: 'ready', data, error: null });
    } catch (err) {
      console.error('[NGD Admin] overview failed:', err);
      setState({ status: 'error', data: null, error: err.message || 'The dashboard could not be loaded.' });
    }
  }, []);

  useEffect(() => {
    let alive = true;
    load(days);
    recentInventory(8).then((r) => {
      if (!alive) return;
      setRecent({ status: r.ok ? 'ready' : 'error', rows: r.rows, error: r.error });
    });
    return () => { alive = false; };
  }, [days, load]);

  const d = state.data;
  const busy = state.status === 'loading';

  /* Which tables answered — reported plainly rather than averaged into a
     single green tick that hides which one is broken. */
  const sources = d ? Object.entries(d.sources) : [];
  const down = sources.filter(([, s]) => !s.ok);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre</p>
          <h1>Overview</h1>
        </div>
        <div className={styles.controls}>
          <div className={styles.ranges} role="group" aria-label="Reporting period">
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                className={styles.range}
                data-on={r === days ? '' : undefined}
                aria-pressed={r === days}
                onClick={() => setDays(r)}
              >
                {r}d
              </button>
            ))}
          </div>
          <button
            type="button"
            className={styles.refresh}
            onClick={() => {
              setState((s) => ({ ...s, status: 'refreshing' }));
              load(days);
            }}
            disabled={state.status === 'refreshing'}
          >
            <RefreshCw size={13} aria-hidden="true" data-spin={state.status === 'refreshing' ? '' : undefined} />
            Refresh
          </button>
        </div>
      </header>

      {state.status === 'error' && (
        <ErrorState message={state.error} onRetry={() => load(days)} />
      )}

      {/* ---- headline figures ---- */}
      <div className={styles.kpis}>
        <Stat label="Live diamonds" metric={d?.diamonds.total} days={days} loading={busy} />
        <Stat
          label="Total carat"
          metric={d?.diamonds.carat}
          days={days}
          decimals={2}
          suffix="ct"
          loading={busy}
          hint="Live stock only"
        />
        <Stat label="Live jewellery" metric={d?.jewellery.total} days={days} loading={busy} />
        <Stat label="Customers" metric={d?.customers.total} days={days} loading={busy} />
        <Stat label={`New customers · ${days}d`} metric={d?.customers.added} days={days} loading={busy} />
        <Stat label={`Enquiries · ${days}d`} metric={d?.enquiries.recent} days={days} loading={busy} />
        <Stat label={`Quotes · ${days}d`} metric={d?.quotes.recent} days={days} loading={busy} />
        <Stat label="Active holds" metric={d?.holds.total} days={days} loading={busy} />
        <Stat label="Upcoming inspections" metric={d?.inspections.upcoming} days={days} loading={busy} />
      </div>

      <div className={styles.grid}>
        {/* ---- trends ---- */}
        <Panel title={`Activity · last ${days} days`} className={styles.wide}>
          {busy ? <Skeleton rows={3} /> : (
            <div className={styles.trends}>
              {[
                ['Stock added', d?.diamonds.added],
                ['New customers', d?.customers.added],
                ['Enquiries', d?.enquiries.recent],
                ['Quotes', d?.quotes.recent],
              ].map(([label, m]) => (
                <div key={label} className={styles.trend}>
                  <p className={styles.trendLabel}>{label}</p>
                  {m?.ok ? (
                    <>
                      <p className={styles.trendValue}>{m.value}</p>
                      <Spark series={m.series} label={`${label}, ${days} day trend`} />
                    </>
                  ) : (
                    <p className={styles.trendOff}>Unavailable</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* ---- stock composition ---- */}
        <Panel title="Stock by availability">
          {busy ? <Skeleton /> : d?.diamonds.availability.ok
            ? <Bars buckets={d.diamonds.availability.buckets} empty="No stock recorded." />
            : <ErrorState message={d?.diamonds.availability.error} onRetry={() => load(days)} />}
        </Panel>

        <Panel title="Enquiries by status">
          {busy ? <Skeleton /> : d?.enquiries.byStatus.ok
            ? <Bars buckets={d.enquiries.byStatus.buckets} empty="No enquiries yet." />
            : <ErrorState message={d?.enquiries.byStatus.error} onRetry={() => load(days)} />}
        </Panel>

        <Panel title="Quotes by status">
          {busy ? <Skeleton /> : d?.quotes.byStatus.ok
            ? <Bars buckets={d.quotes.byStatus.buckets} empty="No quotes yet." />
            : <ErrorState message={d?.quotes.byStatus.error} onRetry={() => load(days)} />}
        </Panel>

        <Panel title="Holds by status">
          {busy ? <Skeleton /> : d?.holds.byStatus.ok
            ? <Bars buckets={d.holds.byStatus.buckets} empty="No holds yet." />
            : <ErrorState message={d?.holds.byStatus.error} onRetry={() => load(days)} />}
        </Panel>

        {/* ---- things that need doing ---- */}
        <Panel title="Needs attention" className={styles.wide}>
          {busy ? <Skeleton rows={3} /> : (
            <div className={styles.alerts}>
              {[
                ['Live stones with no photograph', d?.diamonds.noImage, '/admin/diamonds'],
                ['Live stones with no certificate', d?.diamonds.noCertificate, '/admin/diamonds'],
                ['Diamonds saved but not published', d?.diamonds.unpublished, '/admin/diamonds'],
                ['Jewellery saved but not published', d?.jewellery.unpublished, null],
                ['Holds past their expiry', d?.holds.expired, null],
              ].map(([label, m, href]) => {
                if (!m?.ok) {
                  return (
                    <p key={label} className={styles.alert} data-tone="off">
                      <CircleX size={14} aria-hidden="true" />
                      {label} — unavailable
                    </p>
                  );
                }
                const clear = m.value === 0;
                const body = (
                  <>
                    {clear
                      ? <CircleCheck size={14} aria-hidden="true" />
                      : <span className={styles.count}>{m.value}</span>}
                    {label}
                  </>
                );
                return href && !clear ? (
                  <a key={label} className={styles.alert} data-tone="warn" href={href}>{body}</a>
                ) : (
                  <p key={label} className={styles.alert} data-tone={clear ? 'ok' : 'warn'}>{body}</p>
                );
              })}
            </div>
          )}
        </Panel>

        {/* ---- recently added stock ---- */}
        <Panel
          title="Recently added stock"
          className={styles.wide}
          action={<a className={styles.panelLink} href="/admin/diamonds">All diamonds →</a>}
        >
          {recent.status === 'loading' && <Skeleton rows={5} />}
          {recent.status === 'error' && <ErrorState message={recent.error} />}
          {recent.status === 'ready' && recent.rows.length === 0 && (
            <EmptyState>No stock has been added yet.</EmptyState>
          )}
          {recent.status === 'ready' && recent.rows.length > 0 && (
            <ul className={styles.feed}>
              {recent.rows.map((row, i) => (
                <li key={row.id} className={styles.feedRow} style={{ '--i': i }}>
                  <a href={`/admin/diamonds/${row.id}/edit`}>
                    <b>{row.stock_number || row.public_id}</b>
                    <span>{Number(row.carat).toFixed(2)} ct {row.shape}</span>
                  </a>
                  <span
                    className={styles.pill}
                    data-tone={row.archived_at ? 'off' : row.active ? 'on' : 'hidden'}
                  >
                    {row.archived_at ? 'Archived' : row.active ? 'Live' : 'Hidden'}
                  </span>
                  <time dateTime={row.created_at}>{when(row.created_at)}</time>
                </li>
              ))}
            </ul>
          )}
          {/*
            Named for what it is. These are rows ordered by created_at, not a
            record of who did what — there is no audit table in this database,
            and calling this an activity log would be the invention the rest of
            this dashboard avoids.
          */}
          <p className={styles.foot}>
            Derived from <code>created_at</code>. Not an audit trail — no audit
            table exists yet.
          </p>
        </Panel>

        {/* ---- quick actions ---- */}
        <Panel title="Quick actions">
          <div className={styles.actions}>
            <a className={styles.action} href="/admin/diamonds/new"><Plus size={14} aria-hidden="true" /> Add a diamond</a>
            <a className={styles.action} href="/admin/diamonds">Manage stock</a>
            <a className={styles.action} href="/diamonds" target="_blank" rel="noopener noreferrer">View the storefront</a>
          </div>
        </Panel>

        {/* ---- connection ---- */}
        <Panel title="Data sources">
          {busy ? <Skeleton rows={4} /> : (
            <>
              <ul className={styles.sources}>
                {sources.map(([name, s]) => (
                  <li key={name} data-ok={s.ok ? '' : undefined}>
                    {s.ok ? <CircleCheck size={13} aria-hidden="true" /> : <CircleX size={13} aria-hidden="true" />}
                    <code>{name}</code>
                    <span>{s.ok ? 'reachable' : 'blocked'}</span>
                  </li>
                ))}
              </ul>
              <p className={styles.foot}>
                {down.length === 0
                  ? 'All tables answered.'
                  : `${down.length} table${down.length === 1 ? '' : 's'} refused this account.`}
                {' '}Last refreshed {when(d?.generatedAt)}.
              </p>
            </>
          )}
        </Panel>
      </div>
    </div>
  );
}
