import { useEffect, useState } from 'react';

import { interpolate, useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './LegalLayout.copy.js';
import styles from './LegalPage.module.css';

/**
 * The frame both legal pages share: an opening with the title, the date the
 * text was last changed (when there is one — none is invented), the lead
 * paragraphs, then the text beside a contents list that follows the reader.
 *
 * One layout rather than two copies, so the Privacy Policy and the Terms read
 * as one set of documents and a change to either frame changes both.
 */
export default function LegalLayout({ eyebrow, title, updated = null, lead = null, toc, children }) {
  const { locale, t } = useLocale();
  /* The legal text is the English original in every language, so in Hindi and
     Gujarati it is marked as English: a screen reader then reads it in an
     English voice instead of sounding out English words as Hindi. */
  const english = locale !== 'en' ? 'en' : undefined;
  const c = useCopy(COPY);
  const [active, setActive] = useState(toc[0]?.id);

  /* The contents list marks whichever section heading most recently crossed
     the upper part of the screen. */
  useEffect(() => {
    const heads = toc.map((t) => document.getElementById(t.id)).filter(Boolean);
    if (!heads.length || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: '-15% 0px -70% 0px', threshold: 0 },
    );
    heads.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [toc]);

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>{eyebrow ?? c.eyebrow}</p>
        <h1 className={styles.title} lang={english}>{title}</h1>
        {/* In Hindi and Gujarati only the frame is translated; the text below
            is the English original, which has not been reviewed in either
            language. Said plainly before anyone starts reading it. */}
        {locale !== 'en' && (
          <p className={styles.updated}>
            <span aria-hidden="true" /> {t('notice.englishOnly')}
          </p>
        )}
        {updated && (
          <p className={styles.updated}>
            <span aria-hidden="true" /> {c.updated} <time dateTime={updated.iso}>{updated.label}</time>
          </p>
        )}
        {lead && <div className={styles.lead} lang={english}>{lead}</div>}
      </header>

      <div className={styles.layout}>
        <nav className={styles.toc} aria-label={c.toc}>
          <p className={styles.tocTitle}>{c.toc}</p>
          <ol lang={english}>
            {toc.map((t) => (
              <li key={t.id} data-sub={t.sub ? '' : undefined}>
                <a href={`#${t.id}`} aria-current={active === t.id ? 'true' : undefined}>{t.label}</a>
              </li>
            ))}
          </ol>
        </nav>

        {/* The body keeps still: a long legal text reads better without every
            paragraph rising into place, so the site-wide reveal is off here. */}
        <article className={styles.body} data-motion="off" lang={english}>
          {children}
        </article>
      </div>
    </main>
  );
}

/* A heading that can be linked to, with a visible anchor on hover and focus. */
export function H({ as: Tag = 'h2', id, children }) {
  const c = useCopy(COPY);
  const cls = Tag === 'h2' ? styles.h2 : Tag === 'h3' ? styles.h3 : styles.h4;
  return (
    <Tag id={id} className={cls}>
      {children}
      {id && (
        <a className={styles.anchor} href={`#${id}`} aria-label={interpolate(c.anchor, { heading: typeof children === 'string' ? children : c.thisSection })}>
          #
        </a>
      )}
    </Tag>
  );
}

