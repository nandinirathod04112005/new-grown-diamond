import { useEffect, useState } from 'react';

import { getPublishedBlog } from '@/lib/supabase/queries/blogs.js';
import { blogCoverUrl } from '@/lib/supabase/storage.js';
import styles from './BlogPostPage.module.css';

/**
 * One journal post.
 *
 * The cards on /blogs have pointed at /blogs/:slug since the journal was
 * built; this is the page that was never behind them. It reads the same
 * published record the index reads (queries/blogs.js, `getPublishedBlog`),
 * under the same access rule — published rows only — and renders nothing it
 * did not get from that row.
 *
 * Five states, each told plainly: loading, the table not being there yet, the
 * deployment not being connected, a request that failed, and a slug that
 * matches no published post. The last is the one a stale link lands on, and
 * it offers the index rather than a dead end.
 *
 * The body is stored as plain text. It is rendered as paragraphs split on
 * blank lines, with single line breaks kept — through text nodes, never as
 * markup, so nothing in the column can become an element on the page.
 */
export default function BlogPostPage({ slug }) {
  const [state, setState] = useState({ slug: null, status: 'loading', post: null });

  useEffect(() => {
    let alive = true;
    getPublishedBlog(slug)
      .then(({ post, missing, unconfigured }) => {
        if (!alive) return;
        if (unconfigured) setState({ slug, status: 'unconfigured', post: null });
        else if (missing) setState({ slug, status: 'missing', post: null });
        else setState(post ? { slug, status: 'ready', post } : { slug, status: 'notfound', post: null });
      })
      .catch((err) => {
        console.error('[NGD journal]', err);
        if (alive) setState({ slug, status: 'error', post: null });
      });
    return () => { alive = false; };
  }, [slug]);

  // Derived, not set in an effect: a new slug is loading until its own
  // result lands, and the previous post is never shown under the new address.
  const status = state.slug === slug ? state.status : 'loading';
  const post = state.slug === slug ? state.post : null;

  useEffect(() => {
    if (status === 'ready' && post) document.title = `${post.title} — New Grown Diamond`;
  }, [status, post]);

  if (status === 'loading') {
    return (
      <main className={styles.page}>
        <div className={styles.article} aria-busy="true">
          <p className={styles.eyebrow}>Journal</p>
          <div className={styles.skeleton} aria-hidden="true">
            <span /><span /><span />
          </div>
          <p className="u-visually-hidden" role="status">Loading the post</p>
        </div>
      </main>
    );
  }

  if (status !== 'ready') {
    const copy = {
      missing: ['The journal is not published yet', 'Writing is under way. Once the first pieces are live they will appear here.'],
      unconfigured: ['The journal is unavailable', 'This deployment is not connected to its database.'],
      error: ['This post could not be loaded', 'Something went wrong fetching it. Please try again shortly.'],
      notfound: ['This post is not in the journal', 'The address may have changed, or the piece may not be published yet.'],
    }[status];
    return (
      <main className={styles.page}>
        <div className={styles.article}>
          <p className={styles.eyebrow}>Journal</p>
          <div className={styles.notice} data-tone={status === 'error' ? 'error' : undefined}>
            <h1>{copy[0]}</h1>
            <p>{copy[1]}</p>
            <div className={styles.actions}>
              <a className="u-button u-button--ghost" href="/blogs">All posts</a>
              <a className={styles.textLink} href="/contact">Talk to the desk <span aria-hidden="true">→</span></a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const cover = blogCoverUrl(post.cover_path);
  const paragraphs = String(post.body ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <main className={styles.page}>
      <article className={styles.article}>
        <header className={styles.head}>
          <p className={styles.eyebrow}>
            <a href="/blogs">Journal</a>
            {post.published_at ? <> · <time dateTime={post.published_at}>{formatDate(post.published_at)}</time></> : null}
            {post.author_name ? <> · {post.author_name}</> : null}
          </p>
          <h1 className={styles.title}>{post.title}</h1>
          {post.excerpt ? <p className={styles.standfirst}>{post.excerpt}</p> : null}
        </header>

        {cover ? (
          <figure className={styles.cover}>
            <img src={cover} alt="" loading="eager" fetchPriority="high" decoding="async" />
          </figure>
        ) : null}

        {paragraphs.length > 0 ? (
          <div className={styles.body}>
            {paragraphs.map((p, i) => (
              <p key={i}>
                {p.split('\n').map((line, li) => (
                  <span key={li}>{li > 0 ? <br /> : null}{line}</span>
                ))}
              </p>
            ))}
          </div>
        ) : (
          <p className={styles.standfirst}>This post has no body text yet.</p>
        )}

        <footer className={styles.foot}>
          <a className="u-button u-button--ghost" href="/blogs"><span aria-hidden="true">←</span> All posts</a>
          <a className={styles.textLink} href="/contact">Talk to the desk <span aria-hidden="true">→</span></a>
        </footer>
      </article>
    </main>
  );
}

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
