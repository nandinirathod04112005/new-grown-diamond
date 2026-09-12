import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, RotateCcw, X } from 'lucide-react';

import DataTable from '@/components/admin/DataTable.jsx';
import { Toasts } from '@/components/admin/AdminFeedback.jsx';
import { useToasts } from '@/hooks/useAdminFeedback.js';
import { archivePosts } from '@/lib/journal.js';
import { adminListFeedback, adminSetFeedbackState } from '@/lib/supabase/queries/adminFeedback.js';
import { TOPIC_LABEL } from '@/lib/supabase/queries/feedback.js';
import styles from './AdminDiamonds.module.css';
import own from './AdminJournal.module.css';

const day = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const stars = (n) => '★'.repeat(n) + '☆'.repeat(Math.max(0, 5 - n));

const STATE = {
  pending: ['Waiting', 'hidden'],
  approved: ['Published', 'on'],
  rejected: ['Not published', 'off'],
};

/**
 * Feedback moderation.
 *
 * Feedback arrives as enquiries (it is in the Enquiries inbox too, with a
 * "Feedback · 4/5 · …" subject). Nothing a client writes is public until it
 * is approved here: approving publishes the name, city, rating and words to
 * the website; rejecting keeps it off, and can be undone. Each decision goes
 * to the audit log — the decision only, never the client's words.
 */
export default function AdminFeedbackQueue() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [view, setView] = useState('pending');
  const [busyId, setBusyId] = useState(null);
  const [working, setWorking] = useState(false);
  const t = useToasts();

  const fetchRows = useCallback(async () => {
    try {
      const r = await adminListFeedback();
      setRows(r.items);
      setError(null);
      setStatus('ready');
    } catch (err) {
      console.error('[NGD Admin] feedback list failed:', err);
      setError(err.message || 'Feedback could not be loaded.');
      setStatus('error');
    }
  }, []);

  // The first write happens after the database promise settles.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { fetchRows(); }, [fetchRows]);

  const titles = useMemo(() => new Map(archivePosts().map((p) => [p.slug, p.title])), []);

  const counts = useMemo(() => rows.reduce((acc, r) => {
    acc[r.state] = (acc[r.state] ?? 0) + 1;
    return acc;
  }, {}), [rows]);

  const visible = useMemo(() => (view === 'all' ? rows : rows.filter((r) => r.state === view)), [rows, view]);

  const decide = useCallback(async (row, next, okMsg) => {
    setBusyId(row.id);
    try {
      await adminSetFeedbackState(row, next);
      await fetchRows();
      t.ok(okMsg);
    } catch (err) {
      console.error('[NGD Admin] feedback decision failed:', err);
      t.error(err.message || 'That decision could not be saved.');
    } finally {
      setBusyId(null);
    }
  }, [fetchRows, t]);

  const bulk = useCallback(async (list, next, verb, clear) => {
    setWorking(true);
    let done = 0;
    for (const row of list) {
      try { await adminSetFeedbackState(row, next); done += 1; } catch (err) {
        console.error('[NGD Admin] bulk feedback failed:', row.id, err);
      }
    }
    await fetchRows();
    setWorking(false);
    clear?.();
    if (done < list.length) t.error(`${verb} ${done} of ${list.length}. The rest could not be saved.`);
    else t.ok(`${verb} ${done}.`);
  }, [fetchRows, t]);

  const columns = useMemo(() => [
    {
      key: 'rating',
      label: 'Rating',
      sortValue: (r) => r.rating,
      render: (r) => <span className={own.stars} aria-label={`${r.rating} out of 5`}>{stars(r.rating)}</span>,
    },
    {
      key: 'message',
      label: 'Feedback',
      plain: (r) => r.message,
      render: (r) => (
        <span>
          <span className={own.message}>{r.message}</span>
          <span className={own.topic}>
            {r.blog_slug ? `On “${titles.get(r.blog_slug) ?? r.blog_slug}”` : TOPIC_LABEL[r.topic] ?? r.topic}
            {' · '}{r.public_id}
          </span>
        </span>
      ),
    },
    {
      key: 'display_name',
      label: 'Shown as',
      render: (r) => (
        <span className={own.titleCell}>
          <b>{r.display_name}{r.city ? `, ${r.city}` : ''}</b>
          <span className={styles.blank}>{r.email}{r.user_id ? ' · account' : ' · guest'}</span>
        </span>
      ),
    },
    { key: 'created_at', label: 'Received', render: (r) => day(r.created_at), sortValue: (r) => r.created_at ?? '' },
    {
      key: 'state',
      label: 'State',
      sortValue: (r) => ['pending', 'approved', 'rejected'].indexOf(r.state),
      render: (r) => <span className={styles.pill} data-tone={STATE[r.state]?.[1]}>{STATE[r.state]?.[0] ?? r.state}</span>,
    },
    {
      key: 'do',
      label: 'Actions',
      sortable: false,
      render: (r) => (
        <span className={styles.rowActions}>
          {r.state !== 'approved' && (
            <button type="button" className={styles.act} disabled={busyId === r.id} title="Approve — publish on the website"
              onClick={() => decide(r, 'approved', 'Approved — now on the website.')}>
              <Check size={13} />
            </button>
          )}
          {r.state !== 'rejected' && (
            <button type="button" className={styles.act} data-danger="" disabled={busyId === r.id} title={r.state === 'approved' ? 'Take it off the website' : 'Reject — do not publish'}
              onClick={() => decide(r, 'rejected', r.state === 'approved' ? 'Taken off the website.' : 'Rejected. It will not be published.')}>
              <X size={13} />
            </button>
          )}
          {r.state !== 'pending' && (
            <button type="button" className={styles.act} disabled={busyId === r.id} title="Back to waiting"
              onClick={() => decide(r, 'pending', 'Back in the waiting list.')}>
              <RotateCcw size={13} />
            </button>
          )}
        </span>
      ),
    },
  ], [busyId, decide, titles]);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre</p>
          <h1>Feedback</h1>
          <p className={styles.sub}>
            {status === 'ready'
              ? `${counts.pending ?? 0} waiting · ${counts.approved ?? 0} published · ${counts.rejected ?? 0} not published`
              : 'Loading feedback…'}
          </p>
        </div>
      </header>

      <p className={styles.note}>
        Approving shows the feedback on the homepage, the journal and the
        feedback page, with the name and city the client typed. Their email is
        shown here only. Feedback also appears in Enquiries, so you can reply.
      </p>

      <DataTable
        rows={visible}
        columns={columns}
        status={status}
        error={error}
        onRetry={fetchRows}
        searchKeys={['message', 'display_name', 'city', 'email', 'public_id']}
        searchPlaceholder="Search words, name, email, reference…"
        initialSort={{ key: 'created_at', dir: 'desc' }}
        selectable
        filters={view}
        empty={view === 'pending' ? 'Nothing waiting for review.' : 'Nothing here.'}
        toolbar={(
          <div className={styles.tabs} role="group" aria-label="Which feedback to show">
            {[['pending', 'Waiting'], ['approved', 'Published'], ['rejected', 'Not published'], ['all', 'All']].map(([k, label]) => (
              <button
                key={k}
                type="button"
                className={styles.tab}
                data-on={view === k ? '' : undefined}
                aria-pressed={view === k}
                onClick={() => setView(k)}
              >
                {label}{k !== 'all' && counts[k] ? ` (${counts[k]})` : ''}
              </button>
            ))}
          </div>
        )}
        bulkActions={(sel, clear) => (
          <>
            <button type="button" className={styles.toolBtn} disabled={working}
              onClick={() => bulk(sel.filter((r) => r.state !== 'approved'), 'approved', 'Approved', clear)}>
              Approve
            </button>
            <button type="button" className={styles.toolBtnDanger} disabled={working}
              onClick={() => bulk(sel.filter((r) => r.state !== 'rejected'), 'rejected', 'Rejected', clear)}>
              Reject
            </button>
          </>
        )}
      />

      <Toasts toasts={t.toasts} dismiss={t.dismiss} />
    </div>
  );
}
