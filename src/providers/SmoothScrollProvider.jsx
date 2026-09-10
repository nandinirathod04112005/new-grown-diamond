import { useEffect, useRef } from 'react';

import { createSmoothScroll, getLenis } from '@/lib/motion/lenis.js';
import useReducedMotion from '@/hooks/useReducedMotion.js';

/**
 * Owns the single Lenis instance for the app's lifetime.
 *
 * StrictMode mounts effects twice in development; cleanup destroys the
 * instance and removes its ticker callback, so the second mount starts clean
 * instead of stacking a second smoother on top of the first.
 */
export default function SmoothScrollProvider({ children }) {
  const handle = useRef(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    handle.current = createSmoothScroll();
    return () => {
      handle.current?.destroy();
      handle.current = null;
    };
  }, [reduced]);

  /*
   * In-page anchors, which the smoother was quietly eating.
   *
   * The router deliberately leaves a same-page #hash to the browser, because a
   * hash is a scroll and not a navigation. But Lenis owns the scroll position:
   * the browser's native jump landed, and on the next frame the smoother wrote
   * its own position back over it. Measured on /contact, "Start an enquiry"
   * put the page at 1850px and it was back at 0 within 600ms — the button
   * appeared to do nothing at every viewport, and a shared /contact#enquiry
   * link opened at the top of the page.
   *
   * So the scroll is handed to whoever owns it. Lenis when it is running, the
   * element itself when it is not, which is what reduced motion gets.
   */
  useEffect(() => {
    let landed = false;

    const goToHash = (hash, immediate) => {
      if (!hash || hash.length < 2) return;
      let target = null;
      try {
        target = document.querySelector(hash);
      } catch {
        return; // A hash that is not a valid selector is not ours to handle.
      }
      if (!target) return;

      const lenis = getLenis();
      if (lenis) lenis.scrollTo(target, { immediate, offset: 0 });
      else target.scrollIntoView({ behavior: immediate ? 'auto' : 'smooth', block: 'start' });
    };

    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target.closest?.('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href') || '';
      if (!href.startsWith('#') || href === '#') return;

      const url = new URL(anchor.href, window.location.href);
      if (url.pathname !== window.location.pathname) return;

      event.preventDefault();
      /* The address bar still gets the hash, so the link is shareable and Back
         behaves — it is only the scrolling that is taken over. */
      window.history.pushState({}, '', url.hash);
      goToHash(url.hash, false);
    };

    /*
     * A page opened directly at /contact#enquiry.
     *
     * The element does not exist yet at mount: the route is lazy, the section
     * renders after its data settles, and a single timer fired before any of
     * that and found nothing. So this looks again a few times over the first
     * couple of seconds and stops the moment it lands — which also means a
     * hash naming nothing costs six null queries and no scrolling at all.
     */
    const attempts = [120, 350, 700, 1200, 1800, 2500];
    const timers = attempts.map((delay) => setTimeout(() => {
      if (!window.location.hash || landed) return;

      let target = null;
      try {
        target = document.querySelector(window.location.hash);
      } catch {
        landed = true;
        return;
      }
      if (!target) return;

      /*
       * Re-aligned on every attempt rather than once.
       *
       * Stopping at the first successful scroll left the section 673px down
       * the screen: the page was still growing underneath it as photographs
       * decoded and later sections rendered, so where the element WAS at
       * 120ms is not where it ends up. Anything within a few pixels of the
       * top counts as arrived and stops the retries.
       */
      if (Math.abs(target.getBoundingClientRect().top) <= 4) {
        landed = true;
        return;
      }
      goToHash(window.location.hash, true);
    }, delay));

    /* Someone who starts reading has overruled us; do not yank them back. */
    const onUserScroll = () => { landed = true; };
    window.addEventListener('wheel', onUserScroll, { passive: true, once: true });
    window.addEventListener('touchstart', onUserScroll, { passive: true, once: true });
    window.addEventListener('keydown', onUserScroll, { once: true });

    const onHashChange = () => goToHash(window.location.hash, false);

    document.addEventListener('click', onClick);
    window.addEventListener('hashchange', onHashChange);
    return () => {
      timers.forEach(clearTimeout);
      document.removeEventListener('click', onClick);
      window.removeEventListener('hashchange', onHashChange);
      window.removeEventListener('wheel', onUserScroll);
      window.removeEventListener('touchstart', onUserScroll);
      window.removeEventListener('keydown', onUserScroll);
    };
  }, []);

  return children;
}
