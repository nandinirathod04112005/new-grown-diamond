import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Copy, FileText, Film, ImageIcon, Trash2, Upload } from 'lucide-react';

import { BUCKETS, listBucket, prettySize, removeFile, uploadWithProgress, usageFor } from '@/lib/supabase/queries/adminMedia.js';
import { ConfirmDialog, Toasts } from '@/components/admin/AdminFeedback.jsx';
import { ErrorState, Skeleton } from '@/components/admin/AdminBits.jsx';
import { useToasts } from '@/hooks/useAdminFeedback.js';
import styles from './AdminMedia.module.css';

/* 25 MB. Not a Storage limit — a sanity limit, so a mis-picked video does not
   spend ten minutes uploading before the server refuses it. */
const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT = 'image/*,video/mp4,video/webm,application/pdf';

const ICON = { image: ImageIcon, video: Film, document: FileText, other: FileText };

/**
 * The media library, over the two Storage buckets this project really has.
 *
 * USAGE IS CHECKED LIVE, NOT INDEXED. Before anything can be deleted, the
 * table that would reference it is read and the file's path looked up. Three
 * outcomes, and they are treated as three different things:
 *
 *   in use          — delete is refused outright, and it names the row.
 *   not referenced  — delete is allowed, behind a typed confirmation.
 *   usage unknown   — the reference table could not be read, so delete is
 *                     refused. Deleting on the strength of a failed query is
 *                     precisely the accident this screen exists to prevent.
 *
 * There is no `media` table, so alt text and captions have nowhere to be
 * stored. Rather than offer a field that silently discards what is typed into
 * it, the screen says where that would have to live.
 */
export default function AdminMedia() {
  const [bucket, setBucket] = useState(BUCKETS[0]);
  const [state, setState] = useState({ status: 'loading', files: [], error: null });
  const [usage, setUsage] = useState(undefined); // undefined = not asked, null = unreadable
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [progress, setProgress] = useState(null);
  const [doomed, setDoomed] = useState(null);
  const [busy, setBusy] = useState(false);
  const input = useRef(null);
  const t = useToasts();

  const load = useCallback(async () => {
    const r = await listBucket(bucket.id);
    setState({ status: r.ok ? 'ready' : 'error', files: r.files, error: r.error });
    setUsage(await usageFor(bucket));
  }, [bucket]);

  // The first write happens after the storage promise settles.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.files.filter((f) => (
      (kind === 'all' || f.kind === kind) && (!q || f.path.toLowerCase().includes(q))
    ));
  }, [state.files, query, kind]);

  const usedBy = useCallback((f) => (usage === null ? undefined : usage?.get(f.path)), [usage]);

  const onPick = useCallback(async (file) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      t.error(`${file.name} is ${prettySize(file.size)}. The limit here is ${prettySize(MAX_BYTES)}.`);
      return;
    }
    /* A stable, collision-proof key. The date prefix keeps the bucket
       browsable by eye; the random suffix means two files with the same name
       uploaded in the same second cannot overwrite one another. */
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
    const path = `uploads/${new Date().toISOString().slice(0, 10)}/${Math.random().toString(36).slice(2, 10)}-${safe}`;
    setProgress(0);
    try {
      await uploadWithProgress(bucket.id, path, file, setProgress);
      await load();
      t.ok(`Uploaded ${file.name}.`);
    } catch (err) {
      console.error('[NGD Admin] upload failed:', err);
      t.error(err.message || 'That file could not be uploaded.');
    } finally {
      setProgress(null);
      if (input.current) input.current.value = '';
    }
  }, [bucket.id, load, t]);

  const confirmDelete = useCallback(async () => {
    setBusy(true);
    try {
      await removeFile(bucket.id, doomed.path);
      await load();
      t.ok('File removed.');
      setDoomed(null);
    } catch (err) {
      console.error('[NGD Admin] delete failed:', err);
      t.error(err.message || 'That file could not be removed.');
    } finally {
      setBusy(false);
    }
  }, [bucket.id, doomed, load, t]);

  const counts = useMemo(() => {
    const c = { image: 0, video: 0, document: 0, other: 0 };
    state.files.forEach((f) => { c[f.kind] += 1; });
    return c;
  }, [state.files]);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre</p>
          <h1>Media Library</h1>
          <p className={styles.sub}>
            {state.status === 'ready' ? `${visible.length} of ${state.files.length} files in ${bucket.label.toLowerCase()}` : 'Reading the bucket…'}
          </p>
        </div>
        <label className={styles.primary}>
          <Upload size={14} aria-hidden="true" /> Upload
          <input
            ref={input}
            type="file"
            accept={ACCEPT}
            className={styles.fileInput}
            onChange={(e) => onPick(e.target.files?.[0])}
            disabled={progress !== null}
          />
        </label>
      </header>

      <p className={styles.note}>
        There is no <code>media</code> table, so alt text, captions and upload
        attribution have nowhere to be stored — those need a migration. Usage
        below is checked live against{' '}
        <code>{bucket.usedBy.table}.{bucket.usedBy.column}</code> each time this
        page loads, so it is always current.
      </p>

      {progress !== null && (
        <div className={styles.progress} role="status" aria-live="polite">
          <span className={styles.progressBar}><span style={{ '--p': `${Math.round(progress * 100)}%` }} /></span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
      )}

      <div className={styles.tools}>
        <div className={styles.tabs} role="group" aria-label="Bucket">
          {BUCKETS.map((b) => (
            <button key={b.id} type="button" className={styles.tab} data-on={b.id === bucket.id ? '' : undefined} aria-pressed={b.id === bucket.id} onClick={() => setBucket(b)}>
              {b.label}
            </button>
          ))}
        </div>
        <div className={styles.tabs} role="group" aria-label="File type">
          {[['all', 'All'], ['image', `Images ${counts.image}`], ['video', `Video ${counts.video}`], ['document', `Docs ${counts.document}`]].map(([k, label]) => (
            <button key={k} type="button" className={styles.tab} data-on={kind === k ? '' : undefined} aria-pressed={kind === k} onClick={() => setKind(k)}>
              {label}
            </button>
          ))}
        </div>
        <input
          className={styles.search}
          type="search"
          value={query}
          placeholder="Search by path…"
          aria-label="Search media by path"
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {state.status === 'loading' && <Skeleton rows={5} />}
      {state.status === 'error' && <ErrorState message={state.error} onRetry={load} />}

      {state.status === 'ready' && (
        visible.length === 0
          ? <p className={styles.empty}>{query || kind !== 'all' ? 'No files match this filter.' : 'This bucket is empty.'}</p>
          : (
            <ul className={styles.grid}>
              {visible.map((f, i) => {
                const owner = usedBy(f);
                const Icon = ICON[f.kind];
                return (
                  <li key={f.path} className={styles.card} style={{ '--i': i }}>
                    <div className={styles.preview}>
                      {f.kind === 'image'
                        ? <img src={f.url} alt="" loading="lazy" decoding="async" />
                        : <Icon size={22} aria-hidden="true" />}
                    </div>
                    <div className={styles.meta}>
                      <p className={styles.path} title={f.path}>{f.name}</p>
                      <p className={styles.dim}>{prettySize(f.size)} · {f.kind}</p>
                      {usage === null ? (
                        <p className={styles.unknown}>Usage unknown</p>
                      ) : owner ? (
                        <p className={styles.inUse}>In use · {owner}</p>
                      ) : (
                        <p className={styles.dim}>Not referenced</p>
                      )}
                    </div>
                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className={styles.act}
                        title="Copy the public URL"
                        onClick={() => {
                          navigator.clipboard?.writeText(f.url).then(
                            () => t.ok('URL copied.'),
                            () => t.error('The clipboard is not available here.'),
                          );
                        }}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        type="button"
                        className={styles.act}
                        data-danger=""
                        /* Refused both when the file is in use AND when usage
                           could not be established. */
                        disabled={Boolean(owner) || usage === null}
                        title={owner ? `In use by ${owner}` : usage === null ? 'Usage could not be checked' : 'Delete'}
                        onClick={() => setDoomed(f)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )
      )}

      <ConfirmDialog
        open={Boolean(doomed)}
        title="Delete this file?"
        confirmText={doomed?.name}
        confirmLabel="Delete"
        busy={busy}
        onCancel={() => setDoomed(null)}
        onConfirm={confirmDelete}
        body={(
          <>
            <p><strong>{doomed?.path}</strong> — {prettySize(doomed?.size)}.</p>
            <ul>
              <li>This one is permanent. Storage has no archive and no undo.</li>
              <li>Nothing currently references it in <code>{bucket.usedBy.table}</code>.</li>
              <li>A row added since this page loaded would not be seen — reload if in doubt.</li>
            </ul>
          </>
        )}
      />

      <Toasts toasts={t.toasts} dismiss={t.dismiss} />
    </div>
  );
}
