import { useCallback, useEffect, useState } from 'react';
import { CircleCheck, CircleX, RefreshCw, TriangleAlert } from 'lucide-react';

import { overviewStats } from '@/lib/supabase/queries/adminStats.js';
import { ErrorState, Panel, Skeleton } from '@/components/admin/AdminBits.jsx';
import styles from './AdminMonitoring.module.css';

/* Probed against the live project and confirmed absent. Listed so the page can
   say what is missing by name rather than "analytics unavailable". */
const ABSENT = [
  ['analytics_events', 'page views, referrers, traffic trends'],
  ['page_views', 'the same, under the other common name'],
  ['audit_log', 'who changed what, and when'],
  ['error_events', 'front-end errors reported from the browser'],
  ['notifications', 'durable alerts with a read state'],
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
            These need tables this database has not got. Two reviewed migrations
            that would add them, with RLS and retention, are in{' '}
            <code>supabase/migrations/</code> — written, deliberately not applied.
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
          <p className={styles.foot}>
            No third-party analytics tag is installed either, so there is nothing
            to read traffic from. Nothing on this page is estimated or sampled.
          </p>
        </Panel>
      </div>
    </div>
  );
}
