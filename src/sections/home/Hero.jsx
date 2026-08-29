import { useRef } from 'react';
import { ArrowDown } from 'lucide-react';

import HeroVisual from '@/components/three/HeroVisual.jsx';
import Button from '@/components/primitives/Button.jsx';
import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import { useSmoothScroll } from '@/providers/smoothScrollContext.js';
import styles from './Hero.module.css';

/**
 * Full-height opening. The headline is authored as masked lines and animated
 * by a single timeline; the visual sits behind it and never gates it.
 */
export default function Hero() {
  const scope = useRef(null);
  const { scrollTo } = useSmoothScroll();

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MQ.motion, () => {
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

        tl.from(`.${styles.lineInner}`, {
          yPercent: 115,
          duration: 1.5,
          stagger: 0.11,
        })
          .from(`.${styles.eyebrow}`, { opacity: 0, y: 18, duration: 1 }, 0.25)
          .from(`.${styles.lede}`, { opacity: 0, y: 22, duration: 1.1 }, '-=0.85')
          .from(`.${styles.actions} > *`, {
            opacity: 0,
            y: 20,
            duration: 0.9,
            stagger: 0.1,
          }, '-=0.8')
          .from(`.${styles.meta} li`, {
            opacity: 0,
            y: 16,
            duration: 0.8,
            stagger: 0.08,
          }, '-=0.7')
          .from(`.${styles.scrollCue}`, { opacity: 0, duration: 0.8 }, '-=0.5');

        // The stone drifts up slightly as the hero leaves — depth without pinning.
        gsap.to(`.${styles.visual}`, {
          yPercent: -12,
          ease: 'none',
          scrollTrigger: {
            trigger: scope.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.9,
          },
        });
      });

      // Reduced motion: everything is already in its final position.
      mm.add(MQ.still, () => {
        gsap.set(
          [
            `.${styles.lineInner}`,
            `.${styles.eyebrow}`,
            `.${styles.lede}`,
            `.${styles.actions} > *`,
            `.${styles.meta} li`,
            `.${styles.scrollCue}`,
          ],
          { clearProps: 'all' }
        );
      });

      return () => mm.revert();
    },
    { scope }
  );

  const lines = ['Grown', 'in light,', 'cut for it.'];

  return (
    <section ref={scope} className={styles.hero} aria-labelledby="hero-title">
      <div className={styles.visual}>
        <HeroVisual />
      </div>

      <div className={`ngd-container ${styles.inner}`}>
        <p className={styles.eyebrow}>New Grown Diamond · Surat, India</p>

        <h1 id="hero-title" className={styles.title}>
          <span className="ngd-visually-hidden">Grown in light, cut for it.</span>
          <span aria-hidden="true">
            {lines.map((line, i) => (
              <span key={i} className={styles.line}>
                <span className={styles.lineInner}>
                  {i === 2 ? (
                    <>
                      cut <em>for it.</em>
                    </>
                  ) : (
                    line
                  )}
                </span>
              </span>
            ))}
          </span>
        </h1>

        <p className={styles.lede}>
          Laboratory-grown diamonds of certified origin, cut in our own
          facility and set into jewellery made to last generations.
        </p>

        <div className={styles.actions}>
          <Button to="/diamonds" variant="solid" size="lg" magnetic>
            View the inventory
          </Button>
          <Button to="/diamond-finder" variant="outline" size="lg">
            Find my diamond
          </Button>
        </div>

        <ul className={styles.meta}>
          <li><strong>IGI &amp; GIA</strong><span>Certified stones</span></li>
          <li><strong>CVD &amp; HPHT</strong><span>Both grown in-house</span></li>
          <li><strong>0.30–5.00 ct</strong><span>Current inventory</span></li>
        </ul>
      </div>

      <button
        type="button"
        className={styles.scrollCue}
        onClick={() => scrollTo('#featured-diamonds')}
      >
        <span>Explore</span>
        <ArrowDown size={15} aria-hidden="true" />
      </button>
    </section>
  );
}
