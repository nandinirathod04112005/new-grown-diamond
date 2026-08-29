import { useCallback, useEffect, useRef, useState } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import styles from './Preloader.module.css';

/**
 * Cinematic preloader.
 *
 * The progress is REAL: it tracks fonts and the images actually present in the
 * document, and it leaves as soon as they resolve. There is no artificial
 * minimum — a fast connection sees it for a few hundred milliseconds, which is
 * the point. A 6s ceiling guarantees the page is never held hostage by one
 * slow asset.
 *
 * Skippable by click or by any key, focus lands on the skip control, and under
 * reduced motion it resolves immediately without the sweep.
 */
export default function Preloader({ onDone }) {
  const scope = useRef(null);
  const [progress, setProgress] = useState(0);
  const [leaving, setLeaving] = useState(false);
  const finished = useRef(false);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    setProgress(100);
    setLeaving(true);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion()) { finish(); return undefined; }

    // Real signals only: fonts, plus every <img> already in the document.
    const jobs = [];
    if (document.fonts?.ready) jobs.push(document.fonts.ready);
    document.querySelectorAll('img').forEach((img) => {
      if (!img.complete) {
        jobs.push(new Promise((res) => {
          img.addEventListener('load', res, { once: true });
          img.addEventListener('error', res, { once: true });
        }));
      }
    });

    let settled = 0;
    const total = Math.max(jobs.length, 1);
    jobs.forEach((j) => j.then(() => {
      settled += 1;
      setProgress(Math.round((settled / total) * 100));
    }));

    Promise.all(jobs).then(finish);

    // Never hold the page hostage to one slow asset.
    const ceiling = setTimeout(finish, 6000);
    // Creep toward 90 so the bar is never frozen while a job is in flight.
    const creep = setInterval(() => {
      setProgress((p) => (p >= 90 || finished.current ? p : p + 2));
    }, 90);

    const onKey = () => finish();
    window.addEventListener('keydown', onKey);

    return () => {
      clearTimeout(ceiling);
      clearInterval(creep);
      window.removeEventListener('keydown', onKey);
    };
  }, [finish]);

  useGSAP(() => {
    if (!leaving) return;
    if (prefersReducedMotion()) { onDone(); return; }

    gsap.timeline({ onComplete: onDone })
      // The light sweep passes across the monogram, then the curtain splits
      // upward — carbon parting to reveal what is behind it.
      .to(`.${styles.sweep}`, { xPercent: 260, duration: 0.85, ease: 'power2.inOut' })
      .to(`.${styles.mark}`, { opacity: 0, scale: 1.08, duration: 0.5, ease: 'power2.in' }, '-=0.35')
      .to(`.${styles.meter}`, { opacity: 0, duration: 0.35 }, '<')
      .to(scope.current, { yPercent: -100, duration: 1, ease: 'expo.inOut' }, '-=0.15');
  }, { scope, dependencies: [leaving, onDone] });

  return (
    <div ref={scope} className={styles.root} role="status" aria-live="polite">
      <p className="ngd-visually-hidden">Loading, {progress} percent.</p>

      <div className={styles.mark} aria-hidden="true">
        <span className={styles.monogram}>NGD</span>
        <span className={styles.sweep} />
      </div>

      <div className={styles.meter} aria-hidden="true">
        <span className={styles.meterFill} style={{ transform: `scaleX(${progress / 100})` }} />
        <span className={styles.count}>{String(progress).padStart(3, '0')}</span>
      </div>

      <button type="button" className={styles.skip} onClick={finish}>
        Skip
      </button>
    </div>
  );
}
