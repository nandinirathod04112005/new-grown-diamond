import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';

import DataTable from '@/components/admin/DataTable.jsx';
import { EmptyState, SetupRequired } from '@/components/admin/AdminBits.jsx';
import { moduleForPath } from '@/components/admin/adminModules.js';
import { listAuditLog } from '@/lib/supabase/queries/adminInsights.js';
import styles from './AdminOverview.module.css';
import own from './AdminAudit.module.css';

/*
 * The actions the table's CHECK constraint allows, in the words an operator
 * would use for them. A verb the log can hold but this map does not name would
 * still render — as itself — rather than disappearing.
 */
const ACTION_LABEL = {
  create: 'Created',
  update: 'Edited',
  publish: 'Published',
  unpublish: 'Hidden',
  archive: 'Archived',
  restore: 'Restored',
  delete: 'Deleted',
  status_change: 'Status changed',
  media_upload: 'Media uploaded',
  media_delete: 'Media deleted',
  content_update: 'Content edited',
};

const TONE = {
  create: 'good',
  publish: 'good',
  restore: 'good',
  unpublish: 'warn',
  archive: 'warn',
  delete: 'bad',
  media_delete: 'bad',
};

const when = (iso) => {
  if (!iso) return '—';
  const date = new Date(iso);
  const mins = Math.round((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const exact = (iso) => (iso ? new Date(iso).toLocaleString() : '');

/** A value as it should read in a log line, not as JSON. */
function show(value) {
  if (value === null || value === undefined || value === '') return 'empty';
  if (value === true) return 'yes';
  if (value === false) return 'no';
  const text = String(value);
  return text.length > 40 ? `${text.slice(0, 39)}…` : text;
}

/**
 * What changed, in words.
 *
 * The column holds {column: [before, after]} for the columns that moved. A
 * create has no "before", so it reads as the values it was given rather than
 * as a list of arrows from nothing.
 */
function Changes({ entry }) {
  const changes = entry.changes && typeof entry.changes === 'object' ? entry.changes : {};
  const keys = Object.keys(changes);
  if (!keys.length) return <span className={own.quiet}>—</span>;

  const creating = entry.action === 'create';
  return (
    <ul className={own.changes}>
      {keys.slice(0, 6).map((key) => {
        const pair = Array.isArray(changes[key]) ? changes[key] : [null, changes[key]];
        return (
          <li key={key}>
            <span className={own.field}>{key.replaceAll('_', ' ')}</span>
            {creating ? (
              <span className={own.after}>{show(pair[1])}</span>
            ) : (
              <>
                <span className={own.before}>{show(pair[0])}</span>
                <span className={own.arrow} aria-hidden="true">→</span>
                <span className={own.after}>{show(pair[1])}</span>
              </>
            )}
          </li>
        );
      })}
      {keys.length > 6 && <li className={own.quiet}>and {keys.length - 6} more</li>}
    </ul>
  );
}

/**
 * Activity and audit log.
 *
 * Reads public.audit_log, which the console itself writes on every stock and
 * jewellery change. Two things this screen will not do: it will not show an
 * action that was not recorded, and it will not fill a gap with anything
 * derived. If the log is empty it says so — an empty log and an unrecorded
 * action look identical on screen and mean opposite things, so the difference
 * is stated in words rather than implied by a blank table.
 *
 * The table is append-only by policy: no update, no delete, for anyone. So
 * there is nothing on this page to act with, and it is a reading surface only.
 */
export default function AdminAudit() {
  const [state, setState] = useState({ status: 'loading', entries: [], missing: false, error: null });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, status: 'loading' }));
    try {
      const { entries, missing } = await listAuditLog({ limit: 300 });
      setState({ status: 'ready', entries, missing, error: null });
    } catch (err) {
      console.error('[NGD Admin] audit log failed:', err);
      setState({ status: 'error', entries: [], missing: false, error: err.message || 'The log could not be read.' });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const columns = useMemo(() => [
    {
      key: 'created_at',
      label: 'When',
      render: (r) => <time dateTime={r.created_at} title={exact(r.created_at)}>{when(r.created_at)}</time>,
      sortValue: (r) => r.created_at ?? '',
    },
    {
      key: 'action',
      label: 'Action',
      render: (r) => (
        <span className={own.action} data-tone={TONE[r.action] || undefined}>
          {ACTION_LABEL[r.action] || r.action}
        </span>
      ),
    },
    {
      key: 'entity_type',
      label: 'What',
      render: (r) => (
        <span className={own.what}>
          <span className={own.kind}>{r.entity_type}</span>
          {r.entity_label ? <strong>{r.entity_label}</strong> : null}
          {r.entity_id ? <code className={own.id}>{r.entity_id}</code> : null}
        </span>
      ),
      sortValue: (r) => `${r.entity_type} ${r.entity_label ?? ''}`,
    },
    {
      key: 'actor_email',
      label: 'Who',
      render: (r) => r.actor_email || <span className={own.quiet}>account removed</span>,
    },
    { key: 'changes', label: 'Changed', render: (r) => <Changes entry={r} /> },
  ], []);

  if (state.missing) return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre</p>
          <h1>Activity &amp; Audit Log</h1>
        </div>
      </header>
      <SetupRequired module={{ ...moduleForPath('/admin/audit'), state: 'setup', missing: ['audit_log'] }} />
    </div>
  );

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre</p>
          <h1>Activity &amp; Audit Log</h1>
          <p className={own.sub}>
            Every publish, edit and archive this console makes, as it was made. The table is
            append-only: nothing here can be edited or removed, including by an administrator.
          </p>
        </div>
        <button type="button" className={own.refresh} onClick={load} disabled={state.status === 'loading'}>
          <RefreshCw size={15} strokeWidth={1.6} aria-hidden="true" />
          Refresh
        </button>
      </header>

      {state.status === 'ready' && state.entries.length === 0 ? (
        <EmptyState>
          Nothing recorded yet. Entries appear here from the next change made in this console —
          actions taken before the log existed were not recorded and are not reconstructed.
        </EmptyState>
      ) : (
        <DataTable
          rows={state.entries}
          columns={columns}
          status={state.status}
          error={state.error}
          onRetry={load}
          getId={(r) => r.id}
          searchKeys={['action', 'entity_type', 'entity_label', 'entity_id', 'actor_email']}
          searchPlaceholder="Search action, stock number, who…"
          initialSort={{ key: 'created_at', dir: 'desc' }}
          pageSize={25}
          empty="Nothing recorded yet."
        />
      )}
    </div>
  );
}
