import { useEffect, useRef } from 'react';

import LetterAssemble from '@/components/motion/LetterAssemble.jsx';
import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import { useSmoothScroll } from '@/providers/smoothScrollContext.js';
import { useReady } from '@/app/readyContext.js';
import styles from './Hero.module.css';

/**
 * Chapter 00 — the thesis, stated once, over the journey's own stage.
 *
 * The hero owns NO visual of its own any more. The diamond behind this text is
 * the director's stage — the same photograph that will dissolve into carbon
 * and return at the handover — so the reader never sees a cut between "the
 * hero image" and "the scene". That continuity is the entire argument for a
 * single fixed stage.
 *
 * The composition is deliberately off-axis: the title low-left against the
 * stone high-right, with the technical register in the outer margin. Nothing
 * is centred, because centring is what makes a luxury page look like every
 * other luxury page.
 */
export default function Hero() {
  const ready = useReady();
  const scope = useRef(null);
  const { scrollTo } = useSmoothScroll();

  // Restrained pointer parallax. Deliberately small — a few pixels of lean, so
  // the page feels physical rather than tilted. Fine pointers only: on a touch
  // screen there is no pointer to follow.
  useEffect(() => {
    if (!window.matchMedia?.(MQ.pointer).matches) return undefined;
    const node = scope.current;
    if (!node) return undefined;

    const title = node.querySelector(`.${styles.title}`);
    const margin = node.querySelector(`.${styles.margin}`);
    if (!title) return undefined;

    const tx = gsap.quickTo(title, 'x', { duration: 1.1, ease: 'power3.out' });
    const ty = gsap.quickTo(title, 'y', { duration: 1.1, ease: 'power3.out' });
    const mx = margin ? gsap.quickTo(margin, 'x', { duration: 1.3, ease: 'power3.out' }) : null;

    const onMove = (e) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      tx(nx * -9);
      ty(ny * -6);
      mx?.(nx * -4);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      gsap.set([title, margin].filter(Boolean), { x: 0, y: 0 });
    };
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MQ.motion, () => {
        // Built only once the preloader has left, and never `paused` behind a
        // flag: a from() renders its start values immediately, so a timeline
        // built early and played late leaves the copy at opacity 0 until
        // something plays it. Built when it is ready to run, the untouched
        // state is the visible one.
        if (!ready) return undefined;

        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        tl.from(`.${styles.rule}`, { scaleX: 0, duration: 1.2 }, 0.55)
          .from(`.${styles.marginItem}`, { opacity: 0, x: -14, duration: 0.9, stagger: 0.08 }, 0.6)
          .from(`.${styles.lede}`, { opacity: 0, y: 22, duration: 1 }, 0.8)
          .from(`.${styles.actions} > *`, { opacity: 0, y: 18, duration: 0.9, stagger: 0.1 }, 0.95)
          .from(`.${styles.cue}`, { opacity: 0, duration: 0.8 }, 1.35);

        return () => tl.kill();
      });

      // No clearProps under reduced motion, deliberately: the motion branch
      // never ran there, so there is nothing to clear — and clearProps blanks
      // an element's whole inline style, not merely what GSAP set.
      return () => mm.revert();
    },
    { scope, dependencies: [ready] }
  );

  return (
    <section ref={scope} id="hero" className={styles.hero} aria-labelledby="hero-title">
      <div className={`ngd-page ngd-grid ${styles.inner}`}>
        <ul className={styles.margin} aria-label="At a glance">
          <li className={styles.marginItem}><span>Method</span><strong>CVD / HPHT</strong></li>
          <li className={styles.marginItem}><span>Grading</span><strong>IGI · GIA</strong></li>
          <li className={styles.marginItem}><span>Facility</span><strong>Surat, India</strong></li>
        </ul>

        <div className={styles.title}>
          <LetterAssemble as="h1" id="hero-title" className={styles.h1}>
            From carbon to brilliance
          </LetterAssemble>

          <span className={styles.rule} aria-hidden="true" />

          <p className={styles.lede}>
            Nine weeks in a reactor. Fifty-seven facets cut to a tolerance
            finer than a human hair. One certificate that says what it is.
          </p>

          <div className={styles.actions}>
            <a className={styles.primary} href="/diamonds" data-cursor="View">
              The inventory
            </a>
            <a className={styles.secondary} href="/diamond-finder">
              Find my diamond
            </a>
          </div>
        </div>
      </div>

      <button type="button" className={styles.cue} onClick={() => scrollTo('#genesis')}>
        <span className={styles.cueLine} aria-hidden="true" />
        <span>Begin</span>
      </button>
    </section>
  );
}
