import { useEffect, useRef, useState } from 'react';
import { Check, Globe } from 'lucide-react';

import { LOCALES, LOCALE_CODES } from '@/i18n/locales.js';
import { useLocale } from '@/i18n/LocaleProvider.jsx';
import styles from './LanguageSwitch.module.css';

/**
 * The language switcher.
 *
 * EACH OPTION IS A REAL LINK, not a button that swaps state. That matters more
 * than it looks: the languages live at different URLs, so a link is what lets
 * someone open Gujarati in a new tab, bookmark it, or send it to a colleague —
 * and it is what a search engine follows to discover the other two versions
 * exist. A button would make all three languages one address again, which is
 * the whole thing the path prefixes are there to avoid.
 *
 * Each option is labelled in ITS OWN language — "ગુજરાતી", not "Gujarati" —
 * because someone looking for Gujarati is looking for the Gujarati word. The
 * English name is carried in `lang`-tagged markup for screen readers, which is
 * also what stops an English synthesiser trying to pronounce Devanagari.
 */
export default function LanguageSwitch({ compact = false }) {
  const { locale, meta, t, switchTo } = useLocale();
  const [open, setOpen] = useState(false);
  const wrap = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const away = (e) => { if (!wrap.current?.contains(e.target)) setOpen(false); };
    const key = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('pointerdown', away);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointerdown', away);
      window.removeEventListener('keydown', key);
    };
  }, [open]);

  return (
    <div className={`${styles.wrap} ${compact ? styles.compact : ''}`} ref={wrap}>
      <button
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t('nav.changeLanguage')}
      >
        <Globe size={15} strokeWidth={1.5} aria-hidden="true" />
        {/* The current language in its own script, which doubles as the cue
            that this control is about language at all. */}
        <span className={styles.current} lang={meta.htmlLang}>{meta.endonym}</span>
      </button>

      {open && (
        <ul className={styles.menu} role="list">
          {LOCALE_CODES.map((code) => {
            const l = LOCALES[code];
            const active = code === locale;
            return (
              <li key={code}>
                <a
                  className={styles.option}
                  href={switchTo(code)}
                  /* Tells the browser and assistive tech what language is on
                     the other end, so the link text is spoken correctly and
                     the target page's language is known before it loads. */
                  lang={l.htmlLang}
                  hrefLang={l.hreflang}
                  aria-current={active ? 'true' : undefined}
                  data-on={active ? '' : undefined}
                >
                  <span className={styles.tick}>{active ? <Check size={13} aria-hidden="true" /> : null}</span>
                  <span className={styles.endonym}>{l.endonym}</span>
                  {/* The English name, for anyone who does not read the
                      script well enough to recognise its own name in it. */}
                  {l.endonym !== l.label && (
                    <span className={styles.latin} lang="en">{l.label}</span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
