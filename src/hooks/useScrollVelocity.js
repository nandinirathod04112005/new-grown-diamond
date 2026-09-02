import { useEffect } from 'react';

import { prefersReducedMotion } from '@/lib/motion/media.js';

/**
 * Publishes how fast, and which way, the page is moving.
 *
 * Everything on this site so far answers to scroll POSITION — where you are.
 * Nothing answers to scroll VELOCITY — how hard you are moving. That gap is
 * the difference between a page that responds and a page that merely tracks:
 * position alone produces the same frame whether you crept there or threw
 * yourself down the page, and a heavy object should not behave identically to
 * a flicked one.
 *
 * Three values land on the root element, and every consumer is pure CSS:
 *
 *   --vel     signed velocity, -1..1, damped     (direction and force)
 *   --speed   absolute velocity, 0..1, damped    (force alone)
 *   data-scroll-dir  'down' | 'up'               (for direction-aware reveals)
 *
 * ONE loop and ONE writer for the whole site. Velocity is the sort of thing
 * every component wants its own copy of, and twenty listeners each
 * differentiating the same scroll position is how a smooth page becomes a
 * stuttering one.
 *
 * The damping is asymmetric on purpose: it rises fast and falls slowly, so a
 * flick registers immediately and then eases out instead of snapping back the
 * instant the wheel stops. That decay IS the sense of weight.
 */

/** Pixels per frame that count as "flat out". Above this everything clamps. */
const MAX_PER_FRAME = 90;

/** How quickly the value climbs toward a new reading, and falls away from it. */
const RISE = 0.28;
const FALL = 0.06;

export function useScrollVelocity() {
  useEffect(() => {
    // Velocity-driven motion is unrequested movement by definition: it happens
    // because the page moved, not because anyone asked for it.
    if (prefersReducedMotion()) return undefined;

    const root = document.documentElement;
    let last = window.scrollY;
    let raw = 0;
    let smooth = 0;
    let raf = 0;
    let dir = 'down';

    const tick = () => {
      const y = window.scrollY;
      raw = y - last;
      last = y;

      const target = Math.max(-1, Math.min(1, raw / MAX_PER_FRAME));
      // Rising toward a bigger magnitude is fast; falling back to rest is slow.
      const k = Math.abs(target) > Math.abs(smooth) ? RISE : FALL;
      smooth += (target - smooth) * k;

      // Below this the value is visual noise, and writing it every frame keeps
      // the compositor busy for nothing.
      if (Math.abs(smooth) < 0.0015) smooth = 0;

      if (raw > 0.5 && dir !== 'down') { dir = 'down'; root.dataset.scrollDir = dir; }
      else if (raw < -0.5 && dir !== 'up') { dir = 'up'; root.dataset.scrollDir = dir; }

      root.style.setProperty('--vel', smooth.toFixed(4));
      root.style.setProperty('--speed', Math.abs(smooth).toFixed(4));

      raf = requestAnimationFrame(tick);
    };

    root.dataset.scrollDir = 'down';
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      root.style.removeProperty('--vel');
      root.style.removeProperty('--speed');
      delete root.dataset.scrollDir;
    };
  }, []);
}
