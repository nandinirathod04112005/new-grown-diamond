import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ArrowUpRight, Search, X } from 'lucide-react';

import HeroBackdrop from '@/components/layout/HeroBackdrop.jsx';
import Rail from '@/components/journal/Rail.jsx';
import FeedbackWall from '@/components/feedback/FeedbackWall.jsx';
import { Cover, PostCard, PostMeta } from '@/components/journal/JournalBits.jsx';
import gradingBench from '@/assets/process/grading-bench.webp';
import ARCHIVE_COPY from '@/content/journalPosts.copy.js';
import { useReveal } from '@/hooks/useReveal.js';
import { useLocale, interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import { archivePosts, loadJournal, localizePosts, shorten } from '@/lib/journal.js';
import { loadFeedbackWall } from '@/lib/supabase/queries/feedback.js';
import COPY from './BlogsPage.copy.js';
import styles from './BlogsPage.module.css';

/**
 * The journal.
 *
 * The previous site's five articles are always here — they ship with the
 * site, so the page is never empty and never waits on the database to show
 * them. Posts published from the Control Centre join them as they load, newest
 * first (lib/journal.js decides the order and how the two meet).
 *
 * The layout is the old blog's, redrawn: a lead story, articles set in
 * alternating rows, a carousel with arrows, and a "recently posted" list. A
 * search box filters everything at once, as the old page's did.
 *
 * Client feedback closes the page — only feedback the team has approved.
 * Until there is some, the band invites it and shows none; it never fills the
 * space with invented quotes. Clients can send an article for the journal from
 * the same band.
 */
export default function BlogsPage() {
  const [journal, setJournal] = useState(() => ({ posts: archivePosts(), editorFailed: false }));
  const [query, setQuery] = useState('');
  const [voices, setVoices] = useState({ items: [], ready: false });
  const root = useRef(null);
  const { locale } = useLocale();
  const c = useCopy(COPY);
  const archive = useCopy(ARCHIVE_COPY);

  useEffect(() => {
    let alive = true;
    loadJournal().then((r) => { if (alive) setJournal(r); });
    loadFeedbackWall({ limit: 6 })
      .then((r) => { if (alive) setVoices({ items: r.items, ready: true }); })
      .catch((err) => {
        console.error('[NGD journal] feedback', err);
        if (alive) setVoices({ items: [], ready: true });
      });
    return () => { alive = false; };
  }, []);

  /* Archive articles in the reader's language; editor posts as written. */
  const posts = useMemo(() => localizePosts(journal.posts, locale), [journal.posts, locale]);
  const q = query.trim().toLowerCase();

  const matches = useMemo(() => (q
    ? posts.filter((p) => `${p.title} ${p.paragraphs.join(' ')} ${p.author ?? ''}`.toLowerCase().includes(q))
    : posts), [posts, q]);

  const titleFor = useMemo(() => {
    const map = new Map(posts.map((p) => [p.slug, p.title]));
    return (slug) => map.get(slug) ?? null;
  }, [posts]);

  useReveal(root, [posts.length, q, voices.items.length]);

  const [lead, ...rest] = posts;
  const rows = rest.slice(0, 2);
  const more = rest.slice(2);

  return (
    <main className={styles.page} ref={root}>
      <header className={styles.hero}>
        <div className={styles.field} aria-hidden="true" />
        <HeroBackdrop src={gradingBench} focus="50% 42%" />
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{c.eyebrow}</p>
          <h1 className={styles.title}>{c.title}</h1>
          <p className={styles.intro}>{archive.intro}</p>

          <form className={styles.search} role="search" onSubmit={(e) => e.preventDefault()}>
            <label className={styles.vh} htmlFor="journal-search">{c.search}</label>
            <Search size={17} aria-hidden="true" className={styles.searchIcon} />
            <input
              id="journal-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={c.search}
              autoComplete="off"
              enterKeyHint="search"
            />
            {query && (
              <button type="button" className={styles.clear} onClick={() => setQuery('')} aria-label={c.clear}>
                <X size={15} aria-hidden="true" />
              </button>
            )}
          </form>
          <p className={styles.count} role="status" aria-live="polite">
            {q
              ? interpolate(matches.length === 1 ? c.count.matchOne : c.count.matchMany, { n: matches.length, q: query.trim() })
              : interpolate(posts.length === 1 ? c.count.one : c.count.many, { n: posts.length })}
          </p>
        </div>
      </header>

      {q ? (
        <section className={styles.results} aria-label={c.results} data-reveal="">
          {matches.length ? (
            <ol className={styles.resultGrid}>
              {matches.map((post, i) => (
                <li key={post.slug} data-rv="" style={{ '--i': i % 6 }}>
                  <PostCard post={post} excerpt={shorten(post.excerpt, 150)} />
                </li>
              ))}
            </ol>
          ) : (
            <div className={styles.none}>
              <h2>{interpolate(c.none.title, { q: query.trim() })}</h2>
              <p>{c.none.hint}</p>
              <button type="button" className={styles.textLink} onClick={() => setQuery('')}>{c.none.all}</button>
            </div>
          )}
        </section>
      ) : (
        <>
          {lead && (
            <section className={styles.lead} aria-labelledby="lead-title" data-reveal="">
              <a className={styles.leadMedia} href={hrefOf(lead)} tabIndex={-1} aria-hidden="true" data-rv="">
                <span className={styles.plate} />
                <Cover cover={lead.cover} eager />
              </a>
              <div className={styles.leadText} data-rv="">
                <PostMeta post={lead} lead={c.latest} />
                <h2 id="lead-title" className={styles.leadTitle}>
                  <a href={hrefOf(lead)}>{lead.title}</a>
                </h2>
                <p className={styles.leadExcerpt}>{shorten(lead.excerpt, 330)}</p>
                <a className={styles.cta} href={hrefOf(lead)}>
                  {c.readArticle} <ArrowUpRight size={17} aria-hidden="true" />
                </a>
              </div>
            </section>
          )}

          {rows.length > 0 && (
            <section className={styles.rows} aria-labelledby="rows-title" data-reveal="">
              <header className={styles.sectionHead}>
                <p className={styles.sectionEyebrow}>{c.rows.eyebrow}</p>
                <h2 id="rows-title">{c.rows.title}</h2>
              </header>
              {rows.map((post, i) => (
                <article key={post.slug} className={styles.row} data-flip={i % 2 ? '' : undefined}>
                  <a className={styles.rowMedia} href={hrefOf(post)} tabIndex={-1} aria-hidden="true" data-rv="">
                    <Cover cover={post.cover} />
                  </a>
                  <div className={styles.rowText} data-rv="">
                    <span className={styles.rowNo} aria-hidden="true">{String(i + 2).padStart(2, '0')}</span>
                    <PostMeta post={post} />
                    <h3 className={styles.rowTitle}><a href={hrefOf(post)}>{post.title}</a></h3>
                    <p className={styles.rowExcerpt}>{shorten(post.excerpt, 300)}</p>
                    <a className={styles.readLink} href={hrefOf(post)} aria-label={interpolate(c.readLabel, { title: post.title })}>
                      {c.read} <ArrowRight size={15} aria-hidden="true" />
                    </a>
                  </div>
                </article>
              ))}
            </section>
          )}

          {more.length > 0 && (
            <section className={styles.more} aria-labelledby="more-title" data-reveal="">
              <header className={styles.sectionHead} data-center="">
                <p className={styles.sectionEyebrow}>{c.more.eyebrow}</p>
                <h2 id="more-title">{c.more.title}</h2>
              </header>
              <Rail
                label={c.more.label}
                items={more}
                getKey={(p) => p.slug}
                renderItem={(post) => <PostCard post={post} excerpt={shorten(post.excerpt, 150)} />}
              />
            </section>
          )}

          <section className={styles.recent} aria-labelledby="recent-title" data-reveal="">
            <header className={styles.sectionHead} data-center="">
              <h2 id="recent-title">{c.recent}</h2>
              <span className={styles.ornament} aria-hidden="true"><i /><i /></span>
            </header>
            <Rail
              label={c.recent}
              variant="titles"
              items={posts}
              getKey={(p) => p.slug}
              renderItem={(post, i) => (
                <a className={styles.recentLink} href={hrefOf(post)}>
                  <span className={styles.recentNo} aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                  <span className={styles.recentTitle}>{post.title}</span>
                  <span className={styles.recentMeta}>{post.dateLabel ?? interpolate(c.minRead, { n: post.minutes })}</span>
                </a>
              )}
            />
          </section>
        </>
      )}

      <section className={styles.voices} aria-labelledby="voices-title" data-reveal="">
        <header className={styles.sectionHead} data-center="">
          <p className={styles.sectionEyebrow}>{c.voices.eyebrow}</p>
          <h2 id="voices-title">{c.voices.title}</h2>
          {voices.ready && !voices.items.length && (
            <p className={styles.voicesNote}>
              {c.voices.note}
            </p>
          )}
        </header>
        <FeedbackWall items={voices.items} titleFor={titleFor} />
        <div className={styles.voicesActions}>
          <a className={styles.cta} href="/feedback">
            {c.voices.share} <ArrowUpRight size={17} aria-hidden="true" />
          </a>
          {voices.items.length > 0 && (
            <a className={styles.textLink} href="/feedback#wall">{c.voices.all}</a>
          )}
          <a className={styles.textLink} href="/feedback#send-article">{c.voices.write}</a>
        </div>
      </section>

      {journal.editorFailed && (
        <p className={styles.quietNote}>{c.editorFailed}</p>
      )}
    </main>
  );
}

function hrefOf(post) {
  return `/blogs/${encodeURIComponent(post.slug)}`;
}
