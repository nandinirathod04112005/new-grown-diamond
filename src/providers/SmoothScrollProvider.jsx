import { useCallback, useEffect, useMemo, useRef } from 'react';

import { createSmoothScroll } from '@/lib/motion/lenis.js';
import { ScrollTrigger } from '@/lib/motion/gsap.js';
import { SmoothScrollContext } from './smoothScrollContext.js';

/**
 * Owns the single Lenis instance.
 *
 * The instance lives in a ref and `scrollTo` is stable, so no state is set
 * from the effect and consumers never re-render because scrolling started.
 * StrictMode mounts effects twice in development; cleanup fully destroys the
 * instance and removes its ticker callback, so the second mount starts clean
 * instead of stacking a second smoother.
 */
export default function SmoothScrollProvider({ children }) {
  const handle = useRef(null);

  useEffect(() => {
    const instance = createSmoothScroll();
    handle.current = instance;

    // Fonts change metrics; refresh once they settle so pinned and scrubbed
    // triggers measure against the final layout.
    let cancelled = false;
    const refresh = () => {
      if (!cancelled) ScrollTrigger.refresh();
    };
    if (document.fonts?.ready) document.fonts.ready.then(refresh);
    window.addEventListener('load', refresh);

    return () => {
      cancelled = true;
      window.removeEventListener('load', refresh);
      instance.destroy();
      handle.current = null;
    };
  }, []);

  const scrollTo = useCallback((target, options) => {
    const lenis = handle.current?.lenis;
    if (lenis) {
      lenis.scrollTo(target, { offset: -8, ...options });
      return;
    }
    // Reduced motion (or before mount): move natively, no smoothing.
    //
    // Numbers are handled FIRST and explicitly. They used to fall through to
    // the element branch, where `el instanceof Element` is false for a number,
    // so the call returned having done nothing — every journey rail button was
    // silently inert under reduced motion, because the rail addresses chapters
    // by scroll offset rather than by selector.
    if (typeof target === 'number') {
      window.scrollTo(0, target);
      return;
    }
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (el instanceof Element) el.scrollIntoView({ block: 'start' });
  }, []);

  const value = useMemo(() => ({ scrollTo }), [scrollTo]);

  return (
    <SmoothScrollContext.Provider value={value}>
      {children}
    </SmoothScrollContext.Provider>
  );
}
