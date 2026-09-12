import { useEffect, useState } from 'react';

import { useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import { useSiteAnnouncement } from '@/hooks/useSiteSettings.js';
import styles from './AnnouncementBar.module.css';

/*
 * The bar's own words. Small enough to live here rather than in a copy file;
 * the announcement itself is written per language in the Control Centre.
 */
const COPY = {
  en: { region: 'Announcement', dismiss: 'Dismiss announcement', newTab: '(opens in a new tab)' },
  hi: { region: 'सूचना', dismiss: 'सूचना बंद करें', newTab: '(नए टैब में खुलता है)' },
  gu: { region: 'સૂચના', dismiss: 'સૂચના બંધ કરો', newTab: '(નવા ટેબમાં ખૂલે છે)' },
};

const DISMISSED_KEY = 'ngd-announcement-dismissed';

function readDismissed() {
  try {
    const list = JSON.parse(window.localStorage.getItem(DISMISSED_KEY) || '[]');
    return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function rememberDismissed(id) {
  try {
    const next = [id, ...readDismissed().filter((x) => x !== id)].slice(0, 12);
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  } catch {
    // Dismissed for this page view only; nothing else depends on it.
  }
}

/**
 * The slim strip, drawn from data. Used by the bar below and by the Control
 * Centre's preview, so the preview is the real thing rather than a likeness.
 * In a preview the link is inert and nothing is positioned.
 */
export function AnnouncementView({ message, messageLang, link, labels, onDismiss, enter = false, preview = false }) {
  const linkBody = link && (
    <>
      {link.label}
      <span aria-hidden="true"> →</span>
      {link.external && !preview && <span className="u-visually-hidden"> {labels.newTab}</span>}
    </>
  );

  return (
    <aside
      className={styles.root}
      aria-label={labels.region}
      data-enter={enter ? '' : undefined}
      data-preview={preview ? '' : undefined}
    >
      <p className={styles.text}>
        <span className={styles.message} lang={messageLang} title={message}>{message}</span>
        {link && (preview
          ? <span className={styles.link} lang={link.lang}>{linkBody}</span>
          : (
            <a
              className={styles.link}
              href={link.href}
              lang={link.lang}
              target={link.external ? '_blank' : undefined}
              rel={link.external ? 'noopener noreferrer' : undefined}
            >
              {linkBody}
            </a>
          ))}
      </p>
      <button type="button" className={styles.close} onClick={onDismiss} aria-label={labels.dismiss}>
        <svg viewBox="0 0 12 12" width="11" height="11" aria-hidden="true" focusable="false">
          <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
    </aside>
  );
}

/**
 * The announcement bar.
 *
 * WHERE IT SITS, AND WHY IT NEVER MOVES THE PAGE. It hangs from the bottom
 * edge of the fixed header, absolutely positioned against the document, so it
 * takes no room in the layout at all: it is laid over the top padding every
 * page already leaves under the header, and it scrolls away behind the header
 * like any top bar. Nothing is reserved when there is no announcement, and
 * nothing below it moves when one appears or is dismissed.
 *
 * A returning visitor gets it on the first paint, from the saved copy in their
 * browser. A first-time visitor gets it once the one request after idle has
 * answered; it then slides down out from behind the header — a transform, so
 * still nothing shifts.
 *
 * Shown only while published, not past its end date, and not dismissed. A
 * dismissal is remembered for that message; a new message shows again.
 */
export default function AnnouncementBar() {
  const announcement = useSiteAnnouncement();
  const { locale } = useLocale();
  const c = useCopy(COPY);
  const [dismissed, setDismissed] = useState(readDismissed);
  const [now, setNow] = useState(() => Date.now());

  const expired = announcement?.endsAt != null && announcement.endsAt <= now;
  const showing = Boolean(announcement) && !expired && !dismissed.includes(announcement.id);
  /* On screen at the first render means it came from the cache: no entrance. */
  const [fromCache] = useState(showing);

  /* An end date that passes while the page is open takes the bar with it. */
  useEffect(() => {
    const endsAt = announcement?.endsAt;
    if (endsAt == null) return undefined;
    const wait = endsAt - Date.now();
    if (wait <= 0 || wait > 2 ** 31 - 1) return undefined;
    const timer = window.setTimeout(() => setNow(Date.now()), wait + 50);
    return () => window.clearTimeout(timer);
  }, [announcement]);

  if (!showing) return null;

  const own = announcement.message[locale];
  const label = announcement.link && (announcement.link.label[locale] || announcement.link.label.en);
  const link = announcement.link && {
    href: announcement.link.href,
    external: announcement.link.external,
    label,
    lang: announcement.link.label[locale] ? undefined : 'en',
  };

  return (
    <AnnouncementView
      message={own || announcement.message.en}
      /* An untranslated message is English on a Hindi page, and says so. */
      messageLang={own ? undefined : 'en'}
      link={link}
      labels={c}
      enter={!fromCache}
      onDismiss={() => {
        rememberDismissed(announcement.id);
        setDismissed((list) => [announcement.id, ...list]);
      }}
    />
  );
}
