/** Single source of truth for motion-relevant media queries. */
export const MQ = {
  desktop: '(min-width: 1024px)',
  coarse: '(pointer: coarse)',
  motion: '(prefers-reduced-motion: no-preference)',
};

export function prefersReducedMotion() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return !window.matchMedia(MQ.motion).matches;
}
