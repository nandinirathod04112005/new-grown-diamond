import { useEffect, useRef } from 'react';

import { prefersReducedMotion } from '@/lib/motion/media.js';
import styles from './LivePhoto.module.css';

/**
 * A photograph that behaves like a lit object instead of a flat picture.
 *
 * Rendered geometry keeps reading as rendered, so the honest way to make a
 * diamond look real is to use a real photograph of one — and then put the
 * motion INTO the photograph rather than replacing it with a model.
 *
 * Five things stack, none of which change what the image is:
 *   drift    a slow scale-and-pan, so the frame is never quite still
 *   tilt     perspective toward the pointer, giving the plate thickness
 *   sweep    a specular band travelling across, the way light crosses facets
 *   spark    points that catch and fade, timed off each other
 *   grain    a trace of noise, which is what stops a clean crop reading as CGI
 *
 * All of it is compositing over the real pixels, so nothing here can make the
 * subject look synthetic — the worst case is that it sits still.
 */
export default function LivePhoto({
  src,
  alt,
  className,
  sparks = 3,
  tilt = 6,
  priority = false,
  width,
  height,
}) {
  const root = useRef(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    if (prefersReducedMotion()) return undefined;
    if (window.matchMedia?.('(pointer: coarse)').matches) return undefined;

    let tx = 0, ty = 0, cx = 0, cy = 0, frame = 0;

    const tick = () => {
      cx += (tx - cx) * 0.08;
      cy += (ty - cy) * 0.08;
      el.style.setProperty('--rx', `${(-cy * tilt).toFixed(2)}deg`);
      el.style.setProperty('--ry', `${(cx * tilt).toFixed(2)}deg`);
      // The highlight tracks the pointer, so the light appears to come from
      // where the viewer is looking.
      el.style.setProperty('--lx', `${(50 + cx * 26).toFixed(1)}%`);
      el.style.setProperty('--ly', `${(50 + cy * 26).toFixed(1)}%`);
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

    const leave = () => {
      tx = 0;
      ty = 0;
      if (!frame) frame = requestAnimationFrame(tick);
    };

    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerleave', leave);
      cancelAnimationFrame(frame);
    };
  }, [tilt]);

  return (
    <div ref={root} className={`${styles.root} ${className ?? ''}`}>
      <img
        className={styles.shot}
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
      />

      {/* Compositing passes. All decorative — the photograph carries the
          meaning and the alt text. */}
      <span className={styles.glare} aria-hidden="true" />
      <span className={styles.sweep} aria-hidden="true" />
      {Array.from({ length: sparks }, (_, i) => (
        <span key={i} className={styles.spark} style={{ '--i': i }} aria-hidden="true" />
      ))}
      <span className={styles.grain} aria-hidden="true" />
    </div>
  );
}
