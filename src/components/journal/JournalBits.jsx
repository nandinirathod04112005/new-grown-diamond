import { interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './JournalBits.copy.js';
import styles from './JournalBits.module.css';

/**
 * The journal's small parts, shared by the index and the article page.
 */

const hrefOf = (post) => `/blogs/${encodeURIComponent(post.slug)}`;

/**
 * A cover photograph, or the house plate when a post has none. `contain`
 * covers are small originals shown whole on black rather than blown up soft.
 * `data-cover` is the hook page styles use to size and animate it.
 */
export function Cover({ cover, eager = false, className = '' }) {
  if (!cover) return <span className={`${styles.noCover} ${className}`} data-cover="" />;
  return (
    <span className={`${styles.cover} ${className}`} data-cover="" data-fit={cover.fit}>
      <img
        src={cover.src}
        alt={cover.alt ?? ''}
        width={cover.width}
        height={cover.height}
        loading={eager ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={eager ? 'high' : undefined}
      />
    </span>
  );
}

/** Date, reading time and author, parted by gold dots. */
export function PostMeta({ post, lead = null, className = '' }) {
  const c = useCopy(COPY);
  return (
    <p className={`${styles.meta} ${className}`}>
      {lead ? <span className={styles.badge}>{lead}</span> : null}
      {post.dateLabel ? <time dateTime={post.dateTime ?? undefined}>{post.dateLabel}</time> : null}
      <span>{interpolate(c.minRead, { n: post.minutes })}</span>
      {post.author ? <span>{post.author}</span> : null}
    </p>
  );
}

/** A post as a card: cover, meta, title, a line or two of text. */
export function PostCard({ post, excerpt }) {
  return (
    <article className={styles.card}>
      <a className={styles.cardMedia} href={hrefOf(post)} tabIndex={-1} aria-hidden="true">
        <Cover cover={post.cover} />
      </a>
      <div className={styles.cardText}>
        <PostMeta post={post} />
        <h3 className={styles.cardTitle}><a href={hrefOf(post)}>{post.title}</a></h3>
        {excerpt ? <p className={styles.cardExcerpt}>{excerpt}</p> : null}
      </div>
    </article>
  );
}
