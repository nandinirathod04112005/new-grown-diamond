import { useEffect } from 'react';

/**
 * Marks `[data-rv]` elements inside `ref` with `data-in` as they come on
 * screen, once each. The CSS decides what the entrance looks like; this only
 * says when.
 *
 * Nothing is hidden by this hook. The stylesheets hide an element only under
 * `[data-rv]:not([data-in])` inside `@media (prefers-reduced-motion:
 * no-preference)`, and the element is marked the moment it is observed — so
 * reduced motion, a failed script or a missing IntersectionObserver all leave
 * finished content on the page.
 *
 * `deps` re-scans when the content changes (a search result set, say).
 */
export function useReveal(ref, deps = []) {
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const nodes = [...root.querySelectorAll('[data-rv]:not([data-in])')];
    if (!nodes.length) return undefined;

    if (typeof IntersectionObserver === 'undefined') {
      nodes.forEach((n) => n.setAttribute('data-in', ''));
      return undefined;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.setAttribute('data-in', '');
        io.unobserve(e.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

    nodes.forEach((n) => io.observe(n));
    return () => io.disconnect();
    // The caller's deps are the point; the ref is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
