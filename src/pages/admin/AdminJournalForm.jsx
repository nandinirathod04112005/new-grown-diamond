import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

import { putFlash, takeFlash, useUnsavedGuard } from '@/hooks/useAdminFeedback.js';
import { archivePost, readingMinutes, toParagraphs } from '@/lib/journal.js';
import { navigateTo } from '@/lib/router.js';
import { blogCoverUrl } from '@/lib/supabase/storage.js';
import {
  adminCreateBlog,
  adminGetBlog,
  adminUpdateBlog,
  SLUG_PATTERN,
  slugify,
  uploadBlogCover,
} from '@/lib/supabase/queries/adminBlogs.js';
import styles from './AdminDiamonds.module.css';
import own from './AdminJournal.module.css';

const MAX_BYTES = 5 * 1024 * 1024;
const BLANK = {
  title: '', slug: '', excerpt: '', body: '', author_name: '', cover_path: '', published: false, published_at: '',
};

/** ISO timestamp ↔ the value a datetime-local input holds, in local time. */
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInput(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function formOf(row) {
  return {
    title: row.title ?? '',
    slug: row.slug ?? '',
    excerpt: row.excerpt ?? '',
    body: row.body ?? '',
    author_name: row.author_name ?? '',
    cover_path: row.cover_path ?? '',
    published: Boolean(row.published),
    published_at: toLocalInput(row.published_at),
  };
}

/**
 * Write or edit one journal post.
 *
 * The post is plain text — paragraphs split on blank lines — rendered on the
 * site through text nodes, so nothing typed here can become markup on a page.
 * The cover goes to the site-media bucket under journal/<slug>/, and both the
 * upload and the row write are refused by the database for anyone who is not
 * an active admin.
 */
export default function AdminJournalForm({ id }) {
  const editing = Boolean(id);
  const [original, setOriginal] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [slugTouched, setSlugTouched] = useState(editing);
  const [stage, setStage] = useState(editing ? 'loading' : 'ready');
  const [errors, setErrors] = useState({});
  /* "Created" survives the one navigation this screen makes itself, from
     /new to the new post's own edit address. */
  const [message, setMessage] = useState(() => { const m = takeFlash(); return m ? { tone: 'ok', text: m } : null; });
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!editing) return undefined;
    let alive = true;
    adminGetBlog(id)
      .then((row) => {
        if (!alive) return;
        if (!row) { setStage('notfound'); return; }
        setOriginal(row);
        setForm(formOf(row));
        setStage('ready');
      })
      .catch((err) => {
        console.error('[NGD Admin] journal load failed:', err);
        if (alive) { setStage('error'); setMessage({ tone: 'bad', text: err.message || 'The post could not be loaded.' }); }
      });
    return () => { alive = false; };
  }, [editing, id]);

  /* A picked file is previewed from memory until it is uploaded on save. */
  const fileUrl = useMemo(() => (file ? URL.createObjectURL(file) : ''), [file]);
  useEffect(() => () => { if (fileUrl) URL.revokeObjectURL(fileUrl); }, [fileUrl]);

  const baseline = original ? formOf(original) : BLANK;
  const dirty = Boolean(file) || JSON.stringify(form) !== JSON.stringify(baseline);
  useUnsavedGuard(dirty);

  const archived = archivePost(form.slug);
  const coverSrc = fileUrl || blogCoverUrl(form.cover_path);

  const set = (key) => (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm((f) => {
      const next = { ...f, [key]: value };
      /* The address follows the title until someone edits it by hand, and
         never moves on its own once a post exists. */
      if (key === 'title' && !slugTouched) next.slug = slugify(value);
      if (key === 'published' && value && !f.published_at) next.published_at = toLocalInput(new Date().toISOString());
      return next;
    });
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'A post needs a title.';
    if (!SLUG_PATTERN.test(form.slug)) e.slug = 'Use lower-case letters, numbers and single hyphens only.';
    if (form.published && !form.body.trim()) e.body = 'A published post needs its text.';
    if (form.excerpt.length > 400) e.excerpt = 'Keep the summary under 400 characters.';
    return e;
  };

  const onPickFile = (e) => {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (!/^image\/(jpeg|png|webp|avif)$/.test(picked.type)) {
      setMessage({ tone: 'bad', text: 'Choose a JPEG, PNG, WebP or AVIF image.' });
      e.target.value = '';
      return;
    }
    if (picked.size > MAX_BYTES) {
      setMessage({ tone: 'bad', text: 'That image is over 5 MB. Export a smaller one — 1600 px wide is plenty.' });
      e.target.value = '';
      return;
    }
    setMessage(null);
    setFile(picked);
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) {
      setMessage({ tone: 'bad', text: 'Some fields need attention before this can be saved.' });
      return;
    }
    setStage('saving');
    setMessage(null);
    try {
      let coverPath = form.cover_path;
      if (file) {
        setProgress(0);
        coverPath = await uploadBlogCover(form.slug, file, setProgress);
      }
      const values = { ...form, cover_path: coverPath, published_at: fromLocalInput(form.published_at) };
      if (editing) {
        const row = await adminUpdateBlog(id, values, original);
        setOriginal(row);
        setForm(formOf(row));
        setFile(null);
        setMessage({ tone: 'ok', text: row.published ? 'Saved — the changes are live on the journal.' : 'Saved as a draft. It is not on the site.' });
        setStage('ready');
      } else {
        const row = await adminCreateBlog(values);
        putFlash(row.published ? 'Created and published on the journal.' : 'Created as a draft. Publish it when it is ready.');
        setFile(null);
        navigateTo(`/admin/journal/${row.id}/edit`);
      }
    } catch (err) {
      console.error('[NGD Admin] journal save failed:', err);
      setMessage({ tone: 'bad', text: err.message || 'The post could not be saved.' });
      setStage('ready');
    } finally {
      setProgress(null);
    }
  };

  if (stage === 'loading') {
    return <div className={styles.page}><p className={styles.sub}>Loading the post…</p></div>;
  }

  if (stage === 'notfound' || stage === 'error') {
    return (
      <div className={styles.page}>
        <header className={styles.head}>
          <div>
            <p className={styles.eyebrow}>Journal</p>
            <h1>{stage === 'notfound' ? 'This post does not exist' : 'The post could not be loaded'}</h1>
            {message ? <p className={own.msgBad}>{message.text}</p> : null}
          </div>
        </header>
        <a className={own.ghostBtn} href="/admin/journal">Back to the journal</a>
      </div>
    );
  }

  const paragraphs = toParagraphs(form.body);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre · Journal</p>
          <h1>{editing ? 'Edit post' : 'New post'}</h1>
          <p className={styles.sub}>
            {form.published ? 'Published posts change on the site as soon as they are saved.' : 'Drafts are only visible here.'}
            {' '}{readingMinutes(`${form.excerpt} ${form.body}`)} min read.
          </p>
        </div>
        <a className={own.ghostBtn} href="/admin/journal"><ArrowLeft size={13} aria-hidden="true" /> All posts</a>
      </header>

      <form className={own.editor} onSubmit={onSubmit} noValidate>
        <div className={own.form}>
          {message ? <p className={message.tone === 'ok' ? own.msgOk : own.msgBad} role={message.tone === 'ok' ? 'status' : 'alert'}>{message.text}</p> : null}

          <section className={own.box} aria-label="Text">
            <label className={own.field}>
              <span>Title</span>
              <input value={form.title} onChange={set('title')} aria-invalid={errors.title ? 'true' : undefined} maxLength={160} />
              {errors.title ? <span className={own.fieldError}>{errors.title}</span> : null}
            </label>

            <label className={own.field}>
              <span>Web address</span>
              <span className={own.slugRow}>
                <span>/blogs/</span>
                <input
                  value={form.slug}
                  onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: e.target.value.toLowerCase() })); }}
                  aria-invalid={errors.slug ? 'true' : undefined}
                  maxLength={100}
                  spellCheck="false"
                />
              </span>
              {errors.slug
                ? <span className={own.fieldError}>{errors.slug}</span>
                : <span className={own.hint}>{archived ? 'This is the address of an archive article — once this post is published it replaces that article.' : 'Changing the address of a published post breaks links that already point to it.'}</span>}
            </label>

            <label className={own.field}>
              <span>Summary <em>{form.excerpt.length}/400</em></span>
              <textarea rows={3} value={form.excerpt} onChange={set('excerpt')} aria-invalid={errors.excerpt ? 'true' : undefined} />
              {errors.excerpt
                ? <span className={own.fieldError}>{errors.excerpt}</span>
                : <span className={own.hint}>Shown on the journal cards and in search results. Leave empty to use the start of the text.</span>}
            </label>

            <label className={own.field}>
              <span>Text</span>
              <textarea className={own.body} value={form.body} onChange={set('body')} aria-invalid={errors.body ? 'true' : undefined} />
              {errors.body
                ? <span className={own.fieldError}>{errors.body}</span>
                : <span className={own.hint}>Plain text. Leave a blank line between paragraphs. {paragraphs.length} {paragraphs.length === 1 ? 'paragraph' : 'paragraphs'}.</span>}
            </label>
          </section>
        </div>

        <div className={own.form}>
          <section className={own.box} aria-label="Publishing">
            <h2>Publishing</h2>
            <label className={own.check}>
              <input type="checkbox" checked={form.published} onChange={set('published')} />
              Published on the journal
            </label>
            <label className={own.field}>
              <span>Publish date</span>
              <input type="datetime-local" value={form.published_at} onChange={set('published_at')} />
              <span className={own.hint}>Orders the journal, newest first. Set when first published.</span>
            </label>
            <label className={own.field}>
              <span>Author <em>optional</em></span>
              <input value={form.author_name} onChange={set('author_name')} maxLength={80} />
            </label>
            <div className={own.actions}>
              <button className={own.save} type="submit" disabled={stage === 'saving'}>
                {stage === 'saving' ? 'Saving…' : editing ? 'Save changes' : 'Create post'}
              </button>
              {editing && original?.published && (
                <a className={own.ghostBtn} href={`/blogs/${encodeURIComponent(original.slug)}`} target="_blank" rel="noopener noreferrer">View on site</a>
              )}
            </div>
          </section>

          <section className={own.box} aria-label="Cover image">
            <h2>Cover image</h2>
            {coverSrc
              ? <img className={own.coverPreview} src={coverSrc} alt="The post's cover" />
              : (
                <div className={own.coverEmpty}>
                  {archived ? 'No cover of its own — the archive photograph is used.' : 'No cover yet. The card shows the house plate.'}
                </div>
              )}
            {progress !== null && <div className={own.progress} aria-hidden="true"><i style={{ '--p': progress }} /></div>}
            <div className={own.fileRow}>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={onPickFile} aria-label="Choose a cover image" />
              {(coverSrc) && (
                <button
                  type="button"
                  className={own.ghostBtn}
                  onClick={() => { setFile(null); setForm((f) => ({ ...f, cover_path: '' })); }}
                >
                  Remove cover
                </button>
              )}
            </div>
            <span className={own.hint}>JPEG, PNG, WebP or AVIF, up to 5 MB. Uploaded when you save.</span>
          </section>

          <section className={own.box} aria-label="Preview">
            <button type="button" className={own.ghostBtn} onClick={() => setShowPreview((v) => !v)} aria-expanded={showPreview}>
              {showPreview ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />} {showPreview ? 'Hide preview' : 'Preview the article'}
            </button>
            {showPreview && (
              <div className={own.preview}>
                <p className={own.previewTag}>Journal · {readingMinutes(`${form.excerpt} ${form.body}`)} min read</p>
                <h3>{form.title || 'Untitled post'}</h3>
                {form.excerpt ? <p className={own.standfirst}>{form.excerpt}</p> : null}
                {coverSrc ? <img src={coverSrc} alt="" /> : null}
                {paragraphs.length ? paragraphs.map((p, i) => <p key={i}>{p}</p>) : <p>No text yet.</p>}
              </div>
            )}
          </section>
        </div>
      </form>
    </div>
  );
}
