import { useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X, ChevronDown } from 'lucide-react';

import Logo from './Logo.jsx';
import Button from '@/components/primitives/Button.jsx';
import { PRIMARY_NAV } from '@/lib/navigation.js';
import styles from './Header.module.css';

/**
 * Sticky header. Transparent over the hero, then a hairline + blur once the
 * page scrolls. Desktop gets a hoverable/focusable mega menu; below 1024px a
 * full-height drawer takes over.
 */
export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [openPanel, setOpenPanel] = useState(null);
  const drawerRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Drawer: lock the page, trap Tab, close on Escape, restore focus on close.
  useEffect(() => {
    if (!menuOpen) return undefined;

    const previouslyFocused = document.activeElement;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;

      const focusable = drawerRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    drawerRef.current?.querySelector('a, button')?.focus();

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [menuOpen]);

  return (
    <>
      <a className="ngd-skip" href="#main">Skip to content</a>

      <header className={`${styles.header} ${scrolled ? styles.scrolled : ''}`}>
        <div className={`ngd-container ${styles.bar}`}>
          <Logo />

          <nav className={styles.nav} aria-label="Primary">
            <ul className={styles.navList}>
              {PRIMARY_NAV.map((item) => (
                <li
                  key={item.label}
                  className={styles.navItem}
                  onMouseEnter={() => item.columns && setOpenPanel(item.label)}
                  onMouseLeave={() => item.columns && setOpenPanel(null)}
                >
                  {item.columns ? (
                    <>
                      <button
                        type="button"
                        className={styles.navLink}
                        aria-expanded={openPanel === item.label}
                        onClick={() =>
                          setOpenPanel(openPanel === item.label ? null : item.label)
                        }
                      >
                        {item.label}
                        <ChevronDown size={13} aria-hidden="true" />
                      </button>
                      <div
                        className={`${styles.panel} ${
                          openPanel === item.label ? styles.panelOpen : ''
                        }`}
                        hidden={openPanel !== item.label}
                      >
                        <div className={styles.panelInner}>
                          {item.columns.map((col) => (
                            <div key={col.title}>
                              <p className={styles.colTitle}>{col.title}</p>
                              <ul className={styles.colList}>
                                {col.links.map((link) => (
                                  <li key={link.label}>
                                    <Link
                                      to={link.to}
                                      className={styles.colLink}
                                      onClick={() => setOpenPanel(null)}
                                    >
                                      {link.label}
                                    </Link>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <NavLink to={item.to} className={styles.navLink}>
                      {item.label}
                    </NavLink>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className={styles.actions}>
            <Button to="/contact" variant="outline" size="sm" className={styles.cta}>
              Enquire
            </Button>
            <button
              ref={toggleRef}
              type="button"
              className={styles.burger}
              aria-expanded={menuOpen}
              aria-controls="ngd-drawer"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      <div
        id="ngd-drawer"
        ref={drawerRef}
        className={`${styles.drawer} ${menuOpen ? styles.drawerOpen : ''}`}
        hidden={!menuOpen}
      >
        <div className={styles.drawerHead}>
          <Logo compact />
          <button
            type="button"
            className={styles.drawerClose}
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <X size={22} />
          </button>
        </div>

        <nav aria-label="Mobile" className={styles.drawerNav}>
          <ul>
            {PRIMARY_NAV.map((item, i) => (
              <li key={item.label} style={{ '--i': i }}>
                <Link
                  to={item.to}
                  className={styles.drawerLink}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className={styles.drawerFoot}>
          <Button to="/contact" variant="solid" onClick={() => setMenuOpen(false)}>
            Book a consultation
          </Button>
        </div>
      </div>
    </>
  );
}
