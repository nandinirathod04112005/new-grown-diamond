import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { currentPath, subscribePath } from '@/lib/router.js';
import { splitLocale } from '@/i18n/locales.js';
import ThemeToggle from './ThemeToggle.jsx';
import LanguageSwitch from './LanguageSwitch.jsx';
import { useT } from '@/i18n/localeContext.js';
import NavMenu from './NavMenu.jsx';
import { EDUCATION_TOPICS } from '@/pages/siteContent.js';

import styles from './Header.module.css';

/*
 * Shapes is no longer its own top-level entry.
 *
 * It sits under Education, where it belongs and where the dropdown now lists
 * it, and leaving it in both places gave the same page two ranks in the same
 * row. The route is untouched; only the nav stopped saying it twice.
 */
/*
 * The nav carries a translation KEY rather than a finished label. The English
 * word now lives in one place — the dictionary — instead of being duplicated
 * here and in the footer and the sitemap, which is how a menu ends up saying
 * "Our story" in one place and "Our Story" in another.
 *
 * `items` (the education submenu) still carries its own labels: those come
 * from siteContent and are part of the editorial copy, which is out of scope
 * for this first translation pass and falls back to English by design.
 */
const NAV = [
  { key: 'nav.diamonds', href: '/diamonds' },
  { key: 'nav.jewellery', href: '/jewellery' },
  { key: 'nav.ourStory', href: '/about' },
  { key: 'nav.education', href: '/education', items: EDUCATION_TOPICS },
  { key: 'nav.blogs', href: '/blogs' },
  { key: 'nav.contact', href: '/contact' },
];

/*
 * The account entry is kept OUT of the main nav.
 *
 * The six links above are the sales path — what a retailer or jeweller came
 * here to look at. Signing in is a utility, and putting it in the same row
 * gives it the same weight as the inventory, which is the wrong hierarchy for
 * a trade site. It sits beside the theme control instead, where the other
 * personal settings live.
 */
const ACCOUNT = { key: 'nav.account', href: '/account' };

/**
 * Site header.
 *
 * The mobile nav used to hide every link except the second and the last, which
 * left four of six pages unreachable on a phone — a navigation failure, not a
 * styling choice. It now opens a full-screen menu instead.
 *
 * The overlay is a real dialog: focus is trapped, Escape closes it, the page
 * behind is scroll-locked, and focus returns to the toggle. Those four
 * together are what separate a menu from a trap.
 */
export default function Header() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const panel = useRef(null);
  const toggle = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  /*
   * Which page is this. Read from the router's store rather than from a prop,
   * and compared without the language prefix so /hi/diamonds still lights up
   * Diamonds. Education counts as current on every page it lists, since those
   * are where its own link leads.
   */
  const here = useSyncExternalStore(subscribePath, currentPath, () => '/');
  const page = splitLocale(here).path;
  const at = (href) => page === href || (href !== '/' && page.startsWith(`${href}/`));
  const isCurrent = (item) => at(item.href) || Boolean(item.items?.some((sub) => at(sub.href)));

  /*
   * Once the page has scrolled, a soft fall of ink is laid under the header
   * so the nav reads over whatever passes beneath it. A flag, read once per
   * frame; the header's own height never changes, so nothing below it moves.
   */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    let frame = 0;
    const read = () => { frame = 0; setScrolled(window.scrollY > 40); };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(read); };
    read();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); };
  }, []);

  useEffect(() => {
    if (!open) return undefined;

    const prev = document.body.style.overflow;
    const toggleButton = toggle.current;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector('a')?.focus();

    const onKey = (event) => {
      if (event.key === 'Escape') {
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = panel.current?.querySelectorAll('a, button');
      if (!items?.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
      toggleButton?.focus();
    };
  }, [open, close]);

  return (
    <>
      {/* Outside the header, because the header blends with `difference` and
          a background inside it would be inverted along with the type. */}
      <div className={styles.scrim} data-on={scrolled && !open ? '' : undefined} aria-hidden="true" />
      <header className={styles.root} data-open={open ? '' : undefined}>
        <a className={styles.mark} href="/">New Grown Diamond</a>

        <nav className={styles.nav} aria-label="Primary">
          {NAV.map((item) => (item.items ? (
            <NavMenu
              key={item.href}
              label={t(item.key)}
              href={item.href}
              items={item.items}
              linkClassName={styles.link}
              current={isCurrent(item)}
            />
          ) : (
            <a
              key={item.href}
              className={styles.link}
              href={item.href}
              aria-current={isCurrent(item) ? 'page' : undefined}
            >
              {t(item.key)}
            </a>
          )))}
        </nav>

        <a
          className={styles.account}
          href={ACCOUNT.href}
          aria-current={at(ACCOUNT.href) ? 'page' : undefined}
        >
          {t(ACCOUNT.key)}
        </a>

        <div className={styles.theme}>
          {/* Beside the theme control rather than in the nav: both are settings
              for how the site is presented, not places to go. */}
          <LanguageSwitch />
          <ThemeToggle />
        </div>

        <button
          ref={toggle}
          type="button"
          className={styles.burger}
          aria-expanded={open}
          aria-controls="site-menu"
          aria-label={open ? 'Close menu' : 'Open menu'}
          onClick={() => setOpen((v) => !v)}
        >
          <span /><span />
        </button>
      </header>

      <div
        id="site-menu"
        ref={panel}
        className={styles.sheet}
        data-open={open ? '' : undefined}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
        hidden={!open}
      >
        <nav className={styles.sheetNav}>
          {NAV.map((item, i) => (
            <div key={item.href} className={styles.sheetItem}>
              <a
                href={item.href}
                className={styles.sheetLink}
                style={{ '--i': i }}
                aria-current={isCurrent(item) ? 'page' : undefined}
                onClick={close}
              >
                <span className={styles.sheetIndex}>{String(i + 1).padStart(2, '0')}</span>
                <span className={styles.sheetLabel}>{t(item.key)}</span>
              </a>

              {/* Nested rather than a second sheet: a phone menu that opens
                  another phone menu is a place to get lost in, and four links
                  cost less room than the control that would hide them. */}
              {item.items && (
                <ul className={styles.subList}>
                  {item.items.map((sub) => (
                    <li key={sub.href}>
                      <a href={sub.href} aria-current={at(sub.href) ? 'page' : undefined} onClick={close}>{sub.label}</a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>

        <a
          className={styles.sheetLink}
          href={ACCOUNT.href}
          onClick={() => setOpen(false)}
        >
          <span className={styles.sheetIndex}>{String(NAV.length + 1).padStart(2, '0')}</span>
          <span className={styles.sheetLabel}>{t(ACCOUNT.key)}</span>
        </a>

        <div className={styles.sheetLang}>
          <LanguageSwitch />
        </div>

        <div className={styles.sheetFoot}>
          <a href="mailto:newgrowndiamonds@gmail.com">newgrowndiamonds@gmail.com</a>
          <span>Surat · Mumbai · New York · Hong Kong</span>
        </div>
      </div>
    </>
  );
}
