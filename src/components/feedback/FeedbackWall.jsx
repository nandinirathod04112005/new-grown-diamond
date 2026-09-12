import { useLocale, interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import { feedbackDate, TOPIC_LABEL } from '@/lib/supabase/queries/feedback.js';
import COPY from './Feedback.copy.js';
import { StarsDisplay } from './Stars.jsx';
import styles from './Feedback.module.css';

/**
 * One approved piece of feedback.
 *
 * Only what the author chose to publish is here: the name and city they
 * typed, their rating and their words. `about` names the journal article when
 * the feedback was left on one.
 */
export function FeedbackCard({ item, about, index = 0 }) {
  const { locale } = useLocale();
  const c = useCopy(COPY);
  return (
    <article className={styles.card} data-rv="" style={{ '--i': index }}>
      <StarsDisplay value={item.rating} />
      <blockquote className={styles.quote}>
        <p>{item.message}</p>
      </blockquote>
      <footer className={styles.cardFoot}>
        <span className={styles.who}>
          <b>{item.display_name}</b>
          {item.city ? <span>{item.city}</span> : null}
        </span>
        <span className={styles.when}>
          {about
            ? <a href={`/blogs/${encodeURIComponent(item.blog_slug)}`}>{interpolate(c.on, { title: about })}</a>
            : item.topic && item.topic !== 'general' ? c.topics[item.topic] ?? TOPIC_LABEL[item.topic] : null}
          {item.created_at ? <time dateTime={item.created_at}>{feedbackDate(item.created_at, locale)}</time> : null}
        </span>
      </footer>
    </article>
  );
}

/** Approved feedback as a grid of cards. Renders nothing for an empty list. */
export default function FeedbackWall({ items, titleFor }) {
  if (!items?.length) return null;
  return (
    <div className={styles.wall}>
      {items.map((item, i) => (
        <FeedbackCard
          key={item.id}
          item={item}
          index={i % 6}
          about={item.blog_slug && titleFor ? titleFor(item.blog_slug) : null}
        />
      ))}
    </div>
  );
}
