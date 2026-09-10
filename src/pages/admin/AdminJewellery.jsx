import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Eye, EyeOff, ScrollText, Star, Undo2 } from 'lucide-react';

import {
  adminArchiveJewellery,
  adminListJewellery,
  adminSetJewelleryActive,
  adminSetJewelleryFeatured,
} from '@/lib/supabase/queries/jewellery.js';
import DataTable from '@/components/admin/DataTable.jsx';
import { ConfirmDialog, Toasts } from '@/components/admin/AdminFeedback.jsx';
import { useToasts } from '@/hooks/useAdminFeedback.js';
import styles from './AdminDiamonds.module.css';

const day = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' }) : '—');

/**
 * Jewellery.
 *
 * Deliberately the same console as Diamonds — same table, same tabs, same
 * publish / feature / archive verbs, same typed confirmation — because they
 * are the same job done to a different product, and an operator should not
 * have to learn two consoles.
 *
 * WHAT IS ABSENT AND WHY. There is no image column on this table, so there is
 * no photography here and no upload control. A greyed-out button implying one
 * is coming would be a promise the schema cannot keep; the note under the
 * heading states the position instead. There is also no collection column —
 * `category` is a free-text field, so it is shown and filtered on, but it is
 * not presented as a managed taxonomy.
 */
export default function AdminJewellery() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [view, setView] = useState('current');
  const [confirm, setConfirm] = useState(null);
  const [working, setWorking] = useState(false);
  const t = useToasts();

  const fetchRows = useCallback(async () => {
    try {
      setRows(await adminListJewellery());
      setError(null);
      setStatus('ready');
    } catch (err) {
      console.error('[NGD Admin] jewellery list failed:', err);
      setError(err.message || 'The jewellery list could not be loaded.');
      setStatus('error');
    }
  }, []);

  // The first write happens after the database promise settles.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { fetchRows(); }, [fetchRows]);

  /* A repeated SKU is the same data-entry fault it is on the stock table, and
     just as worth flagging before someone quotes against the wrong piece. */
  const dupeSku = useMemo(() => {
    const seen = new Map();
    rows.forEach((r) => {
      const v = String(r.sku ?? '').trim().toLowerCase();
      if (v) seen.set(v, (seen.get(v) ?? 0) + 1);
    });
    return (r) => seen.get(String(r.sku ?? '').trim().toLowerCase()) > 1;
  }, [rows]);

  const visible = useMemo(() => rows.filter((r) => (
    view === 'all' ? true : view === 'archived' ? Boolean(r.archived_at) : !r.archived_at
  )), [rows, view]);

  const run = useCallback(async (id, fn, okMsg) => {
    setBusyId(id);
    try {
      await fn();
      await fetchRows();
      t.ok(okMsg);
    } catch (err) {
      console.error('[NGD Admin] jewellery write failed:', err);
      t.error(err.message || 'That change could not be saved.');
    } finally {
      setBusyId(null);
    }
  }, [fetchRows, t]);

  const runBulk = useCallback(async (list, fn, verb) => {
    setWorking(true);
    let done = 0;
    const failed = [];
    for (const row of list) {
      try { await fn(row); done += 1; } catch (err) {
        console.error('[NGD Admin] bulk item failed:', row.id, err);
        failed.push(row.sku || row.public_id);
      }
    }
    await fetchRows();
    setWorking(false);
    setConfirm(null);
    if (failed.length) t.error(`${verb} ${done}, but ${failed.length} failed: ${failed.slice(0, 4).join(', ')}${failed.length > 4 ? '…' : ''}`);
    else t.ok(`${verb} ${done} ${done === 1 ? 'piece' : 'pieces'}.`);
  }, [fetchRows, t]);

  const exportCsv = useCallback(() => {
    const cols = ['sku', 'public_id', 'product_name', 'category', 'metal', 'size', 'diamond_weight',
      'price', 'currency', 'price_visible', 'availability', 'featured', 'active', 'archived_at', 'created_at'];
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csv = [cols.join(','), ...visible.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `ngd-jewellery-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    t.ok(`Exported ${visible.length} ${visible.length === 1 ? 'row' : 'rows'}.`);
  }, [visible, t]);

  const columns = useMemo(() => [
    {
      key: 'product_name',
      label: 'Piece',
      plain: (r) => r.product_name || r.sku || r.public_id,
      render: (r) => (
        <span>
          <b>{r.product_name || <span className={styles.blank}>Unnamed</span>}</b>
          <br />
          <span className={styles.blank}>{r.sku || r.public_id}</span>
          {dupeSku(r) && <span className={styles.dupe} title="This SKU is on more than one row">dup</span>}
        </span>
      ),
    },
    { key: 'category', label: 'Category' },
    { key: 'metal', label: 'Metal' },
    { key: 'size', label: 'Size', hiddenByDefault: true },
    {
      key: 'diamond_weight',
      label: 'Diamond wt',
      hiddenByDefault: true,
      sortValue: (r) => Number(r.diamond_weight) || 0,
    },
    {
      key: 'price',
      label: 'Price',
      sortValue: (r) => Number(r.price) || 0,
      /* Same rule as the stock table: the row decides whether its price may be
         shown, and `price_visible` is that decision. */
      render: (r) => (r.price_visible && r.price
        ? `${r.currency ?? ''} ${Number(r.price).toLocaleString()}`.trim()
        : <span className={styles.blank}>hidden</span>),
    },
    { key: 'availability', label: 'Availability' },
    {
      key: 'featured',
      label: 'Featured',
      sortValue: (r) => (r.featured ? 0 : 1),
      render: (r) => (r.featured
        ? <span className={styles.pill} data-tone="on">Featured</span>
        : <span className={styles.blank}>—</span>),
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
            <button
              type="button"
              className={styles.act}
              disabled={busyId === r.id || archived}
              title={r.active ? 'Hide from the storefront' : 'Show on the storefront'}
              onClick={() => run(r.id, () => adminSetJewelleryActive(r.id, !r.active, { previous: r, publicId: r.public_id, label: r.product_name }), r.active ? 'Hidden from the site.' : 'Live on the site.')}
            >
              {r.active ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
            <button
              type="button"
              className={styles.act}
              disabled={busyId === r.id || archived}
              title={r.featured ? 'Remove from featured' : 'Feature on the homepage'}
              onClick={() => run(r.id, () => adminSetJewelleryFeatured(r.id, !r.featured, { previous: r, publicId: r.public_id, label: r.product_name }), r.featured ? 'No longer featured.' : 'Featured.')}
            >
              <Star size={13} fill={r.featured ? 'currentColor' : 'none'} />
            </button>
            {archived ? (
              <button
                type="button"
                className={styles.act}
                disabled={busyId === r.id}
                title="Restore"
                onClick={() => run(r.id, () => adminArchiveJewellery(r.id, false, { previous: r, publicId: r.public_id, label: r.product_name }), 'Restored.')}
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
          </span>
        );
      },
    },
  ], [busyId, dupeSku, run]);

  const one = confirm?.kind === 'one' ? confirm.rows[0] : null;
  const nameOf = (r) => r?.sku || r?.public_id || r?.product_name;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre</p>
          <h1>Jewellery</h1>
          <p className={styles.sub}>
            {status === 'ready'
              ? `${visible.length} shown · ${rows.filter((r) => r.active && !r.archived_at).length} live on the site`
              : 'Loading pieces…'}
          </p>
        </div>
      </header>

      {/*
        Stated once, at the top, rather than as a disabled upload button.
        The table has no image column of any kind, so photography here needs a
        migration and a Storage bucket — and an admin should know that from the
        screen rather than by trying.
      */}
      <p className={styles.note}>
        This table carries no image column, so jewellery has no photography yet.
        Adding it needs a migration plus a Storage bucket — see Media Library.
        Everything else below is live and editable.
      </p>

      <DataTable
        rows={visible}
        columns={columns}
        status={status}
        error={error}
        onRetry={fetchRows}
        searchKeys={['product_name', 'sku', 'public_id', 'category', 'metal', 'availability', 'description']}
        searchPlaceholder="Search name, SKU, category, metal…"
        initialSort={{ key: 'created_at', dir: 'desc' }}
        selectable
        filters={view}
        empty="No jewellery yet."
        toolbar={(
          <>
            <div className={styles.tabs} role="group" aria-label="Which pieces to show">
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
              disabled={working}
              onClick={() => runBulk(sel.filter((r) => !r.archived_at && !r.active), (r) => adminSetJewelleryActive(r.id, true, { previous: r, publicId: r.public_id, label: r.product_name }), 'Published').then(clear)}
            >
              Publish
            </button>
            <button
              type="button"
              className={styles.toolBtn}
              disabled={working}
              onClick={() => runBulk(sel.filter((r) => !r.archived_at && r.active), (r) => adminSetJewelleryActive(r.id, false, { previous: r, publicId: r.public_id, label: r.product_name }), 'Hidden').then(clear)}
            >
              Unpublish
            </button>
            <button
              type="button"
              className={styles.toolBtnDanger}
              disabled={working}
              onClick={() => setConfirm({ kind: 'bulk', rows: sel.filter((r) => !r.archived_at), clear })}
            >
              Archive
            </button>
          </>
        )}
      />

      <ConfirmDialog
        open={Boolean(one)}
        title="Archive this piece?"
        confirmText={nameOf(one)}
        confirmLabel="Archive"
        busy={working}
        onCancel={() => setConfirm(null)}
        onConfirm={() => runBulk([one], (r) => adminArchiveJewellery(r.id, true, { previous: r, publicId: r.public_id, label: r.product_name }), 'Archived')}
        body={(
          <>
            <p><strong>{one?.product_name || nameOf(one)}</strong>{one?.category ? ` — ${one.category}` : ''}.</p>
            <ul>
              <li>It disappears from the storefront immediately.</li>
              <li>Nothing is deleted — quotes and enquiries that reference it stay intact.</li>
              <li>You can restore it from the Archived tab.</li>
            </ul>
          </>
        )}
      />

      <ConfirmDialog
        open={confirm?.kind === 'bulk'}
        title={`Archive ${confirm?.rows.length ?? 0} pieces?`}
        confirmText={String(confirm?.rows.length ?? '')}
        confirmLabel="Archive them"
        busy={working}
        onCancel={() => setConfirm(null)}
        onConfirm={() => runBulk(confirm.rows, (r) => adminArchiveJewellery(r.id, true, { previous: r, publicId: r.public_id, label: r.product_name }), 'Archived').then(() => confirm.clear?.())}
        body={(
          <>
            <p>
              These come off the storefront at once:{' '}
              <strong>{confirm?.rows.slice(0, 6).map(nameOf).join(', ')}</strong>
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
