import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, PenLine, Plus, SquareArrowOutUpRight, Trash2 } from 'lucide-react';

import DataTable from '@/components/admin/DataTable.jsx';
import { ConfirmDialog, Toasts } from '@/components/admin/AdminFeedback.jsx';
import { SetupRequired } from '@/components/admin/AdminBits.jsx';
import { useToasts } from '@/hooks/useAdminFeedback.js';
import { archivePosts, shorten } from '@/lib/journal.js';
import { navigateTo } from '@/lib/router.js';
import {
  adminCreateBlog,
  adminDeleteBlog,
  adminListBlogs,
  adminSetBlogPublished,
} from '@/lib/supabase/queries/adminBlogs.js';
import {
  adminDeclineSubmission,
  adminListSubmissions,
  adminOpenSubmission,
} from '@/lib/supabase/queries/adminSubmissions.js';
import styles from './AdminDiamonds.module.css';
import own from './AdminJournal.module.css';

const day = (iso) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

/**
 * Journal: every post the editor has written, drafts included, plus the five
 * articles that ship with the site from the previous blog.
 *
 * Same console verbs as the stock screens — publish, take down, delete with a
 * typed confirmation — and every one of them goes to the audit log. RLS on
 * public.blogs is what allows it (active admins only); this screen is never
 * the gate.
 *
 * THE ARCHIVE. Those five articles are part of the site's code, not rows, so
 * they cannot be edited in place. "Copy into the editor" makes a DRAFT row
 * with the same address and text; once that draft is published it replaces
 * the built-in version on the site. Nothing changes publicly until then.
 *
 * SENT BY CLIENTS. Articles clients send from the feedback page arrive as
 * enquiries. "Open as draft" turns one into a draft post with the writer as
 * author, for editing and publishing here; "Decline" closes it. Neither
 * publishes anything.
 */
export default function AdminJournal() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');
  const [error, setError] = useState(null);
  const [missing, setMissing] = useState(false);
  const [view, setView] = useState('all');
  const [busyId, setBusyId] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [working, setWorking] = useState(false);
  const [subs, setSubs] = useState({ ready: false, items: [], error: null });
  const t = useToasts();

  const fetchSubs = useCallback(async () => {
    try {
      const r = await adminListSubmissions();
      setSubs({ ready: true, items: r.items, error: null });
    } catch (err) {
      console.error('[NGD Admin] submissions failed:', err);
      setSubs({ ready: true, items: [], error: err.message || 'Submissions could not be loaded.' });
    }
  }, []);

  // The first write happens after the database promise settles.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { fetchSubs(); }, [fetchSubs]);

  const fetchRows = useCallback(async () => {
    try {
      const r = await adminListBlogs();
      setRows(r.posts);
      setMissing(r.missing);
      setError(null);
      setStatus('ready');
    } catch (err) {
      console.error('[NGD Admin] journal list failed:', err);
      setError(err.message || 'The journal could not be loaded.');
      setStatus('error');
    }
  }, []);

  // The first write happens after the database promise settles.
  // oxlint-disable-next-line react/set-state-in-effect
  useEffect(() => { fetchRows(); }, [fetchRows]);

  const visible = useMemo(() => rows.filter((r) => (
    view === 'published' ? r.published : view === 'drafts' ? !r.published : true
  )), [rows, view]);

  const bySlug = useMemo(() => new Map(rows.map((r) => [r.slug, r])), [rows]);

  const run = useCallback(async (id, fn, okMsg) => {
    setBusyId(id);
    try {
      await fn();
      await fetchRows();
      t.ok(okMsg);
    } catch (err) {
      console.error('[NGD Admin] journal write failed:', err);
      t.error(err.message || 'That change could not be saved.');
    } finally {
      setBusyId(null);
    }
  }, [fetchRows, t]);

  const copyIn = useCallback(async (post) => {
    setBusyId(post.slug);
    try {
      const row = await adminCreateBlog({
        slug: post.slug,
        title: post.title,
        excerpt: '',
        body: post.paragraphs.join('\n\n'),
        published: false,
      });
      navigateTo(`/admin/journal/${row.id}/edit`);
    } catch (err) {
      console.error('[NGD Admin] journal copy failed:', err);
      t.error(err.message || 'The article could not be copied.');
      setBusyId(null);
    }
  }, [t]);

  const openSub = useCallback(async (sub) => {
    setBusyId(sub.id);
    try {
      const row = await adminOpenSubmission(sub, new Set(rows.map((r) => r.slug)));
      navigateTo(`/admin/journal/${row.id}/edit`);
    } catch (err) {
      console.error('[NGD Admin] opening submission failed:', err);
      t.error(err.message || 'The article could not be opened as a draft.');
      setBusyId(null);
    }
  }, [rows, t]);

  const declineSub = useCallback(async (sub) => {
    setBusyId(sub.id);
    try {
      await adminDeclineSubmission(sub);
      await fetchSubs();
      t.ok('Declined. It stays in Enquiries, closed.');
    } catch (err) {
      console.error('[NGD Admin] declining submission failed:', err);
      t.error(err.message || 'That could not be saved.');
    } finally {
      setBusyId(null);
    }
  }, [fetchSubs, t]);

  const columns = useMemo(() => [
    {
      key: 'title',
      label: 'Post',
      plain: (r) => r.title,
      render: (r) => (
        <span className={own.titleCell}>
          <b>{r.title}</b>
          <a href={`/blogs/${encodeURIComponent(r.slug)}`} target="_blank" rel="noopener noreferrer">/blogs/{r.slug}</a>
        </span>
      ),
    },
    {
      key: 'published',
      label: 'State',
      sortValue: (r) => (r.published ? 0 : 1),
      render: (r) => (
        <span className={styles.pill} data-tone={r.published ? 'on' : 'hidden'}>
          {r.published ? 'Published' : 'Draft'}
        </span>
      ),
    },
    { key: 'author_name', label: 'Author', render: (r) => r.author_name || <span className={styles.blank}>—</span> },
    { key: 'published_at', label: 'Publish date', render: (r) => day(r.published_at), sortValue: (r) => r.published_at ?? '' },
    { key: 'updated_at', label: 'Last edited', render: (r) => day(r.updated_at), sortValue: (r) => r.updated_at ?? '' },
    {
      key: 'do',
      label: 'Actions',
      sortable: false,
      render: (r) => (
        <span className={styles.rowActions}>
          <a className={styles.act} href={`/admin/journal/${r.id}/edit`} title="Edit">
            <PenLine size={13} />
          </a>
          <button
            type="button"
            className={styles.act}
            disabled={busyId === r.id}
            title={r.published ? 'Take down (back to draft)' : 'Publish on the site'}
            onClick={() => run(r.id, () => adminSetBlogPublished(r, !r.published), r.published ? 'Taken down — now a draft.' : 'Published on the journal.')}
          >
            {r.published ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          {r.published && (
            <a className={styles.act} href={`/blogs/${encodeURIComponent(r.slug)}`} target="_blank" rel="noopener noreferrer" title="Open on the site">
              <SquareArrowOutUpRight size={13} />
            </a>
          )}
          <button
            type="button"
            className={styles.act}
            data-danger=""
            disabled={busyId === r.id}
            title="Delete"
            onClick={() => setConfirm(r)}
          >
            <Trash2 size={13} />
          </button>
        </span>
      ),
    },
  ], [busyId, run]);

  if (missing) {
    return (
      <div className={styles.page}>
        <SetupRequired
          module={{
            label: 'Journal',
            state: 'setup',
            missing: ['blogs'],
            note: 'The blogs table is not on this project. Its definition and policies are in supabase/blogs.sql.',
          }}
        />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre</p>
          <h1>Journal</h1>
          <p className={styles.sub}>
            {status === 'ready'
              ? `${rows.length} ${rows.length === 1 ? 'post' : 'posts'} · ${rows.filter((r) => r.published).length} published`
              : 'Loading posts…'}
          </p>
        </div>
        <a className={styles.primary} href="/admin/journal/new">
          <Plus size={14} aria-hidden="true" /> New post
        </a>
      </header>

      <DataTable
        rows={visible}
        columns={columns}
        status={status}
        error={error}
        onRetry={fetchRows}
        searchKeys={['title', 'slug', 'author_name', 'excerpt']}
        searchPlaceholder="Search title, address, author…"
        initialSort={{ key: 'updated_at', dir: 'desc' }}
        filters={view}
        empty="No posts written in the editor yet. The five archive articles below are already on the site."
        toolbar={(
          <div className={styles.tabs} role="group" aria-label="Which posts to show">
            {[['all', 'All'], ['published', 'Published'], ['drafts', 'Drafts']].map(([k, label]) => (
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
        )}
      />

      <section className={own.panel} aria-labelledby="subs-title">
        <div className={own.panelHead}>
          <h2 id="subs-title">
            Sent by clients
            {subs.items.filter((x) => x.status === 'new' || x.status === 'in_progress').length > 0 && (
              <span className={own.count}>{subs.items.filter((x) => x.status === 'new' || x.status === 'in_progress').length} new</span>
            )}
          </h2>
          <p>
            Articles sent from the website&apos;s “Write for the journal” form. Open
            one as a draft to edit it, add a cover and publish it with the
            writer&apos;s name — or decline it. Reply to the writer from Enquiries.
          </p>
        </div>
        {subs.error ? <p className={own.msgBad}>{subs.error}</p> : null}
        {subs.ready && !subs.items.length && !subs.error ? <p className={own.empty}>No articles have been sent in yet.</p> : null}
        {subs.items.length > 0 && (
          <ul className={own.archiveList}>
            {subs.items.map((sub) => {
              const open = sub.status === 'new' || sub.status === 'in_progress';
              return (
                <li key={sub.id}>
                  <span>
                    <b>{sub.article.title}</b>
                    <small>
                      {sub.full_name} · {sub.email} · {day(sub.created_at)} · {sub.public_id}
                      {sub.status === 'responded' ? ' · opened as a draft' : sub.status === 'closed' ? ' · declined' : ''}
                    </small>
                    <small className={own.preview2}>{shorten(sub.article.summary || sub.article.body, 220)}</small>
                  </span>
                  {open ? (
                    <span className={styles.rowActions}>
                      <button type="button" className={styles.toolBtn} disabled={busyId === sub.id || status !== 'ready'} onClick={() => openSub(sub)}>
                        {busyId === sub.id ? 'Opening…' : 'Open as draft'}
                      </button>
                      <button type="button" className={styles.toolBtnDanger} disabled={busyId === sub.id} onClick={() => declineSub(sub)}>
                        Decline
                      </button>
                    </span>
                  ) : <span className={styles.blank}>{sub.status === 'responded' ? 'In the editor' : 'Declined'}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className={own.panel} aria-labelledby="archive-title">
        <div className={own.panelHead}>
          <h2 id="archive-title">From the previous website</h2>
          <p>
            These five articles are built into the site and always shown. To
            change one, copy it into the editor: that makes a draft with the
            same address, and publishing the draft replaces the built-in version.
          </p>
        </div>
        <ul className={own.archiveList}>
          {archivePosts().map((p) => {
            const row = bySlug.get(p.slug);
            return (
              <li key={p.slug}>
                <span>
                  <b>{p.title}</b>
                  <small>
                    {row
                      ? row.published
                        ? 'Replaced on the site by the published editor version.'
                        : 'Copied to the editor as a draft — the built-in version is still shown.'
                      : `Built in · /blogs/${p.slug}`}
                  </small>
                </span>
                {row ? (
                  <a className={styles.toolBtn} href={`/admin/journal/${row.id}/edit`}>Open in editor</a>
                ) : (
                  <button
                    type="button"
                    className={styles.toolBtn}
                    disabled={busyId === p.slug || status !== 'ready'}
                    onClick={() => copyIn(p)}
                  >
                    {busyId === p.slug ? 'Copying…' : 'Copy into the editor'}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete this post?"
        confirmText={confirm?.slug}
        confirmLabel="Delete"
        busy={working}
        onCancel={() => setConfirm(null)}
        onConfirm={async () => {
          setWorking(true);
          try {
            await adminDeleteBlog(confirm);
            await fetchRows();
            t.ok('Deleted.');
          } catch (err) {
            console.error('[NGD Admin] journal delete failed:', err);
            t.error(err.message || 'The post could not be deleted.');
          } finally {
            setWorking(false);
            setConfirm(null);
          }
        }}
        body={(
          <>
            <p><strong>{confirm?.title}</strong></p>
            <ul>
              <li>It is removed from the journal immediately{confirm?.published ? ' — it is live now' : ''}.</li>
              <li>This cannot be undone. To hide it for now, take it down instead: it stays as a draft.</li>
              <li>Its cover image stays in the Media Library until you remove it there.</li>
            </ul>
          </>
        )}
      />

      <Toasts toasts={t.toasts} dismiss={t.dismiss} />
    </div>
  );
}
