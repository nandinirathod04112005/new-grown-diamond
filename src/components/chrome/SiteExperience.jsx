import { useEffect, useRef } from 'react';

import { onPageProgress } from '@/lib/motion/pageProgress.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import styles from './SiteExperience.module.css';

/**
 * Global motion chrome shared by every route: the reading-progress bar and the
 * custom cursor.
 *
 * NAVIGATION USED TO LIVE HERE and no longer does. It intercepted link clicks,
 * played a wipe, then called window.location.assign() — a full document
 * reload with an animation in front of it. That threw away the header, the
 * smoother, the theme and the WebGL context every time anyone moved between
 * two pages of the same site, and replayed the opening sequence on arrival.
 *
 * lib/router.js now performs the same handover WITHOUT the reload, so the
 * cover hides a swap rather than decorating a restart. Two systems both
 * calling preventDefault on the same click cannot coexist: this one won,
 * because assign() happens regardless of what any other listener decided.
 */
export default function SiteExperience() {
  const progress = useRef(null);
  const cursor = useRef(null);
  const halo = useRef(null);

  useEffect(() => onPageProgress((value) => {
    progress.current?.style.setProperty('--page-progress', value.toFixed(4));
  }), []);


  useEffect(() => {
    if (prefersReducedMotion() || !window.matchMedia?.('(pointer: fine)').matches) return undefined;
    const dot = cursor.current;
    const ring = halo.current;
    if (!dot || !ring) return undefined;

    let frame = 0;
    let x = -100;
    let y = -100;
    let rx = -100;
    let ry = -100;

    const paint = () => {
      rx += (x - rx) * 0.16;
      ry += (y - ry) * 0.16;
      dot.style.transform = `translate3d(${x}px,${y}px,0)`;
      ring.style.transform = `translate3d(${rx}px,${ry}px,0)`;
      frame = requestAnimationFrame(paint);
    };
    const move = (event) => { x = event.clientX; y = event.clientY; };
    const over = (event) => {
      const active = Boolean(event.target.closest?.('a,button,input,textarea,select,[role="button"]'));
      ring.dataset.active = active ? '' : undefined;
    };
    const visibility = () => {
      const hidden = document.hidden;
      dot.hidden = hidden;
      ring.hidden = hidden;
    };

    document.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('pointerover', over, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    frame = requestAnimationFrame(paint);
    return () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerover', over);
      document.removeEventListener('visibilitychange', visibility);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <>
      <div className={styles.worldBackground} aria-hidden="true">
        <span className={styles.deepField} />
        <span className={styles.prismBeam} />
        <span className={styles.prismBeam} />
        <span className={styles.prismBeam} />
        <span className={styles.facetLattice} />
        <span className={styles.lightGrid} />
        <span className={styles.horizonGlow} />
        <span className={styles.diamondCore}><i /><i /><i /></span>
        <span className={styles.dust} />
      </div>
      <div ref={progress} className={styles.progress} aria-hidden="true"><span /></div>
      {/* The pointer mark now lives in components/cursor/DiamondCursor,
          which owns the gem, the trailing ring, the label and the click
          burst. Two components chasing the same pointer would draw two. */}
      <span ref={halo} className={styles.halo} aria-hidden="true" />
    </>
  );
}
