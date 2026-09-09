import { useEffect, useRef, useState } from 'react';
import HeroBackdrop from '@/components/layout/HeroBackdrop.jsx';
import gradingBench from '@/assets/process/grading-bench.webp';

import { usePointerParallax } from '@/hooks/usePointerParallax.js';
import { listPublishedBlogs } from '@/lib/supabase/queries/blogs.js';
import { blogCoverUrl } from '@/lib/supabase/storage.js';
import styles from './BlogsPage.module.css';

/**
 * The journal.
 *
 * Four states, and each one is told the truth:
 *
 *   loading    the request is in flight
 *   missing    public.blogs does not exist yet — a configuration state, not a
 *              fault, so it reads calmly rather than as a red error
 *   empty      the table exists and holds no published posts
 *   ready      posts, newest first
 *
 * Nothing here invents articles to make the page look populated. Placeholder
 * posts written to fill a grid are indistinguishable from real editorial to a
 * visitor, and a trade buyer who follows one and finds nothing has been
 * misled by the site itself. An empty journal that says it is empty costs far
 * less than that.
 */
export default function BlogsPage() {
  const [state, setState] = useState({ status: 'loading', posts: [] });
  const grid = useRef(null);
  usePointerParallax(grid, 1);

  useEffect(() => {
    let alive = true;
    listPublishedBlogs()
      .then((r) => {
        if (!alive) return;
        if (r.unconfigured) return setState({ status: 'unconfigured', posts: [] });
        if (r.missing) return setState({ status: 'missing', posts: [] });
        setState({ status: r.posts.length ? 'ready' : 'empty', posts: r.posts });
      })
      .catch((error) => {
        console.error('[NGD blogs]', error);
        if (alive) setState({ status: 'error', posts: [] });
      });
    return () => { alive = false; };
  }, []);

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.field} aria-hidden="true" />
        {/* The bench the notes are written from, behind the words — the same
            layer and motion as every other banner. The caustic light that
            stood in for a photograph is gone: screen-blended over a real one
            it flared white and took the headline with it. */}
        <HeroBackdrop src={gradingBench} focus="50% 42%" />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>New Grown Diamond</p>
          <h1 className={styles.title}>The journal</h1>
          <p className={styles.intro}>
            Notes from the floor in Surat — growth runs, cutting decisions,
            grading, and what the trade is actually asking for.
          </p>
          <span className={styles.rule} aria-hidden="true" />
        </div>
      </header>

      <section ref={grid} className={styles.body} aria-live="polite">
        {state.status === 'loading' && (
          <div className={styles.skeletons} aria-hidden="true">
            {[0, 1, 2].map((i) => <span key={i} className={styles.skeleton} style={{ '--i': i }} />)}
          </div>
        )}

        {state.status === 'missing' && (
          <Notice
            title="The journal is not published yet"
            body="Writing is under way. Once the first pieces are live they will appear here."
          />
        )}

        {state.status === 'empty' && (
          <Notice
            title="No posts yet"
            body="The journal is set up but nothing has been published. Check back shortly."
          />
        )}

        {state.status === 'unconfigured' && (
          <Notice
            title="The journal is unavailable"
            body="This deployment is not connected to its database."
          />
        )}

        {state.status === 'error' && (
          <Notice
            tone="error"
            title="The journal could not be loaded"
            body="Something went wrong fetching the posts. Please try again shortly."
          />
        )}

        {state.status === 'ready' && (
          <ol className={styles.grid}>
            {state.posts.map((post, i) => (
              <li key={post.slug} className={styles.cell} style={{ '--i': i }}>
                <article className={styles.card}>
                  <div className={styles.plane}>
                    <div className={styles.shot}>
                      {blogCoverUrl(post.cover_path) ? (
                        <img
                          src={blogCoverUrl(post.cover_path)}
                          alt=""
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span className={styles.noShot} aria-hidden="true" />
                      )}
                    </div>
                    <span className={styles.gloss} aria-hidden="true" />
                    <span className={styles.rim} aria-hidden="true" />

                    <div className={styles.text}>
                      <p className={styles.meta}>
                        {post.published_at ? formatDate(post.published_at) : 'Undated'}
                        {post.author_name ? ` · ${post.author_name}` : ''}
                      </p>
                      <h2 className={styles.cardTitle}>{post.title}</h2>
                      {post.excerpt ? <p className={styles.excerpt}>{post.excerpt}</p> : null}
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

function Notice({ title, body, tone }) {
  return (
    <div className={styles.notice} data-tone={tone}>
      <h2>{title}</h2>
      <p>{body}</p>
      <a className={styles.noticeLink} href="/contact">Talk to the desk →</a>
    </div>
  );
}

/** Fixed locale, so the same date reads identically to every visitor. */
function formatDate(value) {
  try {
    return new Date(value).toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
  } catch {
    return 'Undated';
  }
}
