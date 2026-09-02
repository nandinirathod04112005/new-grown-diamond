import { useCallback, useEffect, useRef, useState } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import styles from './Preloader.module.css';

/**
 * The opening sequence, rebuilt from the reference site's LoadingUI.
 *
 * Its shape there is a bottom-up `clip-path: inset(100% 0 0 0)` wipe on the
 * wordmark, then the whole cover wipes away — no fades anywhere. This is one
 * of the two places GSAP earns its place, because it is a discrete timeline
 * rather than anything driven by scroll.
 *
 * TIMING IS THE WHOLE POINT HERE. The earlier sequence ran 2.6 seconds on a
 * page whose DOM was ready in 270ms — measured, not guessed — so it was not
 * covering a load at all. It was a wall in front of a site that had already
 * arrived, and the first thing a visitor learned about the brand was that it
 * makes them wait. A brand moment is worth about a second; beyond that it is
 * charging the visitor for the privilege of a logo.
 *
 * So: the sequence is compressed to roughly 1.1s, and ANY intent to proceed —
 * a click, a key, a scroll, a touch — ends it immediately. Someone who has
 * already decided to look at the site should never be held back by an
 * animation about looking at the site.
 */
const HARD_CAP_MS = 1600;

export default function Preloader({ onDone }) {
  const scope = useRef(null);
  const timeline = useRef(null);
  const finished = useRef(false);
  const [gone, setGone] = useState(() => prefersReducedMotion());

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    timeline.current?.kill();
    setGone(true);
    onDone?.();
  }, [onDone]);

  useGSAP(
    () => {
      if (prefersReducedMotion()) {
        finish();
        return;
      }

      timeline.current = gsap.timeline({
        defaults: { ease: 'expo.inOut' },
        onComplete: finish,
      });

      timeline.current
        .to(`.${styles.markInner}`, { clipPath: 'inset(0% 0 0 0)', duration: 0.55 })
        .to(`.${styles.barFill}`, { scaleX: 1, duration: 0.5 }, '-=0.4')
        .to(`.${styles.mark}`, { yPercent: -120, duration: 0.34 }, '-=0.05')
        .to(scope.current, { clipPath: 'inset(0 0 100% 0)', duration: 0.5 }, '-=0.24');
    },
    { scope, dependencies: [] },
  );

  useEffect(() => {
    if (gone) return undefined;

    // Any signal that the visitor wants to get on with it.
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, finish, { passive: true, once: true }));

    // A backstop, so a dropped GSAP tick or a throttled background tab can
    // never leave the site permanently behind a cover it cannot dismiss.
    const cap = setTimeout(finish, HARD_CAP_MS);

    return () => {
      events.forEach((e) => window.removeEventListener(e, finish));
      clearTimeout(cap);
    };
  }, [gone, finish]);

  if (gone) return null;

  return (
    <div ref={scope} className={styles.root} role="status" aria-label="Loading">
      <div className={styles.mark}>
        <span className={styles.markInner}>New Grown Diamond</span>
      </div>
      <div className={styles.bar}>
        <div className={styles.barFill} />
      </div>
      {/* Discoverable without being loud, and only for people who are still
          waiting after a moment. */}
      <button type="button" className={styles.skip} onClick={finish}>Skip</button>
    </div>
  );
}
