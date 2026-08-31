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

        tl.from(`.${styles.letter}`, {
          yPercent: 125, rotate: 3, opacity: 0, duration: 1.45, stagger: 0.035,
        })
          .from(`.${styles.rule}`, { scaleX: 0, duration: 1.2 }, 0.5)
          .from(`.${styles.marginItem}`, { opacity: 0, x: -14, duration: 0.9, stagger: 0.08 }, 0.6)
          .from(`.${styles.lede}`, { opacity: 0, y: 22, duration: 1 }, 0.75)
          .from(`.${styles.actions} > *`, { opacity: 0, y: 18, duration: 0.9, stagger: 0.1 }, 0.9)
          .from(`.${styles.visual}`, { opacity: 0, scale: 1.06, duration: 1.8 }, 0.1)
          .from(`.${styles.bracket}`, { scaleY: 0, duration: 1.2, stagger: 0.1 }, 0.48)
          .from(`.${styles.sceneLabel}`, { opacity: 0, x: 12, duration: 0.9, stagger: 0.08 }, 0.72)
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
        const exit = gsap.timeline({
          scrollTrigger: {
            trigger: scope.current, start: 'top top', end: 'bottom top', scrub: 0.9,
          },
        }).fromTo(`.${styles.title}`, { yPercent: 0, opacity: 1 }, {
          yPercent: -18, opacity: 0.12, ease: 'none', immediateRender: false,
        }, 0).fromTo(`.${styles.letter}`, { letterSpacing: '0em' }, {
          letterSpacing: '0.055em', ease: 'none', immediateRender: false,
        }, 0);
        return () => {
          drift.scrollTrigger?.kill(); drift.kill();
          exit.scrollTrigger?.kill(); exit.kill();
        };

      });

      // Fine-pointer depth: the typography and the calibrated product plate
      // respond at different rates, like two planes inside a display case.
      // This is input-led (never an idle loop), and is not registered on touch.
      mm.add(MQ.pointer, () => {
        const title = scope.current?.querySelector(`.${styles.title}`);
        const register = scope.current?.querySelector(`.${styles.sceneRegister}`);
        if (!title || !register) return undefined;

        const titleX = gsap.quickTo(title, 'x', { duration: 0.9, ease: 'power3.out' });
        const titleY = gsap.quickTo(title, 'y', { duration: 0.9, ease: 'power3.out' });
        const registerX = gsap.quickTo(register, 'x', { duration: 1.2, ease: 'power3.out' });
        const registerY = gsap.quickTo(register, 'y', { duration: 1.2, ease: 'power3.out' });

        const onMove = (event) => {
          const x = event.clientX / window.innerWidth - 0.5;
          const y = event.clientY / window.innerHeight - 0.5;
          titleX(x * -10); titleY(y * -7);
          registerX(x * 18); registerY(y * 12);
        };
        const onLeave = () => {
          titleX(0); titleY(0); registerX(0); registerY(0);
        };
        scope.current.addEventListener('pointermove', onMove);
        scope.current.addEventListener('pointerleave', onLeave);
        return () => {
          scope.current?.removeEventListener('pointermove', onMove);
          scope.current?.removeEventListener('pointerleave', onLeave);
          gsap.killTweensOf([title, register]);
        };
      });

      mm.add(MQ.still, () => {
        gsap.set([`.${styles.letter}`, `.${styles.rule}`, `.${styles.marginItem}`,
          `.${styles.lede}`, `.${styles.actions} > *`, `.${styles.visual}`, `.${styles.bracket}`,
          `.${styles.sceneLabel}`, `.${styles.cue}`],
        { clearProps: 'all' });
      });

      return () => mm.revert();
    },
    { scope, dependencies: [ready] }
  );

  return (
    <section ref={scope} id="hero" className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.atmosphere} aria-hidden="true">
        <span className={styles.horizon} />
        <span className={styles.coordinate}>00 / 07</span>
      </div>
      <div className={styles.visual}>
        <HeroVisual />
        <div className={styles.sceneRegister} aria-hidden="true">
          <span className={`${styles.bracket} ${styles.bracketLeft}`} />
          <span className={`${styles.sceneLabel} ${styles.sceneLabelLeft}`}>Carbon source</span>
          <span className={`${styles.sceneLabel} ${styles.sceneLabelRight}`}>Finished brilliance</span>
          <span className={`${styles.bracket} ${styles.bracketRight}`} />
        </div>
      </div>

      <div className={`ngd-page ngd-grid ${styles.inner}`}>
        <ul className={styles.margin} aria-label="At a glance">
          <li className={styles.marginItem}><span>Method</span><strong>CVD / HPHT</strong></li>
          <li className={styles.marginItem}><span>Grading</span><strong>IGI · GIA</strong></li>
          <li className={styles.marginItem}><span>Facility</span><strong>Surat, India</strong></li>
        </ul>

        <div className={styles.title}>
          <p className={styles.eyebrow}><span>New Grown Diamond</span><span>Chapter 00</span></p>
          <h1 id="hero-title" className={styles.h1}>
            <span className="ngd-visually-hidden">From carbon to brilliance</span>
            <span aria-hidden="true">
              <span className={styles.lineBox}><span className={styles.word}>{letters('From ')}<em>{letters('carbon', 'carbon')}</em></span></span>
              <span className={`${styles.lineBox} ${styles.lineOffset}`}><span className={styles.word}>{letters('to brilliance')}</span></span>
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

function letters(text, keyPrefix = 'title') {
  return Array.from(text).map((character, index) => (
    <span key={`${keyPrefix}-${index}`} className={styles.letter}>
      {character === ' ' ? '\u00a0' : character}
    </span>
  ));
}
