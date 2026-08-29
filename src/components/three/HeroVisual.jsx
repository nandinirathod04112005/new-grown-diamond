import { useRef } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import stoneUrl from '@/assets/diamonds/ngd-brilliant-macro.webp';
import styles from './HeroVisual.module.css';

/**
 * The hero stone: a photograph of a real NGD diamond, and nothing else.
 *
 * There is no WebGL here by decision, not by capability. A procedurally
 * generated brilliant is not a photograph of a company-owned stone, and no
 * material setting makes it one — it renders as glass or as plaster, and it
 * cannot carry the facets, inclusions, transparency and proportions of an
 * actual graded diamond. Genuine photography outranks WebGL for this subject.
 *
 * The image itself is never redrawn. It receives only presentation effects
 * that leave the stone exactly as photographed:
 *
 *   · background isolation   — the source is already a transparent cutout
 *   · masked reveal          — a clip-path wipe over the plate, not the stone
 *   · slow scale and drift   — sub-pixel, scrubbed to the scroll
 *   · a light sweep          — a highlight passing ACROSS the plate, clipped
 *                              to it, never composited into the diamond
 *   · controlled contrast    — a drop-shadow beneath, seating it in the frame
 *
 * Nothing here alters a facet, a reflection, the colour, or the proportions.
 *
 * PROVISIONAL SIZE: see HERO_ASSET_SHORTFALL in lib/assetRequirements.js. The
 * source is 754px, so the plate is deliberately held to a size where the stone
 * stays sharp instead of being blown up to fill the viewport.
 */
export default function HeroVisual() {
  const scope = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MQ.motion, () => {
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

        // The plate opens; the photograph settles inside it. The stone is
        // scaled, never distorted.
        tl.from(`.${styles.plate}`, {
          clipPath: 'inset(0% 0% 100% 0%)',
          duration: 1.6,
        }).from(`.${styles.stone}`, {
          scale: 1.14,
          duration: 2,
        }, 0);

        // One slow pass of light across the plate, well after the reveal.
        tl.fromTo(`.${styles.sweep}`,
          { xPercent: -160, opacity: 0 },
          { xPercent: 160, opacity: 1, duration: 2.4, ease: 'power2.inOut' },
          1.1);

        return () => tl.kill();
      });

      // Desktop drift: a few pixels of parallax as the hero leaves. Explicit
      // start values with immediateRender:false, or the tween would capture
      // whatever the intro had just set.
      mm.add(MQ.desktop, () => {
        const drift = gsap.fromTo(
          `.${styles.stone}`,
          { yPercent: 0, scale: 1 },
          {
            yPercent: -7, scale: 1.05, ease: 'none', immediateRender: false,
            scrollTrigger: {
              trigger: scope.current, start: 'top top', end: 'bottom top', scrub: 1,
            },
          }
        );
        return () => { drift.scrollTrigger?.kill(); drift.kill(); };
      });

      mm.add(MQ.still, () => {
        gsap.set([`.${styles.plate}`, `.${styles.stone}`, `.${styles.sweep}`],
          { clearProps: 'all' });
      });

      return () => mm.revert();
    },
    { scope }
  );

  return (
    <div ref={scope} className={styles.visual}>
      <figure className={styles.plate}>
        <span className={styles.pool} aria-hidden="true" />
        <img
          className={styles.stone}
          src={stoneUrl}
          alt="A New Grown Diamond loose round brilliant, photographed against black"
          width={754}
          height={541}
          fetchPriority="high"
          decoding="async"
        />
        <span className={styles.sweep} aria-hidden="true" />
      </figure>
    </div>
  );
}
