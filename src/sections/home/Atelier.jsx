import { useRef } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import { useHeroProgress } from '@/hooks/useHeroProgress.js';
import { usePointerParallax } from '@/hooks/usePointerParallax.js';
import Magnetic from '@/components/motion/Magnetic.jsx';
import DiamondField from '@/components/media/DiamondField.jsx';

/* The house's own photograph, lifted off the white paper it was shot on. */
import roughStone from '@/assets/diamonds/ngd-brilliant-cutout.webp';

import styles from './Atelier.module.css';

/**
 * The opening, rebuilt from nothing.
 *
 * WHAT CHANGED. It was a left column of type beside a framed photograph. It is
 * now stacked and centred — label, headline, line, buttons — with one wide
 * panel beneath holding the stone. That gives the diamond the full width of the
 * page rather than half of it, and it puts the words where a reader's eye
 * already starts.
 *
 * THE PANEL IS THE POINT. Inside it the stone is divided down a travelling
 * seam: left of the line the photograph, cooled and darkened, reading as the
 * rough crystal; right of it the same stone as a rank of thin lit plates,
 * reading as the cut. Both halves are masked by ONE number, so they are exact
 * complements and no gap or overlap can open between them however slowly the
 * seam moves. Along its foot the house is written in its own small stones.
 *
 * WORDING IS UNCHANGED. All four headline pairs remain the accessible name of
 * this H1, in the order they have always been read; the display carries the
 * opening pair, and the duplicate is hidden from assistive technology so the
 * heading is announced once.
 *
 * NOTHING HERE IS REQUIRED FOR IT TO BE FINISHED. The stylesheet describes the
 * arrived composition and the timeline animates toward it, so a failed script,
 * a blocked bundle and reduced motion all leave a complete, readable opening.
 */

/* Unchanged: the same four pairs the original sequence carried. */
const LINES = [
  { key: 'rough', top: 'The beginning', bottom: 'of brilliance.' },
  { key: 'facet', top: 'Every facet', bottom: 'matters.' },
  { key: 'design', top: 'Endless design', bottom: 'possibilities.' },
  { key: 'atelier', top: 'Every stone has a tale', bottom: 'at the atelier.' },
];

const OPENING = LINES[0];
const EYEBROW = 'Grown in Surat · CVD & HPHT · IGI certified options';

export default function Atelier() {
  const hero = useRef(null);
  const panel = useRef(null);
  const scope = useRef(null);

  useHeroProgress(hero);
  usePointerParallax(panel, 1);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      const q = gsap.utils.selector(scope);
      const phone = window.matchMedia?.('(max-width: 899px)').matches;
      const t = phone ? 0.74 : 1;
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

      tl.fromTo(q(`.${styles.tag}`), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8 * t }, 0)
        /* Word by word, each in its own mask, so the line arrives as a wave
           travelling across it rather than as a block sliding up. */
        .fromTo(
          q(`.${styles.word}`),
          { yPercent: 120, rotate: 2 },
          { yPercent: 0, rotate: 0, duration: 1.15 * t, stagger: { each: 0.05 * t } },
          0.1 * t,
        )
        .fromTo(q(`.${styles.sub}`), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9 * t }, 0.5 * t)
        .fromTo(
          q(`.${styles.cta}`),
          { y: 16, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.85 * t, stagger: 0.07 * t },
          0.62 * t,
        )
        /*
         * The panel opens from a slit, last and largest, so the screen
         * resolves downward — label, words, buttons, then the stone — which is
         * the order they are read in.
         */
        .fromTo(
          q(`.${styles.panel}`),
          { clipPath: 'inset(46% 0% 46% 0% round 20px)', opacity: 0.35 },
          { clipPath: 'inset(0% 0% 0% 0% round 20px)', opacity: 1, duration: 1.5 * t, ease: 'expo.inOut' },
          0.4 * t,
        );
    },
    /* Once for the visit: a re-render must never restart the opening. */
    { scope, dependencies: [] },
  );

  return (
    <section
      ref={hero}
      id="top"
      className={`${styles.hero} u-stage-dark`}
      aria-label="From rough crystal to polished diamond"
    >
      <div ref={scope} className={styles.inner}>
        <p className={styles.tag}>
          <span className={styles.tagDot} aria-hidden="true" />
          {EYEBROW}
        </p>

        <h1 className={styles.head}>
          {/* Unchanged: all four pairs, in order, as the accessible name. */}
          <span className="u-visually-hidden">
            {LINES.map((l) => `${l.top} ${l.bottom}`).join(' ')}
          </span>
          {[
            { text: OPENING.top, tone: styles.lead },
            { text: OPENING.bottom, tone: styles.gold },
          ].map((line) => (
            <span key={line.text} className={styles.line} aria-hidden="true">
              {line.text.split(' ').map((w, i) => (
                <span key={`${w}-${i}`} className={styles.mask}>
                  <span className={`${styles.word} ${line.tone}`}>{w}</span>
                </span>
              ))}
            </span>
          ))}
        </h1>

        <p className={styles.sub}>
          Certified laboratory-grown diamonds for retailers, jewellers and partners worldwide.
        </p>

        <div className={styles.actions}>
          <Magnetic radius={90} pull={0.18}>
            <a className={`${styles.cta} ${styles.ctaLead}`} href="/diamonds">
              <span>Discover the diamonds</span>
              <i className={styles.arrow} aria-hidden="true" />
            </a>
          </Magnetic>
          <Magnetic radius={90} pull={0.18}>
            <a className={styles.cta} href="/contact">
              <span>Request inventory</span>
              <i className={styles.arrow} aria-hidden="true" />
            </a>
          </Magnetic>
        </div>

        <figure ref={panel} className={styles.panel}>
          <img
            className={styles.rough}
            src={roughStone}
            alt="A New Grown Diamond brilliant, photographed close."
            width="743"
            height="530"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            draggable="false"
          />

          {/* The cut half: a rank of thin lit plates, cut to the outline of a
              brilliant, with one pass of light travelling across it. */}
          <span className={styles.blades} aria-hidden="true">
            <i className={styles.sweep} />
          </span>

          <span className={styles.seam} aria-hidden="true" />
          <span className={styles.glow} aria-hidden="true" />

          {/* The house, written in its own small stones, along the foot. */}
          <DiamondField progressRef={hero} className={styles.mark} />

          <figcaption className={styles.caption}>
            <span>Rough</span>
            <span className={styles.captionRule} aria-hidden="true" />
            <span>Cut</span>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}
