import { useEffect, useMemo, useRef, useState } from 'react';

import ArticleForm from '@/components/feedback/ArticleForm.jsx';
import FEEDBACK_COPY from '@/components/feedback/Feedback.copy.js';
import FeedbackForm from '@/components/feedback/FeedbackForm.jsx';
import FeedbackWall from '@/components/feedback/FeedbackWall.jsx';
import { StarsDisplay } from '@/components/feedback/Stars.jsx';
import { useAuth } from '@/hooks/useAuth.js';
import { useReveal } from '@/hooks/useReveal.js';
import { useLocale, interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import { getLenis } from '@/lib/motion/lenis.js';
import { archivePosts, loadJournal, localizePosts } from '@/lib/journal.js';
import {
  feedbackDate,
  listMyFeedback,
  loadFeedbackSummary,
  loadFeedbackWall,
  TOPIC_LABEL,
} from '@/lib/supabase/queries/feedback.js';
import COPY from './FeedbackPage.copy.js';
import styles from './FeedbackPage.module.css';

/* Each status chip's tone; its words are `status` in FeedbackPage.copy.js. */
const STATUS_TONE = {
  pending: 'pending',
  approved: 'on',
  rejected: 'off',
};

/* Which form a link opened: /feedback#send-article opens the article form. */
const initialMode = () => (typeof window !== 'undefined' && window.location.hash === '#send-article' ? 'article' : 'feedback');

/**
 * Write to us: feedback on how we did, or an article for the journal.
 *
 * Both go to the desk as messages — no account needed — and nothing is
 * published until the team has read it. What the wall shows has been approved
 * in the Control Centre; nothing here is seeded or sample text.
 */
export default function FeedbackPage() {
  const auth = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [summary, setSummary] = useState({ count: 0, average: null });
  const [wall, setWall] = useState({ ready: false, items: [] });
  const [topic, setTopic] = useState('all');
  const [mine, setMine] = useState({ userId: null, items: [] });
  const [posts, setPosts] = useState(() => archivePosts());
  const root = useRef(null);
  const { locale } = useLocale();
  const c = useCopy(COPY);
  const shared = useCopy(FEEDBACK_COPY);

  useEffect(() => {
    let alive = true;
    loadFeedbackSummary()
      .then((r) => { if (alive) setSummary(r); })
      .catch((err) => console.error('[NGD feedback] summary', err));
    loadFeedbackWall({ limit: 60 })
      .then((r) => { if (alive) setWall({ ready: true, items: r.items }); })
      .catch((err) => {
        console.error('[NGD feedback] wall', err);
        if (alive) setWall({ ready: true, items: [] });
      });
    loadJournal().then((r) => { if (alive) setPosts(r.posts); });
    return () => { alive = false; };
  }, []);

  const userId = auth.user?.id ?? null;
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!userId) return undefined;
    let alive = true;
    listMyFeedback()
      .then((r) => { if (alive) setMine({ userId, items: r.items }); })
      .catch((err) => console.error('[NGD feedback] mine', err));
    return () => { alive = false; };
  }, [userId, refresh]);

  const myItems = mine.userId === userId ? mine.items : [];

  const titleFor = useMemo(() => {
    const map = new Map(localizePosts(posts, locale).map((p) => [p.slug, p.title]));
    return (slug) => map.get(slug) ?? null;
  }, [posts, locale]);

  const topics = useMemo(() => {
    const present = new Set(wall.items.map((f) => f.topic));
    return Object.keys(TOPIC_LABEL).filter((k) => present.has(k));
  }, [wall.items]);

  const shown = topic === 'all' ? wall.items : wall.items.filter((f) => f.topic === topic);

  useReveal(root, [shown.length, topic, myItems.length, mode]);

  /*
   * A link can open this page on the article form (#send-article) or at the
   * wall (#wall). The mode is read at mount; this follows a change of fragment
   * on the page itself, and takes the reader to the section the link named
   * once it has rendered.
   */
  useEffect(() => {
    const go = () => {
      const hash = window.location.hash;
      if (hash === '#send-article') setMode('article');
      const target = hash === '#wall' ? document.getElementById('wall')
        : hash === '#send-article' ? document.getElementById('write-title') : null;
      if (!target) return;
      const lenis = getLenis();
      if (lenis) lenis.scrollTo(target, { offset: -110 });
      else target.scrollIntoView({ block: 'start' });
    };
    const first = window.setTimeout(go, 350);
    window.addEventListener('hashchange', go);
    return () => { window.clearTimeout(first); window.removeEventListener('hashchange', go); };
  }, []);

  const choose = (next) => {
    setMode(next);
    /* The address follows the choice, so the article form can be linked to. */
    try {
      window.history.replaceState(window.history.state, '', next === 'article' ? '#send-article' : window.location.pathname);
    } catch { /* an old browser keeps its address; the form still switches */ }
  };

  return (
    <main className={styles.page} ref={root}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{c.hero.eyebrow}</p>
          <h1 className={styles.title}>{c.hero.titleLead}<em>{c.hero.titleEm}</em></h1>
          <p className={styles.intro}>
            {c.hero.intro}
          </p>
        </div>

        {summary.count > 0 && (
          <div className={styles.score} aria-label={interpolate(c.score.label, { average: summary.average, count: summary.count })}>
            <b>{summary.average?.toFixed(1)}</b>
            <StarsDisplay value={summary.average} size={18} />
            <span>{interpolate(summary.count === 1 ? c.score.one : c.score.many, { count: summary.count })}</span>
          </div>
        )}
      </header>

      <section className={styles.write} aria-labelledby="write-title" data-reveal="">
        <div className={styles.writeForm}>
          <h2 id="write-title" className={styles.h2}>{mode === 'article' ? c.write.article : c.write.feedback}</h2>

          <div className={styles.switch} role="group" aria-label={c.write.switch}>
            <button type="button" aria-pressed={mode === 'feedback'} onClick={() => choose('feedback')}>
              {c.write.feedbackOption}
              <small>{c.write.feedbackHint}</small>
            </button>
            <button type="button" aria-pressed={mode === 'article'} onClick={() => choose('article')}>
              {c.write.articleOption}
              <small>{c.write.articleHint}</small>
            </button>
          </div>

          {mode === 'article'
            ? <ArticleForm />
            : <FeedbackForm onSubmitted={() => setRefresh((n) => n + 1)} />}
        </div>

        <div className={styles.side}>
          {mode === 'article' ? (
            <ol className={styles.steps} aria-label={c.articleSteps.label}>
              <li>
                <b>{c.articleSteps.write.title}</b>
                <span>{c.articleSteps.write.text}</span>
              </li>
              <li>
                <b>{c.articleSteps.edit.title}</b>
                <span>{c.articleSteps.edit.text}</span>
              </li>
              <li>
                <b>{c.articleSteps.publish.title}</b>
                <span>{c.articleSteps.publish.text}</span>
              </li>
            </ol>
          ) : (
            <ol className={styles.steps} aria-label={c.feedbackSteps.label}>
              <li>
                <b>{c.feedbackSteps.write.title}</b>
                <span>{c.feedbackSteps.write.text}</span>
              </li>
              <li>
                <b>{c.feedbackSteps.review.title}</b>
                <span>{c.feedbackSteps.review.text}</span>
              </li>
              <li>
                <b>{c.feedbackSteps.publish.title}</b>
                <span>{c.feedbackSteps.publish.text}</span>
              </li>
            </ol>
          )}

          {userId && mode === 'feedback' && (
            <div className={styles.mine}>
              <h3>{c.mine.title}</h3>
              {myItems.length ? (
                <ul>
                  {myItems.map((f) => (
                    <li key={f.id}>
                      <div className={styles.mineHead}>
                        <StarsDisplay value={f.rating} size={13} />
                        <span className={styles.chip} data-tone={STATUS_TONE[f.status]}>{c.status[f.status]}</span>
                      </div>
                      <p>{f.message}</p>
                      <div className={styles.mineFoot}>
                        <span>
                          {feedbackDate(f.created_at, locale)}
                          {f.blog_slug && titleFor(f.blog_slug)
                            ? ` · ${interpolate(shared.on, { title: titleFor(f.blog_slug) })}`
                            : ` · ${shared.topics[f.topic] ?? TOPIC_LABEL[f.topic] ?? ''}`}
                        </span>
                        <span>{f.id}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.quiet}>{c.mine.none}</p>
              )}
              <p className={styles.quiet}>
                {c.mine.changeLead}<a href="/contact">{c.mine.changeLink}</a>{c.mine.changeTail}
              </p>
            </div>
          )}
        </div>
      </section>

      <section className={styles.wallSection} id="wall" aria-labelledby="wall-title" data-reveal="">
        <header className={styles.wallHead}>
          <div>
            <p className={styles.eyebrow}>{c.wall.eyebrow}</p>
            <h2 id="wall-title" className={styles.h2}>{c.wall.title}</h2>
          </div>
          {topics.length > 1 && (
            <div className={styles.filters} role="group" aria-label={c.wall.filters}>
              {['all', ...topics].map((k) => (
                <button
                  key={k}
                  type="button"
                  className={styles.filter}
                  aria-pressed={topic === k}
                  onClick={() => setTopic(k)}
                >
                  {k === 'all' ? c.wall.all : shared.topics[k] ?? TOPIC_LABEL[k]}
                </button>
              ))}
            </div>
          )}
        </header>

        {shown.length ? (
          <FeedbackWall items={shown} titleFor={titleFor} />
        ) : (
          <p className={styles.empty}>
            {wall.ready ? c.wall.empty : c.wall.loading}
          </p>
        )}
      </section>
    </main>
  );
}
