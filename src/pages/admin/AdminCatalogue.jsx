import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  ArrowDown, ArrowLeft, ArrowUp, ChevronRight, Eye, EyeOff, Gem, GitMerge, ImageIcon, ImageOff,
  Layers, PenLine, Plus, Sparkles, Trash2, TriangleAlert, Upload, X,
} from 'lucide-react';

import { ConfirmDialog, Toasts } from '@/components/admin/AdminFeedback.jsx';
import { ErrorState, SetupRequired, Skeleton } from '@/components/admin/AdminBits.jsx';
import { useToasts, useUnsavedGuard } from '@/hooks/useAdminFeedback.js';
import {
  CATEGORY_MAX,
  COLLECTION_LIMITS,
  adminCreateCollection,
  adminDeleteCollection,
  adminListCollections,
  adminListPieces,
  adminRenameCategory,
  adminReorderCollections,
  adminResolveMembers,
  adminSearchMembers,
  adminSetCollectionPublished,
  adminUpdateCollection,
  cleanCategory,
  coverOf,
  describeMember,
  groupCategories,
  membersOf,
  pieceState,
  slugify,
  validateCollection,
} from '@/lib/supabase/queries/adminCatalogue.js';
import { BUCKETS, listBucket, listMediaMeta, recordMediaUpload, uploadWithProgress } from '@/lib/supabase/queries/adminMedia.js';
import { BLOG_BUCKET } from '@/lib/supabase/storage.js';
import base from './AdminDiamonds.module.css';
import styles from './AdminCatalogue.module.css';

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const STATE_PILL = { live: ['Live', 'on'], hidden: ['Hidden', 'hidden'], archived: ['Archived', 'off'] };
const COVER_TYPES = /^image\/(jpeg|png|webp|avif)$/;
const COVER_MAX = 5 * 1024 * 1024;
const OFFLINE = 'This deployment is not connected to its database.';

const keyOf = (c) => (c.value === null ? 'none' : `c:${c.value}`);

function StatePill({ state }) {
  const [label, tone] = STATE_PILL[state] ?? STATE_PILL.hidden;
  return <span className={base.pill} data-tone={tone}>{label}</span>;
}

/** The photograph, or the module's own icon, at the start of a member row. */
function MemberThumb({ type, info }) {
  if (info.status === 'removed') {
    return <span className={styles.thumb} data-tone="bad"><ImageOff size={14} aria-hidden="true" /></span>;
  }
  if (info.imageUrl) {
    return <span className={styles.thumb}><img src={info.imageUrl} alt="" loading="lazy" decoding="async" /></span>;
  }
  const Icon = type === 'diamond' ? Gem : Sparkles;
  return <span className={styles.thumb}><Icon size={14} aria-hidden="true" /></span>;
}

/**
 * Focus in on open, Escape to close, focus back to the opener on close — the
 * same contract as the console's ConfirmDialog, for this page's own dialog.
 */
function useDialog(ref, onClose, locked) {
  const close = useRef(onClose);
  const lock = useRef(locked);
  useEffect(() => {
    close.current = onClose;
    lock.current = locked;
  });
  useEffect(() => {
    const opener = document.activeElement;
    const timer = setTimeout(() => {
      const root = ref.current;
      (root?.querySelector('[data-autofocus]') ?? root?.querySelector('input, textarea, button'))?.focus();
    }, 30);
    const onKey = (e) => { if (e.key === 'Escape' && !lock.current) close.current?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [ref]);
}

/**
 * Categories & Collections, on tables that already exist.
 *
 * CATEGORIES are read from jewellery.category — the free-text field on each
 * piece — so the list is always exactly what the records say. Rename and
 * merge rewrite that field on every matching piece in one statement, behind a
 * confirmation that states how many rows move.
 *
 * COLLECTIONS are site_content rows under page = 'collections' (see
 * queries/adminCatalogue.js for the row shape). A member that has since been
 * deleted is shown as a "removed item" rather than breaking the list, and a
 * member whose table could not be read is shown as unchecked rather than as
 * removed — the two call for opposite responses.
 *
 * Nothing on this screen changes the schema, and nothing on the storefront
 * reads collections yet; the note on that tab says so.
 */
export default function AdminCatalogue() {
  const [tab, setTab] = useState(() => (
    typeof window !== 'undefined' && window.location.hash === '#collections' ? 'collections' : 'categories'
  ));
  const [pieces, setPieces] = useState({ status: 'loading', rows: [], error: null, missing: false });
  const [cols, setCols] = useState({ status: 'loading', rows: [], error: null, missing: false });
  const [known, setKnown] = useState({ diamond: new Map(), jewellery: new Map() });
  const t = useToasts();

  const loadPieces = useCallback(async () => {
    try {
      const r = await adminListPieces();
      if (r.unconfigured) throw new Error(OFFLINE);
      setPieces({ status: 'ready', rows: r.pieces, error: null, missing: r.missing });
    } catch (err) {
      console.error('[NGD Admin] categories failed:', err);
      setPieces({ status: 'error', rows: [], error: err.message || 'Jewellery could not be loaded.', missing: false });
    }
  }, []);

  const loadCollections = useCallback(async () => {
    try {
      const r = await adminListCollections();
      if (r.unconfigured) throw new Error(OFFLINE);
      const resolved = await adminResolveMembers(r.collections.flatMap(membersOf));
      setKnown(resolved);
      setCols({ status: 'ready', rows: r.collections, error: null, missing: r.missing });
    } catch (err) {
      console.error('[NGD Admin] collections failed:', err);
      setCols({ status: 'error', rows: [], error: err.message || 'Collections could not be loaded.', missing: false });
    }
  }, []);

  // The first writes happen after the database promises settle.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { loadPieces(); loadCollections(); }, [loadPieces, loadCollections]);

  const grouped = useMemo(() => groupCategories(pieces.rows), [pieces.rows]);

  const summary = [
    pieces.status === 'ready' && !pieces.missing
      ? `${plural(grouped.categories.length, 'category', 'categories')} across ${plural(pieces.rows.length, 'piece')}`
      : null,
    cols.status === 'ready' && !cols.missing
      ? `${plural(cols.rows.length, 'collection')} · ${cols.rows.filter((r) => r.published).length} published`
      : null,
  ].filter(Boolean).join(' · ') || (pieces.status === 'loading' || cols.status === 'loading' ? 'Loading…' : '');

  return (
    <div className={base.page}>
      <header className={base.head}>
        <div>
          <p className={base.eyebrow}>Control Centre</p>
          <h1>Categories &amp; Collections</h1>
          {summary ? <p className={base.sub}>{summary}</p> : null}
        </div>
      </header>

      <div className={`${base.tabs} ${styles.switch}`} role="group" aria-label="Which to manage">
        {[['categories', 'Categories'], ['collections', 'Collections']].map(([k, label]) => (
          <button
            key={k}
            type="button"
            className={base.tab}
            data-on={tab === k ? '' : undefined}
            aria-pressed={tab === k}
            onClick={() => setTab(k)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Both stay mounted, so switching tabs never throws away a collection
          that is half edited. */}
      <div hidden={tab !== 'categories'}>
        <CategoriesPanel state={pieces} grouped={grouped} reload={loadPieces} t={t} />
      </div>
      <div hidden={tab !== 'collections'}>
        <CollectionsPanel state={cols} known={known} reload={loadCollections} t={t} />
      </div>

      <Toasts toasts={t.toasts} dismiss={t.dismiss} />
    </div>
  );
}

/* ============================== categories ============================== */

function CategoriesPanel({ state, grouped, reload, t }) {
  const uid = useId();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('count');
  const [open, setOpen] = useState(() => new Set());
  const [edit, setEdit] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = grouped.categories.filter((c) => !q || c.label.toLowerCase().includes(q));
    return sort === 'name' ? rows : [...rows].sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  }, [grouped, query, sort]);

  const toggle = (k) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(k)) next.delete(k); else next.add(k);
    return next;
  });

  /* A typed name that is exactly an existing category is a merge, and is
     confirmed as one. A name that differs from one only in capitals is
     refused, because creating "ring" beside "Ring" is how the duplicates
     this screen flags come about in the first place. */
  const reviewRename = (c) => {
    const next = cleanCategory(edit.text);
    let error = null;
    if (!next) error = 'Type the new name.';
    else if (next.length > CATEGORY_MAX) error = `Keep it under ${CATEGORY_MAX} characters.`;
    else if (next === c.value) error = 'That is already its name.';
    if (error) { setEdit((e) => ({ ...e, error })); return; }

    const same = grouped.categories.find((o) => o !== c && o.label === next);
    if (same) { setConfirm({ from: c, to: same.value, toLabel: same.label, merge: true, target: same }); return; }
    const near = grouped.categories.find((o) => o !== c && o.label.toLowerCase() === next.toLowerCase());
    if (near) {
      setEdit((e) => ({ ...e, error: `“${near.label}” already exists. Type it exactly like that to merge into it, or choose another name.` }));
      return;
    }
    setConfirm({ from: c, to: next, toLabel: next, merge: false, target: null });
  };

  const reviewMerge = (c) => {
    const target = grouped.categories.find((o) => keyOf(o) === edit.target);
    if (!target) { setEdit((e) => ({ ...e, error: 'Choose the category to merge into.' })); return; }
    setConfirm({ from: c, to: target.value, toLabel: target.label, merge: true, target });
  };

  const apply = async () => {
    if (!confirm) return;
    const { from, to, toLabel, merge } = confirm;
    setBusy(true);
    try {
      const { changed } = await adminRenameCategory(from.value, to, { merge });
      setConfirm(null);
      setEdit(null);
      await reload();
      if (!changed) {
        t.error('No pieces were changed. The category may have been renamed in another tab, or this account may not edit jewellery. The list has been reloaded.');
      } else {
        const drift = changed !== from.total ? ` ${from.total} were listed; the records changed since this page loaded.` : '';
        t.ok(`${merge ? 'Merged' : 'Renamed'}: ${plural(changed, 'piece')} now in “${toLabel}”.${drift}`);
      }
    } catch (err) {
      console.error('[NGD Admin] category change failed:', err);
      t.error(err.message || 'The category could not be changed.');
    } finally {
      setBusy(false);
    }
  };

  if (state.status === 'loading') return <Skeleton rows={6} />;
  if (state.status === 'error') return <ErrorState message={state.error} onRetry={reload} />;
  if (state.missing) {
    return (
      <SetupRequired
        module={{
          label: 'Categories',
          state: 'setup',
          missing: ['jewellery'],
          note: 'Categories are read from jewellery.category, and the jewellery table (or that column) is not on this project.',
        }}
      />
    );
  }

  const renderRow = (c, i) => {
    const k = keyOf(c);
    const isOpen = open.has(k);
    const none = c.value === null;
    const listId = `${uid}-pieces-${i}`;
    const editing = edit?.key === k ? edit : null;

    return (
      <li key={k} className={styles.cat}>
        <div className={styles.catHead}>
          <button
            type="button"
            className={styles.catName}
            aria-expanded={isOpen}
            aria-controls={isOpen ? listId : undefined}
            onClick={() => toggle(k)}
          >
            <ChevronRight size={14} className={styles.chev} aria-hidden="true" />
            <span className={none ? styles.muted : undefined}>{c.label}</span>
          </button>
          {c.similar.length > 0 && (
            <span className={styles.flag} title="Differs only in capitals or spacing. A merge is usually what is wanted.">
              Similar to “{c.similar[0]}”{c.similar.length > 1 ? ` +${c.similar.length - 1}` : ''}
            </span>
          )}
          {c.untidy && (
            <span className={styles.flag} title="The stored value has extra spaces. Renaming it tidies them.">Extra spaces</span>
          )}
        </div>

        <p className={styles.counts}>
          <span><b>{c.total}</b> {c.total === 1 ? 'piece' : 'pieces'}</span>
          <span><b>{c.live}</b> live</span>
          {c.hidden > 0 && <span>{c.hidden} hidden</span>}
          {c.archived > 0 && <span>{c.archived} archived</span>}
        </p>

        {none ? (
          <span className={styles.noteSmall}>No category on these pieces. Not renamed or merged from here.</span>
        ) : (
          <span className={styles.catActions}>
            <button
              type="button"
              className={base.toolBtn}
              disabled={busy}
              onClick={() => setEdit({ key: k, mode: 'rename', text: c.label, error: null })}
            >
              <PenLine size={13} aria-hidden="true" /> Rename
            </button>
            <button
              type="button"
              className={base.toolBtn}
              disabled={busy || grouped.categories.length < 2}
              onClick={() => setEdit({ key: k, mode: 'merge', target: '', error: null })}
            >
              <GitMerge size={13} aria-hidden="true" /> Merge
            </button>
          </span>
        )}

        {editing?.mode === 'rename' && (
          <form className={styles.inline} onSubmit={(e) => { e.preventDefault(); reviewRename(c); }}>
            <label className={styles.inlineField}>
              <span>New name for “{c.label}”</span>
              <input
                value={editing.text}
                maxLength={CATEGORY_MAX}
                autoFocus
                aria-invalid={editing.error ? 'true' : undefined}
                onChange={(e) => setEdit({ ...editing, text: e.target.value, error: null })}
              />
            </label>
            <span className={styles.inlineActions}>
              <button type="submit" className={styles.save}>Review</button>
              <button type="button" className={styles.ghostBtn} onClick={() => setEdit(null)}>Cancel</button>
            </span>
            {editing.error && <p className={styles.fieldError} role="alert">{editing.error}</p>}
          </form>
        )}

        {editing?.mode === 'merge' && (
          <form className={styles.inline} onSubmit={(e) => { e.preventDefault(); reviewMerge(c); }}>
            <label className={styles.inlineField}>
              <span>Merge “{c.label}” into</span>
              <select
                value={editing.target}
                autoFocus
                aria-invalid={editing.error ? 'true' : undefined}
                onChange={(e) => setEdit({ ...editing, target: e.target.value, error: null })}
              >
                <option value="">Choose a category…</option>
                {grouped.categories.filter((o) => o !== c).map((o) => (
                  <option key={keyOf(o)} value={keyOf(o)}>
                    {o.label}{o.untidy ? ' (extra spaces)' : ''} — {plural(o.total, 'piece')}
                  </option>
                ))}
              </select>
            </label>
            <span className={styles.inlineActions}>
              <button type="submit" className={styles.save}>Review</button>
              <button type="button" className={styles.ghostBtn} onClick={() => setEdit(null)}>Cancel</button>
            </span>
            {editing.error && <p className={styles.fieldError} role="alert">{editing.error}</p>}
          </form>
        )}

        {isOpen && (
          <ul id={listId} className={styles.pieces} aria-label={`Pieces in ${c.label}`}>
            {c.pieces.map((p) => (
              <li key={p.id}>
                <span className={styles.pieceText}>
                  <b>{p.product_name || <span className={base.blank}>Unnamed</span>}</b>
                  <small>{[p.sku || p.public_id, p.metal].filter(Boolean).join(' · ')}</small>
                </span>
                <StatePill state={pieceState(p)} />
              </li>
            ))}
          </ul>
        )}
      </li>
    );
  };

  return (
    <div className={styles.stack}>
      <p className={styles.lead}>
        Categories come from the jewellery records themselves — the category typed on each piece — so
        renaming one here rewrites it on every matching piece.
      </p>

      <div className={styles.tools}>
        <input
          className={styles.search}
          type="search"
          value={query}
          placeholder="Filter categories…"
          aria-label="Filter categories"
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={base.tabs} role="group" aria-label="Sort categories">
          {[['count', 'Most pieces'], ['name', 'A–Z']].map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={base.tab}
              data-on={sort === k ? '' : undefined}
              aria-pressed={sort === k}
              onClick={() => setSort(k)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {grouped.categories.length === 0 ? (
        <p className={styles.empty}>No jewellery piece has a category yet.</p>
      ) : list.length === 0 ? (
        <p className={styles.empty}>No category matches “{query.trim()}”.</p>
      ) : (
        <ul className={styles.cats}>{list.map(renderRow)}</ul>
      )}

      {grouped.uncategorised && !query.trim() && (
        <ul className={styles.cats}>{renderRow(grouped.uncategorised, list.length)}</ul>
      )}

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm
          ? (confirm.merge
            ? `Merge “${confirm.from.label}” into “${confirm.toLabel}”?`
            : `Rename “${confirm.from.label}” to “${confirm.toLabel}”?`)
          : ''}
        confirmText={confirm?.merge ? confirm.from.label : undefined}
        confirmLabel={confirm?.merge ? 'Merge' : 'Rename'}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={apply}
        body={confirm ? (
          <>
            <p>
              <strong>{plural(confirm.from.total, 'jewellery record')}</strong> will change category
              {' '}— {confirm.from.live} live, {confirm.from.hidden} hidden, {confirm.from.archived} archived.
            </p>
            <ul>
              <li>Every piece whose category is exactly “{confirm.from.label}” changes in one step, archived pieces included.</li>
              {confirm.merge ? (
                <li>
                  “{confirm.toLabel}” already has {plural(confirm.target.total, 'piece')}. Afterwards the two groups cannot
                  be told apart, so a merge cannot be undone from here.
                </li>
              ) : (
                <li>Nothing else about the pieces changes, and you can rename it back the same way.</li>
              )}
              <li>Anywhere the console shows these pieces&apos; category, the new name appears.</li>
            </ul>
          </>
        ) : null}
      />
    </div>
  );
}

/* ============================== collections ============================== */

function CollectionsPanel({ state, known, reload, t }) {
  const [editing, setEditing] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [doomed, setDoomed] = useState(null);
  const [working, setWorking] = useState(false);
  const rows = state.rows;

  const move = async (index, delta) => {
    const to = index + delta;
    if (to < 0 || to >= rows.length) return;
    const ordered = [...rows];
    const [moved] = ordered.splice(index, 1);
    ordered.splice(to, 0, moved);
    setBusyId(moved.id);
    try {
      await adminReorderCollections(ordered, moved);
      await reload();
    } catch (err) {
      console.error('[NGD Admin] collection reorder failed:', err);
      t.error(err.message || 'The new order could not be saved.');
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  const togglePublish = async (r) => {
    const next = !r.published;
    const name = r.heading || r.section;
    if (next && membersOf(r).length === 0) {
      t.error(`Add at least one piece to “${name}” before publishing it.`);
      return;
    }
    if (next && r.image_path && !String(r.image_alt ?? '').trim()) {
      t.error(`Give the cover of “${name}” alt text before publishing it. Open the collection to add it.`);
      return;
    }
    setBusyId(r.id);
    try {
      await adminSetCollectionPublished(r, next);
      await reload();
      t.ok(next ? `“${name}” is published.` : `“${name}” is back to a draft.`);
    } catch (err) {
      console.error('[NGD Admin] collection publish failed:', err);
      t.error(err.message || 'That change could not be saved.');
      await reload();
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    setWorking(true);
    try {
      await adminDeleteCollection(doomed);
      setDoomed(null);
      await reload();
      t.ok('Collection deleted.');
    } catch (err) {
      console.error('[NGD Admin] collection delete failed:', err);
      t.error(err.message || 'The collection could not be deleted.');
    } finally {
      setWorking(false);
    }
  };

  /* The editor is checked before the load states: a failed background reload
     after a save must not unmount a form someone is still working in. */
  if (editing) {
    return (
      <CollectionEditor
        key={editing.key}
        initial={editing.row}
        collections={rows}
        known={known}
        onClose={() => setEditing(null)}
        onSaved={reload}
        t={t}
      />
    );
  }

  if (state.status === 'loading') return <Skeleton rows={4} />;
  if (state.status === 'error') return <ErrorState message={state.error} onRetry={reload} />;
  if (state.missing) {
    return (
      <SetupRequired
        module={{
          label: 'Collections',
          state: 'setup',
          missing: ['site_content'],
          note: 'Collections are stored as site_content rows (page = collections), and that table is not on this project.',
        }}
      />
    );
  }

  const busy = busyId !== null;

  return (
    <div className={styles.stack}>
      <p className={base.note}>
        Collections are saved as website content (page “collections”). The storefront does not show
        them yet, so publishing one marks it ready for when it does.
      </p>

      <div className={styles.tools}>
        <button type="button" className={styles.newBtn} onClick={() => setEditing({ key: `new-${Date.now()}`, row: null })}>
          <Plus size={14} aria-hidden="true" /> New collection
        </button>
        {rows.length > 1 && <span className={styles.hint}>The order here is the order a page would show them in.</span>}
      </div>

      {rows.length === 0 ? (
        <p className={styles.empty}>
          No collections yet. A collection is a hand-picked, ordered set of diamonds and jewellery — a bridal edit, say.
        </p>
      ) : (
        <ol className={styles.colList}>
          {rows.map((r, i) => {
            const members = membersOf(r);
            const infos = members.map((m) => describeMember(m, known));
            const removed = infos.filter((x) => x.status === 'removed').length;
            const unknown = infos.filter((x) => x.status === 'unknown').length;
            const notLive = infos.filter((x) => x.status === 'ok' && x.state !== 'live').length;
            const cover = coverOf(r);
            const name = r.heading || r.section;
            return (
              <li key={r.id} className={styles.colRow}>
                <span className={styles.colCover}>
                  {cover?.url
                    ? <img src={cover.url} alt="" loading="lazy" decoding="async" />
                    : <Layers size={18} aria-hidden="true" />}
                </span>
                <span className={styles.colMain}>
                  <b>{name}</b>
                  <span className={styles.slug}>{r.section}</span>
                  <span className={styles.colMeta}>
                    {plural(members.length, 'piece')}
                    {notLive > 0 && ` · ${notLive} not live`}
                    {removed > 0 && <span className={styles.warnText}> · {removed} removed</span>}
                    {unknown > 0 && <span className={styles.warnText}> · {unknown} unchecked</span>}
                  </span>
                </span>
                <span className={base.pill} data-tone={r.published ? 'on' : 'hidden'}>
                  {r.published ? 'Published' : 'Draft'}
                </span>
                <span className={`${base.rowActions} ${styles.colActions}`}>
                  <button
                    type="button"
                    className={`${base.act} ${styles.touch}`}
                    title="Move up"
                    aria-label={`Move ${name} up`}
                    disabled={busy || i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    type="button"
                    className={`${base.act} ${styles.touch}`}
                    title="Move down"
                    aria-label={`Move ${name} down`}
                    disabled={busy || i === rows.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    type="button"
                    className={`${base.act} ${styles.touch}`}
                    title="Edit"
                    aria-label={`Edit ${name}`}
                    disabled={busy}
                    onClick={() => setEditing({ key: r.id, row: r })}
                  >
                    <PenLine size={13} />
                  </button>
                  <button
                    type="button"
                    className={`${base.act} ${styles.touch}`}
                    title={r.published ? 'Unpublish (back to draft)' : 'Publish'}
                    aria-label={r.published ? `Unpublish ${name}` : `Publish ${name}`}
                    disabled={busy}
                    onClick={() => togglePublish(r)}
                  >
                    {r.published ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                  <button
                    type="button"
                    className={`${base.act} ${styles.touch}`}
                    data-danger=""
                    title="Delete"
                    aria-label={`Delete ${name}`}
                    disabled={busy}
                    onClick={() => setDoomed(r)}
                  >
                    <Trash2 size={13} />
                  </button>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <ConfirmDialog
        open={Boolean(doomed)}
        title="Delete this collection?"
        confirmText={doomed?.section}
        confirmLabel="Delete"
        busy={working}
        onCancel={() => setDoomed(null)}
        onConfirm={confirmDelete}
        body={(
          <>
            <p><strong>{doomed?.heading || doomed?.section}</strong> — {plural(membersOf(doomed).length, 'piece')}.</p>
            <ul>
              <li>The collection is removed{doomed?.published ? ' — it is published now' : ''}. This cannot be undone.</li>
              <li>The diamonds and jewellery in it are not touched.</li>
              <li>Its cover image stays in the Media Library until you remove it there.</li>
            </ul>
          </>
        )}
      />
    </div>
  );
}

/** The editable shape of a collection row. */
function formOf(row) {
  const cover = coverOf(row);
  return {
    name: row?.heading ?? '',
    slug: row?.section ?? '',
    description: row?.body ?? '',
    cover: cover ? { bucket: cover.bucket, path: cover.path } : null,
    coverAlt: row?.image_alt ?? '',
    published: Boolean(row?.published),
    items: membersOf(row),
  };
}

function CollectionEditor({ initial, collections, known, onClose, onSaved, t }) {
  const uid = useId();
  const [original, setOriginal] = useState(initial);
  const [form, setForm] = useState(() => formOf(initial));
  const [slugTouched, setSlugTouched] = useState(Boolean(initial));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [leaving, setLeaving] = useState(false);
  /* Rows picked from search this session, so a new member renders at once
     rather than as "unchecked" until the next reload. */
  const [added, setAdded] = useState(() => ({ diamond: new Map(), jewellery: new Map() }));

  const baseline = useMemo(() => JSON.stringify(formOf(original)), [original]);
  const dirty = JSON.stringify(form) !== baseline;
  useUnsavedGuard(dirty);

  const describe = (m) => {
    const row = added[m.type].get(m.id);
    return row ? describeMember(m, { [m.type]: new Map([[m.id, row]]) }) : describeMember(m, known);
  };
  const infos = form.items.map(describe);
  const removedCount = infos.filter((x) => x.status === 'removed').length;

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => {
      const next = { ...f, [key]: value };
      /* The address follows the name until it is edited by hand, and never
         moves on its own once the collection exists. */
      if (key === 'name' && !slugTouched) next.slug = slugify(value);
      return next;
    });
  };

  const moveItem = (i, d) => setForm((f) => {
    const j = i + d;
    if (j < 0 || j >= f.items.length) return f;
    const items = [...f.items];
    [items[i], items[j]] = [items[j], items[i]];
    return { ...f, items };
  });

  const removeItem = (i) => setForm((f) => ({ ...f, items: f.items.filter((_, k) => k !== i) }));

  const addItem = (type, row) => {
    setAdded((a) => ({ ...a, [type]: new Map(a[type]).set(row.id, row) }));
    setForm((f) => (
      f.items.length >= COLLECTION_LIMITS.members || f.items.some((m) => m.type === type && m.id === row.id)
        ? f
        : { ...f, items: [...f.items, { type, id: row.id }] }
    ));
  };

  const pruneRemoved = () => {
    const gone = new Set(form.items.filter((m) => describe(m).status === 'removed').map((m) => `${m.type}:${m.id}`));
    setForm((f) => ({ ...f, items: f.items.filter((m) => !gone.has(`${m.type}:${m.id}`)) }));
  };

  const pickCover = (c) => {
    /* A new picture needs its own description, so the old alt text goes; the
       library's alt text for the new image is brought in when it has one. */
    setForm((f) => ({ ...f, cover: { bucket: c.bucket, path: c.path }, coverAlt: c.alt || '' }));
    setPicking(false);
  };

  const leave = () => (dirty ? setLeaving(true) : onClose());

  const onSubmit = async (event) => {
    event.preventDefault();
    const others = collections.filter((c) => c.id !== original?.id);
    const found = validateCollection(form, others);
    setErrors(found);
    if (Object.keys(found).length) {
      setMessage({ tone: 'bad', text: 'Some fields need attention before this can be saved.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const position = collections.reduce((max, c) => Math.max(max, Number(c.position) || 0), -1) + 1;
      const row = original ? await adminUpdateCollection(original, form) : await adminCreateCollection(form, position);
      setOriginal(row);
      setForm(formOf(row));
      setSlugTouched(true);
      setLeaving(false);
      setMessage({
        tone: 'ok',
        text: row.published
          ? 'Saved. It is published, ready for when the storefront shows collections.'
          : 'Saved as a draft.',
      });
      t.ok(original ? 'Collection saved.' : 'Collection created.');
      onSaved?.();
    } catch (err) {
      console.error('[NGD Admin] collection save failed:', err);
      setMessage({ tone: 'bad', text: err.message || 'The collection could not be saved.' });
    } finally {
      setSaving(false);
    }
  };

  const coverUrl = form.cover
    ? coverOf({ image_path: form.cover.path, draft: { cover_bucket: form.cover.bucket } })?.url ?? ''
    : '';
  const fieldProps = (key) => ({ 'aria-invalid': errors[key] ? 'true' : undefined });

  return (
    <div className={styles.stack}>
      <div className={styles.editorTop}>
        <button type="button" className={styles.ghostBtn} onClick={leave} disabled={saving}>
          <ArrowLeft size={13} aria-hidden="true" /> All collections
        </button>
        <h2 className={styles.editorTitle}>{original ? (original.heading || original.section) : 'New collection'}</h2>
        {original && (
          <span className={base.pill} data-tone={original.published ? 'on' : 'hidden'}>
            {original.published ? 'Published' : 'Draft'}
          </span>
        )}
      </div>

      {leaving && (
        <div className={styles.leaveBar} role="alert">
          <TriangleAlert size={14} aria-hidden="true" />
          <p>This collection has changes that are not saved.</p>
          <span className={styles.inlineActions}>
            <button type="button" className={styles.dangerBtn} onClick={onClose}>Discard and leave</button>
            <button type="button" className={styles.ghostBtn} onClick={() => setLeaving(false)}>Keep editing</button>
          </span>
        </div>
      )}

      <form className={styles.editor} onSubmit={onSubmit} noValidate>
        <div className={styles.col}>
          {message && (
            <p className={message.tone === 'ok' ? styles.msgOk : styles.msgBad} role={message.tone === 'ok' ? 'status' : 'alert'}>
              {message.text}
            </p>
          )}

          <section className={styles.box} data-slot="details" aria-labelledby={`${uid}-details`}>
            <h3 id={`${uid}-details`}>Details</h3>
            <label className={styles.field}>
              <span>Name</span>
              <input value={form.name} onChange={set('name')} maxLength={COLLECTION_LIMITS.name} {...fieldProps('name')} />
              {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
            </label>

            <label className={styles.field}>
              <span>Address</span>
              <span className={styles.slugRow}>
                <span aria-hidden="true">collections/</span>
                <input
                  value={form.slug}
                  onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() })); }}
                  maxLength={COLLECTION_LIMITS.slug}
                  spellCheck="false"
                  autoCapitalize="none"
                  {...fieldProps('slug')}
                />
              </span>
              {errors.slug
                ? <span className={styles.fieldError}>{errors.slug}</span>
                : (
                  <span className={styles.hint}>
                    Lower-case letters, numbers and hyphens.{' '}
                    {original?.published ? 'Changing it would break any link already pointing at this collection.' : 'Follows the name until you edit it.'}
                  </span>
                )}
            </label>

            <label className={styles.field}>
              <span>Short description <em>{form.description.length}/{COLLECTION_LIMITS.description}</em></span>
              <textarea
                rows={3}
                value={form.description}
                onChange={set('description')}
                maxLength={COLLECTION_LIMITS.description}
                {...fieldProps('description')}
              />
              {errors.description
                ? <span className={styles.fieldError}>{errors.description}</span>
                : <span className={styles.hint}>One or two sentences, plain text.</span>}
            </label>
          </section>

          <section className={styles.box} data-slot="pieces" aria-labelledby={`${uid}-pieces`}>
            <div className={styles.boxHead}>
              <h3 id={`${uid}-pieces`}>Pieces <em>{form.items.length}</em></h3>
              {removedCount > 0 && (
                <button type="button" className={styles.ghostBtn} onClick={pruneRemoved}>
                  Remove {plural(removedCount, 'removed item')}
                </button>
              )}
            </div>
            {errors.items && <p className={styles.fieldError} role="alert">{errors.items}</p>}

            {form.items.length === 0 ? (
              <p className={styles.hint}>
                No pieces yet. Search below to add diamonds and jewellery; the order in this list is the order
                they would be shown in.
              </p>
            ) : (
              <ol className={styles.members}>
                {form.items.map((m, i) => {
                  const info = infos[i];
                  return (
                    <li key={`${m.type}:${m.id}`} className={styles.member} data-status={info.status}>
                      <span className={styles.pos} aria-hidden="true">{i + 1}</span>
                      <MemberThumb type={m.type} info={info} />
                      <span className={styles.memberText}>
                        <b>{info.title}</b>
                        <small>{info.detail}</small>
                      </span>
                      <span className={styles.memberEnd}>
                        {info.status === 'ok'
                          ? <StatePill state={info.state} />
                          : <span className={styles.flag}>{info.status === 'removed' ? 'Removed' : 'Unchecked'}</span>}
                        <span className={base.rowActions}>
                          <button
                            type="button"
                            className={`${base.act} ${styles.touch}`}
                            title="Move up"
                            aria-label={`Move ${info.title} up`}
                            disabled={i === 0}
                            onClick={() => moveItem(i, -1)}
                          >
                            <ArrowUp size={13} />
                          </button>
                          <button
                            type="button"
                            className={`${base.act} ${styles.touch}`}
                            title="Move down"
                            aria-label={`Move ${info.title} down`}
                            disabled={i === form.items.length - 1}
                            onClick={() => moveItem(i, 1)}
                          >
                            <ArrowDown size={13} />
                          </button>
                          <button
                            type="button"
                            className={`${base.act} ${styles.touch}`}
                            data-danger=""
                            title="Remove from this collection"
                            aria-label={`Remove ${info.title} from this collection`}
                            onClick={() => removeItem(i)}
                          >
                            <X size={13} />
                          </button>
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            <MemberAdder chosen={form.items} full={form.items.length >= COLLECTION_LIMITS.members} onAdd={addItem} />
          </section>
        </div>

        <div className={styles.col}>
          <section className={styles.box} data-slot="publish" aria-labelledby={`${uid}-publish`}>
            <h3 id={`${uid}-publish`}>Publishing</h3>
            <label className={styles.check}>
              <input type="checkbox" checked={form.published} onChange={set('published')} />
              Published
            </label>
            <span className={styles.hint}>
              A published collection can be read by the public site. No page shows collections yet.
            </span>
            <div className={styles.actions}>
              <button type="submit" className={styles.save} disabled={saving || (Boolean(original) && !dirty)}>
                {saving ? 'Saving…' : original ? 'Save changes' : 'Create collection'}
              </button>
              <button type="button" className={styles.ghostBtn} onClick={leave} disabled={saving}>
                {dirty ? 'Cancel' : 'Close'}
              </button>
            </div>
          </section>

          <section className={styles.box} data-slot="cover" aria-labelledby={`${uid}-cover`}>
            <h3 id={`${uid}-cover`}>Cover <em>optional</em></h3>
            {coverUrl
              ? <img className={styles.coverPreview} src={coverUrl} alt={form.coverAlt || ''} />
              : <div className={styles.coverEmpty}>No cover chosen.</div>}
            <div className={styles.fileRow}>
              <button type="button" className={styles.ghostBtn} onClick={() => setPicking(true)}>
                <ImageIcon size={13} aria-hidden="true" /> {form.cover ? 'Change cover' : 'Choose a cover'}
              </button>
              {form.cover && (
                <button type="button" className={styles.ghostBtn} onClick={() => setForm((f) => ({ ...f, cover: null, coverAlt: '' }))}>
                  Remove cover
                </button>
              )}
            </div>
            {form.cover && (
              <>
                <label className={styles.field}>
                  <span>Cover alt text <em>{form.coverAlt.length}/{COLLECTION_LIMITS.alt}</em></span>
                  <textarea
                    rows={2}
                    value={form.coverAlt}
                    onChange={set('coverAlt')}
                    maxLength={COLLECTION_LIMITS.alt}
                    {...fieldProps('coverAlt')}
                  />
                  {errors.coverAlt
                    ? <span className={styles.fieldError}>{errors.coverAlt}</span>
                    : <span className={styles.hint}>What the image shows, for people who cannot see it. Brought in from the Media Library when it has alt text there.</span>}
                </label>
                <span className={styles.pathLine} title={form.cover.path}>
                  {form.cover.bucket ?? 'external'} / {form.cover.path}
                </span>
              </>
            )}
          </section>
        </div>
      </form>

      {picking && <CoverPicker slug={form.slug} onPick={pickCover} onClose={() => setPicking(false)} />}
    </div>
  );
}

/* ---------------- adding members ---------------- */

const SEARCH_LIMIT = 12;

function MemberAdder({ chosen, full, onAdd }) {
  const uid = useId();
  const [type, setType] = useState('diamond');
  const [query, setQuery] = useState('');
  const [found, setFound] = useState({ key: '', rows: [], error: null });
  const q = query.trim();
  const key = `${type}:${q}`;

  /* Debounced, and only the latest answer is kept: a slow reply to "HJ"
     must not overwrite the reply to "HJH-7". */
  useEffect(() => {
    if (!q) return undefined;
    let alive = true;
    const timer = setTimeout(async () => {
      try {
        const rows = await adminSearchMembers(type, q, { limit: SEARCH_LIMIT });
        if (alive) setFound({ key: `${type}:${q}`, rows, error: null });
      } catch (err) {
        if (alive) setFound({ key: `${type}:${q}`, rows: [], error: err.message || 'The search failed.' });
      }
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [type, q]);

  const chosenKeys = useMemo(() => new Set(chosen.map((m) => `${m.type}:${m.id}`)), [chosen]);
  const pending = Boolean(q) && found.key !== key;
  const rows = q && !pending ? found.rows : [];

  let status;
  if (full) status = `This collection is full (${COLLECTION_LIMITS.members} pieces).`;
  else if (!q) status = `${type === 'diamond' ? 'Type a stock number to find a diamond.' : 'Type a name or SKU to find a jewellery piece.'} Archived stock is not offered.`;
  else if (pending) status = 'Searching…';
  else if (found.error) status = found.error;
  else if (rows.length) status = `${plural(rows.length, 'match', 'matches')}${rows.length >= SEARCH_LIMIT ? ` — the first ${SEARCH_LIMIT}; type more to narrow it` : ''}.`;
  else status = `Nothing matches “${q}”.`;

  return (
    <div className={styles.adder}>
      <p className={styles.adderTitle}>Add pieces</p>
      <div className={styles.tools}>
        <div className={base.tabs} role="group" aria-label="Kind of piece to add">
          {[['diamond', 'Diamonds'], ['jewellery', 'Jewellery']].map(([k, label]) => (
            <button
              key={k}
              type="button"
              className={base.tab}
              data-on={type === k ? '' : undefined}
              aria-pressed={type === k}
              onClick={() => setType(k)}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          className={styles.search}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={type === 'diamond' ? 'Stock number…' : 'Piece name or SKU…'}
          aria-label={type === 'diamond' ? 'Search diamonds by stock number' : 'Search jewellery by name or SKU'}
          aria-describedby={`${uid}-status`}
          onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
        />
      </div>
      <p id={`${uid}-status`} className={found.error && q && !pending ? styles.fieldError : styles.hint} role="status">
        {status}
      </p>
      {rows.length > 0 && (
        <ul className={styles.results}>
          {rows.map((row) => {
            const info = describeMember({ type, id: row.id }, { [type]: new Map([[row.id, row]]) });
            const inIt = chosenKeys.has(`${type}:${row.id}`);
            return (
              <li key={row.id} className={styles.result}>
                <MemberThumb type={type} info={info} />
                <span className={styles.memberText}>
                  <b>{info.title}</b>
                  <small>{info.detail}</small>
                </span>
                <span className={styles.memberEnd}>
                  <StatePill state={info.state} />
                  <button
                    type="button"
                    className={`${base.toolBtn} ${styles.touchBtn}`}
                    disabled={inIt || full}
                    onClick={() => onAdd(type, row)}
                    aria-label={inIt ? `${info.title} is already in this collection` : `Add ${info.title}`}
                  >
                    {inIt ? 'Added' : <><Plus size={13} aria-hidden="true" /> Add</>}
                  </button>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ---------------- choosing a cover ---------------- */

function CoverPicker({ slug, onPick, onClose }) {
  const uid = useId();
  const panel = useRef(null);
  const [bucketId, setBucketId] = useState(BLOG_BUCKET);
  const [nonce, setNonce] = useState(0);
  const [data, setData] = useState({ for: null, files: [], meta: new Map(), error: null });
  const [query, setQuery] = useState('');
  const [progress, setProgress] = useState(null);
  const [problem, setProblem] = useState(null);
  useDialog(panel, onClose, progress !== null);

  const loadKey = `${bucketId}:${nonce}`;
  useEffect(() => {
    let alive = true;
    Promise.all([listBucket(bucketId), listMediaMeta(bucketId)])
      .then(([files, meta]) => {
        if (!alive) return;
        setData({
          for: `${bucketId}:${nonce}`,
          files: files.files.filter((f) => f.kind === 'image'),
          meta: meta.map,
          error: files.ok ? null : files.error,
        });
      })
      .catch((err) => {
        console.error('[NGD Admin] cover picker failed:', err);
        if (alive) setData({ for: `${bucketId}:${nonce}`, files: [], meta: new Map(), error: err.message || 'Images could not be listed.' });
      });
    return () => { alive = false; };
  }, [bucketId, nonce]);

  const loading = data.for !== loadKey;
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.files;
    return data.files.filter((f) => (
      f.path.toLowerCase().includes(q) || String(data.meta.get(f.path)?.alt_text ?? '').toLowerCase().includes(q)
    ));
  }, [data, query]);

  const upload = async (file) => {
    if (!file) return;
    if (!COVER_TYPES.test(file.type)) { setProblem('Choose a JPEG, PNG, WebP or AVIF image.'); return; }
    if (file.size > COVER_MAX) { setProblem('That image is over 5 MB. Export a smaller one — 1600 px wide is plenty.'); return; }
    setProblem(null);
    /* Same collision-proof key shape as the Media Library, under the
       collection's own folder so the bucket stays browsable by eye. */
    const folder = slugify(slug) || 'untitled';
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase().slice(-80);
    const path = `collections/${folder}/${Math.random().toString(36).slice(2, 10)}-${safe}`;
    setProgress(0);
    try {
      await uploadWithProgress(BLOG_BUCKET, path, file, setProgress);
      await recordMediaUpload(BLOG_BUCKET, path, file.name);
      onPick({ bucket: BLOG_BUCKET, path, alt: '' });
    } catch (err) {
      console.error('[NGD Admin] cover upload failed:', err);
      setProblem(err.message || 'That image could not be uploaded.');
      setProgress(null);
    }
  };

  return (
    <div className={styles.backdrop}>
      <button
        type="button"
        className={styles.backdropHit}
        aria-label="Close"
        tabIndex={-1}
        onClick={() => { if (progress === null) onClose(); }}
      />
      <div className={styles.dialog} ref={panel} role="dialog" aria-modal="true" aria-labelledby={`${uid}-title`}>
        <header className={styles.dialogHead}>
          <h2 id={`${uid}-title`}>Choose a cover</h2>
          <button
            type="button"
            className={`${base.act} ${styles.touch}`}
            onClick={onClose}
            disabled={progress !== null}
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </header>

        <div className={styles.tools}>
          <div className={base.tabs} role="group" aria-label="Bucket">
            {BUCKETS.map((b) => (
              <button
                key={b.id}
                type="button"
                className={base.tab}
                data-on={bucketId === b.id ? '' : undefined}
                aria-pressed={bucketId === b.id}
                onClick={() => setBucketId(b.id)}
              >
                {b.label}
              </button>
            ))}
          </div>
          <input
            className={styles.search}
            type="search"
            value={query}
            data-autofocus=""
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by path or alt text…"
            aria-label="Search images"
          />
          <label className={styles.uploadBtn} data-busy={progress !== null ? '' : undefined}>
            <Upload size={13} aria-hidden="true" /> Upload new
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              className={styles.fileInput}
              disabled={progress !== null}
              onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ''; }}
            />
          </label>
        </div>

        {progress !== null && (
          <div className={styles.progress} role="status" aria-label={`Uploading, ${Math.round(progress * 100)}%`}>
            <i style={{ '--p': progress }} />
          </div>
        )}
        {problem && <p className={styles.msgBad} role="alert">{problem}</p>}

        <div className={styles.pickBody}>
          {loading ? (
            <Skeleton rows={3} />
          ) : data.error ? (
            <ErrorState message={data.error} onRetry={() => setNonce((n) => n + 1)} />
          ) : shown.length === 0 ? (
            <p className={styles.empty}>{query.trim() ? 'No image matches this search.' : 'No images in this bucket yet.'}</p>
          ) : (
            <ul className={styles.pickGrid}>
              {shown.map((f) => {
                const alt = data.meta.get(f.path)?.alt_text ?? '';
                return (
                  <li key={f.path}>
                    <button
                      type="button"
                      className={styles.pickItem}
                      title={f.path}
                      disabled={progress !== null}
                      onClick={() => onPick({ bucket: bucketId, path: f.path, alt })}
                    >
                      <img src={f.url} alt="" loading="lazy" decoding="async" />
                      <span className={styles.pickName}>{f.name}</span>
                      <span className={alt ? styles.pickAlt : styles.pickNoAlt}>{alt || 'No alt text'}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <p className={styles.hint}>
          Uploads go to site media, under collections/. Alt text set in the Media Library is brought in for you.
        </p>
      </div>
    </div>
  );
}
