import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import Rail from '@/components/journal/Rail.jsx';
import ShareLinks from '@/components/journal/ShareLinks.jsx';
import { Cover, PostCard, PostMeta } from '@/components/journal/JournalBits.jsx';
import FeedbackForm from '@/components/feedback/FeedbackForm.jsx';
import FeedbackWall from '@/components/feedback/FeedbackWall.jsx';
import { useReveal } from '@/hooks/useReveal.js';
import { useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import { archivePost, archivePosts, loadJournal, loadPost, localizePost, localizePosts, shorten } from '@/lib/journal.js';
import { loadFeedbackWall } from '@/lib/supabase/queries/feedback.js';
import COPY from './BlogPostPage.copy.js';
import styles from './BlogPostPage.module.css';

/**
 * One journal article.
 *
 * An archive article is on screen at the first paint — it ships with the site
 * — and is swapped for the Control Centre's version if one has been published
 * under the same address. An editor-only post waits for the database, with the
 * states the journal has always stated plainly: not found (a stale link, which
 * is offered the index rather than a dead end) and could not load.
 *
 * Around the text: sharing, the articles either side of this one, feedback on
 * this article (sent to the desk, and shown here once approved), and more
 * to read. The body is plain text rendered through text nodes, never as markup,
 * so nothing stored in a post can become an element on the page.
 */
export default function BlogPostPage({ slug }) {
  const [state, setState] = useState(() => ({ slug, status: 'pending', post: null }));
  const [journal, setJournal] = useState(() => archivePosts());
  const [voices, setVoices] = useState({ slug: null, items: [] });
  const root = useRef(null);
  const { locale } = useLocale();
  const c = useCopy(COPY);

  useEffect(() => {
    let alive = true;
    loadPost(slug).then((r) => { if (alive) setState({ slug, ...r }); });
    loadJournal().then((r) => { if (alive) setJournal(r.posts); });
    loadFeedbackWall({ blogSlug: slug, limit: 12 })
      .then((wall) => { if (alive) setVoices({ slug, items: wall.items }); })
      .catch((err) => {
        console.error('[NGD journal] feedback', err);
        if (alive) setVoices({ slug, items: [] });
      });
    return () => { alive = false; };
  }, [slug]);

  /*
   * Derived, not set in an effect. Until this slug's own answer lands, an
   * archive article shows immediately and anything else is loading — the
   * previous article is never shown under the new address.
   */
  const settled = state.slug === slug && state.status !== 'pending';
  const fallback = archivePost(slug);
  const status = settled ? state.status : fallback ? 'ready' : 'loading';
  const found = settled ? state.post : fallback;
  /* In the reader's language: an archive article translated, an editor post as written. */
  const post = useMemo(() => localizePost(found, locale), [found, locale]);
  const feedback = voices.slug === slug ? voices : { items: [] };

  useEffect(() => {
    if (status === 'ready' && post) document.title = `${post.title} — New Grown Diamond`;
  }, [status, post]);

  const posts = useMemo(() => localizePosts(journal, locale), [journal, locale]);
  const index = posts.findIndex((p) => p.slug === slug);
  const newer = index > 0 ? posts[index - 1] : null;
  const older = index >= 0 && index < posts.length - 1 ? posts[index + 1] : null;
  const others = useMemo(() => posts.filter((p) => p.slug !== slug), [posts, slug]);

  useReveal(root, [status, slug, feedback.items.length, others.length]);

  if (status === 'loading') {
    return (
      <main className={styles.page}>
        <div className={styles.article} aria-busy="true">
          <p className={styles.crumbs}>{c.journal}</p>
          <div className={styles.skeleton} aria-hidden="true">
            <span /><span /><span />
          </div>
          <p className="u-visually-hidden" role="status">{c.loading}</p>
        </div>
      </main>
    );
  }

  if (status !== 'ready' || !post) {
    const copy = { error: c.notice.error, notfound: c.notice.notfound }[status] ?? c.notice.fallback;
    return (
      <main className={styles.page}>
        <div className={styles.article}>
          <p className={styles.crumbs}><a href="/blogs">{c.journal}</a></p>
          <div className={styles.notice} data-tone={status === 'error' ? 'error' : undefined}>
            <h1>{copy.title}</h1>
            <p>{copy.body}</p>
            <div className={styles.actions}>
              <a className={styles.ghost} href="/blogs"><ArrowLeft size={15} aria-hidden="true" /> {c.all}</a>
              <a className={styles.textLink} href="/contact">{c.desk}</a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const [first, ...restParas] = post.paragraphs;
  const lines = (text) => text.split('\n').map((line, i) => (
    <span key={i}>{i > 0 ? <br /> : null}{line}</span>
  ));

  return (
    <main className={styles.page} ref={root}>
      <article className={styles.article}>
        <header className={styles.head}>
          <nav className={styles.crumbs} aria-label={c.breadcrumb}>
            <a href="/blogs">{c.journal}</a>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{c.article}</span>
          </nav>
          <h1 className={styles.title}>{post.title}</h1>
          <PostMeta post={post} className={styles.meta} />
        </header>

        {post.cover && (
          <figure className={styles.cover} data-fit={post.cover.fit} data-rv="">
            <Cover cover={post.cover} eager />
          </figure>
        )}

        <div className={styles.layout}>
          <aside className={styles.aside} aria-label={c.share}>
            <div className={styles.asideInner}>
              <ShareLinks title={post.title} layout="column" />
            </div>
          </aside>

          <div className={styles.body}>
            {first ? <p className={styles.opening}>{lines(first)}</p> : <p>{c.empty}</p>}
            {post.figure && (
              <figure className={styles.figure} data-rv="">
                <Cover cover={post.figure} />
              </figure>
            )}
            {restParas.map((p, i) => <p key={i}>{lines(p)}</p>)}

            <div className={styles.shareRow}>
              <ShareLinks title={post.title} />
            </div>
          </div>
        </div>

        {(newer || older) && (
          <nav className={styles.pager} aria-label={c.pager.label}>
            {newer ? (
              <a className={styles.pagerLink} href={`/blogs/${encodeURIComponent(newer.slug)}`} rel="prev">
                <span className={styles.pagerDir}><ArrowLeft size={15} aria-hidden="true" /> {c.pager.newer}</span>
                <span className={styles.pagerTitle}>{newer.title}</span>
              </a>
            ) : <span />}
            {older ? (
              <a className={styles.pagerLink} data-next="" href={`/blogs/${encodeURIComponent(older.slug)}`} rel="next">
                <span className={styles.pagerDir}>{c.pager.older} <ArrowRight size={15} aria-hidden="true" /></span>
                <span className={styles.pagerTitle}>{older.title}</span>
              </a>
            ) : <span />}
          </nav>
        )}
      </article>

      <section className={styles.feedback} aria-labelledby="article-feedback-title" data-reveal="">
        <header className={styles.sectionHead}>
          <p className={styles.eyebrow}>{c.feedback.eyebrow}</p>
          <h2 id="article-feedback-title">{c.feedback.title}</h2>
          <p className={styles.sectionNote}>
            {c.feedback.note}
          </p>
        </header>
        <div className={styles.feedbackGrid}>
          <FeedbackForm blogSlug={post.slug} articleTitle={post.title} />
          <div className={styles.feedbackList}>
            {feedback.items.length
              ? <FeedbackWall items={feedback.items} />
              : <p className={styles.quiet}>{c.feedback.none}</p>}
          </div>
        </div>
      </section>

      {others.length > 0 && (
        <section className={styles.related} aria-labelledby="related-title" data-reveal="">
          <header className={styles.sectionHead}>
            <p className={styles.eyebrow}>{c.related.eyebrow}</p>
            <h2 id="related-title">{c.related.title}</h2>
          </header>
          <Rail
            label={c.related.title}
            items={others}
            getKey={(p) => p.slug}
            renderItem={(p) => <PostCard post={p} excerpt={shorten(p.excerpt, 130)} />}
          />
          <p className={styles.backRow}>
            <a className={styles.ghost} href="/blogs"><ArrowLeft size={15} aria-hidden="true" /> {c.all}</a>
          </p>
        </section>
      )}
    </main>
  );
}
