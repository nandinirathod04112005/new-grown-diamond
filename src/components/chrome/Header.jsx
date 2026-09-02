import { useCallback, useEffect, useRef, useState } from 'react';
import ThemeToggle from './ThemeToggle.jsx';

import styles from './Header.module.css';

const NAV = [
  { label: 'Diamonds', href: '/diamonds' },
  { label: 'Jewellery', href: '/jewellery' },
  { label: 'Our story', href: '/about' },
  { label: 'Shapes', href: '/shapes' },
  { label: 'Education', href: '/education' },
  { label: 'Blogs', href: '/blogs' },
  { label: 'Contact', href: '/contact' },
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
const ACCOUNT = { label: 'Account', href: '/account' };

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
  const [open, setOpen] = useState(false);
  const panel = useRef(null);
  const toggle = useRef(null);

  const close = useCallback(() => setOpen(false), []);

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
      <header className={styles.root} data-open={open ? '' : undefined}>
        <a className={styles.mark} href="/">New Grown Diamond</a>

        <nav className={styles.nav} aria-label="Primary">
          {NAV.map((item) => (
            <a key={item.href} className={styles.link} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <a className={styles.account} href={ACCOUNT.href}>{ACCOUNT.label}</a>

        <div className={styles.theme}>
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
            <a
              key={item.href}
              href={item.href}
              className={styles.sheetLink}
              style={{ '--i': i }}
              onClick={close}
            >
              <span className={styles.sheetIndex}>{String(i + 1).padStart(2, '0')}</span>
              <span className={styles.sheetLabel}>{item.label}</span>
            </a>
          ))}
        </nav>

        <a
          className={styles.sheetLink}
          href={ACCOUNT.href}
          onClick={() => setOpen(false)}
        >
          <span className={styles.sheetIndex}>{String(NAV.length + 1).padStart(2, '0')}</span>
          <span className={styles.sheetLabel}>{ACCOUNT.label}</span>
        </a>

        <div className={styles.sheetFoot}>
          <a href="mailto:newgrowndiamonds@gmail.com">newgrowndiamonds@gmail.com</a>
          <span>Surat · Mumbai · New York · Hong Kong</span>
        </div>
      </div>
    </>
  );
}
