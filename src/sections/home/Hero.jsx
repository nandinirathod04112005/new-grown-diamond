import { useRef } from 'react';

import HeroVisual from '@/components/three/HeroVisual.jsx';
import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import { useSmoothScroll } from '@/providers/smoothScrollContext.js';
import { useReady } from '@/app/readyContext.js';
import styles from './Hero.module.css';

/**
 * Chapter 00 — the thesis, stated once.
 *
 * The composition is deliberately off-axis: the title sits low-left against
 * the stone high-right, with the technical register (lab, method, grading) in
 * the outer margin. Nothing is centred, because centring is what makes a
 * luxury page look like every other luxury page.
 */
export default function Hero() {
  const ready = useReady();
  const scope = useRef(null);
  const { scrollTo } = useSmoothScroll();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MQ.motion, () => {
        // The timeline is not BUILT until the preloader has left. Building it
        // paused and playing it later hides the copy the moment the tweens
        // render their start values — so if that play were ever missed, the
        // hero would sit blank. This way the untouched state is the visible
        // one, and the animation is purely additive.
        if (!ready) return undefined;

        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

        tl.from(`.${styles.word}`, { yPercent: 118, duration: 1.5, stagger: 0.09 })
          .from(`.${styles.rule}`, { scaleX: 0, duration: 1.2 }, 0.5)
          .from(`.${styles.marginItem}`, { opacity: 0, x: -14, duration: 0.9, stagger: 0.08 }, 0.6)
          .from(`.${styles.lede}`, { opacity: 0, y: 22, duration: 1 }, 0.75)
          .from(`.${styles.actions} > *`, { opacity: 0, y: 18, duration: 0.9, stagger: 0.1 }, 0.9)
          .from(`.${styles.visual}`, { opacity: 0, scale: 1.06, duration: 1.8 }, 0.1)
          .from(`.${styles.cue}`, { opacity: 0, duration: 0.8 }, 1.3);

        return () => { tl.scrollTrigger?.kill(); tl.kill(); };
      });

      // The stone lifts and dims as the hero leaves — depth without a pin.
      //
      // DESKTOP ONLY, and that is not a performance choice. The tween has to
      // name an explicit opacity to start from (see below), and the resting
      // opacity differs by breakpoint: 1 on desktop where the stone has its
      // own column, 0.22 on small screens where it sits behind the headline.
      // Running one tween across both would force the mobile stone to full
      // strength and make the headline unreadable over it.
      //
      // fromTo with immediateRender:false is likewise load-bearing: a plain
      // `to` records its start value the moment it is created — the same tick
      // the intro `from` has just set opacity to 0 — so the scrubbed tween
      // would inherit 0 and the stone would never appear at all.
      mm.add(MQ.desktop, () => {
        const drift = gsap.fromTo(
          `.${styles.visual}`,
          { yPercent: 0, opacity: 1 },
          {
            yPercent: -14, opacity: 0.25, ease: 'none', immediateRender: false,
            scrollTrigger: { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: 0.9 },
          }
        );
        return () => { drift.scrollTrigger?.kill(); drift.kill(); };

      });

      mm.add(MQ.still, () => {
        gsap.set([`.${styles.word}`, `.${styles.rule}`, `.${styles.marginItem}`,
          `.${styles.lede}`, `.${styles.actions} > *`, `.${styles.visual}`, `.${styles.cue}`],
        { clearProps: 'all' });
      });

      return () => mm.revert();
    },
    { scope, dependencies: [ready] }
  );

  return (
    <section ref={scope} className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.visual}>
        <HeroVisual />
      </div>

      <div className={`ngd-page ngd-grid ${styles.inner}`}>
        <ul className={styles.margin} aria-label="At a glance">
          <li className={styles.marginItem}><span>Method</span><strong>CVD / HPHT</strong></li>
          <li className={styles.marginItem}><span>Grading</span><strong>IGI · GIA</strong></li>
          <li className={styles.marginItem}><span>Facility</span><strong>Surat, India</strong></li>
        </ul>

        <div className={styles.title}>
          <h1 id="hero-title" className={styles.h1}>
            <span className="ngd-visually-hidden">From carbon to brilliance</span>
            <span aria-hidden="true">
              <span className={styles.lineBox}><span className={styles.word}>From carbon</span></span>
              <span className={styles.lineBox}><span className={styles.word}>to <em>brilliance</em></span></span>
            </span>
          </h1>

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
