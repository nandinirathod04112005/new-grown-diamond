/**
 * A single gsap.matchMedia() for the whole app.
 *
 * Every animation registers through this so `prefers-reduced-motion` and the
 * mobile/desktop split are decided in ONE place, and reverting is automatic.
 *
 * Contexts:
 *   motion   — user accepts motion (any viewport)
 *   still    — user prefers reduced motion
 *   desktop  — motion accepted AND >= 900px (heavy pins, parallax)
 *   pointer  — motion accepted AND a fine pointer (magnetic buttons)
 */
import { gsap } from './gsap.js';

export const MQ = {
  motion: '(prefers-reduced-motion: no-preference)',
  still: '(prefers-reduced-motion: reduce)',
  desktop: '(prefers-reduced-motion: no-preference) and (min-width: 900px)',
  pointer: '(prefers-reduced-motion: no-preference) and (pointer: fine)',
};

/** True when the user has asked for reduced motion. Safe during SSR/tests. */
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(MQ.still).matches;
}

export { gsap };
