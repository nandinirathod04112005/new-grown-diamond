import { useEffect, useRef } from 'react';

import useReducedMotion from '@/hooks/useReducedMotion.js';

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
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (reduced) return undefined;
    if (window.matchMedia?.('(pointer: coarse)').matches) return undefined;

    let tx = 0, ty = 0, cx = 0, cy = 0, frame = 0, lastTime = 0;

    const tick = (time) => {
      const dt = lastTime ? Math.min(time - lastTime, 64) : 16.67;
      lastTime = time;
      const damping = 1 - Math.exp(-dt / 110);
      cx += (tx - cx) * damping;
      cy += (ty - cy) * damping;
      el.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      if (Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05) {
        frame = requestAnimationFrame(tick);
      } else {
        frame = 0;
        lastTime = 0;
      }
    };

    const onMove = (e) => {
      if (document.hidden || el.contains(document.activeElement)) return;
      const r = el.getBoundingClientRect();
      // Measure from the resting position; moving the target must not feed
      // back into the next pointer measurement and produce oscillation.
      const dx = e.clientX - (r.left - cx + r.width / 2);
      const dy = e.clientY - (r.top - cy + r.height / 2);
      const dist = Math.hypot(dx, dy);
      if (dist < radius + Math.max(r.width, r.height) / 2) {
        tx = Math.max(-12, Math.min(12, dx * pull));
        ty = Math.max(-8, Math.min(8, dy * pull));
      } else {
        tx = 0;
        ty = 0;
      }
      if (!frame) frame = requestAnimationFrame(tick);
    };

    const reset = () => {
      cancelAnimationFrame(frame);
      frame = lastTime = tx = ty = cx = cy = 0;
      el.style.transform = '';
    };
    el.addEventListener('focusin', reset);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', reset);
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      el.removeEventListener('focusin', reset);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', reset);
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(frame);
      el.style.transform = '';
    };
  }, [radius, pull, reduced]);

  return (
    <span ref={ref} style={{ display: 'inline-block', willChange: 'transform' }}>
      {children}
    </span>
  );
}
