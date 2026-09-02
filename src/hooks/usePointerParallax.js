import { useEffect } from 'react';

import { prefersReducedMotion } from '@/lib/motion/media.js';

/**
 * Writes a damped, normalised pointer position onto an element as --mx/--my
 * (both -1..1), so layers can be given different parallax depths in CSS.
 *
 * The value is damped rather than assigned raw: an undamped pointer makes a
 * hero feel twitchy and cheap, where a trailing one reads as weight. Nothing
 * here touches React, and the listener is dropped entirely on touch devices,
 * where there is no hover to respond to.
 */
export function usePointerParallax(ref, strength = 1) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (prefersReducedMotion()) return undefined;
    if (window.matchMedia?.('(pointer: coarse)').matches) return undefined;

    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;
    let frame = 0;

    const tick = () => {
      cx += (tx - cx) * 0.075;
      cy += (ty - cy) * 0.075;
      el.style.setProperty('--mx', (cx * strength).toFixed(4));
      el.style.setProperty('--my', (cy * strength).toFixed(4));

      // Stop once it has effectively arrived, so an idle pointer costs nothing.
      if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    };

    const onMove = (e) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const onLeave = () => {
      tx = 0;
      ty = 0;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('pointerleave', onLeave);

    return () => {
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
      cancelAnimationFrame(frame);
    };
  }, [ref, strength]);
}
