import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { currentPath, subscribePath } from '@/lib/router.js';
import { splitLocale } from '@/i18n/locales.js';
import ThemeToggle from './ThemeToggle.jsx';
import LanguageSwitch from './LanguageSwitch.jsx';
import { useT } from '@/i18n/localeContext.js';
import NavMenu from './NavMenu.jsx';
import { EDUCATION_TOPICS, topicKey } from '@/pages/siteContent.js';

import styles from './Header.module.css';
import { useCart } from '@/cart/useCart.js';
import { useWishlist } from '@/wishlist/useWishlist.js';
import { useSignedIn } from '@/hooks/useSignedIn.js';

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
 * `items` (the education submenu) comes from siteContent with English labels;
 * the header shows each one through the dictionaries' `educationTopics` keys
 * (see topicKey), so the menu is translated without pulling the editorial
 * pages' translations into the main bundle.
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

/*
 * Account and Login are two separate controls, not one "Login / Account"
 * button: Account always opens the account page; the second control is Login
 * while nobody is signed in and Logout once someone is.
 */
const LOGIN = { key: 'nav.login', href: '/login' };

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
  const cart = useCart();
  const wishlist = useWishlist();
  const t = useT();
  const { signedIn, signOut } = useSignedIn();
  const [open, setOpen] = useState(false);
  const panel = useRef(null);
  const toggle = useRef(null);

  const close = useCallback(() => setOpen(false), []);

  /* A submenu topic's label in the visitor's language. A topic added to
     siteContent before it has a dictionary key keeps its English label
     rather than showing the raw key. */
  const topicLabel = (sub) => {
    const key = topicKey(sub.href);
    const label = t(key);
    return label === key ? sub.label : label;
  };

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
      const items = [...(panel.current?.querySelectorAll('a, button') ?? []), toggleButton].filter(Boolean);
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
    const onResize = () => { if (window.innerWidth >= 900) close(); };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
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
      <header className={styles.root} data-site-header="" data-open={open ? '' : undefined} data-scrolled={scrolled ? '' : undefined}>
        <a className={styles.mark} href="/" aria-label="New Grown Diamond — home">
          <span className={styles.markGlyph} aria-hidden="true">N</span>
          <span className={styles.markWords}>New Grown <b>Diamond</b></span>
        </a>

        <nav className={styles.nav} aria-label={t('nav.primary')}>
          {NAV.map((item) => (item.items ? (
            <NavMenu
              key={item.href}
              label={t(item.key)}
              href={item.href}
              items={item.items.map((sub) => ({ ...sub, label: topicLabel(sub) }))}
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

        <div className={styles.utilities}>
          {/* A heart rather than a word: the row already carries Cart and the
              account link, and a third label pushed it into the language control
              at laptop widths. The count and the accessible name say the rest. */}
          {wishlist && (
            <a
              className={`${styles.cart} ${styles.wish}`}
              href="/wishlist"
              aria-current={at('/wishlist') ? 'page' : undefined}
              aria-label={t('nav.wishlistSaved', { count: wishlist.count })}
            >
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false">
                <path d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8 3.6 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.5 0 5.6 3.5 4.4 6.8-1.8 4.6-9.3 9.2-9.3 9.2z" />
              </svg>
              <b>{wishlist.count}</b>
            </a>
          )}
          <a className={styles.cart} href="/cart" aria-current={at('/cart') ? 'page' : undefined}>{t('nav.cart')} <b>{cart.count}</b></a>
          {/* Between 900 and 1199 px the word gives way to a figure — the bar
              holds Account and Login as separate controls now, and at those
              widths the words pushed the theme control off the screen. The
              name stays in the text for screen readers. */}
          <a className={`${styles.account} ${styles.accountLink}`} href={ACCOUNT.href} aria-current={at(ACCOUNT.href) ? 'page' : undefined}>
            <svg className={styles.accountIcon} viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true" focusable="false">
              <circle cx="12" cy="8" r="3.6" />
              <path d="M4.5 20c1.4-3.6 4.2-5.4 7.5-5.4s6.1 1.8 7.5 5.4" />
            </svg>
            <span className={styles.accountText}>{t(ACCOUNT.key)}</span>
          </a>
          {signedIn ? (
            <button type="button" className={`${styles.account} ${styles.logout}`} onClick={signOut}>{t('nav.logout')}</button>
          ) : (
            <a className={`${styles.account} ${styles.login}`} href={LOGIN.href} aria-current={at(LOGIN.href) ? 'page' : undefined}>{t(LOGIN.key)}</a>
          )}
        </div>

        <a className={styles.mobileCart} href="/cart" aria-label={`${t('nav.cart')} (${cart.count})`}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 2-1.6L20 8H6" />
            <circle cx="9.5" cy="19.5" r="1" /><circle cx="17" cy="19.5" r="1" />
          </svg>
          <b>{cart.count}</b>
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
          aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
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
        aria-label={t('nav.siteMenu')}
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
                      <a href={sub.href} aria-current={at(sub.href) ? 'page' : undefined} onClick={close}>{topicLabel(sub)}</a>
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
        {signedIn ? (
          <button type="button" className={`${styles.sheetLink} ${styles.sheetButton}`} onClick={() => { close(); signOut(); }}>
            <span className={styles.sheetIndex}>{String(NAV.length + 2).padStart(2, '0')}</span>
            <span className={styles.sheetLabel}>{t('nav.logout')}</span>
          </button>
        ) : (
          <a className={styles.sheetLink} href={LOGIN.href} onClick={close}>
            <span className={styles.sheetIndex}>{String(NAV.length + 2).padStart(2, '0')}</span>
            <span className={styles.sheetLabel}>{t(LOGIN.key)}</span>
          </a>
        )}
        <a className={styles.sheetLink} href="/cart" onClick={close}>
          <span className={styles.sheetIndex}>{String(NAV.length + 3).padStart(2, '0')}</span>
          <span className={styles.sheetLabel}>{t('nav.cart')} ({cart.count})</span>
        </a>
        {wishlist && (
          <a className={styles.sheetLink} href="/wishlist" onClick={close}>
            <span className={styles.sheetIndex}>{String(NAV.length + 4).padStart(2, '0')}</span>
            <span className={styles.sheetLabel}>{t('nav.wishlist')} ({wishlist.count})</span>
          </a>
        )}

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
