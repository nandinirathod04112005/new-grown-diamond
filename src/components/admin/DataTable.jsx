import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Columns3, Search, X } from 'lucide-react';

import { ErrorState, Skeleton } from './AdminBits.jsx';
import styles from './DataTable.module.css';

/**
 * The table every list in this console is built from.
 *
 * Search, sort, pagination, column visibility and bulk selection all operate
 * on rows ALREADY IN MEMORY. That is a deliberate choice for this data rather
 * than a shortcut: the inventory is hundreds of rows, not millions, and one
 * narrow select of the whole set costs a single round trip where server-side
 * paging would cost one per keystroke, per sort and per page. The moment a
 * table here outgrows that, the honest fix is a count + range query, and the
 * seam for it is `rows` — nothing else in this component would change.
 *
 * Selection is keyed by row id rather than by index, so sorting or filtering
 * under a live selection cannot silently retarget it at different rows. That
 * matters here because the bulk actions include archiving.
 */
export default function DataTable({
  rows,
  columns,
  status = 'ready',
  error,
  onRetry,
  getId = (r) => r.id,
  searchKeys = [],
  searchPlaceholder = 'Search…',
  initialSort,
  pageSize = 25,
  selectable = false,
  bulkActions,
  toolbar,
  empty = 'Nothing here yet.',
  emptyFiltered = 'No rows match this search.',
  rowHref,
  filters,
}) {
  const uid = useId();
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [sort, setSort] = useState(initialSort ?? null);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(() => new Set());
  const [hidden, setHidden] = useState(() => new Set(columns.filter((c) => c.hiddenByDefault).map((c) => c.key)));
  const [colMenu, setColMenu] = useState(false);
  const colRef = useRef(null);

  /* Typing should not re-sort and re-page the table on every keystroke. */
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 180);
    return () => clearTimeout(t);
  }, [query]);

  /*
   * Return to page one when the search or an external filter changes.
   *
   * Adjusted during render against the last inputs we drew for. As an effect
   * this rendered page 5 of a result set that now has two pages — an empty
   * table for one frame — before correcting itself.
   */
  const [drawnFor, setDrawnFor] = useState({ q: debounced, f: filters });
  if (drawnFor.q !== debounced || drawnFor.f !== filters) {
    setDrawnFor({ q: debounced, f: filters });
    if (page !== 0) setPage(0);
  }

  useEffect(() => {
    if (!colMenu) return undefined;
    const away = (e) => { if (!colRef.current?.contains(e.target)) setColMenu(false); };
    window.addEventListener('pointerdown', away);
    return () => window.removeEventListener('pointerdown', away);
  }, [colMenu]);

  const shown = useMemo(() => columns.filter((c) => !hidden.has(c.key)), [columns, hidden]);

  const filtered = useMemo(() => {
    const q = debounced.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => searchKeys.some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
  }, [rows, debounced, searchKeys]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const col = columns.find((c) => c.key === sort.key);
    const get = col?.sortValue ?? ((r) => r[sort.key]);
    /* Copy before sorting: Array.prototype.sort mutates, and mutating the
       prop would reorder the caller's own state behind its back. */
    return [...filtered].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      if (x == null && y == null) return 0;
      // Blanks always sort last, whichever direction is active — a column of
      // empty cells at the top is never what anyone asked for.
      if (x == null) return 1;
      if (y == null) return -1;
      const cmp = typeof x === 'number' && typeof y === 'number'
        ? x - y
        : String(x).localeCompare(String(y), undefined, { numeric: true });
      return sort.dir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const view = sorted.slice(safePage * pageSize, safePage * pageSize + pageSize);

  const toggleSort = useCallback((key) => {
    setSort((s) => (s?.key === key
      ? (s.dir === 'asc' ? { key, dir: 'desc' } : null)
      : { key, dir: 'asc' }));
  }, []);

  const allOnPage = view.length > 0 && view.every((r) => selected.has(getId(r)));
  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      view.forEach((r) => (allOnPage ? next.delete(getId(r)) : next.add(getId(r))));
      return next;
    });
  };

  const selectedRows = useMemo(
    () => rows.filter((r) => selected.has(getId(r))),
    [rows, selected, getId],
  );

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  return (
    <div className={styles.wrap}>
      <div className={styles.tools}>
        <div className={styles.searchBox}>
          <Search size={14} aria-hidden="true" />
          <input
            className={styles.search}
            type="search"
            value={query}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button type="button" className={styles.clear} onClick={() => setQuery('')} aria-label="Clear the search">
              <X size={13} />
            </button>
          )}
        </div>

        {toolbar}

        <div className={styles.colWrap} ref={colRef}>
          <button
            type="button"
            className={styles.toolBtn}
            onClick={() => setColMenu((m) => !m)}
            aria-expanded={colMenu}
            aria-haspopup="true"
          >
            <Columns3 size={14} aria-hidden="true" /> Columns
          </button>
          {colMenu && (
            <div className={styles.colMenu}>
              {columns.map((c) => (
                <label key={c.key} className={styles.colItem}>
                  <input
                    type="checkbox"
                    checked={!hidden.has(c.key)}
                    /* The last visible column cannot be hidden: an empty table
                       gives no way back to the menu that emptied it. */
                    disabled={!hidden.has(c.key) && shown.length === 1}
                    onChange={() => setHidden((h) => {
                      const n = new Set(h);
                      if (n.has(c.key)) n.delete(c.key); else n.add(c.key);
                      return n;
                    })}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectable && selected.size > 0 && (
        <div className={styles.bulk} role="region" aria-label="Bulk actions">
          <span>{selected.size} selected</span>
          {bulkActions?.(selectedRows, clearSelection)}
          <button type="button" className={styles.toolBtn} onClick={clearSelection}>Clear</button>
        </div>
      )}

      {status === 'loading' && <Skeleton rows={6} />}
      {status === 'error' && <ErrorState message={error} onRetry={onRetry} />}

      {status === 'ready' && (
        <>
          <div className={styles.scroller}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {selectable && (
                    <th className={styles.pick} scope="col">
                      <input
                        type="checkbox"
                        checked={allOnPage}
                        onChange={togglePage}
                        aria-label={allOnPage ? 'Deselect this page' : 'Select this page'}
                      />
                    </th>
                  )}
                  {shown.map((c) => (
                    <th key={c.key} scope="col" style={c.width ? { width: c.width } : undefined}>
                      {c.sortable === false ? c.label : (
                        <button
                          type="button"
                          className={styles.sortBtn}
                          onClick={() => toggleSort(c.key)}
                          aria-label={`Sort by ${c.label}`}
                        >
                          {c.label}
                          {sort?.key === c.key && (sort.dir === 'asc'
                            ? <ArrowUp size={12} aria-hidden="true" />
                            : <ArrowDown size={12} aria-hidden="true" />)}
                        </button>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {view.map((r, i) => {
                  const id = getId(r);
                  const href = rowHref?.(r);
                  return (
                    <tr key={id} className={styles.row} style={{ '--i': i }} data-picked={selected.has(id) ? '' : undefined}>
                      {selectable && (
                        <td className={styles.pick}>
                          <input
                            type="checkbox"
                            checked={selected.has(id)}
                            onChange={() => setSelected((prev) => {
                              const n = new Set(prev);
                              if (n.has(id)) n.delete(id); else n.add(id);
                              return n;
                            })}
                            aria-label={`Select ${c0(r, columns)}`}
                          />
                        </td>
                      )}
                      {shown.map((c, ci) => (
                        <td key={c.key} data-label={c.label}>
                          {/* Only the first cell is the row link. A whole row
                              of links would make every cell a tab stop and
                              make text selection impossible. */}
                          {ci === 0 && href
                            ? <a className={styles.rowLink} href={href}>{c.render ? c.render(r) : r[c.key]}</a>
                            : (c.render ? c.render(r) : r[c.key] ?? <span className={styles.blank}>—</span>)}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {view.length === 0 && (
            <p className={styles.empty}>{debounced ? emptyFiltered : empty}</p>
          )}

          {sorted.length > pageSize && (
            <nav className={styles.pager} aria-label="Pagination">
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={safePage === 0}
              >
                <ChevronLeft size={14} aria-hidden="true" /> Previous
              </button>
              <span aria-live="polite" id={`${uid}-count`}>
                {safePage * pageSize + 1}–{Math.min(sorted.length, (safePage + 1) * pageSize)} of {sorted.length}
              </span>
              <button
                type="button"
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
                disabled={safePage >= pages - 1}
              >
                Next <ChevronRight size={14} aria-hidden="true" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

/** A readable name for a row, for the select-one checkbox label. */
function c0(row, columns) {
  const first = columns[0];
  const v = first?.plain ? first.plain(row) : row[first?.key];
  return String(v ?? 'this row');
}
