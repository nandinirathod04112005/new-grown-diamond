import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Mail, MessageCircle, Phone } from 'lucide-react';

import { loadCustomers } from '@/lib/supabase/queries/adminQueues.js';
import DataTable from '@/components/admin/DataTable.jsx';
import { Toasts } from '@/components/admin/AdminFeedback.jsx';
import { useToasts } from '@/hooks/useAdminFeedback.js';
import styles from './AdminQueue.module.css';

const day = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' }) : '—');

const wa = (raw) => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
};

/**
 * Customers.
 *
 * WHAT IS DELIBERATELY NOT HERE. No password material — there is none on this
 * table to show, and Supabase's auth schema is not reachable with this key at
 * all. No tokens, no session data, no address beyond the country the customer
 * themselves entered. The select in loadCustomers names ten columns and asks
 * for nothing else, so the omission is enforced at the query rather than at
 * the render, which is the stronger of the two guarantees.
 *
 * Account status is SHOWN but not editable. profiles.account_status exists and
 * an admin can read it, but suspending an account is a consequential write with
 * no confirmation flow, no audit trail to record it and no notification to the
 * person affected — none of which this database supports yet. Offering the
 * control without them would be the least safe thing on this screen.
 *
 * The activity counts are real tallies over the related tables. A count that
 * could not be read shows as a dash, never as zero: "this customer has no
 * quotes" and "we could not read the quotes table" are different facts.
 */
export default function AdminCustomers() {
  const [state, setState] = useState({ status: 'loading', rows: [], error: null, unavailable: [] });
  const [tab, setTab] = useState('all');
  const t = useToasts();

  const load = useCallback(async () => {
    const r = await loadCustomers();
    setState({ status: r.ok ? 'ready' : 'error', rows: r.rows, error: r.error, unavailable: r.unavailable ?? [] });
  }, []);

  // The first write happens after the database promise settles.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const roles = useMemo(() => {
    const seen = [];
    state.rows.forEach((r) => { const v = r.role ?? 'unspecified'; if (!seen.includes(v)) seen.push(v); });
    return seen;
  }, [state.rows]);

  const visible = useMemo(
    () => (tab === 'all' ? state.rows : state.rows.filter((r) => (r.role ?? 'unspecified') === tab)),
    [state.rows, tab],
  );

  const exportCsv = useCallback(() => {
    const cols = ['full_name', 'company_name', 'email', 'phone', 'country', 'role', 'account_status',
      'favourites', 'enquiries', 'quotes', 'holds', 'inspections', 'created_at'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...visible.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ngd-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    t.ok(`Exported ${visible.length} ${visible.length === 1 ? 'row' : 'rows'}.`);
  }, [visible, t]);

  /* null means unreadable, 0 means genuinely none. They render differently. */
  const num = (v) => (v == null ? <span className={styles.blank}>—</span> : v);

  const columns = useMemo(() => [
    {
      key: 'full_name',
      label: 'Customer',
      plain: (r) => r.full_name || r.email,
      render: (r) => (
        <span>
          <b>{r.full_name || <span className={styles.blank}>Unnamed</span>}</b>
          {r.company_name && <><br /><span className={styles.blank}>{r.company_name}</span></>}
        </span>
      ),
    },
    {
      key: 'email',
      label: 'Contact',
      render: (r) => (
        <span className={styles.contactCell}>
          {r.email ? <a href={`mailto:${r.email}`}><Mail size={11} aria-hidden="true" /> {r.email}</a> : <span className={styles.blank}>—</span>}
          {r.phone && (
            <span className={styles.contactRow}>
              <a href={`tel:${r.phone}`}><Phone size={11} aria-hidden="true" /> {r.phone}</a>
              {wa(r.phone) && <a href={wa(r.phone)} target="_blank" rel="noopener noreferrer"><MessageCircle size={11} aria-hidden="true" /> chat</a>}
            </span>
          )}
        </span>
      ),
    },
    { key: 'country', label: 'Country', hiddenByDefault: true },
    { key: 'role', label: 'Role', render: (r) => <span className={styles.badge}>{r.role ?? '—'}</span> },
    {
      key: 'account_status',
      label: 'Account',
      render: (r) => <span className={styles.badge}>{r.account_status ?? '—'}</span>,
    },
    { key: 'favourites', label: 'Favs', sortValue: (r) => r.favourites ?? -1, render: (r) => num(r.favourites) },
    { key: 'enquiries', label: 'Enq.', sortValue: (r) => r.enquiries ?? -1, render: (r) => num(r.enquiries) },
    { key: 'quotes', label: 'Quotes', sortValue: (r) => r.quotes ?? -1, render: (r) => num(r.quotes) },
    { key: 'holds', label: 'Holds', sortValue: (r) => r.holds ?? -1, render: (r) => num(r.holds) },
    { key: 'inspections', label: 'Insp.', sortValue: (r) => r.inspections ?? -1, render: (r) => num(r.inspections) },
    { key: 'created_at', label: 'Joined', sortValue: (r) => r.created_at ?? '', render: (r) => day(r.created_at) },
  ], []);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre</p>
          <h1>Customers</h1>
          <p className={styles.sub}>
            {state.status === 'ready' ? `${visible.length} shown of ${state.rows.length}` : 'Loading…'}
          </p>
        </div>
      </header>

      <p className={styles.note}>
        Account status is shown but not editable here: suspending an account is a
        consequential write, and this database has no audit trail to record it
        and no way to notify the person affected. Passwords and session tokens
        are not on this table and are never requested.
        {state.unavailable.length > 0 && ` Counts from ${state.unavailable.join(', ')} could not be read and show as a dash.`}
      </p>

      {state.status === 'ready' && roles.length > 1 && (
        <div className={styles.tabs} role="group" aria-label="Filter by role">
          <button type="button" className={styles.tab} data-on={tab === 'all' ? '' : undefined} aria-pressed={tab === 'all'} onClick={() => setTab('all')}>
            All <span>{state.rows.length}</span>
          </button>
          {roles.map((r) => (
            <button key={r} type="button" className={styles.tab} data-on={tab === r ? '' : undefined} aria-pressed={tab === r} onClick={() => setTab(r)}>
              {r} <span>{state.rows.filter((x) => (x.role ?? 'unspecified') === r).length}</span>
            </button>
          ))}
        </div>
      )}

      <DataTable
        rows={visible}
        columns={columns}
        status={state.status}
        error={state.error}
        onRetry={load}
        searchKeys={['full_name', 'company_name', 'email', 'phone', 'country', 'role', 'account_status']}
        searchPlaceholder="Search name, company, email…"
        initialSort={{ key: 'created_at', dir: 'desc' }}
        filters={tab}
        empty="No customer accounts yet."
        toolbar={(
          <button type="button" className={styles.toolBtn} onClick={exportCsv} disabled={!visible.length}>
            <Download size={13} aria-hidden="true" /> Export CSV
          </button>
        )}
      />

      <Toasts toasts={t.toasts} dismiss={t.dismiss} />
    </div>
  );
}
