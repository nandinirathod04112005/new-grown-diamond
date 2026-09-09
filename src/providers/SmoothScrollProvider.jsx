import { useEffect, useRef } from 'react';

import { createSmoothScroll } from '@/lib/motion/lenis.js';
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

  return children;
}
