import useMediaQuery from './useMediaQuery.js';

/** True when the visitor has asked the OS for reduced motion. */
export default function useReducedMotion() {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
