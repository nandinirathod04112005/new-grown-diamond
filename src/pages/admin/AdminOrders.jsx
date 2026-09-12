import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Mail, Phone, Plus, X } from 'lucide-react';

import DataTable from '@/components/admin/DataTable.jsx';
import { SetupRequired } from '@/components/admin/AdminBits.jsx';
import { ConfirmDialog, Toasts } from '@/components/admin/AdminFeedback.jsx';
import { useToasts } from '@/hooks/useAdminFeedback.js';
import {
  ORDER_STATUSES,
  STATUS_LABEL,
  diamondLine,
  formatMoney,
  loadOrders,
  markDiamondSold,
  setOrderNote,
  setOrderStatus,
  summarise,
} from '@/lib/supabase/queries/adminOrders.js';
import styles from './AdminOrders.module.css';

const day = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' }) : '—');
const stamp = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—');

/* How each status reads at a glance. The words are the table's own. */
const TONE = { confirmed: 'new', invoiced: 'mid', paid: 'good', shipped: 'mid', delivered: 'done', cancelled: 'bad' };

/** ?open=ORD-XXXX — how the new-order page and the inbox land on one order. */
function readOpenParam() {
  try { return new URLSearchParams(window.location.search).get('open'); } catch { return null; }
}

function StatusPill({ status }) {
  return (
    <span className={styles.pill} data-tone={TONE[status] ?? 'mid'}>
      {STATUS_LABEL[status] ?? status ?? 'Unspecified'}
    </span>
  );
}

/** A figure tile: loading, unavailable (with why), or the figure. */
function Tile({ label, loading, error, hint, children }) {
  return (
    <article className={styles.tile} data-bad={error ? '' : undefined} aria-busy={loading || undefined}>
      <p className={styles.tileLabel}>{label}</p>
      {loading && <span className={styles.skel} aria-hidden="true" />}
      {!loading && error && (
        <>
          <p className={styles.tileOff}>Unavailable</p>
          <p className={styles.tileHint}>{error}</p>
        </>
      )}
      {!loading && !error && children}
      {!loading && !error && hint && <p className={styles.tileHint}>{hint}</p>}
    </article>
  );
}

/** One line per currency. Never a single figure across currencies. */
function MoneyList({ groups, empty, counted }) {
  if (!groups.length) return <p className={styles.tileEmpty}>{empty}</p>;
  return (
    <ul className={styles.money}>
      {groups.map(([currency, cents, count]) => (
        <li key={currency}>
          <b>{formatMoney(cents, currency)}</b>
          {counted && <span>{count} {count === 1 ? 'order' : 'orders'}</span>}
        </li>
      ))}
    </ul>
  );
}

/**
 * Orders & Sales.
 *
 * Every figure here is computed from the orders the table actually holds —
 * nothing is seeded, estimated or carried over from diamonds.availability.
 * A table that cannot be read shows "Unavailable" and the reason, never a
 * zero; an empty table shows zero orders, because that is then the fact.
 *
 * Statuses are the six the table's CHECK constraint allows, so a row can be
 * moved to any of them — forwards, or back to correct a mistake — and a
 * cancellation asks for the reference to be typed first. Every change goes to
 * the audit log as a status change, with the before and after.
 */
export default function AdminOrders() {
  const [state, setState] = useState({ status: 'loading', rows: [], error: null, missing: false, related: {} });
  const [tab, setTab] = useState('all');
  const [openId, setOpenId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [cancelling, setCancelling] = useState(null);
  const [asked] = useState(readOpenParam);
  const [notFound, setNotFound] = useState(null);
  const handled = useRef(false);
  const t = useToasts();

  const load = useCallback(async () => {
    const r = await loadOrders();
    setState({ status: r.ok ? 'ready' : 'error', rows: r.rows, error: r.error, missing: r.missing, related: r.related ?? {} });
    /* The address asked for one order: open it once, then drop the query so
       a reload does not keep reopening it. */
    if (r.ok && asked && !handled.current) {
      handled.current = true;
      const hit = r.rows.find((o) => o.public_id === asked || o.id === asked);
      if (hit) setOpenId(hit.id);
      else setNotFound(asked);
      try { window.history.replaceState(window.history.state, '', window.location.pathname); } catch { /* not fatal */ }
    }
  }, [asked]);

  // The first write happens after the database promise settles.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const ready = state.status === 'ready';
  const sum = useMemo(() => (ready ? summarise(state.rows) : null), [ready, state.rows]);

  const counts = useMemo(() => {
    const m = new Map();
    state.rows.forEach((r) => m.set(r.status, (m.get(r.status) ?? 0) + 1));
    return m;
  }, [state.rows]);

  const visible = useMemo(
    () => (tab === 'all' ? state.rows : state.rows.filter((r) => r.status === tab)),
    [state.rows, tab],
  );

  /* The drawer reads the row from the list, so a reload refreshes it too. */
  const open = openId ? state.rows.find((r) => r.id === openId) ?? null : null;

  const run = useCallback(async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn();
      await load();
      t.ok(okMsg);
      return true;
    } catch (err) {
      console.error('[NGD Admin] order write failed:', err);
      t.error(err.message || 'That change could not be saved.');
      return false;
    } finally {
      setBusy(false);
    }
  }, [load, t]);

  const move = (order, status) => run(
    () => setOrderStatus(order, status),
    `${order.public_id} is now ${STATUS_LABEL[status].toLowerCase()}.`,
  );
  const saveNote = (order, text) => run(() => setOrderNote(order, text), 'Note saved.');
  const sell = (diamond) => run(
    () => markDiamondSold(diamond),
    `${diamond.stock_number || diamond.public_id} is marked Sold.`,
  );

  const exportCsv = useCallback(() => {
    const cols = ['public_id', 'created_at', 'status', 'customer_name', 'customer_company', 'customer_email',
      'item_count', 'stock_numbers', 'currency', 'total_amount', 'updated_at'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...visible.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ngd-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    t.ok(`Exported ${visible.length} ${visible.length === 1 ? 'order' : 'orders'}.`);
  }, [visible, t]);

  const columns = useMemo(() => [
    {
      key: 'public_id',
      label: 'Order',
      plain: (r) => r.public_id,
      render: (r) => (
        <span className={styles.refCell}>
          <b>{r.public_id ?? r.id}</b>
          {r.item_count === 0 && <span className={styles.flag}>No lines</span>}
        </span>
      ),
    },
    {
      key: 'customer',
      label: 'Customer',
      sortValue: (r) => r.customer_name || r.customer_email || '',
      render: (r) => (r.customer
        ? (
          <span className={styles.stack}>
            <span>{r.customer.full_name || <span className={styles.blank}>Unnamed</span>}</span>
            <span className={styles.blank}>{r.customer.email ?? r.customer.company_name}</span>
          </span>
        )
        /* An account we could not read is not the same as no account. */
        : <span className={styles.blank}>{state.related.profiles ? 'Account unreadable' : 'Account not found'}</span>),
    },
    {
      key: 'items',
      label: 'Items',
      sortValue: (r) => r.item_count ?? -1,
      render: (r) => {
        if (r.items == null) return <span className={styles.blank}>—</span>;
        const stones = r.items.filter((l) => l.diamond).map((l) => l.diamond.stock_number || l.diamond.public_id);
        return (
          <span className={styles.stack}>
            <span>
              {r.item_count}
              {r.pieces !== r.item_count && <span className={styles.blank}> ({r.pieces} pcs)</span>}
            </span>
            {stones.length > 0 && (
              <span className={styles.blank}>{stones.slice(0, 3).join(', ')}{stones.length > 3 ? ` +${stones.length - 3}` : ''}</span>
            )}
          </span>
        );
      },
    },
    {
      key: 'status',
      label: 'Status',
      sortValue: (r) => ORDER_STATUSES.indexOf(r.status),
      render: (r) => <StatusPill status={r.status} />,
    },
    {
      key: 'total',
      label: 'Total',
      /* Grouped by currency first, so a sort never interleaves rupees and dollars. */
      sortValue: (r) => `${r.currency ?? ''} ${String(r.total_cents).padStart(16, '0')}`,
      render: (r) => <span className={styles.amount}>{formatMoney(r.total_cents, r.currency)}</span>,
    },
    { key: 'created_at', label: 'Created', sortValue: (r) => r.created_at ?? '', render: (r) => day(r.created_at) },
    {
      key: 'do',
      label: '',
      sortable: false,
      render: (r) => <button type="button" className={styles.openBtn} onClick={() => setOpenId(r.id)}>Open</button>,
    },
  ], [state.related.profiles]);

  if (state.missing) {
    return (
      <div className={styles.page}>
        <SetupRequired
          module={{
            label: 'Orders & Sales',
            state: 'setup',
            missing: ['orders', 'order_items'],
            note: 'The orders tables are not on this project. Their definition and policies are in supabase/migrations/0005_customer_orders.sql.',
          }}
        />
      </div>
    );
  }

  const unreadable = [
    state.related.items && `order lines (${state.related.items})`,
    state.related.profiles && `customer accounts (${state.related.profiles})`,
    state.related.diamonds && `diamonds (${state.related.diamonds})`,
    state.related.jewellery && `jewellery (${state.related.jewellery})`,
  ].filter(Boolean);

  const loading = state.status === 'loading';
  const failed = state.status === 'error' ? state.error : null;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre</p>
          <h1>Orders &amp; Sales</h1>
          <p className={styles.sub}>
            {ready ? `${visible.length} shown of ${state.rows.length}` : loading ? 'Loading orders…' : 'Orders could not be loaded'}
          </p>
        </div>
        <a className={styles.primary} href="/admin/orders/new">
          <Plus size={14} aria-hidden="true" /> New order
        </a>
      </header>

      <div className={styles.kpis}>
        <Tile
          label={`Orders · ${sum?.monthLabel ?? 'this month'}`}
          loading={loading}
          error={failed}
          hint={sum?.monthCancelled ? `${sum.monthCancelled} cancelled, not counted` : 'Cancelled orders are not counted'}
        >
          {sum && <p className={styles.tileValue}>{sum.monthCount}</p>}
        </Tile>
        <Tile label="Revenue this month" loading={loading} error={failed}>
          {sum && (
            <MoneyList
              groups={sum.monthRevenue.map(([c, g]) => [c, g.cents, g.count])}
              empty="No sales recorded this month."
              counted
            />
          )}
        </Tile>
        <Tile label="Revenue, all time" loading={loading} error={failed}>
          {sum && (
            <MoneyList
              groups={sum.allRevenue.map(([c, g]) => [c, g.cents, g.count])}
              empty="No sales recorded yet."
              counted
            />
          )}
        </Tile>
        <Tile label="Average order value" loading={loading} error={failed}>
          {sum && <MoneyList groups={sum.average} empty="Needs at least one order." />}
        </Tile>
      </div>

      {ready && (
        <p className={styles.hint}>
          Figures are the orders’ own totals with cancelled orders left out. Each
          currency is shown on its own line — amounts are never converted or
          added across currencies. “This month” is {sum?.monthLabel} in your time zone.
        </p>
      )}

      {unreadable.length > 0 && (
        <p className={styles.note}>
          Some related records could not be read: {unreadable.join('; ')}. The
          affected columns say so rather than showing a blank.
        </p>
      )}

      {notFound && (
        <p className={styles.note}>
          Order {notFound} was not found. It may have been removed.
        </p>
      )}

      {ready && (
        <div className={styles.tabs} role="group" aria-label="Filter by status">
          <button type="button" className={styles.tab} data-on={tab === 'all' ? '' : undefined} aria-pressed={tab === 'all'} onClick={() => setTab('all')}>
            All <span>{state.rows.length}</span>
          </button>
          {ORDER_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              className={styles.tab}
              data-on={tab === s ? '' : undefined}
              data-empty={counts.get(s) ? undefined : ''}
              aria-pressed={tab === s}
              onClick={() => setTab(s)}
            >
              {STATUS_LABEL[s]} <span>{counts.get(s) ?? 0}</span>
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
        searchKeys={['public_id', 'customer_name', 'customer_email', 'customer_company', 'stock_numbers', 'descriptions', 'currency']}
        searchPlaceholder="Search order, customer, stock number…"
        initialSort={{ key: 'created_at', dir: 'desc' }}
        filters={tab}
        empty={tab === 'all' ? 'No orders yet. Record the first sale with “New order”.' : `No ${STATUS_LABEL[tab].toLowerCase()} orders.`}
        toolbar={(
          <button type="button" className={styles.toolBtn} onClick={exportCsv} disabled={!visible.length}>
            <Download size={13} aria-hidden="true" /> Export CSV
          </button>
        )}
      />

      {open && (
        <OrderDrawer
          key={open.id}
          order={open}
          related={state.related}
          busy={busy}
          blocked={Boolean(cancelling)}
          onClose={() => setOpenId(null)}
          onMove={move}
          onCancel={setCancelling}
          onSaveNote={saveNote}
          onSell={sell}
        />
      )}

      <ConfirmDialog
        open={Boolean(cancelling)}
        title={`Cancel order ${cancelling?.public_id ?? ''}?`}
        confirmText={cancelling?.public_id}
        confirmLabel="Mark as cancelled"
        busy={busy}
        onCancel={() => setCancelling(null)}
        onConfirm={async () => {
          await move(cancelling, 'cancelled');
          setCancelling(null);
        }}
        body={(
          <>
            <p>
              <strong>{cancelling?.public_id}</strong>
              {cancelling?.customer?.full_name ? ` — ${cancelling.customer.full_name}` : ''}
              {cancelling ? `, ${formatMoney(cancelling.total_cents, cancelling.currency)}` : ''}.
            </p>
            <ul>
              <li>It stops counting towards revenue straight away.</li>
              <li>The customer’s account shows the order as cancelled.</li>
              <li>Stones on it are not changed. If one was marked Sold, set it back in Diamonds.</li>
              <li>Nothing is deleted, and it can be reopened by choosing another status.</li>
            </ul>
          </>
        )}
      />

      <Toasts toasts={t.toasts} dismiss={t.dismiss} />
    </div>
  );
}

/**
 * One order.
 *
 * Mounted per order (keyed by id), so the note field starts from that order's
 * saved note and never carries one customer's text into another's record.
 */
function OrderDrawer({ order, related, busy, blocked, onClose, onMove, onCancel, onSaveNote, onSell }) {
  const [note, setNote] = useState(order.customer_note ?? '');
  const closeRef = useRef(null);

  /* Focus into the panel on open, and back to whatever opened it on close. */
  useEffect(() => {
    const opener = document.activeElement;
    closeRef.current?.focus();
    return () => { if (opener instanceof HTMLElement) opener.focus(); };
  }, []);

  /* Escape closes the drawer — unless the cancel confirmation is open above
     it, which handles its own Escape and must not take the drawer with it. */
  useEffect(() => {
    if (blocked) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [blocked, onClose]);

  const c = order.customer;
  const lines = order.items;
  const sumCents = lines ? lines.reduce((s, l) => s + l.unit_cents * (Number(l.quantity) || 0), 0) : null;
  const mismatch = lines != null && lines.length > 0 && sumCents !== order.total_cents;
  const stones = (lines ?? []).filter((l) => l.diamond);
  const cancelled = order.status === 'cancelled';
  const noteDirty = (note.trim() || null) !== (order.customer_note?.trim() || null);
  const headingId = `order-${order.id}`;

  return (
    <div className={styles.drawerWrap}>
      <button type="button" className={styles.scrim} aria-label="Close" tabIndex={-1} onClick={onClose} />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-labelledby={headingId}>
        <header className={styles.drawerHead}>
          <div>
            <p className={styles.eyebrow}>Order</p>
            <h2 id={headingId}>{order.public_id ?? order.id}</h2>
          </div>
          <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </header>

        <dl className={styles.facts}>
          <div><dt>Status</dt><dd><StatusPill status={order.status} /></dd></div>
          <div>
            <dt>Customer</dt>
            <dd>
              {c ? (
                <>
                  {c.full_name || <span className={styles.blank}>Unnamed account</span>}
                  {c.company_name && <><br /><span className={styles.blank}>{c.company_name}</span></>}
                </>
              ) : (
                <span className={styles.blank}>{related.profiles ? 'Account unreadable' : 'Account not found'}</span>
              )}
            </dd>
          </div>
          {c?.email && (
            <div>
              <dt>Email</dt>
              <dd>
                <a className={styles.inlineLink} href={`mailto:${c.email}?subject=${encodeURIComponent(`Order ${order.public_id ?? ''}`)}`}>
                  <Mail size={12} aria-hidden="true" /> {c.email}
                </a>
              </dd>
            </div>
          )}
          {c?.phone && (
            <div>
              <dt>Phone</dt>
              <dd><a className={styles.inlineLink} href={`tel:${c.phone}`}><Phone size={12} aria-hidden="true" /> {c.phone}</a></dd>
            </div>
          )}
          <div><dt>Total</dt><dd><b className={styles.strong}>{formatMoney(order.total_cents, order.currency, { exact: true })}</b></dd></div>
          <div><dt>Created</dt><dd>{stamp(order.created_at)}</dd></div>
          <div><dt>Updated</dt><dd>{stamp(order.updated_at)}</dd></div>
        </dl>

        <section className={styles.section}>
          <h3>Items</h3>
          {lines == null && (
            <p className={styles.blank}>The order lines could not be read{related.items ? `: ${related.items}` : ''}.</p>
          )}
          {lines != null && lines.length === 0 && (
            <p className={styles.warnText}>
              This order has no lines. It was probably added by hand in the Table
              Editor; its total is shown as stored.
            </p>
          )}
          {lines != null && lines.length > 0 && (
            <>
              <ul className={styles.lines}>
                {lines.map((l) => {
                  const named = l.diamond ? diamondLine(l.diamond) : null;
                  return (
                    <li key={l.id} className={styles.line}>
                      <span className={styles.lineMain}>
                        <span className={styles.lineName}>{named || l.description}</span>
                        {named && l.description && l.description !== named && <span className={styles.lineSub}>{l.description}</span>}
                        {!l.diamond && l.diamond_id && (
                          <span className={styles.lineSub}>
                            {related.diamonds ? 'Linked stone could not be read' : 'Linked stone is no longer in the inventory'}
                          </span>
                        )}
                        {l.piece && (
                          <span className={styles.lineSub}>
                            Jewellery {l.piece.sku || l.piece.public_id}{l.piece.product_name ? ` · ${l.piece.product_name}` : ''}
                          </span>
                        )}
                        {!l.diamond && l.carat != null && <span className={styles.lineSub}>{Number(l.carat).toFixed(2)} ct</span>}
                      </span>
                      <span className={styles.lineAmt}>
                        <span>{formatMoney(l.unit_cents, order.currency, { exact: true })} × {l.quantity}</span>
                        <b>{formatMoney(l.unit_cents * (Number(l.quantity) || 0), order.currency, { exact: true })}</b>
                      </span>
                    </li>
                  );
                })}
              </ul>
              <div className={styles.totals}>
                {mismatch && (
                  <div><span>Sum of the lines</span><span>{formatMoney(sumCents, order.currency, { exact: true })}</span></div>
                )}
                <div><span>Order total</span><b>{formatMoney(order.total_cents, order.currency, { exact: true })}</b></div>
              </div>
              {mismatch && (
                <p className={styles.warnText}>
                  The stored total differs from the sum of the lines. The stored
                  total is what the customer sees and what the figures count.
                </p>
              )}
            </>
          )}
        </section>

        <section className={styles.section}>
          <h3>Status</h3>
          <ol className={styles.steps} aria-label="Order progress">
            {ORDER_STATUSES.filter((s) => s !== 'cancelled').map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className={styles.step}
                  data-on={order.status === s ? '' : undefined}
                  aria-current={order.status === s ? 'step' : undefined}
                  disabled={busy || order.status === s}
                  onClick={() => onMove(order, s)}
                >
                  {STATUS_LABEL[s]}
                </button>
              </li>
            ))}
          </ol>
          {cancelled ? (
            <p className={styles.warnText}>
              This order is cancelled and counts towards nothing. Choosing a
              status above reopens it.
            </p>
          ) : (
            <div className={styles.actionRow}>
              <button type="button" className={styles.dangerBtn} disabled={busy} onClick={() => onCancel(order)}>
                Cancel this order…
              </button>
            </div>
          )}
          <p className={styles.hint}>
            Any status can be chosen, forwards or back, so a slip can be
            corrected. Each change is recorded in the audit log.
          </p>
        </section>

        <section className={styles.section}>
          <h3><label htmlFor={`note-${order.id}`}>Note to the customer</label></h3>
          <textarea
            id={`note-${order.id}`}
            className={styles.input}
            rows={3}
            maxLength={1000}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <p className={styles.hint}>
            The customer’s own account can read this column. Keep internal
            remarks out of it — the orders table has no private notes field.
          </p>
          <div className={styles.actionRow}>
            <button type="button" className={styles.ghostBtn} disabled={busy || !noteDirty} onClick={() => onSaveNote(order, note)}>
              Save note
            </button>
          </div>
        </section>

        {stones.length > 0 && (
          <section className={styles.section}>
            <h3>Stones on this order</h3>
            <ul className={styles.stoneList}>
              {stones.map((l) => (
                <li key={l.id}>
                  <span>
                    <b>{l.diamond.stock_number || l.diamond.public_id}</b>{' '}
                    <span className={styles.blank}>{l.diamond.availability ?? 'No availability set'}</span>
                  </span>
                  {l.diamond.availability === 'Sold' && <span className={styles.pill} data-tone="done">Sold</span>}
                  {l.diamond.availability !== 'Sold' && !cancelled && (
                    <button type="button" className={styles.ghostBtn} disabled={busy} onClick={() => onSell(l.diamond)}>
                      Mark as Sold
                    </button>
                  )}
                </li>
              ))}
            </ul>
            <p className={styles.hint}>
              Optional. Sets the stone’s availability to Sold on the storefront —
              the same edit as in Diamonds — and records it in the audit log.
            </p>
          </section>
        )}
      </aside>
    </div>
  );
}
