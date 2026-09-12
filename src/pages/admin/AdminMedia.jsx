import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { Captions, Copy, FileText, Film, ImageIcon, Trash2, TriangleAlert, Upload, X } from 'lucide-react';

import {
  BUCKETS,
  MEDIA_LIMITS,
  deleteMediaFile,
  listBucket,
  listMediaMeta,
  prettySize,
  recordMediaUpload,
  saveMediaMeta,
  uploadWithProgress,
  usageFor,
} from '@/lib/supabase/queries/adminMedia.js';
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
 * ALT TEXT AND CAPTIONS are stored in public.media, one row per file keyed by
 * (bucket, path), created on first save. The count and the "missing alt text"
 * filter cover images only. If the table cannot be read, editing is switched
 * off and the screen says why, rather than offering a field whose contents
 * would go nowhere.
 */
export default function AdminMedia() {
  const [bucket, setBucket] = useState(BUCKETS[0]);
  const [state, setState] = useState({ status: 'loading', files: [], error: null });
  const [usage, setUsage] = useState(undefined); // undefined = not asked, null = unreadable
  const [meta, setMeta] = useState({ status: 'loading', map: new Map(), error: null });
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState('all');
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [doomed, setDoomed] = useState(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const input = useRef(null);
  const t = useToasts();

  const load = useCallback(async () => {
    const [r, m] = await Promise.all([listBucket(bucket.id), listMediaMeta(bucket.id)]);
    setState({ status: r.ok ? 'ready' : 'error', files: r.files, error: r.error });
    setMeta({ status: m.ok ? 'ready' : m.missing ? 'missing' : 'error', map: m.map, error: m.error });
    setUsage(await usageFor(bucket));
    return { files: r.files, metaOk: m.ok };
  }, [bucket]);

  // The first write happens after the storage promise settles.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  const altOf = useCallback((f) => String(meta.map.get(f.path)?.alt_text ?? '').trim(), [meta.map]);
  const metaReady = meta.status === 'ready';
  const filterMissing = onlyMissing && metaReady;

  const missingAlt = useMemo(
    () => (metaReady ? state.files.filter((f) => f.kind === 'image' && !altOf(f)).length : 0),
    [metaReady, state.files, altOf],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.files.filter((f) => (
      (kind === 'all' || f.kind === kind)
      && (!q || f.path.toLowerCase().includes(q))
      && (!filterMissing || (f.kind === 'image' && !altOf(f)))
    ));
  }, [state.files, query, kind, filterMissing, altOf]);

  const usedBy = useCallback((f) => (usage === null ? undefined : usage?.get(f.path)), [usage]);

  /* The next image after `file`, in the order on screen, that still has no
     alt text — for working through the backlog without closing the dialog. */
  const nextMissing = useCallback((file, map = meta.map) => {
    const images = visible.filter((f) => f.kind === 'image');
    const start = images.findIndex((f) => f.path === file.path);
    for (let step = 1; step <= images.length; step += 1) {
      const f = images[(start + step + images.length) % images.length];
      if (f && f.path !== file.path && !String(map.get(f.path)?.alt_text ?? '').trim()) return f;
    }
    return null;
  }, [visible, meta.map]);

  const saveMeta = useCallback(async (file, values, goNext) => {
    if (!values.changed) {
      setEditing(goNext ? nextMissing(file) : null);
      return;
    }
    setSaving(true);
    try {
      const previous = meta.map.get(file.path) ?? null;
      const row = await saveMediaMeta({
        bucket: bucket.id,
        path: file.path,
        altText: values.alt,
        caption: values.caption,
        previous,
        label: file.name,
      });
      setMeta((m) => ({ ...m, map: new Map(m.map).set(file.path, row) }));
      t.ok(row.alt_text ? `Alt text saved for ${file.name}.` : `Saved. ${file.name} still has no alt text.`);
      /* Worked out against the map as it now is, so the image just described
         is never offered again as "next". */
      setEditing(goNext ? nextMissing(file, new Map(meta.map).set(file.path, row)) : null);
    } catch (err) {
      console.error('[NGD Admin] alt text save failed:', err);
      t.error(err.message || 'The alt text could not be saved.');
    } finally {
      setSaving(false);
    }
  }, [bucket.id, meta.map, nextMissing, t]);

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
      await recordMediaUpload(bucket.id, path, file.name);
      const after = await load();
      /* The moment someone has just chosen an image is the moment they know
         what it shows, so the alt text dialog opens straight away. Closing it
         leaves the image listed under "missing alt text" for later. */
      const fresh = after.files.find((f) => f.path === path);
      if (fresh?.kind === 'image' && after.metaOk) {
        t.ok(`Uploaded ${file.name}. Describe it now, or close the dialog to do it later.`);
        setEditing(fresh);
      } else {
        t.ok(`Uploaded ${file.name}.`);
      }
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
      await deleteMediaFile(bucket.id, doomed.path, doomed.name);
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
            {state.status === 'ready' && metaReady && counts.image > 0 && (
              <> · {missingAlt === 0 ? 'every image has alt text' : `${missingAlt} ${missingAlt === 1 ? 'image' : 'images'} missing alt text`}</>
            )}
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
        Alt text and captions are saved to the <code>media</code> table against
        each file&apos;s bucket and path. The storefront does not read them yet,
        so they are ready for when it does. Usage below is checked live against{' '}
        <code>{bucket.usedBy.table}.{bucket.usedBy.column}</code> and collection
        covers each time this page loads, so it is always current.
      </p>

      {meta.status === 'missing' && (
        <p className={styles.note}>
          The <code>media</code> table is not on this project, so alt text and captions cannot be saved here.
        </p>
      )}
      {meta.status === 'error' && (
        <p className={styles.note}>
          Alt text could not be read ({meta.error}), so editing it is switched off until this page is reloaded.
        </p>
      )}

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
        {metaReady && (
          <button
            type="button"
            className={styles.flagBtn}
            data-on={filterMissing ? '' : undefined}
            aria-pressed={filterMissing}
            disabled={!missingAlt && !filterMissing}
            onClick={() => setOnlyMissing((v) => !v)}
          >
            <TriangleAlert size={13} aria-hidden="true" /> Missing alt text · {missingAlt}
          </button>
        )}
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
          ? (
            <p className={styles.empty}>
              {filterMissing && !query && kind === 'all'
                ? 'Every image in this bucket has alt text.'
                : query || kind !== 'all' || filterMissing ? 'No files match this filter.' : 'This bucket is empty.'}
            </p>
          )
          : (
            <ul className={styles.grid}>
              {visible.map((f, i) => {
                const owner = usedBy(f);
                const Icon = ICON[f.kind];
                const alt = f.kind === 'image' ? altOf(f) : '';
                const caption = String(meta.map.get(f.path)?.caption ?? '').trim();
                return (
                  <li key={f.path} className={styles.card} style={{ '--i': i }}>
                    <div className={styles.preview}>
                      {f.kind === 'image'
                        ? <img src={f.url} alt={alt} loading="lazy" decoding="async" />
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
                      {f.kind === 'image' && metaReady && (
                        alt
                          ? <p className={styles.alt} title={alt}><span>Alt</span> {alt}</p>
                          : <p className={styles.unknown}>No alt text</p>
                      )}
                      {caption && metaReady && (
                        <p className={styles.alt} title={caption}><span>Caption</span> {caption}</p>
                      )}
                    </div>
                    <div className={styles.cardActions}>
                      {f.kind === 'image' && (
                        <button
                          type="button"
                          className={styles.act}
                          disabled={!metaReady}
                          title={metaReady ? (alt ? 'Edit alt text and caption' : 'Add alt text and caption') : 'Alt text cannot be edited right now'}
                          aria-label={`Alt text and caption for ${f.name}`}
                          onClick={() => setEditing(f)}
                        >
                          <Captions size={13} />
                        </button>
                      )}
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
              <li>Nothing currently references it in <code>{bucket.usedBy.table}</code> or as a collection cover.</li>
              <li>Its alt text and caption are removed with it.</li>
              <li>A row added since this page loaded would not be seen — reload if in doubt.</li>
            </ul>
          </>
        )}
      />

      {editing && (
        <MetaDialog
          file={editing}
          row={meta.map.get(editing.path) ?? null}
          saving={saving}
          hasNext={Boolean(nextMissing(editing))}
          onSave={saveMeta}
          onClose={() => setEditing(null)}
        />
      )}

      <Toasts toasts={t.toasts} dismiss={t.dismiss} />
    </div>
  );
}

/**
 * Alt text and caption for one image.
 *
 * The shell — backdrop, Escape, focus returned to the card on close — stays
 * mounted while "Save and next" walks through the backlog. The form inside is
 * keyed by path, so each image starts from its own saved values and never
 * inherits the previous image's words.
 */
function MetaDialog({ file, row, saving, hasNext, onSave, onClose }) {
  const titleId = useId();
  const close = useRef(onClose);
  const locked = useRef(saving);
  useEffect(() => {
    close.current = onClose;
    locked.current = saving;
  });

  useEffect(() => {
    const opener = document.activeElement;
    const onKey = (e) => { if (e.key === 'Escape' && !locked.current) close.current?.(); };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  return (
    <div className={styles.backdrop}>
      <button
        type="button"
        className={styles.backdropHit}
        aria-label="Close"
        tabIndex={-1}
        onClick={() => { if (!saving) onClose(); }}
      />
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <MetaForm
          key={file.path}
          file={file}
          row={row}
          saving={saving}
          hasNext={hasNext}
          onSave={onSave}
          onClose={onClose}
          titleId={titleId}
        />
      </div>
    </div>
  );
}

function MetaForm({ file, row, saving, hasNext, onSave, onClose, titleId }) {
  const [alt, setAlt] = useState(row?.alt_text ?? '');
  const [caption, setCaption] = useState(row?.caption ?? '');
  const altField = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => altField.current?.focus(), 30);
    return () => clearTimeout(timer);
  }, []);

  const changed = alt.trim() !== String(row?.alt_text ?? '').trim()
    || caption.trim() !== String(row?.caption ?? '').trim();
  const submit = (goNext) => onSave(file, { alt, caption, changed }, goNext);

  return (
    <form className={styles.metaForm} onSubmit={(e) => { e.preventDefault(); submit(false); }}>
      <header className={styles.dialogHead}>
        <h2 id={titleId}>Alt text and caption</h2>
        <button type="button" className={styles.act} onClick={onClose} disabled={saving} aria-label="Close">
          <X size={15} />
        </button>
      </header>

      <div className={styles.metaFile}>
        <img src={file.url} alt="" />
        <p title={file.path}>{file.path}</p>
      </div>

      <label className={styles.field}>
        <span>Alt text <em>{alt.length}/{MEDIA_LIMITS.alt}</em></span>
        <textarea
          ref={altField}
          rows={3}
          value={alt}
          maxLength={MEDIA_LIMITS.alt}
          onChange={(e) => setAlt(e.target.value)}
        />
        <span className={styles.hint}>
          What the image shows, for someone who cannot see it — for example “Oval diamond, about 1.5 carats,
          in a platinum solitaire setting”. Leave out “image of”.
        </span>
      </label>

      <label className={styles.field}>
        <span>Caption <em>optional</em></span>
        <textarea
          rows={2}
          value={caption}
          maxLength={MEDIA_LIMITS.caption}
          onChange={(e) => setCaption(e.target.value)}
        />
        <span className={styles.hint}>Visible text shown with the image, where a page uses captions.</span>
      </label>

      <div className={styles.dialogActions}>
        <button type="button" className={styles.ghost} onClick={onClose} disabled={saving}>Cancel</button>
        {hasNext && (
          <button type="button" className={styles.ghost} onClick={() => submit(true)} disabled={saving}>
            {changed ? 'Save and next' : 'Skip to next'}
          </button>
        )}
        <button type="submit" className={styles.save} disabled={saving || !changed}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
