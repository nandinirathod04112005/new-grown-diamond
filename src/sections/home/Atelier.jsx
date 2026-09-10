import { useRef } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import { useHeroProgress } from '@/hooks/useHeroProgress.js';
import { usePointerParallax } from '@/hooks/usePointerParallax.js';
import Magnetic from '@/components/motion/Magnetic.jsx';
import DotMatrix from '@/components/media/DotMatrix.jsx';
import DiamondField from '@/components/media/DiamondField.jsx';



/*
 * The house stone, drawn for this page rather than sourced.
 *
 * Ray-traced, not drawn. Real brilliant geometry — 58 facets, crown 34.5
 * degrees, pavilion 40.75, table 56% — and every pixel is a ray that refracts
 * through the crown, bounces off the pavilion by total internal reflection and
 * leaves into a studio environment, traced once per wavelength so the stone
 * throws its own colour. It is a render and the caption says so.
 *
 * The turning pair behind the hero use the face-up trace, which is the one
 * view a still image may honestly rotate: a round brilliant IS radially
 * symmetric about that axis, so nothing hidden is being invented.
 */
/*
 * The stone from the reference: traced from the side, so the silhouette is the
 * one everybody draws when they draw a diamond — flat table, short crown, long
 * pavilion to a point — and lit in that picture's indigo, with a cyan kick from
 * the left and a violet one from the right for the iridescence.
 *
 * It arrives on transparency, which is the point: the room around it is the
 * shaft, the fragments and the pool below, all of them CSS, all of them moving
 * on their own clocks. The gem is the only thing in the frame that is an image.
 */
import diamondWide from '@/assets/diamonds/ngd-brilliant-profile.webp';
/*
 * The same stone traced at thirty angles and laid out in a strip. Stepping
 * through it is a real rotation — different facets catch at every angle,
 * which is the whole difference between a turning gem and a picture on a
 * turntable. 7800x260 and 145 KB, stepped by the compositor, no script.
 */
import spinSheet from '@/assets/diamonds/ngd-brilliant-spin.webp';
/* The house's own photograph of a real stone, for the pair behind the hero. */
import realStone from '@/assets/diamonds/ngd-brilliant-macro.webp';

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
          { yPercent: 118, rotate: 2.5 },
          {
            yPercent: 0,
            rotate: 0,
            duration: 1.2 * t,
            /* Small enough that the words overlap: the last is already moving
               before the first has settled, which is what makes it read as one
               phrase rather than four separate arrivals. */
            stagger: { each: 0.055 * t, from: 'start' },
          },
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
          {/*
            THE HOUSE, WRITTEN IN STONES, THEN GATHERED INTO ONE.

            Four hundred small diamonds fly in from the dark and settle into
            N G D. As the page is scrolled they leave the letters and gather
            into the outline of a single brilliant, turning violet as they go
            — and scrolling back reassembles the word, because the morph is an
            interpolation between two point sets rather than a simulation.

            Behind everything, at low contrast: it is the room the headline is
            read in, not a thing to be looked at directly.
          */}
          <DiamondField progressRef={hero} className={styles.swarm} />

          <div className={styles.orbit} aria-hidden="true">
            <img className={styles.orbitBig} src={realStone} alt="" width="754" height="541" loading="lazy" decoding="async" />
            <img className={styles.orbitSmall} src={realStone} alt="" width="754" height="541" loading="lazy" decoding="async" />
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
                {/*
                  Word by word rather than line by line. Each word carries its
                  own mask, so the line arrives as a wave travelling across it
                  instead of a block sliding up — the same movement the eye
                  makes reading it. Whole words, never characters: splitting
                  mid-word breaks the shapes a reader recognises, and on a
                  narrow column it also breaks the wrapping.
                */}
                {[
                  { text: OPENING.top, tone: styles.lead },
                  { text: OPENING.bottom, tone: styles.gold },
                ].map((line) => (
                  <span key={line.text} className={styles.line} aria-hidden="true">
                    {line.text.split(' ').map((word, i) => (
                      <span key={`${word}-${i}`} className={styles.wordMask}>
                        <span className={`${styles.lineInner} ${line.tone}`}>{word}</span>
                      </span>
                    ))}
                  </span>
                ))}
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
                  <source srcSet={diamondWide} />
                  <img
                    className={styles.photo}
                    src={diamondWide}
                    alt="A brilliant-cut diamond seen from the side, held in a shaft of light."
                    width="1000"
                    height="1000"
                    loading="eager"
                    fetchPriority="high"
                    decoding="async"
                    draggable="false"
                  />
                </picture>

                {/*
                  The rotation. Thirty traced angles stepped by the compositor,
                  fading in once the dots have finished gathering — so the
                  opening is still an arrival, and the stone only begins to
                  turn after it has arrived.
                */}
                <span
                  className={styles.spin}
                  style={{ backgroundImage: `url(${spinSheet})` }}
                  aria-hidden="true"
                />
                </div>
                </div>

                {/*
                  THE SCENE THE REFERENCE ASKS FOR: a stone held in a shaft of
                  light above the pool of colour it throws on the floor, with
                  fragments drifting around it.

                  Every part is CSS on its own element, so the beam, the pool
                  and the shards each run their own clock and none of them
                  touches the photograph's transform. Behind the stone, so the
                  gem stays the subject and the light stays weather.
                */}
                <span className={styles.beam} aria-hidden="true" />
                <span className={styles.aura} aria-hidden="true" />
                <span className={styles.pool} aria-hidden="true" />

                {/*
                  The photograph, assembled from dots. It gathers on arrival
                  and comes apart again as the hero scrolls away — the real
                  <img> above is what remains, so the finished frame is the
                  picture at full detail rather than an impression of it.
                */}
                <DotMatrix src={diamondWide} progressRef={hero} className={styles.dots} />

                {/*
                  SCINTILLATION. The one thing a diamond does that nothing else
                  does: as the light or the head moves, individual facets catch
                  and let go, and the stone flashes. Eight points, each on its
                  own long clock with a very short flash, so they never pulse
                  together and never read as a blinking light. Placed over the
                  crown where the bright facets actually are.
                */}
                <span className={styles.glints} aria-hidden="true">
                  {Array.from({ length: 8 }, (_, i) => (
                    <i
                      key={i}
                      style={{
                        '--x': `${[38, 57, 46, 63, 34, 52, 68, 43][i]}%`,
                        '--y': `${[40, 37, 46, 44, 47, 34, 41, 52][i]}%`,
                        '--s': `${[26, 34, 20, 30, 22, 38, 24, 28][i]}px`,
                        '--dur': `${[6.5, 9, 7.5, 11, 8, 12.5, 10, 6][i]}s`,
                        '--delay': `${-[0, 2.4, 5.1, 1.3, 7.2, 3.6, 8.8, 4.4][i]}s`,
                      }}
                    />
                  ))}
                </span>

                {/*
                  The prism. Diamond's whole optical signature is that it bends
                  colours by different amounts, so once a cycle the glow splits
                  into a cyan and a violet that part and come back together.
                */}
                <span className={styles.prism} data-side="cool" aria-hidden="true" />
                <span className={styles.prism} data-side="warm" aria-hidden="true" />

                {/* The light the stone throws into the room, as rays rather
                    than a wash — turning slowly, so the room is never twice
                    the same. */}
                <span className={styles.rays} aria-hidden="true" />

                {/*
                  Fragments, in front of the stone and behind it both — the odd
                  ones drift nearer, the even ones further, which is what gives
                  the shaft depth. Twelve, not a hundred: the reference has a
                  handful of readable shards, and a cloud of them would be
                  confetti.
                */}
                <span className={styles.shards} aria-hidden="true">
                  {Array.from({ length: 12 }, (_, i) => (
                    <i
                      key={i}
                      style={{
                        '--x': `${[14, 78, 33, 62, 8, 88, 47, 24, 69, 41, 92, 56][i]}%`,
                        '--y': `${[22, 16, 68, 38, 54, 60, 12, 86, 78, 30, 44, 92][i]}%`,
                        '--s': `${[7, 5, 9, 4, 6, 8, 5, 7, 4, 6, 9, 5][i]}px`,
                        '--rot': `${[18, -32, 47, -12, 63, -55, 8, 39, -24, 71, -41, 27][i]}deg`,
                        '--dur': `${[13, 17, 11, 19, 15, 21, 12, 18, 14, 20, 16, 22][i]}s`,
                        '--delay': `${-[0, 3, 7, 1, 9, 5, 11, 2, 8, 4, 6, 10][i]}s`,
                      }}
                    />
                  ))}
                </span>

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
              <figcaption className={styles.note}>Rendered · brilliant cut, 58 facets</figcaption>
            </figure>
          </div>
        </div>
      </div>
    </section>
  );
}
