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
    if (target === 0) {
      window.scrollTo(0, 0);
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
