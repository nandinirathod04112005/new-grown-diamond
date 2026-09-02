import { useEffect, useRef } from 'react';

import { prefersReducedMotion } from '@/lib/motion/media.js';

/**
 * Pulls its child toward the cursor once the cursor is close enough.
 *
 * The pull is damped and capped, and the element returns to rest on its own —
 * an undamped or uncapped magnet reads as a bug rather than as an affordance.
 * Off entirely for touch and reduced motion, where there is no hover to react
 * to and the movement would only be noise.
 */
export default function Magnetic({ children, radius = 110, pull = 0.32 }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (prefersReducedMotion()) return undefined;
    if (window.matchMedia?.('(pointer: coarse)').matches) return undefined;

    let tx = 0, ty = 0, cx = 0, cy = 0, frame = 0;

    const tick = () => {
      cx += (tx - cx) * 0.16;
      cy += (ty - cy) * 0.16;
      el.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
      }
    };

    const onMove = (e) => {
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      const dist = Math.hypot(dx, dy);
      if (dist < radius + Math.max(r.width, r.height) / 2) {
        tx = dx * pull;
        ty = dy * pull;
      } else {
        tx = 0;
        ty = 0;
      }
      if (!frame) frame = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
      el.style.transform = '';
    };
  }, [radius, pull]);

  return (
    <span ref={ref} style={{ display: 'inline-block', willChange: 'transform' }}>
      {children}
    </span>
  );
}
