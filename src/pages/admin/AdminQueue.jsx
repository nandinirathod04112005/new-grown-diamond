import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock, Download, Mail, MessageCircle, Phone, X } from 'lucide-react';

import { QUEUES, loadQueue, setQueueStatus } from '@/lib/supabase/queries/adminQueues.js';
import DataTable from '@/components/admin/DataTable.jsx';
import { Toasts } from '@/components/admin/AdminFeedback.jsx';
import { useToasts } from '@/hooks/useAdminFeedback.js';
import styles from './AdminQueue.module.css';

const day = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' }) : '—');
const stamp = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

/** Digits only, as wa.me requires. Returns null when there is nothing to dial. */
const wa = (raw) => {
  const digits = String(raw ?? '').replace(/\D/g, '');
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
};

/**
 * One work queue, driven entirely by what its table actually holds.
 *
 * All four queues share this screen because they share a shape: a status, a
 * customer, a product, and a date. What differs is which date matters, and
 * that is declared per queue rather than branched on here.
 *
 * STATUS OPTIONS COME FROM THE DATA. The list a row can be moved to is the set
 * of values already present across the queue — this console does not invent a
 * workflow the database has not got. The consequence is honest: on an empty
 * queue there is nothing to move a row to, which is correct, because nothing
 * has established what the states are.
 *
 * The contact actions build links and never send anything. Tapping one opens
 * the operator's own mail client or WhatsApp with the address filled in; no
 * message leaves this application.
 */
export default function AdminQueue({ queue }) {
  const spec = QUEUES[queue];
  const [state, setState] = useState({ status: 'loading', rows: [], error: null, related: {} });
  const [tab, setTab] = useState('all');
  const [open, setOpen] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const t = useToasts();

  const load = useCallback(async () => {
    const r = await loadQueue(queue);
    setState({ status: r.ok ? 'ready' : 'error', rows: r.rows, error: r.error, related: r.related });
  }, [queue]);

  // The first write happens after the database promise settles.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { setTab('all'); setOpen(null); load(); }, [load]);

  /* The vocabulary this queue actually uses, in the order first encountered. */
  const statuses = useMemo(() => {
    const seen = [];
    state.rows.forEach((r) => {
      const v = r.status ?? 'Unspecified';
      if (!seen.includes(v)) seen.push(v);
    });
    return seen;
  }, [state.rows]);

  const counts = useMemo(() => {
    const map = new Map();
    state.rows.forEach((r) => {
      const v = r.status ?? 'Unspecified';
      map.set(v, (map.get(v) ?? 0) + 1);
    });
    return map;
  }, [state.rows]);

  const visible = useMemo(
    () => (tab === 'all' ? state.rows : state.rows.filter((r) => (r.status ?? 'Unspecified') === tab)),
    [state.rows, tab],
  );

  const move = useCallback(async (row, status) => {
    setBusyId(row.id);
    try {
      await setQueueStatus(queue, row.id, status);
      await load();
      setOpen((o) => (o && o.id === row.id ? { ...o, status } : o));
      t.ok(`Moved to “${status}”.`);
    } catch (err) {
      console.error('[NGD Admin] status change failed:', err);
      t.error(err.message || 'That status could not be saved.');
    } finally {
      setBusyId(null);
    }
  }, [queue, load, t]);

  const exportCsv = useCallback(() => {
    const cols = ['public_id', 'status', 'created_at', 'updated_at', spec.dateKey, 'customer_name', 'customer_email', 'product'].filter(Boolean);
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const line = (r) => cols.map((c) => esc(
      c === 'customer_name' ? (r.full_name || r.customer?.full_name)
        : c === 'customer_email' ? (r.email || r.customer?.email)
          : c === 'product' ? (r.diamond?.stock_number || r.piece?.sku || '')
            : r[c],
    )).join(',');
    const csv = [cols.join(','), ...visible.map(line)].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ngd-${queue}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    t.ok(`Exported ${visible.length} ${visible.length === 1 ? 'row' : 'rows'}.`);
  }, [visible, queue, spec.dateKey, t]);

  const person = (r) => r.full_name || r.customer?.full_name || null;
  const mail = (r) => r.email || r.customer?.email || null;
  const tel = (r) => r.mobile || r.customer?.phone || null;
  const product = (r) => (r.diamond
    ? `${r.diamond.stock_number || r.diamond.public_id} · ${Number(r.diamond.carat).toFixed(2)} ct ${r.diamond.shape}`
    : r.piece ? `${r.piece.sku || r.piece.public_id} · ${r.piece.product_name ?? ''}`.trim() : null);

  const columns = useMemo(() => [
    {
      key: 'public_id',
      label: 'Reference',
      plain: (r) => r.public_id,
      render: (r) => (
        <span>
          <b>{r.public_id ?? r.id}</b>
          {spec.overdue?.(r) && <span className={styles.overdue}>{spec.overdueLabel}</span>}
        </span>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      sortValue: (r) => person(r) ?? '',
      render: (r) => (person(r) || mail(r)
        ? <span>{person(r) ?? <span className={styles.blank}>Unnamed</span>}<br /><span className={styles.blank}>{mail(r)}</span></span>
        /* An account we could not read is not the same as no account. */
        : r.user_id
          ? <span className={styles.blank}>{state.related.profiles ? 'Account unreadable' : 'Account not found'}</span>
          : <span className={styles.blank}>—</span>),
    },
    {
      key: 'product',
      label: 'Product',
      sortValue: (r) => product(r) ?? '',
      render: (r) => product(r) ?? <span className={styles.blank}>—</span>,
    },
    ...(queue === 'enquiries' ? [{ key: 'subject', label: 'Subject' }] : []),
    {
      key: 'status',
      label: 'Status',
      render: (r) => <span className={styles.badge}>{r.status ?? 'Unspecified'}</span>,
    },
    ...(spec.dateKey ? [{
      key: spec.dateKey,
      label: spec.dateKey === 'expires_at' ? 'Expires' : 'Scheduled',
      sortValue: (r) => r[spec.dateKey] ?? '',
      render: (r) => (
        <span data-late={spec.overdue?.(r) ? '' : undefined} className={spec.overdue?.(r) ? styles.late : undefined}>
          {day(r[spec.dateKey])}
        </span>
      ),
    }] : []),
    { key: 'created_at', label: 'Received', sortValue: (r) => r.created_at ?? '', render: (r) => day(r.created_at) },
    {
      key: 'do',
      label: '',
      sortable: false,
      render: (r) => (
        <button type="button" className={styles.openBtn} onClick={() => setOpen(r)}>Open</button>
      ),
    },
  ], [queue, spec, state.related.profiles]);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre</p>
          <h1>{spec.label}</h1>
          <p className={styles.sub}>
            {state.status === 'ready' ? `${visible.length} shown of ${state.rows.length}` : 'Loading…'}
          </p>
        </div>
      </header>

      {/*
        Said once, plainly. These four tables have no assignee, priority or
        internal-note column — all probed, all absent — so those controls are
        not here rather than being present and inert.
      */}
      <p className={styles.note}>
        This table has no assignee, priority or internal-note column, so this
        queue tracks status and dates only. Adding those needs a migration.
      </p>

      {state.status === 'ready' && statuses.length > 0 && (
        <div className={styles.tabs} role="group" aria-label="Filter by status">
          <button type="button" className={styles.tab} data-on={tab === 'all' ? '' : undefined} aria-pressed={tab === 'all'} onClick={() => setTab('all')}>
            All <span>{state.rows.length}</span>
          </button>
          {statuses.map((s) => (
            <button key={s} type="button" className={styles.tab} data-on={tab === s ? '' : undefined} aria-pressed={tab === s} onClick={() => setTab(s)}>
              {s} <span>{counts.get(s)}</span>
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
        searchKeys={['public_id', 'status', 'full_name', 'email', 'mobile', 'subject', 'message', 'company_name', 'country']}
        searchPlaceholder="Search reference, customer, subject…"
        initialSort={{ key: 'created_at', dir: 'desc' }}
        filters={tab}
        empty={`No ${spec.label.toLowerCase()} yet.`}
        toolbar={(
          <button type="button" className={styles.toolBtn} onClick={exportCsv} disabled={!visible.length}>
            <Download size={13} aria-hidden="true" /> Export CSV
          </button>
        )}
      />

      {open && (
        <Drawer
          row={open}
          queue={queue}
          spec={spec}
          statuses={statuses}
          busy={busyId === open.id}
          onMove={move}
          onClose={() => setOpen(null)}
          person={person}
          mail={mail}
          tel={tel}
          product={product}
        />
      )}

      <Toasts toasts={t.toasts} dismiss={t.dismiss} />
    </div>
  );
}

/**
 * The detail panel.
 *
 * Mounted only while a row is open, so its own state starts clean each time
 * and there is no stale scroll position or half-typed field carried between
 * two different customers' records.
 */
function Drawer({ row, spec, statuses, busy, onMove, onClose, person, mail, tel, product }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const email = mail(row);
  const phone = tel(row);
  const chat = wa(phone);

  return (
    <div className={styles.drawerWrap}>
      <button type="button" className={styles.scrim} aria-label="Close" onClick={onClose} />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label={`${spec.label} ${row.public_id ?? row.id}`}>
        <header className={styles.drawerHead}>
          <div>
            <p className={styles.eyebrow}>{spec.label}</p>
            <h2>{row.public_id ?? row.id}</h2>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </header>

        {spec.overdue?.(row) && (
          <p className={styles.overdueBanner}>
            <Clock size={13} aria-hidden="true" /> {spec.overdueLabel} — {stamp(row[spec.dateKey])}
          </p>
        )}

        <dl className={styles.facts}>
          <div><dt>Status</dt><dd><span className={styles.badge}>{row.status ?? 'Unspecified'}</span></dd></div>
          <div><dt>Customer</dt><dd>{person(row) ?? <span className={styles.blank}>—</span>}</dd></div>
          {row.company_name && <div><dt>Company</dt><dd>{row.company_name}</dd></div>}
          {row.country && <div><dt>Country</dt><dd>{row.country}</dd></div>}
          <div><dt>Product</dt><dd>{product(row) ?? <span className={styles.blank}>Not linked to a product</span>}</dd></div>
          {spec.dateKey && <div><dt>{spec.dateKey === 'expires_at' ? 'Expires' : 'Scheduled'}</dt><dd>{stamp(row[spec.dateKey])}</dd></div>}
          <div><dt>Received</dt><dd>{stamp(row.created_at)}</dd></div>
          <div><dt>Updated</dt><dd>{stamp(row.updated_at)}</dd></div>
        </dl>

        {row.message && (
          <section className={styles.message}>
            <h3>Message</h3>
            {/* Rendered as text, never as markup. A customer's message is
                untrusted input and this console is not a place to run it. */}
            <p>{row.message}</p>
          </section>
        )}

        <section className={styles.actions}>
          <h3>Reply</h3>
          {email || chat ? (
            <div className={styles.actionRow}>
              {email && (
                <a className={styles.action} href={`mailto:${email}?subject=${encodeURIComponent(`${spec.label.replace(/s$/, '')} ${row.public_id ?? ''}`)}`}>
                  <Mail size={13} aria-hidden="true" /> Email
                </a>
              )}
              {chat && (
                <a className={styles.action} href={chat} target="_blank" rel="noopener noreferrer">
                  <MessageCircle size={13} aria-hidden="true" /> WhatsApp
                </a>
              )}
              {phone && (
                <a className={styles.action} href={`tel:${phone}`}>
                  <Phone size={13} aria-hidden="true" /> Call
                </a>
              )}
            </div>
          ) : (
            <p className={styles.blank}>No contact details on this record.</p>
          )}
          {/* Stated because it is the difference between a tool and a
              liability: these open the operator's own client. */}
          <p className={styles.hint}>These open your own mail or WhatsApp. Nothing is sent from here.</p>
        </section>

        <section className={styles.actions}>
          <h3>Move to</h3>
          {statuses.length > 1 ? (
            <div className={styles.actionRow}>
              {statuses.filter((s) => s !== (row.status ?? 'Unspecified')).map((s) => (
                <button key={s} type="button" className={styles.action} disabled={busy} onClick={() => onMove(row, s)}>
                  {s}
                </button>
              ))}
            </div>
          ) : (
            /* One value in the data means there is no workflow to offer yet,
               and inventing a second one here would put a status into the
               database that nothing else in the system recognises. */
            <p className={styles.blank}>
              Only “{row.status ?? 'Unspecified'}” exists in this table so far, so
              there is nothing to move to. Statuses are read from the data, never
              invented here.
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
