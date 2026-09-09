import { useCallback, useEffect, useRef, useState } from 'react';

import { getLenis } from '@/lib/motion/lenis.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';

/**
 * Client-side navigation with a covered handover.
 *
 * Every link on this site was a plain anchor doing a full browser reload: a
 * white flash, the whole bundle re-evaluated, and the opening sequence played
 * again. Between two pages of the same site that is not a transition, it is a
 * restart — and it is the single loudest way a site announces "you have left
 * the page you were on".
 *
 * The swap now happens underneath a cover, so the seam is never visible. What
 * changes is the content; what stays is the header, the smoother, the theme
 * and the WebGL context.
 *
 * LINKS ARE INTERCEPTED BY ONE DELEGATED LISTENER, not by replacing every
 * anchor in the codebase. There are dozens of them across pages, sections and
 * generated content, and any missed one would silently fall back to a reload —
 * a bug that only shows up on the one route nobody clicked while testing.
 */

/*
 * The live navigate function, published by the hook.
 *
 * Anything outside the App tree that needs to move the site — the
 * scroll-to-continue control, for one — would otherwise need context threaded
 * through every layer to reach it. A single module-level reference is enough
 * because there is exactly one router, and it is null until App mounts, which
 * every caller must handle.
 */
let live = null;

/** Navigate from outside React. No-op before the router has mounted. */
export function navigateTo(to) {
  live?.(to);
}

/** Out and in are asymmetric on purpose: leaving should be quicker than arriving. */
export const COVER_OUT_MS = 460;
export const COVER_IN_MS = 640;

export function currentPath() {
  return window.location.pathname.replace(/\/+$/, '') || '/';
}

/**
 * Whether this click should be handled here, or left entirely alone.
 *
 * Everything in this list is a case where the visitor has asked the BROWSER
 * for something — a new tab, a download, another site — and hijacking it would
 * break an expectation the site did not create. Middle-click and
 * ctrl/cmd-click in particular must keep working: "open in a new tab" is how
 * people compare two stones side by side.
 */
function isInternalNavigation(event, anchor) {
  if (event.defaultPrevented) return false;
  // Left button only. `button` is 1 for middle, 2 for right.
  if (event.button !== 0) return false;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false;

  if (!anchor || !anchor.href) return false;
  if (anchor.target && anchor.target !== '_self') return false;
  if (anchor.hasAttribute('download')) return false;
  if (anchor.dataset.noTransition !== undefined) return false;

  const url = new URL(anchor.href, window.location.href);
  if (url.origin !== window.location.origin) return false;
  // mailto:, tel:, blob: and friends never reach here as same-origin http(s).
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;
  // An in-page anchor is a scroll, not a navigation.
  if (url.pathname === window.location.pathname && url.hash) return false;

  return true;
}

/** Puts the incoming page at the top, including when Lenis owns the scroll. */
function resetScroll() {
  const lenis = getLenis();
  // `immediate` matters: without it the smoother animates to the top from
  // wherever the previous page was, which is visible under the cover lifting.
  if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
  window.scrollTo(0, 0);
}

/**
 * @returns {{path: string, phase: 'idle'|'out'|'in', navigate: (to: string) => void}}
 */
export function useRouter() {
  const [path, setPath] = useState(currentPath);
  const [phase, setPhase] = useState('idle');
  // Guards against a second click landing mid-transition and swapping the
  // content twice, which would leave the cover up over the wrong page.
  const busy = useRef(false);

  const commit = useCallback((next, push) => {
    if (push) window.history.pushState({}, '', next);
    setPath(next.replace(/\/+$/, '') || '/');
    resetScroll();
  }, []);

  const run = useCallback(
    async (next, push) => {
      if (busy.current) return;
      const target = new URL(next, window.location.href);
      const clean = target.pathname.replace(/\/+$/, '') || '/';
      if (clean === currentPath() && push) return;

      // Reduced motion gets the navigation without the theatre. The cover is
      // decoration; the page change is the function, and it still happens.
      if (prefersReducedMotion()) {
        commit(target.pathname + target.search, push);
        return;
      }

      busy.current = true;
      setPhase('out');
      await new Promise((r) => setTimeout(r, COVER_OUT_MS));

      commit(target.pathname + target.search, push);

      setPhase('in');
      await new Promise((r) => setTimeout(r, COVER_IN_MS));
      setPhase('idle');
      busy.current = false;
    },
    [commit],
  );

  const navigate = useCallback((to) => run(to, true), [run]);

  // Published for callers outside the tree, and withdrawn on unmount so a
  // stale closure can never drive a router that no longer exists.
  useEffect(() => {
    live = navigate;
    return () => { if (live === navigate) live = null; };
  }, [navigate]);

  useEffect(() => {
    const onClick = (event) => {
      const anchor = event.target.closest?.('a[href]');
      if (!isInternalNavigation(event, anchor)) return;
      event.preventDefault();
      run(anchor.getAttribute('href'), true);
    };

    // Back and forward have already changed the URL by the time this fires, so
    // the cover plays and the content follows — never a push, or the history
    // stack would grow every time someone went back.
    const onPop = () => run(window.location.pathname + window.location.search, false);

    document.addEventListener('click', onClick);
    window.addEventListener('popstate', onPop);
    return () => {
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onPop);
    };
  }, [run]);

  return { path, phase, navigate };
}
