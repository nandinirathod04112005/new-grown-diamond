import { useCallback, useEffect, useRef, useState } from 'react';

import { getLenis } from '@/lib/motion/lenis.js';
import { PREFIXES, localePath, splitLocale } from '@/i18n/locales.js';
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

/*
 * Who is listening for the path.
 *
 * The header sits outside the route switch and marks the current page in its
 * nav. It needs the path without being re-rendered by App for the purpose,
 * and without owning a second router — so the router announces each commit
 * and the header subscribes. `useSyncExternalStore` on the other end makes it
 * a store, not a prop threaded through the shell.
 */
const pathListeners = new Set();

export function subscribePath(listener) {
  pathListeners.add(listener);
  return () => pathListeners.delete(listener);
}

const announcePath = () => {
  for (const listener of pathListeners) listener();
};

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
    /*
     * The PATHNAME becomes route state; the query does not.
     *
     * `next` arrives as pathname + search so the address bar keeps the query.
     * Storing that whole string as the path meant "/diamonds?stone=X" was
     * looked up as a route, matched nothing, and rendered the 404 — which is
     * exactly what happened on Back after any tracked link. Every route match
     * downstream compares against a bare pathname, so that is what is kept.
     */
    const { pathname } = new URL(next, window.location.href);
    setPath(pathname.replace(/\/+$/, '') || '/');
    announcePath();
    resetScroll();
  }, []);

  const run = useCallback(
    async (next, push, options = {}) => {
      if (busy.current) return;
      const target = new URL(next, window.location.href);

      /*
       * Carry the current language across the navigation.
       *
       * Almost every href in this codebase is written as a plain "/diamonds",
       * because they were all written before there was more than one language.
       * Rewriting them here rather than in eighty-seven files means a Gujarati
       * visitor stays in Gujarati on their second click, and a missed anchor
       * cannot silently drop someone back into English — which is exactly the
       * class of bug this delegated listener exists to prevent in the first
       * place.
       *
       * A link that ALREADY names a language wins: that is the switcher, and
       * an explicit choice must never be overridden by the page it was made
       * on.
       *
       * ENGLISH IS THE CASE THAT CANNOT BE INFERRED, and inferring it was a
       * bug. English carries no prefix, so the switcher's English option on
       * /hi/diamonds has href="/diamonds" — byte for byte the same as the
       * ordinary header link for हीरे. The guard below rewrote it back to
       * /hi/diamonds, which then equalled the current path and the navigation
       * aborted: the option was a dead control on every localised page, with
       * no way back to English except editing the address bar.
       *
       * So the switcher STATES its intent (`chooses`, from the anchor's
       * hreflang) instead of the router guessing it from the path. Every other
       * link is untouched and still inherits the current language.
       */
      const here = splitLocale(window.location.pathname);
      const there = splitLocale(target.pathname);
      const namesLocale = PREFIXES.includes(target.pathname.split('/')[1]);
      if (here.locale !== 'en' && !namesLocale && !options.chooses) {
        target.pathname = localePath(there.path, here.locale);
      }

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
      /* hreflang is only ever set by the language switcher, and it is the one
         place a link means "this language", not "this page". */
      run(anchor.getAttribute('href'), true, { chooses: anchor.hasAttribute('hreflang') });
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
