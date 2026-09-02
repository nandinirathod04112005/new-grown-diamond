import { useEffect, useRef } from 'react';

import { prefersReducedMotion } from '@/lib/motion/media.js';

/**
 * Genuine 3D tilt: the element rotates in perspective toward the pointer.
 *
 * The rotation is damped and small — six degrees, not twenty. A large tilt
 * reads as a gimmick and distorts the photograph it is applied to; a small one
 * reads as the object having thickness, which is the point.
 *
 * Values are written to CSS custom properties rather than to `transform`
 * directly, so the stylesheet stays in charge of how the tilt is composed with
 * whatever else the element is doing.
 */
export function useTilt({ max = 6, scale = 1.02 } = {}) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (prefersReducedMotion()) return undefined;
    if (window.matchMedia?.('(pointer: coarse)').matches) return undefined;

    let tx = 0, ty = 0, cx = 0, cy = 0, frame = 0, active = false;

    const tick = () => {
      cx += (tx - cx) * 0.14;
      cy += (ty - cy) * 0.14;
      el.style.setProperty('--rx', `${(-cy * max).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(cx * max).toFixed(2)}deg`);
      el.style.setProperty('--tz', active ? `${scale}` : '1');
      if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    };

    const move = (e) => {
      const r = el.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width) * 2 - 1;
      ty = ((e.clientY - r.top) / r.height) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const enter = () => { active = true; };
    const leave = () => {
      active = false;
      tx = 0;
      ty = 0;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    el.addEventListener('pointerenter', enter);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);

    return () => {
      el.removeEventListener('pointerenter', enter);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(frame);
    };
  }, [max, scale]);

  return ref;
}
