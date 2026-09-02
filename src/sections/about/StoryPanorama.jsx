import { useEffect, useRef, useState } from 'react';

import { prefersReducedMotion } from '@/lib/motion/media.js';
import styles from './StoryPanorama.module.css';

const SRC = '/story/panorama.jpg';

/**
 * A camera move across one mural, rather than six separate pictures.
 *
 * The panorama holds every beat of the company story side by side, so the
 * honest way to animate it is to move across it: each chapter focuses the
 * region of the image that actually depicts it, and the scroll drives a
 * continuous pan and zoom between those regions. Nothing cuts, nothing
 * cross-fades — it reads as one long camera move, which is what the artwork
 * is built for.
 *
 * Focus points are fractions of the image, so they hold at any resolution.
 * They are tuned to the artwork's own layout: the workshop sits far left, the
 * 2012 ring beside it, the reactors centre, the shape row along the bottom,
 * and the globe far right.
 */
const FOCUS = {
  b1: { x: 0.10, y: 0.46, z: 2.30 }, // the heritage workshop
  b2: { x: 0.27, y: 0.42, z: 2.25 }, // 2012, the light ring
  b3: { x: 0.46, y: 0.38, z: 2.00 }, // CVD reactor and HPHT press
  b4: { x: 0.50, y: 0.74, z: 1.75 }, // the row of cut shapes
  b5: { x: 0.85, y: 0.42, z: 2.05 }, // Surat to the world
  b6: { x: 0.63, y: 0.30, z: 2.00 }, // type IIa, ethical, conflict-free
  lead: { x: 0.50, y: 0.45, z: 1.06 }, // the whole mural, establishing
  out: { x: 0.50, y: 0.62, z: 1.20 }, // pulls back to the mission line
};

const ORDER = ['lead', 'b1', 'b2', 'b3', 'b4', 'b5', 'b6', 'out'];

export default function StoryPanorama({ progressRef, onUnavailable }) {
  const shot = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    // Content-type, not just res.ok: a dev server answers unknown paths with
    // index.html, which would otherwise pass as a perfectly good image.
    fetch(SRC, { method: 'HEAD' })
      .then((res) => {
        if (!alive) return;
        const type = res.headers.get('content-type') || '';
        if (res.ok && type.startsWith('image/')) setReady(true);
        else onUnavailable?.();
      })
      .catch(() => alive && onUnavailable?.());
    return () => {
      alive = false;
    };
  }, [onUnavailable]);

  useEffect(() => {
    if (!ready) return undefined;
    const el = shot.current;
    if (!el) return undefined;

    // Reduced motion holds the establishing view. The mural is legible whole;
    // it does not need the move to make sense.
    if (prefersReducedMotion()) {
      const f = FOCUS.lead;
      el.style.transformOrigin = `${f.x * 100}% ${f.y * 100}%`;
      el.style.transform = `scale(${f.z})`;
      return undefined;
    }

    let frame = 0;
    let cx = FOCUS.lead.x;
    let cy = FOCUS.lead.y;
    let cz = FOCUS.lead.z;

    const tick = () => {
      const phase = progressRef.current?.phase ?? 'lead';
      const p = progressRef.current?.p ?? 0;

      // Aim at the CURRENT region, then lean toward the next one as this
      // chapter runs out. The camera is therefore already moving before the
      // stage changes, so the transition has no seam in it.
      const here = FOCUS[phase] ?? FOCUS.lead;
      const i = ORDER.indexOf(phase);
      const next = FOCUS[ORDER[Math.min(ORDER.length - 1, i + 1)]] ?? here;
      const lean = Math.max(0, (p - 0.65) / 0.35) * 0.45;

      const tx = here.x + (next.x - here.x) * lean;
      const ty = here.y + (next.y - here.y) * lean;
      const tz = here.z + (next.z - here.z) * lean;

      // Damped, so the move has weight and a fast scroll does not snap it.
      cx += (tx - cx) * 0.055;
      cy += (ty - cy) * 0.055;
      cz += (tz - cz) * 0.055;

      el.style.transformOrigin = `${(cx * 100).toFixed(2)}% ${(cy * 100).toFixed(2)}%`;
      el.style.transform = `scale(${cz.toFixed(4)})`;

      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready, progressRef]);

  if (!ready) return null;

  return (
    <div className={styles.mural}>
      <img
        ref={shot}
        className={styles.shot}
        src={SRC}
        alt="Four decades of diamond excellence: the New Grown Diamond story, from a Surat cutting workshop to CVD and HPHT manufacturing and worldwide supply."
        loading="eager"
        decoding="async"
      />
      <span className={styles.sweep} aria-hidden="true" />
      <span className={styles.vignette} aria-hidden="true" />
    </div>
  );
}
