import Lenis from 'lenis';

import { gsap, ScrollTrigger } from './gsap.js';
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
    return { lenis: null, destroy: () => {} };
  }

  const lenis = new Lenis({
    duration: 0.85,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,
    touchMultiplier: 1.6,
  });

  active = lenis;

  const raf = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  /*
   * ScrollTrigger reads window.scrollY, and Lenis moves the page without the
   * browser firing a native scroll event ScrollTrigger would notice in time.
   * Without this line a pinned section lags the smoother by a frame or two and
   * visibly judders. A scrollerProxy is NOT needed on top of it: Lenis is
   * scrolling the window here, not a custom container.
   */
  const sync = () => ScrollTrigger.update();
  lenis.on('scroll', sync);

  return {
    lenis,
    destroy() {
      if (active === lenis) active = null;
      lenis.off('scroll', sync);
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    },
  };
}
