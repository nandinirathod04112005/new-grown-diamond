import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, EyeOff, ImageOff, Pencil, Plus, ScrollText, Undo2 } from 'lucide-react';

import {
  adminArchiveDiamond,
  adminListDiamonds,
  adminSetActive,
} from '@/lib/supabase/queries/diamonds.js';
import { diamondImageUrl } from '@/lib/supabase/storage.js';
import DataTable from '@/components/admin/DataTable.jsx';
import { ConfirmDialog, Toasts } from '@/components/admin/AdminFeedback.jsx';
import { useToasts } from '@/hooks/useAdminFeedback.js';
import styles from './AdminDiamonds.module.css';

const fmt = (n) => (Number.isFinite(Number(n)) ? Number(n).toFixed(2) : '—');
const day = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' }) : '—');

/**
 * Inventory console.
 *
 * Shows every row, including the inactive and archived stock the storefront
 * can never see. "Archive" is still an archive rather than a delete: enquiries
 * reference these rows, and the storefront policies already hide archived
 * stone. Nothing in this file deletes anything, and there is deliberately no
 * hard-delete control — the schema has `archived_at` precisely so that removal
 * is reversible.
 *
 * The three write paths — adminSetActive, adminArchiveDiamond, and the form
 * behind the edit link — are exactly the ones that were here before. What is
 * new around them is search, sort, paging, column choice, bulk selection, and
 * the confirmation that a bulk archive now has to pass.
 */
export default function AdminDiamonds() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [view, setView] = useState('current'); // current | archived | all
  const [confirm, setConfirm] = useState(null);
  const [working, setWorking] = useState(false);
  const t = useToasts();

  const fetchRows = useCallback(async () => {
    try {
      setRows(await adminListDiamonds());
      setError(null);
      setStatus('ready');
    } catch (err) {
      console.error('[NGD Admin] list failed:', err);
      setError(err.message || 'The stock list could not be loaded.');
      setStatus('error');
    }
  }, []);

  // The first write in fetchRows happens after the database promise settles.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { fetchRows(); }, [fetchRows]);

  /*
   * Duplicates, computed over the WHOLE list rather than the current page.
   *
   * A stock number repeated across two rows is a data-entry mistake that costs
   * the desk a real conversation with a buyer, and a certificate number on two
   * stones is worse than that. Both are surfaced as a flag on the row rather
   * than as a blocking error, because the fix belongs to whoever knows which
   * of the two is right.
   */
  const dupes = useMemo(() => {
    const count = (key) => {
      const seen = new Map();
      rows.forEach((r) => {
        const v = String(r[key] ?? '').trim().toLowerCase();
        if (v) seen.set(v, (seen.get(v) ?? 0) + 1);
      });
      return seen;
    };
    const stock = count('stock_number');
    const cert = count('certificate_number');
    return {
      stock: (r) => stock.get(String(r.stock_number ?? '').trim().toLowerCase()) > 1,
      cert: (r) => cert.get(String(r.certificate_number ?? '').trim().toLowerCase()) > 1,
    };
  }, [rows]);

  const visible = useMemo(() => rows.filter((r) => (
    view === 'all' ? true : view === 'archived' ? Boolean(r.archived_at) : !r.archived_at
  )), [rows, view]);

  /* One row's worth of work, with the row's own state put back on failure. */
  const run = useCallback(async (id, fn, okMsg) => {
    setBusyId(id);
    try {
      await fn();
      await fetchRows();
      t.ok(okMsg);
    } catch (err) {
      console.error('[NGD Admin] write failed:', err);
      t.error(err.message || 'That change could not be saved.');
    } finally {
      setBusyId(null);
    }
  }, [fetchRows, t]);

  /*
   * Bulk writes go one at a time, and a failure part-way through does not
   * abandon the rest. PostgREST would happily take a batch, but the existing
   * helpers are per-row and reusing them keeps exactly one code path — and one
   * set of RLS checks — for a change whether it is made to one stone or forty.
   */
  const runBulk = useCallback(async (list, fn, verb) => {
    setWorking(true);
    let done = 0;
    const failed = [];
    for (const row of list) {
      try { await fn(row); done += 1; } catch (err) {
        console.error('[NGD Admin] bulk item failed:', row.id, err);
        failed.push(row.stock_number || row.public_id);
      }
    }
    await fetchRows();
    setWorking(false);
    setConfirm(null);
    if (failed.length) t.error(`${verb} ${done}, but ${failed.length} failed: ${failed.slice(0, 4).join(', ')}${failed.length > 4 ? '…' : ''}`);
    else t.ok(`${verb} ${done} ${done === 1 ? 'stone' : 'stones'}.`);
  }, [fetchRows, t]);

  /* Export is the whole current view, not the current page — a spreadsheet of
     25 rows out of 400 is a trap. Values are quoted and inner quotes doubled,
     so a measurement like 6.5 x 6.5 x 4 mm cannot split a column. */
  const exportCsv = useCallback(() => {
    const cols = ['stock_number', 'public_id', 'shape', 'carat', 'color', 'clarity', 'cut', 'polish',
      'symmetry', 'fluorescence', 'laboratory', 'certificate_number', 'growth_method', 'availability',
      'total_price', 'currency', 'active', 'archived_at', 'created_at'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...visible.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ngd-diamonds-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    t.ok(`Exported ${visible.length} ${visible.length === 1 ? 'row' : 'rows'}.`);
  }, [visible, t]);

  const columns = useMemo(() => [
    {
      key: 'stock_number',
      label: 'Stock',
      plain: (r) => r.stock_number || r.public_id,
      render: (r) => (
        <span className={styles.idCell}>
          <span className={styles.thumb}>
            {r.image_path
              ? <img src={diamondImageUrl(r.image_path)} alt="" loading="lazy" decoding="async" />
              : <ImageOff size={13} aria-label="No photograph" />}
          </span>
          <span>
            <b>{r.stock_number || r.public_id}</b>
            {dupes.stock(r) && <span className={styles.dupe} title="This stock number is on more than one row">dup</span>}
          </span>
        </span>
      ),
    },
    { key: 'shape', label: 'Shape' },
    { key: 'carat', label: 'Carat', render: (r) => fmt(r.carat), sortValue: (r) => Number(r.carat) || 0 },
    { key: 'color', label: 'Colour' },
    { key: 'clarity', label: 'Clarity' },
    { key: 'cut', label: 'Cut' },
    { key: 'polish', label: 'Polish', hiddenByDefault: true },
    { key: 'symmetry', label: 'Symmetry', hiddenByDefault: true },
    { key: 'fluorescence', label: 'Fluor.', hiddenByDefault: true },
    { key: 'laboratory', label: 'Lab' },
    {
      key: 'certificate_number',
      label: 'Report',
      hiddenByDefault: true,
      render: (r) => (
        <span>
          {r.certificate_number || <span className={styles.blank}>—</span>}
          {dupes.cert(r) && <span className={styles.dupe} title="This certificate number is on more than one row">dup</span>}
        </span>
      ),
    },
    { key: 'growth_method', label: 'Growth', hiddenByDefault: true },
    { key: 'availability', label: 'Availability' },
    {
      key: 'total_price',
      label: 'Price',
      hiddenByDefault: true,
      sortValue: (r) => Number(r.total_price) || 0,
      /* Price is only shown where the row itself says it may be. The column
         exists precisely because trade pricing is often withheld. */
      render: (r) => (r.price_visible && r.total_price
        ? `${r.currency ?? ''} ${Number(r.total_price).toLocaleString()}`.trim()
        : <span className={styles.blank}>hidden</span>),
    },
    {
      key: 'state',
      label: 'State',
      sortValue: (r) => (r.archived_at ? 2 : r.active ? 0 : 1),
      render: (r) => (
        <span className={styles.pill} data-tone={r.archived_at ? 'off' : r.active ? 'on' : 'hidden'}>
          {r.archived_at ? 'Archived' : r.active ? 'Live' : 'Hidden'}
        </span>
      ),
    },
    { key: 'created_at', label: 'Added', render: (r) => day(r.created_at), sortValue: (r) => r.created_at ?? '' },
    {
      key: 'do',
      label: 'Actions',
      sortable: false,
      render: (r) => {
        const archived = Boolean(r.archived_at);
        return (
          <span className={styles.rowActions}>
            <a className={styles.act} href={`/admin/diamonds/${r.id}/edit`} title="Edit"><Pencil size={13} /></a>
            <button
              type="button"
              className={styles.act}
              disabled={busyId === r.id || archived}
              title={r.active ? 'Hide from the storefront' : 'Show on the storefront'}
              onClick={() => run(r.id, () => adminSetActive(r.id, !r.active, { previous: r, publicId: r.public_id, label: r.stock_number }), r.active ? 'Hidden from the site.' : 'Live on the site.')}
            >
              {r.active ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
            {archived ? (
              <button
                type="button"
                className={styles.act}
                disabled={busyId === r.id}
                title="Restore"
                onClick={() => run(r.id, () => adminArchiveDiamond(r.id, false, { previous: r, publicId: r.public_id, label: r.stock_number }), 'Restored.')}
              >
                <Undo2 size={13} />
              </button>
            ) : (
              <button
                type="button"
                className={styles.act}
                data-danger=""
                disabled={busyId === r.id}
                title="Archive"
                onClick={() => setConfirm({ kind: 'one', rows: [r] })}
              >
                <ScrollText size={13} />
              </button>
            )}
            {r.active && !archived && (
              <a className={styles.act} href="/diamonds" target="_blank" rel="noopener noreferrer" title="View on the storefront">
                <Eye size={13} />
              </a>
            )}
          </span>
        );
      },
    },
  ], [busyId, dupes, run]);

  const one = confirm?.kind === 'one' ? confirm.rows[0] : null;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre</p>
          <h1>Diamonds</h1>
          <p className={styles.sub}>
            {status === 'ready'
              ? `${visible.length} shown · ${rows.filter((r) => r.active && !r.archived_at).length} live on the site`
              : 'Loading stock…'}
          </p>
        </div>
        <a className={styles.primary} href="/admin/diamonds/new"><Plus size={14} aria-hidden="true" /> Add a diamond</a>
      </header>

      <DataTable
        rows={visible}
        columns={columns}
        status={status}
        error={error}
        onRetry={fetchRows}
        searchKeys={['stock_number', 'public_id', 'shape', 'color', 'clarity', 'cut', 'laboratory', 'certificate_number', 'availability']}
        searchPlaceholder="Search stock, shape, lab, report…"
        initialSort={{ key: 'created_at', dir: 'desc' }}
        selectable
        rowHref={(r) => `/admin/diamonds/${r.id}/edit`}
        filters={view}
        empty="No stock yet. Add the first stone to get started."
        toolbar={(
          <>
            <div className={styles.tabs} role="group" aria-label="Which stock to show">
              {[['current', 'Current'], ['archived', 'Archived'], ['all', 'All']].map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  className={styles.tab}
                  data-on={view === k ? '' : undefined}
                  aria-pressed={view === k}
                  onClick={() => setView(k)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button type="button" className={styles.toolBtn} onClick={exportCsv} disabled={!visible.length}>
              <Download size={13} aria-hidden="true" /> Export CSV
            </button>
          </>
        )}
        bulkActions={(sel, clear) => (
          <>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => runBulk(sel.filter((r) => !r.archived_at && !r.active), (r) => adminSetActive(r.id, true, { previous: r, publicId: r.public_id, label: r.stock_number }), 'Published').then(clear)}
              disabled={working}
            >
              Publish
            </button>
            <button
              type="button"
              className={styles.toolBtn}
              onClick={() => runBulk(sel.filter((r) => !r.archived_at && r.active), (r) => adminSetActive(r.id, false, { previous: r, publicId: r.public_id, label: r.stock_number }), 'Hidden').then(clear)}
              disabled={working}
            >
              Unpublish
            </button>
            <button
              type="button"
              className={styles.toolBtnDanger}
              onClick={() => setConfirm({ kind: 'bulk', rows: sel.filter((r) => !r.archived_at), clear })}
              disabled={working}
            >
              Archive
            </button>
          </>
        )}
      />

      {/*
        One stone: the stock number has to be typed. Many: the count does.
        Either way the control is not a button someone can hit twice by
        reflex, which is the entire point of a confirmation on a write that
        touches live stock.
      */}
      <ConfirmDialog
        open={Boolean(one)}
        title="Archive this stone?"
        confirmText={one?.stock_number || one?.public_id}
        confirmLabel="Archive"
        busy={working}
        onCancel={() => setConfirm(null)}
        onConfirm={() => runBulk([one], (r) => adminArchiveDiamond(r.id, true, { previous: r, publicId: r.public_id, label: r.stock_number }), 'Archived')}
        body={(
          <>
            <p>
              <strong>{one?.stock_number || one?.public_id}</strong> — {fmt(one?.carat)} ct {one?.shape}.
            </p>
            <ul>
              <li>It disappears from the storefront immediately.</li>
              <li>Nothing is deleted — enquiries that reference it stay intact.</li>
              <li>You can restore it from the Archived tab.</li>
            </ul>
          </>
        )}
      />

      <ConfirmDialog
        open={confirm?.kind === 'bulk'}
        title={`Archive ${confirm?.rows.length ?? 0} stones?`}
        confirmText={String(confirm?.rows.length ?? '')}
        confirmLabel="Archive them"
        busy={working}
        onCancel={() => setConfirm(null)}
        onConfirm={() => runBulk(confirm.rows, (r) => adminArchiveDiamond(r.id, true, { previous: r, publicId: r.public_id, label: r.stock_number }), 'Archived').then(() => confirm.clear?.())}
        body={(
          <>
            <p>
              These come off the storefront at once:{' '}
              <strong>{confirm?.rows.slice(0, 6).map((r) => r.stock_number || r.public_id).join(', ')}</strong>
              {confirm?.rows.length > 6 ? ` and ${confirm.rows.length - 6} more` : ''}.
            </p>
            <ul>
              <li>Nothing is deleted, and every one can be restored.</li>
              <li>Already-archived rows in your selection were skipped.</li>
            </ul>
          </>
        )}
      />

      <Toasts toasts={t.toasts} dismiss={t.dismiss} />
    </div>
  );
}
