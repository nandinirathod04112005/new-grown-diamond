import { useCallback, useEffect, useState } from 'react';
import { CircleCheck, CircleX, RefreshCw, TriangleAlert } from 'lucide-react';

import { overviewStats } from '@/lib/supabase/queries/adminStats.js';
import { ErrorState, Panel, Skeleton } from '@/components/admin/AdminBits.jsx';
import styles from './AdminMonitoring.module.css';

/*
 * Re-probed against the live project on 10 September 2026. Migrations 0001 and
 * 0002 have been applied since this list was written, so audit_log,
 * notifications and analytics_events now exist and have left it. What remains
 * is genuinely absent — and the distinction matters, because a page that keeps
 * naming a table the operator has already added reads as broken.
 */
const ABSENT = [
  ['page_views', 'a per-page rollup; analytics_events holds the raw events instead'],
  ['error_events', 'front-end errors reported from the browser'],
];

/* Exists, and empty for a reason worth stating rather than listing as a gap. */
const IDLE = [
  ['analytics_events', 'ready for page views; nothing sends them, so there is no traffic to read'],
  ['notifications', 'ready for durable alerts; arrivals are read live from the queues instead'],
];

const when = (iso) => {
  if (!iso) return '—';
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return mins < 1 ? 'just now' : mins < 60 ? `${mins}m ago` : `${Math.round(mins / 60)}h ago`;
};

/**
 * Website monitoring.
 *
 * Everything here is derived from rows that exist. Where a signal would need a
 * table this database has not got, the page names the table and stops — it
 * does not estimate, sample or simulate. That is why there are no traffic
 * figures on a page called monitoring: there is no analytics table, and a
 * plausible-looking chart would be the single most damaging thing this console
 * could show, because it would be acted on.
 */
export default function AdminMonitoring() {
  const [state, setState] = useState({ status: 'loading', data: null, error: null });

  const load = useCallback(async () => {
    try {
      setState({ status: 'ready', data: await overviewStats(30), error: null });
    } catch (err) {
      console.error('[NGD Admin] monitoring failed:', err);
      setState({ status: 'error', data: null, error: err.message || 'Checks could not be run.' });
    }
  }, []);

  // The first write happens after the database promise settles.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const d = state.data;
  const sources = d ? Object.entries(d.sources) : [];
  const down = sources.filter(([, s]) => !s.ok);

  /* A check is a name, a metric, and what a non-zero value means. Rendering is
     uniform so a new check is one line rather than a new component. */
  const checks = d ? [
    ['Live stones with no photograph', d.diamonds.noImage, 'They appear on the storefront with the house macro instead of their own.'],
    ['Live stones with no certificate link', d.diamonds.noCertificate, 'A buyer cannot verify these without contacting the desk.'],
    ['Diamonds saved but not published', d.diamonds.unpublished, 'Entered but invisible to customers.'],
    ['Jewellery saved but not published', d.jewellery.unpublished, 'Entered but invisible to customers.'],
    ['Holds past their expiry', d.holds.expired, 'Stock may be held against a lapsed request.'],
    ['Inspections already past their date', d.inspections.upcoming?.ok
      ? { ok: true, value: Math.max(0, (d.inspections.total?.value ?? 0) - (d.inspections.upcoming.value ?? 0)) }
      : { ok: false, error: d.inspections.upcoming?.error },
      'Scheduled for a date that has gone by.'],
  ] : [];

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre</p>
          <h1>Website Monitoring</h1>
          <p className={styles.sub}>
            {d ? `Checked ${when(d.generatedAt)}` : 'Running checks…'}
          </p>
        </div>
        <button type="button" className={styles.refresh} onClick={load}>
          <RefreshCw size={13} aria-hidden="true" /> Re-check
        </button>
      </header>

      {state.status === 'error' && <ErrorState message={state.error} onRetry={load} />}

      <div className={styles.grid}>
        <Panel title="Database connection" className={styles.wide}>
          {state.status === 'loading' ? <Skeleton rows={4} /> : (
            <>
              <ul className={styles.sources}>
                {sources.map(([name, s]) => (
                  <li key={name} data-ok={s.ok ? '' : undefined}>
                    {s.ok ? <CircleCheck size={13} aria-hidden="true" /> : <CircleX size={13} aria-hidden="true" />}
                    <code>{name}</code>
                    <span>{s.ok ? 'reachable' : s.error}</span>
                  </li>
                ))}
              </ul>
              <p className={styles.foot}>
                {down.length === 0
                  ? 'Every table answered this account.'
                  : `${down.length} refused. That is an RLS or connectivity problem, not an empty table.`}
                {' '}Credentials are never shown here; only whether a query succeeded.
              </p>
            </>
          )}
        </Panel>

        <Panel title="Data integrity" className={styles.wide}>
          {state.status === 'loading' ? <Skeleton rows={6} /> : (
            <ul className={styles.checks}>
              {checks.map(([label, m, why]) => {
                if (!m?.ok) {
                  return (
                    <li key={label} data-tone="off">
                      <CircleX size={14} aria-hidden="true" />
                      <span><b>{label}</b><em>could not be checked</em></span>
                    </li>
                  );
                }
                const clear = m.value === 0;
                return (
                  <li key={label} data-tone={clear ? 'ok' : 'warn'}>
                    {clear ? <CircleCheck size={14} aria-hidden="true" /> : <span className={styles.count}>{m.value}</span>}
                    <span><b>{label}</b><em>{clear ? 'Nothing outstanding.' : why}</em></span>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Not measurable yet" className={styles.wide}>
          {/*
            The important half of a monitoring page: saying what it cannot see.
            Each row names the exact table, so the gap is actionable rather
            than a shrug.
          */}
          <p className={styles.lead}>
            These need tables this database has not got. Each row names the
            table, so the gap is actionable rather than a shrug.
          </p>
          <ul className={styles.absent}>
            {ABSENT.map(([table, what]) => (
              <li key={table}>
                <TriangleAlert size={13} aria-hidden="true" />
                <code>{table}</code>
                <span>{what}</span>
              </li>
            ))}
          </ul>
          <p className={styles.lead}>
            These exist and are empty, which is a different thing and is not a
            fault to fix in the database:
          </p>
          <ul className={styles.absent}>
            {IDLE.map(([table, what]) => (
              <li key={table} data-ok="">
                <CircleCheck size={13} aria-hidden="true" />
                <code>{table}</code>
                <span>{what}</span>
              </li>
            ))}
          </ul>
          <p className={styles.foot}>
            No third-party analytics tag is installed, so there is nothing to
            read traffic from. Nothing on this page is estimated or sampled.
            Who changed what is recorded now, and is on the Activity &amp; Audit
            Log.
          </p>
        </Panel>
      </div>
    </div>
  );
}
