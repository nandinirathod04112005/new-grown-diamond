import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import styles from './NavMenu.module.css';

/**
 * A nav item that also opens a list of pages beneath it.
 *
 * The panel is PORTALLED out of the header, and that is not tidiness — it is
 * the only way it can be seen. `.root` carries `mix-blend-mode: difference`,
 * which composites the header and everything inside it as one group against
 * whatever is behind; a panel rendered in place would have its own background
 * differenced away to near-black on the dark pages and inverted on the light
 * ones. Outside the header it paints normally, and it also escapes the
 * header's stacking context, so it can never be clipped by it.
 *
 * The label stays a real link. A dropdown that swallows its own destination
 * makes Education unreachable in one click, so the anchor navigates and a
 * separate chevron opens — which is also what makes the whole thing work from
 * a keyboard without borrowing ARIA menu semantics it does not need. This is a
 * disclosure: a button, expanded or not, and a list of links.
 */
export default function NavMenu({ label, href, items, className, linkClassName }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const group = useRef(null);
  const trigger = useRef(null);
  const shut = useRef(null);
  const id = useId();

  /* Measured on open rather than tracked, because the header is fixed and the
     panel is only ever on screen while it is being pointed at. */
  const place = useCallback(() => {
    const box = group.current?.getBoundingClientRect();
    if (box) setRect({ left: box.left, top: box.bottom });
  }, []);

  const show = useCallback(() => {
    clearTimeout(shut.current);
    place();
    setOpen(true);
  }, [place]);

  /*
   * A grace period on the way out.
   *
   * The panel hangs below the label with a gap between them, and a pointer
   * travelling diagonally toward the third item leaves the label before it
   * arrives. Closing on that would make the menu unusable for anyone who does
   * not move in straight lines.
   */
  const hide = useCallback(() => {
    clearTimeout(shut.current);
    shut.current = setTimeout(() => setOpen(false), 140);
  }, []);

  const closeNow = useCallback(() => {
    clearTimeout(shut.current);
    setOpen(false);
  }, []);

  useEffect(() => () => clearTimeout(shut.current), []);

  useEffect(() => {
    if (!open) return undefined;

    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      closeNow();
      trigger.current?.focus();
    };
    // Anything that moves the panel away from the label closes it: re-measuring
    // mid-scroll would have it chase the page instead.
    const onAway = (e) => {
      if (!group.current?.contains(e.target) && !e.target.closest?.(`[data-navmenu="${id}"]`)) closeNow();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onAway);
    window.addEventListener('scroll', closeNow, { passive: true });
    window.addEventListener('resize', closeNow);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onAway);
      window.removeEventListener('scroll', closeNow);
      window.removeEventListener('resize', closeNow);
    };
  }, [open, closeNow, id]);

  return (
    <div
      ref={group}
      className={`${styles.group} ${className ?? ''}`}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <a className={linkClassName} href={href}>{label}</a>

      <button
        ref={trigger}
        type="button"
        className={styles.chevron}
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${label} pages`}
        /*
         * Opened by press, never by focus. Opening on focus made Escape
         * useless: closing returns focus to this button, which immediately
         * reopened the panel it had just dismissed. A disclosure button
         * answering Enter and Space is what a keyboard expects anyway.
         */
        onClick={() => (open ? closeNow() : show())}
      >
        <svg viewBox="0 0 10 6" aria-hidden="true" focusable="false">
          <path d="M1 1l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      </button>

      {open && rect && createPortal(
        <div
          id={id}
          data-navmenu={id}
          className={styles.panel}
          style={{ '--x': `${rect.left}px`, '--y': `${rect.top}px` }}
          onMouseEnter={show}
          onMouseLeave={hide}
        >
          <ul>
            {items.map((item) => (
              <li key={item.href}>
                <a href={item.href} onClick={closeNow}>{item.label}</a>
              </li>
            ))}
          </ul>
        </div>,
        document.body,
      )}
    </div>
  );
}
