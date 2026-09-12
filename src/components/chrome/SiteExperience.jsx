import { useEffect, useRef } from 'react';

import { onPageProgress } from '@/lib/motion/pageProgress.js';
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
  const depth = useRef(null);
  const world = useRef(null);

  /*
   * Written onto the two layers that read them, never onto the root.
   *
   * `--journey` used to be set on <html> on every scroll frame. A custom
   * property on the root is inherited by every element on the page, so each
   * frame re-computed the style of the whole document, up to 800 elements,
   * and the next frame's scroll measurement forced it to happen at once.
   * Traced on a phone-speed CPU that was most of every scroll frame on the
   * home page. Only the depth light below uses it (the About page's timeline
   * sets its own on its own element).
   */
  useEffect(() => onPageProgress((value) => {
    progress.current?.style.setProperty('--page-progress', value.toFixed(4));
    depth.current?.style.setProperty('--journey', value.toFixed(4));
  }), []);

  /* One compositor-only pointer writer for the global room. It updates the
     fixed visual layer itself, never <html>, so moving a pointer cannot force
     the whole application to recalculate styles. Low-power/coarse devices get
     the same depth as a still composition with no tracking cost. */
  useEffect(() => {
    const node = world.current;
    if (!node) return undefined;
    const coarse = matchMedia('(pointer: coarse)').matches;
    const compact = matchMedia('(max-width: 767px)').matches;
    const lite = coarse || compact || (navigator.deviceMemory && navigator.deviceMemory <= 4);
    if (lite) node.dataset.lite = '';

    let frame = 0;
    let x = 0;
    let y = 0;
    const paint = () => {
      frame = 0;
      node.style.setProperty('--world-x', x.toFixed(3));
      node.style.setProperty('--world-y', y.toFixed(3));
    };
    const move = (event) => {
      x = (event.clientX / innerWidth - 0.5) * 2;
      y = (event.clientY / innerHeight - 0.5) * 2;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const visibility = () => { node.toggleAttribute('data-paused', document.hidden); };

    if (!lite) addEventListener('pointermove', move, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    visibility();
    return () => {
      removeEventListener('pointermove', move);
      document.removeEventListener('visibilitychange', visibility);
      cancelAnimationFrame(frame);
    };
  }, []);


  /*
   * THE POINTER IS NOT TRACKED HERE any more, and the ring this file used to
   * draw is gone with it.
   *
   * When the pointer mark moved to components/cursor/DiamondCursor, the gem
   * element went with it but its ring and the code that moved them both stayed
   * behind. That code opened with `if (!dot || !ring) return` and the gem was
   * no longer rendered, so it returned on the first line every time — while the
   * ring itself was still in the markup. The result was a 34px gold ring parked
   * at the top-left corner of every desktop page for the whole visit, measured
   * at 34x34 at (-17,-17), never once moved.
   *
   * The same dead effect also wrote --pointer-x/y/nx/ny onto <html> on every
   * mousemove, which is the pattern this file removed from --journey above: a
   * custom property on the root restyles the entire document. It never ran, so
   * it cost nothing — but it was a loaded gun, and the three rules in
   * global.css that read those variables now state their resting values
   * outright instead of waiting for a writer that no longer exists.
   */

  return (
    <>
      <div ref={world} className={styles.worldBackground} aria-hidden="true">
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
      <div ref={depth} className={styles.depthLight} aria-hidden="true"><span /><span /><i /></div>
    </>
  );
}
