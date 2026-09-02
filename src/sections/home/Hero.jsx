import { useRef } from 'react';

import ScrollScene from '@/components/scroll/ScrollScene.jsx';
import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import Magnetic from '@/components/motion/Magnetic.jsx';
import { usePointerParallax } from '@/hooks/usePointerParallax.js';
import stone from '@/assets/diamonds/ngd-brilliant-macro.webp';
import diamondHourglass from '@/assets/diamonds/ngd-diamond-hourglass-v2.png';
import LivePhoto from '@/components/media/LivePhoto.jsx';
import CausticField from '@/components/media/CausticField.jsx';
import styles from './Hero.module.css';


// 100vh of sticky against 200vh of scene gives a full viewport of travel.
// The previous 80+55 left only 35vh of travel, so --sp reached 1 after a
// third of a screen and the headline vanished while the section still filled
// the frame — an empty dark screen with a stone in it.
const PHASES = [{ name: 'in', vh: 110 }, { name: 'out', vh: 90 }];

const EYEBROW = ['Surat', '·', 'Since the 1980s', '·', 'CVD & HPHT'];
const TITLE = [
  { text: 'Grown with', gold: false },
  { text: 'precision.', gold: false },
  { text: 'Cut for light.', gold: true },
];
const SUB = [
  'Certified laboratory-grown diamonds for',
  'retailers, jewellers and partners worldwide.',
];
const REGISTER = ['0.30—6.00 ct', 'D—J colour', 'CVD / HPHT', 'IGI certified options'];

/** Split to characters but keep words whole, so line wrapping still behaves. */
function toWords(text) {
  return text.split(' ').map((word) => ({ word, chars: [...word] }));
}

/**
 * The opening: type on the left, the verified NGD photograph holding the right.
 *
 * There is no photographic plate behind the words any more. The stone that
 * carries the rest of the page is already here, held large and right of centre
 * while the headline owns the left — and when the page starts to move it walks
 * to the middle and becomes the ground the chapters are read against. The hero
 * and the film are the same object, so there is never a cut between them.
 *
 * A procedural 3D stone is deliberately not substituted for inventory media:
 * the page can move around a real photograph without implying that a rendered
 * object is a product visitors can buy.
 */
export default function Hero({ ready = false }) {
  const scope = useRef(null);
  const stage = useRef(null);
  usePointerParallax(stage, 1);

  useGSAP(
    () => {
      if (!ready || prefersReducedMotion()) return;

      const q = gsap.utils.selector(scope);
      const tl = gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.4 } });

      tl.fromTo(q(`.${styles.plate}`), { opacity: 0 }, { opacity: 1, duration: 1.6 }, 0)
        // The stone is uncovered from the centre outwards rather than faded:
        // a fade reads as an image loading, an opening reads as a reveal.
        .fromTo(
          q(`.${styles.gemFrame}`),
          { clipPath: 'inset(42% 42% 42% 42% round 50%)' },
          { clipPath: 'inset(0% 0% 0% 0% round 2px)', duration: 2, ease: 'expo.inOut' },
          0.1,
        )
        .fromTo(
          q(`.${styles.brow} span`),
          { yPercent: 130, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 1, stagger: 0.05 },
          0.25,
        )
        // Overlapping lines: the next begins before the last has settled, so
        // three lines read as one movement rather than three events.
        .fromTo(
          q(`.${styles.char}`),
          { yPercent: 120, rotate: 4, opacity: 0 },
          {
            yPercent: 0,
            rotate: 0,
            opacity: 1,
            duration: 1.5,
            // `from: 'start'` with a small step reads as a wave travelling
            // across the words rather than as each line arriving whole.
            stagger: { each: 0.018, from: 'start' },
          },
          0.35,
        )
        .fromTo(q(`.${styles.rule}`), { scaleX: 0 }, { scaleX: 1, duration: 1.5 }, 0.95)
        .fromTo(
          q(`.${styles.subLine}`),
          { yPercent: 115, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 1.3, stagger: 0.1 },
          1.05,
        )
        .fromTo(
          q(`.${styles.actions} a`),
          { y: 26, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.2, stagger: 0.09 },
          1.2,
        )
        .fromTo(q(`.${styles.registerRule}`), { scaleX: 0 }, { scaleX: 1, duration: 1.4 }, 1.35)
        .fromTo(
          q(`.${styles.register} span[data-item]`),
          { y: 14, opacity: 0 },
          { y: 0, opacity: 1, duration: 1, stagger: 0.07 },
          1.45,
        )
        .fromTo(q(`.${styles.cue}`), { opacity: 0, y: -18 }, { opacity: 1, y: 0, duration: 1.2 }, 1.6);

      // One pass of light across the facets, repeating slowly. Long enough
      // apart that it stays an event rather than becoming wallpaper.
      gsap.fromTo(
        q(`.${styles.gemSweep}`),
        { xPercent: -150, opacity: 0 },
        {
          xPercent: 150,
          opacity: 1,
          duration: 2.4,
          ease: 'power2.inOut',
          delay: 2.6,
          repeat: -1,
          repeatDelay: 5.5,
        },
      );
    },
    { scope, dependencies: [ready] },
  );

  return (
    <ScrollScene phases={PHASES} id="top" label="Introduction">
      <div ref={scope} className={`${styles.stage} u-stage-dark`} data-bleed>
        <div ref={stage} className={styles.depth}>
        <div className={styles.aurora} aria-hidden="true">
          <span /><span /><span />
        </div>
        <CausticField className={styles.caustics} tint={[0.18, 0.74, 0.9]} />
        <div className={styles.facetField} aria-hidden="true">
          {Array.from({ length: 14 }, (_, index) => (
            <span key={index} style={{ '--facet': index }} />
          ))}
        </div>
        <div className={styles.orbits} aria-hidden="true"><i /><i /><i /></div>
        <span className={styles.scanner} aria-hidden="true" />

        <div className={styles.copy}>
          <p className={`u-eyebrow ${styles.brow}`}>
            <span className="u-visually-hidden">{EYEBROW.join(' ')}</span>
            {EYEBROW.map((word, i) => (
              <span key={`${word}-${i}`} aria-hidden="true">{word}</span>
            ))}
          </p>

          <h1 className={styles.title}>
            <span className="u-visually-hidden">{TITLE.map((l) => l.text).join(' ')}</span>
            {TITLE.map((line) => (
              <span key={line.text} className={styles.line} aria-hidden="true">
                <span className={`${styles.lineInner} ${line.gold ? styles.gold : ''}`}>
                  {toWords(line.text).map(({ word, chars }, wi) => (
                    <span key={`${word}-${wi}`} className={styles.word}>
                      {chars.map((ch, ci) => (
                        <span key={`${ch}-${ci}`} className={styles.char}>{ch}</span>
                      ))}
                    </span>
                  ))}
                </span>
              </span>
            ))}
          </h1>

          <span className={styles.rule} aria-hidden="true" />

          <p className={styles.sub}>
            <span className="u-visually-hidden">{SUB.join(' ')}</span>
            {SUB.map((line) => (
              <span key={line} className={styles.subMask} aria-hidden="true">
                <span className={styles.subLine}>{line}</span>
              </span>
            ))}
          </p>

          <div className={styles.actions}>
            <Magnetic><a href="#diamonds">Discover the diamonds</a></Magnetic>
            <Magnetic><a href="/contact">Request inventory</a></Magnetic>
          </div>
        </div>

        <div className={styles.register} aria-hidden="true">
          <span className={styles.registerRule} />
          {REGISTER.map((item) => <span key={item} data-item>{item}</span>)}
        </div>

        <div className={styles.hourglassScene} aria-hidden="true">
          <span className={styles.hourglassGlow} />
          <span className={styles.orbitRing} /><span className={styles.orbitRing} />
          <img src={diamondHourglass} alt="" width="1536" height="1024" />
          <span className={styles.carbonStream} />
          <span className={styles.particleCloud}>
            {Array.from({ length: 28 }, (_, index) => (
              <i key={index} style={{
                '--particle': index,
                '--px': `${12 + index * 1.9}%`,
                '--py': `${18 + index * 2.15}%`,
                '--drift-a': `${index * 0.7 - 9.8}px`,
                '--drift-b': `${index * 1.8 - 25.2}px`,
                '--duration': `${4.2 + index * 0.17}s`,
                '--delay': `${index * -0.31}s`,
              }} />
            ))}
          </span>
          <span className={styles.facetSweep} />
          <span className={styles.lensFlare} />
        </div>

        <figure className={styles.gem}>
          <LivePhoto
            className={styles.gemFrame}
            src={stone}
            alt="A real New Grown Diamond round brilliant photographed loose against black."
            sparks={4}
            tilt={7}
            priority
            width="754"
            height="541"
          />
          <figcaption className={styles.grab}>Real NGD diamond photograph</figcaption>
        </figure>

        <div className={styles.cue} aria-hidden="true">
          <span className={styles.cueLine} />
        </div>
        </div>
      </div>
    </ScrollScene>
  );
}
