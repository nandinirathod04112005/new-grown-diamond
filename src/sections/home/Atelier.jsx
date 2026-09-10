import { useRef } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import { useHeroProgress } from '@/hooks/useHeroProgress.js';
import { usePointerParallax } from '@/hooks/usePointerParallax.js';
import Magnetic from '@/components/motion/Magnetic.jsx';
import DotMatrix from '@/components/media/DotMatrix.jsx';



/*
 * The house stone, drawn for this page rather than sourced.
 *
 * Real brilliant geometry — 58 facets, table at 54.5% of the girdle, eight-fold
 * symmetry — shaded from the same light direction the rest of the site uses.
 * It is an illustration and the caption says so; it is also the one view of a
 * brilliant that can honestly be turned, because a round brilliant IS radially
 * symmetric about this axis, which is what lets the background pair rotate
 * without pretending a flat picture has a back.
 */
import diamondWide from '@/assets/diamonds/ngd-brilliant-figure-wide.webp';
import diamondTall from '@/assets/diamonds/ngd-brilliant-figure-tall.webp';

import styles from './Atelier.module.css';

/**
 * The opening: the house line on the left, one lit diamond holding the right.
 *
 * WHAT THIS REPLACED, AND WHY IT IS WORTH SAYING. This was a four-stage pinned
 * narrative — rough crystal, cut plan, polished stone — that held the page for
 * 242vh while a seam travelled across a plinth. It was a good idea and it cost
 * too much: a visitor arriving at the site could not reach a single word of the
 * business's own copy without scrolling through two and a half screens of
 * theatre, and the sequence's later headlines were only ever visible mid-scroll.
 *
 * The brief for this rebuild was a single cinematic screen, unpinned. So the
 * scene is one viewport, it releases the page immediately, and the section
 * below arrives on ordinary scrolling. Every word the hero carried is still
 * here: the four headline pairs remain the accessible name of this H1, exactly
 * as before, and the display shows the opening pair at editorial scale.
 *
 * THREE TRANSFORMS, THREE ELEMENTS, ON PURPOSE. Entrance, pointer and scroll
 * each own a different node, so none can overwrite another's transform:
 *
 *   .hero      the scroll target. useHeroProgress writes --hp on it.
 *   .drift     the pointer layer. usePointerParallax writes --mx/--my on it,
 *              and CSS turns those into a few degrees of tilt.
 *   .lift      the scroll layer, driven from --hp in CSS alone.
 *   .photo     the entrance layer, and the only thing GSAP scales.
 *
 * NOTHING HERE IS REQUIRED FOR THE HERO TO BE FINISHED. The stylesheet defines
 * the arrived composition, and the timeline animates from a start state toward
 * it — so a failed script, a blocked bundle or reduced motion all leave a
 * complete, readable opening rather than an empty screen.
 */

/* Unchanged: the same four pairs the pinned sequence carried. */
const LINES = [
  { key: 'rough', top: 'The beginning', bottom: 'of brilliance.' },
  { key: 'facet', top: 'Every facet', bottom: 'matters.' },
  { key: 'design', top: 'Endless design', bottom: 'possibilities.' },
  { key: 'atelier', top: 'Every stone has a tale', bottom: 'at the atelier.' },
];

const OPENING = LINES[0];

export default function Atelier() {
  const hero = useRef(null);
  const drift = useRef(null);
  const scope = useRef(null);

  useHeroProgress(hero);
  usePointerParallax(drift, 1);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;

      const q = gsap.utils.selector(scope);
      /* A phone gets the same choreography at three-quarter length: the same
         reveal, less waiting, which is what a small screen wants. */
      const phone = window.matchMedia?.('(max-width: 899px)').matches;
      const t = phone ? 0.72 : 1;

      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

      /*
       * The aperture. A polygon that starts as a small faceted opening over the
       * centre of the stone and expands to the full frame — the diamond is
       * uncovered rather than faded up, because a fade reads as an image
       * arriving late and an opening reads as a display case being unshuttered.
       */
      tl.fromTo(
        q(`.${styles.aperture}`),
        {
          clipPath: 'polygon(50% 41%, 57% 46%, 57% 54%, 50% 59%, 43% 54%, 43% 46%)',
        },
        {
          clipPath: 'polygon(50% 0%, 100% 8%, 100% 92%, 50% 100%, 0% 92%, 0% 8%)',
          duration: 1.5 * t,
          ease: 'expo.inOut',
        },
        0,
      )
        /* Settling from slightly too close, which is how a lens finds focus. */
        .fromTo(
          q(`.${styles.photo}`),
          { scale: 1.12 },
          { scale: 1, duration: 1.8 * t, ease: 'expo.out' },
          0,
        )
        /* Each headline line rises out of its own overflow mask. */
        .fromTo(
          q(`.${styles.lineInner}`),
          { yPercent: 118 },
          { yPercent: 0, duration: 1.15 * t, stagger: 0.09 * t },
          0.15 * t,
        )
        /* Copy and buttons arrive BEFORE the stone has finished opening, so the
           screen reads as one movement rather than image-then-text. */
        .fromTo(
          q(`.${styles.subInner}`),
          { yPercent: 130, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.9 * t },
          0.62 * t,
        )
        .fromTo(
          q(`.${styles.cta}`),
          { y: 18, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.85 * t, stagger: 0.08 * t },
          0.74 * t,
        )
        /* The rule is drawn last and completes the composition. */
        .fromTo(
          q(`.${styles.rule}`),
          { scaleX: 0 },
          { scaleX: 1, duration: 1.1 * t, ease: 'power2.inOut' },
          0.9 * t,
        )
        .fromTo(
          q(`.${styles.note}`),
          { opacity: 0 },
          { opacity: 1, duration: 0.8 * t },
          1.1 * t,
        )
        /*
         * The case edge, drawn rather than faded. DrawSVGPlugin ships with
         * GSAP now and is registered in lib/motion/gsap.js, so this costs no
         * new dependency. It starts from both ends of the outline and meets at
         * the bottom point, which is why the stroke reads as being traced.
         */
        .fromTo(
          q(`.${styles.rimLine}`),
          { drawSVG: '50% 50%' },
          { drawSVG: '0% 100%', duration: 1.3 * t, ease: 'power2.inOut' },
          0.85 * t,
        )
        /* The plan builds stroke by stroke, in a cutter's order. */
        .fromTo(
          q(`.${styles.planLine}`),
          { drawSVG: '0% 0%' },
          { drawSVG: '0% 100%', duration: 0.7 * t, stagger: 0.09 * t, ease: 'power2.out' },
          0.5 * t,
        )
        /* Then one arrowhead runs the outline, once. */
        .fromTo(
          q(`.${styles.planTrace}`),
          { drawSVG: '0% 0%' },
          { drawSVG: '0% 100%', duration: 1.6 * t, ease: 'power1.inOut' },
          1.15 * t,
        );
    },
    /* No dependencies: the opening plays once for the visit, and a re-render
       must never restart it. useGSAP reverts the timeline on unmount. */
    { scope, dependencies: [] },
  );

  return (
    <section
      ref={hero}
      id="top"
      className={`${styles.hero} u-stage-dark`}
      aria-label="From rough crystal to polished diamond"
    >
      <div ref={scope} className={styles.lift}>
        <div ref={drift} className={styles.drift}>
          {/*
            Two soft sources, and the only moving decoration on the screen.
            They travel AGAINST the pointer, which is what gives a flat
            photograph the feeling of sitting inside a room.
          */}
          <div className={styles.ambient} aria-hidden="true">
            <span className={styles.key} />
            <span className={styles.fill} />
          </div>

          {/*
            TWO REAL STONES, TURNING, BEHIND EVERYTHING.

            This is the house's own photograph of a round brilliant seen
            face-up — the one cut where rotation is honest, because a brilliant
            IS radially symmetric about that axis. Turning any other view would
            be pretending a flat picture has a back.

            They are dim, enormous and slow: one large behind the words, one
            small at the right edge, running in opposite directions on
            different clocks so the pair never lines up into a pattern.
          */}
          <div className={styles.orbit} aria-hidden="true">
            <img className={styles.orbitBig} src={diamondTall} alt="" width="976" height="1024" loading="lazy" decoding="async" />
            <img className={styles.orbitSmall} src={diamondTall} alt="" width="976" height="1024" loading="lazy" decoding="async" />
          </div>

          {/*
            The diamond drawn as lines, beside the words. Four strokes: the
            table, the crown, the girdle and the pavilion — the order a cutter
            works in. Each is drawn rather than faded, and an arrowhead runs
            the outline once the drawing is done, so the shape is built in
            front of the reader instead of appearing.
          */}
          <svg
            className={styles.plan}
            viewBox="0 0 120 108"
            aria-hidden="true"
            focusable="false"
          >
            <defs>
              <marker id="ngd-plan-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                <path d="M0 1 L9 5 L0 9" fill="none" stroke="currentColor" strokeWidth="1.6" />
              </marker>
            </defs>
            {/* girdle */}
            <path className={styles.planLine} d="M6 34 L114 34" pathLength="1" />
            {/* crown: table and its shoulders */}
            <path className={styles.planLine} d="M34 8 L86 8" pathLength="1" />
            <path className={styles.planLine} d="M6 34 L34 8 L86 8 L114 34" pathLength="1" />
            {/* crown facets */}
            <path className={styles.planLine} d="M34 8 L48 34 M86 8 L72 34 M60 8 L60 34" pathLength="1" />
            {/* pavilion to the culet */}
            <path className={styles.planLine} d="M6 34 L60 102 L114 34" pathLength="1" />
            <path className={styles.planLine} d="M48 34 L60 102 M72 34 L60 102 M24 34 L60 102 M96 34 L60 102" pathLength="1" />
            {/* the arrow that traces the outline once it is built */}
            <path
              className={styles.planTrace}
              d="M6 34 L34 8 L86 8 L114 34 L60 102 Z"
              pathLength="1"
              markerEnd="url(#ngd-plan-arrow)"
            />
          </svg>

          <div className={styles.inner}>
            <div className={styles.copy}>
              <h1 className={styles.head}>
                {/*
                  The accessible name is unchanged: all four pairs, in order,
                  exactly as the pinned sequence read them out. The display
                  shows the opening pair, and the duplicate is hidden from
                  assistive technology so the heading is announced once.
                */}
                <span className="u-visually-hidden">
                  {LINES.map((l) => `${l.top} ${l.bottom}`).join(' ')}
                </span>
                <span className={styles.line} aria-hidden="true">
                  <span className={`${styles.lineInner} ${styles.lead}`}>{OPENING.top}</span>
                </span>
                <span className={styles.line} aria-hidden="true">
                  <span className={`${styles.lineInner} ${styles.gold}`}>{OPENING.bottom}</span>
                </span>
              </h1>

              <span className={styles.rule} aria-hidden="true" />

              <p className={styles.sub}>
                <span className="u-visually-hidden">
                  Grown in Surat · CVD &amp; HPHT · IGI certified options
                </span>
                <span className={styles.subMask} aria-hidden="true">
                  <span className={styles.subInner}>
                    Grown in Surat · CVD &amp; HPHT · IGI certified options
                  </span>
                </span>
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
            </div>

            <figure className={styles.visual}>
              <div className={styles.aperture}>
                {/*
                  FOUR LAYERS AROUND ONE FLAT PHOTOGRAPH.
                  It is a still image, so nothing here pretends the stone can
                  be turned. What it can do is behave like an object in a room:
                  breathe on a long loop, take light across its facets, and sit
                  a little deeper than the frame it is in.

                  .sway is the pointer layer for the stone alone, a touch
                  stronger than the stage behind it, which is what separates
                  the two planes. .float is the loop. The photograph keeps its
                  own transform for the entrance, so all three are on their own
                  element and none overwrites another.
                */}
                <div className={styles.sway}>
                <div className={styles.float}>
                <picture>
                  {/*
                    The phone gets a genuinely different crop, not the wide
                    frame squeezed. The subject sits right of centre in the
                    original, so a centre-crop on a narrow screen would cut the
                    stone in half and keep the empty black beside it.
                  */}
                  <source media="(max-width: 899px)" srcSet={diamondTall} />
                  <source srcSet={diamondWide} />
                  <img
                    className={styles.photo}
                    src={diamondWide}
                    alt="An illustration of a round brilliant diamond seen face-up, its facets catching one light."
                    width="1536"
                    height="1024"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    draggable="false"
                  />
                </picture>
                </div>
                </div>

                {/*
                  The photograph, assembled from dots. It gathers on arrival
                  and comes apart again as the hero scrolls away — the real
                  <img> above is what remains, so the finished frame is the
                  picture at full detail rather than an impression of it.
                */}
                <DotMatrix src={diamondWide} progressRef={hero} className={styles.dots} />

                {/* One pass of light across the facets, long apart enough that
                    it stays an event rather than becoming wallpaper. */}
                <span className={styles.sweep} aria-hidden="true" />

                {/* The faceted edge of the display case, drawn once as the
                    aperture finishes opening. */}
                <svg
                  className={styles.rim}
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  aria-hidden="true"
                  focusable="false"
                >
                  <polygon
                    className={styles.rimLine}
                    points="50,0.4 99.6,8 99.6,92 50,99.6 0.4,92 0.4,8"
                    pathLength="1"
                  />
                </svg>
              </div>
              <figcaption className={styles.note}>Illustration · round brilliant, 58 facets</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
