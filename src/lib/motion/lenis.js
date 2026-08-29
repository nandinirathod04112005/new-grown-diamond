/**
 * Lenis <-> ScrollTrigger wiring.
 *
 * Lenis drives GSAP's ticker (not the other way round), which is the pairing
 * that keeps pinned sections in sync with smoothed scrolling. Under reduced
 * motion Lenis is never created at all and the browser's native scrolling is
 * left alone.
 */
import Lenis from 'lenis';

import { gsap, ScrollTrigger } from './gsap.js';
import { prefersReducedMotion } from './media.js';

/**
 * Start Lenis and bind it to ScrollTrigger.
 * @returns {{lenis: Lenis|null, destroy: () => void}}
 */
export function createSmoothScroll() {
  if (prefersReducedMotion()) {
    return { lenis: null, destroy: () => {} };
  }

  const lenis = new Lenis({
    duration: 1.05,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    // Never smooth touch scrolling: it fights the OS and feels laggy on phones.
    smoothTouch: false,
    touchMultiplier: 1.6,
  });

  const onScroll = () => ScrollTrigger.update();
  lenis.on('scroll', onScroll);

  const raf = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(raf);
  gsap.ticker.lagSmoothing(0);

  return {
    lenis,
    destroy() {
      lenis.off('scroll', onScroll);
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(500, 33);
      lenis.destroy();
    },
  };
}
