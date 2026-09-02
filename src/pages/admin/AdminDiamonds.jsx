import { useCallback, useEffect, useState } from 'react';

import {
  adminArchiveDiamond,
  adminListDiamonds,
  adminSetActive,
} from '@/lib/supabase/queries/diamonds.js';
import { diamondImageUrl } from '@/lib/supabase/storage.js';
import { useAuth } from '@/hooks/useAuth.js';
import styles from './Admin.module.css';

/**
 * Inventory console.
 *
 * Shows every row, including the inactive and archived stock the storefront
 * can never see. "Remove" archives rather than deletes: enquiries reference
 * these rows, and the storefront policies already hide archived stone.
 */
export default function AdminDiamonds() {
  const { signOut } = useAuth();
  const [rows, setRows] = useState([]);
  const [stage, setStage] = useState('loading');
  const [busyId, setBusyId] = useState(null);

  const fetchRows = useCallback(async () => {
    try {
      setRows(await adminListDiamonds());
      setStage('ready');
    } catch (err) {
      console.error('[NGD Admin] list failed:', err);
      setStage('error');
    }
  }, []);

  // The first write in fetchRows happens after the database promise settles.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { fetchRows(); }, [fetchRows]);

  async function toggleActive(row) {
    setBusyId(row.id);
    try {
      await adminSetActive(row.id, !row.active);
      await fetchRows();
    } catch (err) {
      console.error('[NGD Admin] visibility change failed:', err);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleArchive(row) {
    setBusyId(row.id);
    try {
      await adminArchiveDiamond(row.id, !row.archived_at);
      await fetchRows();
    } catch (err) {
      console.error('[NGD Admin] archive failed:', err);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.head}>
        <div>
          <h1>Diamond inventory</h1>
          <p>
            {stage === 'ready'
              ? `${rows.length} ${rows.length === 1 ? 'stone' : 'stones'} · ${rows.filter((r) => r.active && !r.archived_at).length} live on the site`
              : 'Loading stock…'}
          </p>
        </div>
        <div className={styles.headActions}>
          <a className={styles.primary} href="/admin/diamonds/new">Add a diamond</a>
          <button type="button" className={styles.ghost} onClick={signOut}>Sign out</button>
        </div>
      </header>

      {stage === 'error' && (
        <p className={styles.error}>
          The stock list could not be loaded. Check the connection and try again.
        </p>
      )}

      {stage === 'ready' && rows.length === 0 && (
        <p className={styles.muted}>
          No stones yet. Use “Add a diamond” — it will appear on the site immediately.
        </p>
      )}

      {stage === 'ready' && rows.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Photo</th>
                <th scope="col">Stock</th>
                <th scope="col">Shape</th>
                <th scope="col">Carat</th>
                <th scope="col">Colour</th>
                <th scope="col">Clarity</th>
                <th scope="col">Lab</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const url = diamondImageUrl(row.image_path);
                const archived = Boolean(row.archived_at);
                return (
                  <tr key={row.id}>
                    <td>
                      {url
                        ? <img className={styles.thumb} src={url} alt="" loading="lazy" />
                        : <span className={styles.noThumb}>None</span>}
                    </td>
                    <td>{row.stock_number || row.public_id}</td>
                    <td>{row.shape || '—'}</td>
                    <td>{row.carat != null ? Number(row.carat).toFixed(2) : '—'}</td>
                    <td>{row.color || '—'}</td>
                    <td>{row.clarity || '—'}</td>
                    <td>{row.laboratory || '—'}</td>
                    <td>
                      <span
                        className={`${styles.pill} ${archived ? styles.archived : row.active ? styles.live : styles.hidden}`}
                      >
                        {archived ? 'Archived' : row.active ? 'Live' : 'Hidden'}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowActions}>
                        <a className={styles.mini} href={`/admin/diamonds/${row.id}/edit`}>Edit</a>
                        <button
                          type="button"
                          className={styles.mini}
                          disabled={busyId === row.id || archived}
                          onClick={() => toggleActive(row)}
                        >
                          {row.active ? 'Hide' : 'Show'}
                        </button>
                        <button
                          type="button"
                          className={styles.mini}
                          disabled={busyId === row.id}
                          onClick={() => toggleArchive(row)}
                        >
                          {archived ? 'Restore' : 'Archive'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
