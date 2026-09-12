import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Bell, ChevronRight, Cog, Eye, FileText, Gem, Grid2x2, House, Image, Inbox,
  Layers, List, Lock, LogOut, Menu, MessageSquareQuote, Newspaper, PanelLeftClose,
  PanelLeftOpen, Search, ShoppingCart, Sparkles, SquarePen, TrendingUp, Users, X,
} from 'lucide-react';

import { useAuth } from '@/hooks/useAuth.js';
import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import { countUnread, onUnreadChange } from '@/lib/supabase/queries/adminNotifications.js';
import { MODULES, moduleForPath } from './adminModules.js';
import styles from './AdminLayout.module.css';

const ICONS = {
  grid: Grid2x2, gem: Gem, ring: Sparkles, layers: Layers, users: Users,
  inbox: Inbox, file: FileText, lock: Lock, eye: Eye, cart: ShoppingCart,
  doc: SquarePen, image: Image, home: House, search: Search, chart: TrendingUp,
  list: List, bell: Bell, cog: Cog, pen: Newspaper, message: MessageSquareQuote,
};

const RAIL_KEY = 'ngd-admin-rail';

/**
 * The console shell: rail, command bar, breadcrumb, content.
 *
 * Built as a plain grid whose first column is a CSS custom property, so
 * collapsing the rail is one number changing rather than a class swapped on
 * six elements. The rail's own contents fade with it; the grid track is what
 * actually moves, and the browser animates that on the compositor.
 *
 * At phone width the rail stops being a column at all and becomes an overlay,
 * because a 16rem column on a 390px screen leaves nothing for the table that
 * is the entire point of the page.
 */
export default function AdminLayout({ path, children }) {
  const { profile, signOut } = useAuth();
  const active = moduleForPath(path);

  /* Read once at mount: a rail that re-reads storage on every render will
     fight the user the moment anything else writes to it. */
  const [wide, setWide] = useState(() => {
    try { return localStorage.getItem(RAIL_KEY) !== 'narrow'; } catch { return true; }
  });
  const [drawer, setDrawer] = useState(false);
  const [menu, setMenu] = useState(false);
  const [query, setQuery] = useState('');

  const root = useRef(null);
  const menuRef = useRef(null);

  const toggleRail = useCallback(() => {
    setWide((w) => {
      try { localStorage.setItem(RAIL_KEY, w ? 'narrow' : 'wide'); } catch { /* not fatal */ }
      return !w;
    });
  }, []);

  /*
   * Close the overlays when the route changes.
   *
   * Adjusted DURING render against the last path we drew, rather than in an
   * effect. An effect would paint the new page once with the drawer still
   * over it and then immediately re-render to take it away — a visible flash
   * of the menu covering the page it just navigated to, and the cascading
   * render the linter is right to object to.
   */
  /* New arrivals not yet marked read, or null while it cannot be known (a
     failed read shows no badge rather than a made-up zero). Re-read on every
     page change and whenever the inbox marks something read. */
  const [unread, setUnread] = useState(null);
  useEffect(() => {
    let alive = true;
    const refresh = () => countUnread().then((n) => { if (alive) setUnread(n); }).catch(() => {});
    refresh();
    const off = onUnreadChange(refresh);
    return () => { alive = false; off(); };
  }, [path]);

  const [drawnFor, setDrawnFor] = useState(path);
  if (drawnFor !== path) {
    setDrawnFor(path);
    if (drawer) setDrawer(false);
    if (menu) setMenu(false);
  }

  useEffect(() => {
    if (!drawer && !menu) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') { setDrawer(false); setMenu(false); } };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawer, menu]);

  /* A click anywhere else dismisses the profile menu. Pointerdown rather than
     click, so it closes on the press instead of waiting for the release. */
  useEffect(() => {
    if (!menu) return undefined;
    const away = (e) => { if (!menuRef.current?.contains(e.target)) setMenu(false); };
    window.addEventListener('pointerdown', away);
    return () => window.removeEventListener('pointerdown', away);
  }, [menu]);

  /*
   * The page transition: opacity and 10px, once, on the way in.
   *
   * Deliberately short. This is a console — a transition that has to finish
   * before a table can be read is a cost paid on every single navigation, and
   * it is paid by someone doing repetitive work.
   */
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    gsap.fromTo(
      '[data-admin-page]',
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power2.out' },
    );
  }, { scope: root, dependencies: [path] });

  const searchable = MODULES.filter(
    (m) => !query || m.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  const rail = (
    <nav className={styles.nav} aria-label="Admin sections">
      {(query ? searchable : MODULES).map((m) => {
        const Icon = ICONS[m.icon] ?? Grid2x2;
        const setup = m.state === 'setup';
        const on = m.key === active.key;
        return (
          <a
            key={m.key}
            className={styles.link}
            href={setup ? undefined : m.href}
            data-on={on ? '' : undefined}
            data-setup={setup ? '' : undefined}
            /* Not a link when there is nothing to link to: a disabled anchor
               with an href still navigates on middle-click and still lands in
               the tab order promising something it cannot deliver. */
            role={setup ? 'button' : undefined}
            aria-disabled={setup ? 'true' : undefined}
            aria-current={on ? 'page' : undefined}
            tabIndex={setup ? -1 : undefined}
            title={setup ? `Setup required — needs ${m.missing?.join(', ')}` : m.label}
          >
            <Icon className={styles.icon} size={17} strokeWidth={1.5} aria-hidden="true" />
            <span className={styles.linkLabel}>{m.label}</span>
            {setup && <span className={styles.tag}>Setup</span>}
            {m.state === 'partial' && <span className={styles.tagSoft}>Soon</span>}
            {m.key === 'notifications' && unread > 0 && (
              <span className={styles.count} aria-label={`${unread} unread`}>{unread > 99 ? '99+' : unread}</span>
            )}
          </a>
        );
      })}
      {query && searchable.length === 0 && (
        <p className={styles.noHits}>No section matches “{query}”.</p>
      )}
    </nav>
  );

  return (
    <div
      ref={root}
      className={styles.shell}
      data-wide={wide ? '' : undefined}
      data-drawer={drawer ? '' : undefined}
    >
      {/* ---- the rail ---- */}
      <aside className={styles.rail}>
        <div className={styles.brand}>
          <a className={styles.mark} href="/">NGD</a>
          <span className={styles.brandText}>Control Centre</span>
          <button
            type="button"
            className={styles.railToggle}
            onClick={toggleRail}
            aria-label={wide ? 'Collapse the sidebar' : 'Expand the sidebar'}
          >
            {wide ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
          </button>
        </div>
        {rail}
        <a className={styles.exit} href="/">
          <ChevronRight className={styles.icon} size={16} aria-hidden="true" />
          <span className={styles.linkLabel}>Back to the site</span>
        </a>
      </aside>

      {/* The scrim is the drawer's dismiss target on small screens. It is only
          in the tree while the drawer is open, so it can never swallow a click
          on the desktop layout. */}
      {drawer && (
        <button
          type="button"
          className={styles.scrim}
          aria-label="Close the menu"
          onClick={() => setDrawer(false)}
        />
      )}

      <div className={styles.main}>
        {/* ---- the command bar ---- */}
        <header className={styles.bar}>
          <button
            type="button"
            className={styles.burger}
            onClick={() => setDrawer((d) => !d)}
            aria-label="Open the menu"
            aria-expanded={drawer}
          >
            {drawer ? <X size={18} /> : <Menu size={18} />}
          </button>

          <nav className={styles.crumbs} aria-label="Breadcrumb">
            <a href="/admin">Admin</a>
            {active.key !== 'overview' && (
              <>
                <ChevronRight size={13} aria-hidden="true" />
                <span aria-current="page">{active.label}</span>
              </>
            )}
          </nav>

          <div className={styles.searchWrap}>
            <Search size={15} aria-hidden="true" />
            <input
              className={styles.search}
              type="search"
              value={query}
              placeholder="Search sections…"
              aria-label="Search admin sections"
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <a className={styles.create} href="/admin/diamonds/new">
            <span aria-hidden="true">+</span> New diamond
          </a>

          {/* The inbox (Notifications). Its dot is backed by a real count of
              arrivals not yet marked read, and is absent when that count could
              not be read, never a guess. */}
          <a
            className={styles.iconBtn}
            href="/admin/notifications"
            title="Notifications"
            aria-label={unread > 0 ? `Notifications: ${unread} unread` : 'Notifications'}
          >
            <Bell size={17} strokeWidth={1.5} />
            {unread > 0 && <span className={styles.dot} aria-hidden="true" />}
          </a>

          <div className={styles.who} ref={menuRef}>
            <button
              type="button"
              className={styles.avatar}
              onClick={() => setMenu((m) => !m)}
              aria-expanded={menu}
              aria-haspopup="menu"
            >
              {(profile?.full_name || profile?.email || 'A').trim().charAt(0).toUpperCase()}
            </button>
            {menu && (
              <div className={styles.menu} role="menu">
                <p className={styles.menuName}>{profile?.full_name || 'Administrator'}</p>
                <p className={styles.menuMail}>{profile?.email}</p>
                <a className={styles.menuItem} href="/account" role="menuitem">Your account</a>
                <button type="button" className={styles.menuItem} onClick={signOut} role="menuitem">
                  <LogOut size={14} aria-hidden="true" /> Sign out
                </button>
              </div>
            )}
          </div>
        </header>

        <main className={styles.content} data-admin-page>
          {children}
        </main>
      </div>
    </div>
  );
}
