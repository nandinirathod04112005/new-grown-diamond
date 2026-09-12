import Lenis from 'lenis';

import { prefersReducedMotion } from './media.js';

/**
 * One Lenis instance for the app's lifetime, driven by GSAP's ticker so the
 * smoother and every timeline share a single clock.
 *
 * Touch is never smoothed: syncing it fights the OS and reads as lag on a
 * phone, which is exactly the impression a premium site cannot afford.
 */
/*
 * The live instance, exposed for one reason only: client-side navigation has
 * to put the new page at the top, and window.scrollTo() loses that argument
 * with Lenis — the smoother keeps its own scroll position and animates back
 * to it, so the new page arrives already scrolled down.
 */
let active = null;

/** The running smoother, or null under reduced motion / before mount. */
export function getLenis() {
  return active;
}

export function createSmoothScroll() {
  if (prefersReducedMotion()) {
    document.documentElement.classList.add('no-smooth');
    return { lenis: null, destroy: () => document.documentElement.classList.remove('no-smooth') };
  }

  const lenis = new Lenis({
    duration: 0.85,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
    touchMultiplier: 1.6,
  });

  active = lenis;

  /* Native rAF keeps the 70 kB smoother independent of the much larger GSAP
     animation bundle. Routes that actually use GSAP load it in their own lazy
     chunk; ordinary browsing never downloads it just to move the scrollbar. */
  let frame = 0;
  const raf = (time) => {
    if (!document.hidden) lenis.raf(time);
    frame = requestAnimationFrame(raf);
  };
  frame = requestAnimationFrame(raf);

  return {
    lenis,
    destroy() {
      if (active === lenis) active = null;
      cancelAnimationFrame(frame);
      lenis.destroy();
    },
  };
}
