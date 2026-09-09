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
    let lastTime = 0;
    let published = '';

    const tick = (time) => {
      const dt = lastTime ? Math.min(64, Math.max(1, time - lastTime)) : 16.667;
      lastTime = time;
      const y = window.scrollY;
      raw = y - last;
      last = y;

      const target = Math.max(-1, Math.min(1, (raw * 16.667) / (dt * MAX_PER_FRAME)));
      // Rising toward a bigger magnitude is fast; falling back to rest is slow.
      const k = Math.abs(target) > Math.abs(smooth) ? RISE : FALL;
      smooth += (target - smooth) * (1 - Math.pow(1 - k, dt / 16.667));

      // Below this the value is visual noise, and writing it every frame keeps
      // the compositor busy for nothing.
      if (Math.abs(smooth) < 0.0015) smooth = 0;

      if (raw > 0.5 && dir !== 'down') { dir = 'down'; root.dataset.scrollDir = dir; }
      else if (raw < -0.5 && dir !== 'up') { dir = 'up'; root.dataset.scrollDir = dir; }

      const value = smooth.toFixed(4);
      if (published !== value) {
        root.style.setProperty('--vel', value);
        root.style.setProperty('--speed', Math.abs(smooth).toFixed(4));
        published = value;
      }
      raf = smooth !== 0 || raw !== 0 ? requestAnimationFrame(tick) : 0;
      if (!raf) lastTime = 0;
    };

    const wake = () => { if (!raf) raf = requestAnimationFrame(tick); };

    root.dataset.scrollDir = 'down';
    raf = requestAnimationFrame(tick);
    window.addEventListener('scroll', wake, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', wake);
      root.style.removeProperty('--vel');
      root.style.removeProperty('--speed');
      delete root.dataset.scrollDir;
    };
  }, []);
}
