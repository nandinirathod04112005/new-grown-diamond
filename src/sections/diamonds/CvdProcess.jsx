import { lazy, Suspense, useRef, useState } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import { qualityTier } from '@/lib/three/capability.js';
import SplitHeading from '@/components/motion/SplitHeading.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import { CVD_STEPS } from './cvdSteps.js';
import CvdReactor from './CvdReactor.jsx';
import styles from './CvdProcess.module.css';

/*
 * The stone is the only thing on this page that needs WebGL, and it is halfway
 * down it. Loading three, the fiber renderer and drei on first paint to serve
 * one section nobody has scrolled to yet would cost every visitor for the
 * benefit of some — so the chunk is fetched when the section decides it wants
 * it, and never at all on a device that cannot use it.
 */
const ProcessGem = lazy(() => import('@/components/three/ProcessGem.jsx'));

/*
 * How much scroll each beat is worth, as a fraction of the whole pinned
 * distance. The stone gets a fifth of it and the twelve plates share the rest —
 * enough for the turn to visibly slow without holding the reader on one image.
 */
const GEM_SHARE = 0.2;
const PLATE_VH = 85;

/* How much of a plate's slot the reveal itself occupies; the rest is the hold. */
const REVEAL = 0.42;

/*
 * Fraction of a plate's slot the readout waits before naming the next stage.
 *
 * Set to where the iris actually takes the frame over, which is later than it
 * looks. Half the plate's AREA is covered when the circle's radius reaches 50%
 * of the 70.71% it ends on — and `power2.inOut` is past its slow start by then,
 * so that point falls around a quarter of the way through the reveal rather
 * than halfway. Before this was retuned the number changed while barely a third
 * of the new picture was showing.
 */
const HUD_LAG = 0.26;

/**
 * The CVD production sequence: a pinned, scrubbed story.
 *
 * ONE ScrollTrigger drives everything. Every value — the stone's deceleration,
 * the dissolve, twelve cross-fades and the progress readout — is a position on
 * a single timeline, so scrubbing backwards runs the whole thing in reverse
 * exactly and there is no second instance to fall out of sync with the first.
 *
 * THE PLATES ARE DISCOVERED, NOT LISTED. Any file dropped into
 * `src/assets/process/cvd-steps/` named for its step number becomes that
 * stage's picture with no code change.
 *
 * Three things about this deliberately do not depend on the timeline:
 *
 *   - The step text is real HTML, present for search engines and screen
 *     readers, and visually hidden because the plates carry the same words
 *     rendered into the artwork.
 *   - Under reduced motion nothing pins and nothing scrubs; the twelve plates
 *     become an ordinary scrolling list, which is the same content at the same
 *     quality without the movement.
 *   - On a device with no usable WebGL the stone is simply absent and the
 *     sequence opens on Step 01. Nothing else changes.
 */
const PLATES = Object.fromEntries(
  Object.entries(
    import.meta.glob('@/assets/process/cvd-steps/*.{webp,png,jpg,jpeg}', {
      eager: true,
      import: 'default',
    }),
  ).map(([path, url]) => [Number(path.split('/').pop().replace(/\D/g, '')), url]),
);

export default function CvdProcess() {
  const root = useRef(null);
  const stage = useRef(null);
  const gemWrap = useRef(null);
  const reactorWrap = useRef(null);
  const stoneWrap = useRef(null);
  const introPhase = useRef(null);
  const plates = useRef([]);
  /* The picture is held apart from its plate: the plate carries the clip that
     reveals it, the picture carries the light that falls off it. Both on one
     element would mean the falloff also dimmed the edge drawn over it. */
  const shots = useRef([]);
  const rings = useRef([]);
  const bar = useRef(null);
  const num = useRef(null);
  const label = useRef(null);
  const atmosphere = useRef(null);
  const markers = useRef([]);
  const gemProgress = useRef(0);

  /*
   * Both settled at mount rather than corrected in an effect, so the first
   * render is already the final one — no canvas mounted and then torn down on
   * a phone, no pinned layout flashing before reduced motion is noticed.
   */
  const [still] = useState(() => prefersReducedMotion());
  const [tier] = useState(() => (typeof window === 'undefined' ? 'off' : qualityTier()));
  // The SVG growth sequence works even without WebGL.
  const hasGem = !still;
  const steps = CVD_STEPS.filter((s) => PLATES[s.n]);

  useGSAP(
    () => {
      if (still) return;
      const pinned = stage.current;
      if (!pinned) return;

      const cards = plates.current.filter(Boolean);
      if (!cards.length) return;

      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        onUpdate: () => updateReadout(tl.progress()),
        scrollTrigger: {
          /*
           * The STAGE is the trigger, not the section.
           *
           * `pin` freezes an element wherever it happens to be sitting at the
           * moment the trigger fires. With the section as trigger it fired when
           * the section's top — the heading — reached the top of the window,
           * and the stage was still 496px further down the page. So it pinned
           * THERE: a 902px pane held with its top halfway down a 900px window,
           * 404px of every plate parked permanently below the fold and the
           * progress readout off screen entirely. Only 43% of each picture was
           * ever visible.
           *
           * Triggering on the stage itself pins it flush against the top of the
           * window, where it is exactly one viewport tall and wholly on screen.
           */
          trigger: pinned,
          start: 'top top',
          end: `+=${cards.length * PLATE_VH + (hasGem ? 90 : 0)}%`,
          pin: pinned,
          /*
           * Pin by transform, not by `position: fixed`.
           *
           * The default pin takes the element out of flow, and the layout-shift
           * observer scores that as the element collapsing to zero height —
           * measured CLS 1.72 on desktop and 1.11 on a phone, and NOT discounted,
           * because scroll is not the kind of discrete input Chrome excuses.
           * Nothing visibly moved; the score was real all the same.
           *
           * `transform` translates the element instead, so it never leaves the
           * document flow and there is nothing for the observer to record. It is
           * also the friendlier of the two next to Lenis, which is already
           * moving the page by transform.
           */
          pinType: 'transform',
          pinSpacing: true,
          scrub: 0.45,
          invalidateOnRefresh: true,
          /*
           * The readout is written straight to the DOM. It changes on every
           * scrub frame, and putting that through React state would re-render
           * the whole sequence sixty times a second to update two short
           * strings and one width.
           */
        },
      });

      // Read the eased playhead, so the captions track the visible image even
      // while the scrub catches up after a fast scroll.
      function updateReadout(p) {
            if (introPhase.current) {
              introPhase.current.textContent = p < 0.045 ? '01 / A perfect seed'
                : p < 0.095 ? '02 / Plasma activation'
                : p < 0.15 ? '03 / Layer by layer'
                : '04 / The beginning of brilliance';
            }
            const after = hasGem ? Math.max(0, (p - GEM_SHARE) / (1 - GEM_SHARE)) : p;
            /*
             * The readout follows the plate you can SEE, not the one whose slot
             * the scroll has entered. A plate holds the whole frame until the
             * next one's iris opens over it, so a plain floor() named the new
             * stage on the frame the circle started — a dot in the middle of a
             * picture still entirely the previous step. HUD_LAG pushes the
             * change out to where the new plate genuinely owns the frame.
             */
            const i = Math.min(
              cards.length - 1,
              Math.max(0, Math.floor(after * cards.length - HUD_LAG)),
            );
            const step = steps[i];
            markers.current.forEach((marker, index) => {
              if (marker) marker.dataset.state = index < i ? 'complete' : index === i ? 'active' : 'pending';
            });
            if (num.current && num.current.textContent !== String(step.n).padStart(2, '0')) {
              num.current.textContent = String(step.n).padStart(2, '0');
              label.current.textContent = step.title;
              /*
               * The number and its caption rise into place rather than blinking
               * from one string to the next. This tween is NOT scrubbed — it
               * plays at its own speed off the change itself, which is what
               * makes it read as a counter turning over rather than as text
               * being rewritten. The overwrite matters: a fast flick through
               * the section fires this many times, and each flip has to take
               * the previous one's place cleanly.
               */
              gsap.fromTo(
                [num.current, label.current],
                { yPercent: 55, autoAlpha: 0 },
                {
                  yPercent: 0,
                  autoAlpha: 1,
                  duration: 0.45,
                  ease: 'power3.out',
                  stagger: 0.06,
                  overwrite: 'auto',
                },
              );
            }
            if (bar.current) bar.current.style.setProperty('--fill', after.toFixed(4));
      }

      tl.fromTo(atmosphere.current, { rotation: -18, scale: 0.85 },
        { rotation: 65, scale: 1.15, duration: 1 }, 0);

      if (hasGem) {
        tl.fromTo(pinned.querySelector(`.${styles.hud}`), { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.025 }, GEM_SHARE);
        const atoms = reactorWrap.current.querySelectorAll('[data-atom]');
        const layers = reactorWrap.current.querySelectorAll('[data-crystal-layer]');
        const plasma = reactorWrap.current.querySelector('[data-plasma]');
        const energy = reactorWrap.current.querySelectorAll('[data-energy-stream]');
        const scan = reactorWrap.current.querySelector('[data-scan]');
        const finished = reactorWrap.current.querySelector('[data-finished-stone]');
        gsap.set(finished, { autoAlpha: 0 });
        tl.fromTo(reactorWrap.current, { y: 20, scale: 0.94 },
          { y: 0, scale: 1, duration: 0.12, ease: 'sine.inOut' }, 0);
        tl.fromTo(energy, { strokeDasharray: '0.18 0.82', strokeDashoffset: 1, opacity: 0 },
          { strokeDashoffset: -2, opacity: 0.85, duration: 0.075,
            stagger: { amount: 0.012 }, ease: 'none' }, 0.035);
        tl.to(energy, { opacity: 0, duration: 0.018 }, 0.115);
        tl.fromTo(scan, { y: 0, opacity: 0 },
          { y: -84, opacity: 0.8, duration: 0.065, ease: 'sine.inOut' }, 0.07);
        tl.to(scan, { opacity: 0, duration: 0.015 }, 0.135);
        tl.fromTo(atoms, {
          x: (i) => (i % 2 ? 1 : -1) * (130 + (i % 5) * 25),
          y: (i) => -90 - (i % 7) * 12,
          opacity: 0,
        }, { x: 0, y: 0, opacity: 0.9, duration: 0.07,
          stagger: { amount: 0.035 }, ease: 'power2.inOut' }, 0.015);
        tl.fromTo(plasma, { opacity: 0, scale: 0.5, svgOrigin: '400 245' },
          { opacity: 1, scale: 1, duration: 0.045, ease: 'power2.out' }, 0.035);
        tl.fromTo(layers, { opacity: 0, y: -16 },
          { opacity: 1, y: 0, duration: 0.025, stagger: 0.008, ease: 'power2.out' }, 0.075);
        tl.to(atoms, { opacity: 0, y: 35, duration: 0.04, stagger: { amount: 0.02 } }, 0.105);
        tl.to(plasma, { opacity: 0.2, duration: 0.035 }, 0.13);
        if (tier !== 'off') {
          tl.to(reactorWrap.current, { autoAlpha: 0, scale: 1.08, duration: 0.035 }, 0.15);
          tl.fromTo(stoneWrap.current, { autoAlpha: 0, scale: 0.75 },
            { autoAlpha: 1, scale: 1, duration: 0.035, ease: 'power2.out' }, 0.15);
        } else {
          tl.to(reactorWrap.current.querySelector('[data-growth-scene]'),
            { autoAlpha: 0, y: 20, duration: 0.025 }, 0.145);
          tl.to(reactorWrap.current.querySelector(`.${styles.reactorLabels}`),
            { autoAlpha: 0, duration: 0.025 }, 0.145);
          tl.fromTo(finished, { autoAlpha: 0, scale: 0.65, rotation: -12, svgOrigin: '400 260' },
            { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.035, ease: 'power3.out' }, 0.15);
          tl.fromTo(finished.querySelector('[data-glint]'),
            { opacity: 0, scale: 0, svgOrigin: '495 170' },
            { opacity: 1, scale: 1, duration: 0.012 }, 0.177);
        }
        /*
         * A proxy object, because what is being animated is a number the WebGL
         * scene reads each frame — not a DOM property GSAP could set directly.
         * `power2.inOut` is what turns a linear scrub into a turn that eases
         * off rather than one that brakes.
         */
        const spin = { p: 0 };
        tl.to(spin, {
          p: 1,
          duration: GEM_SHARE * 0.72,
          ease: 'power2.inOut',
          onUpdate: () => { gemProgress.current = spin.p; },
        }, 0);

        // The still moment. Nothing animates here; the gap is the hold.
        tl.to(gemWrap.current, {
          autoAlpha: 0,
          scale: 1.14,
          duration: GEM_SHARE * 0.28,
          ease: 'power2.in',
        }, GEM_SHARE * 0.86);
      }

      const start = hasGem ? GEM_SHARE : 0;
      const span = (1 - start) / cards.length;

      cards.forEach((card, i) => {
        const at = start + i * span;
        const dur = span * REVEAL;
        const shot = shots.current[i];
        const ring = rings.current[i];

        /*
         * THE IRIS. Each plate opens as a circle widening from the centre.
         *
         * The plates are stacked in one grid cell in document order, so plate
         * i + 1 paints ON TOP of plate i. That is what makes this a wipe rather
         * than a fade: the incoming plate is fully opaque the whole time and
         * the clip is what reveals it, so what you see outside the circle is
         * the previous step, still there, still sharp, until the circle has
         * grown past it.
         *
         * 71% is not a guess. A percentage radius resolves against
         * sqrt(w² + h²) / sqrt(2), and the distance from the centre to a corner
         * is sqrt(w² + h²) / 2 — so the corners are reached at exactly
         * sqrt(2) / 2, or 70.71%, whatever the box's aspect ratio. Stopping at
         * 71% means the whole of the tween is visible change, and the extra
         * fraction covers the anti-aliased edge.
         *
         * The from-state doubles as the resting state: a circle of zero radius
         * shows nothing, so every plate but the first is hidden before its turn
         * without needing opacity to do it.
         */
        if (hasGem || i > 0) {
          tl.fromTo(
            card,
            { clipPath: 'circle(0% at 50% 50%)', scale: 0.96, rotationY: i % 2 ? -7 : 7, y: 14 },
            {
              clipPath: 'circle(71% at 50% 50%)',
              scale: 1,
              rotationY: 0,
              y: 0,
              duration: dur,
              ease: 'power2.inOut',
            },
            at,
          );

          const sheen = card.querySelector(`.${styles.sheen}`);
          tl.fromTo(sheen, { xPercent: -130, opacity: 0 },
            { xPercent: 130, opacity: 0.35, duration: dur * 1.5, ease: 'sine.inOut' }, at);
          tl.to(sheen, { opacity: 0, duration: dur * 0.35 }, at + dur * 1.15);

          /*
           * The new picture arrives a shade hot and cools into place. It runs
           * half again as long as the reveal on purpose: the light is still
           * settling after the circle has finished opening, so the plate goes
           * on resolving for a moment rather than snapping to its final state
           * the instant the geometry lands.
           */
          if (shot) {
            tl.fromTo(
              shot,
              { opacity: 0.8 },
              { opacity: 1, duration: dur * 1.5, ease: 'power2.out' },
              at,
            );
          }
        }

        if (i < cards.length - 1) {
          /*
           * THE EDGE. A ring of light riding the rim of the circle above it.
           *
           * It lives inside the OUTGOING plate, which is the one still drawn in
           * full — a ring inside the incoming plate would be cut in half by the
           * very clip it is tracing. Its box is as wide as the plate, so at
           * scale 1 its radius is half the plate width; 1.21 puts that radius at
           * 0.605 of the width, which is exactly where a 71% circle lands. Same
           * start, same duration and same ease as the clip, so the two stay
           * locked together instead of drifting apart across the reveal.
           *
           * This is what stops the wipe reading as a hard cookie-cutter: the
           * eye follows the light and never settles on the cut itself.
           */
          if (ring) {
            /*
             * Geometry and brightness are two separate tweens on purpose.
             *
             * Sharing one meant the ring's opacity climbed on the same
             * `power2.inOut` as its radius, so it was still faint through the
             * whole first half of the travel and only reached full strength as
             * it left the frame — the one part of the journey nobody needs to
             * see. Now the scale alone stays locked to the clip, and the light
             * snaps on in the first fifth, holds while it crosses the picture,
             * and is spent by the time it reaches the corners.
             */
            tl.fromTo(
              ring,
              { scale: 0 },
              { scale: 1.21, duration: dur, ease: 'power2.inOut' },
              at + span,
            );
            tl.fromTo(
              ring,
              { autoAlpha: 0 },
              { autoAlpha: 1, duration: dur * 0.18, ease: 'power2.out' },
              at + span,
            );
            tl.to(ring, { autoAlpha: 0, duration: dur * 0.4, ease: 'power2.in' }, at + span + dur * 0.6);
          }

          /*
           * And the picture underneath falls back into shadow as the new one
           * takes the frame — the depth cue that keeps the two from reading as
           * one flat image swapping texture behind a fixed hole. It is on the
           * PICTURE and not the plate, so the ring drawn over it stays bright.
           */
          if (shot) {
            tl.to(
              shot,
              { opacity: 0.42, duration: dur, ease: 'power2.inOut' },
              at + span,
            );
          }

          /*
           * Switching the covered plate off.
           *
           * Not a visible change — by this point the plate above has grown past
           * every corner and nothing of this one is on screen. It is here so the
           * stage is not left compositing twelve full-bleed images at once by
           * the end of the sequence, and it happens half a slot late so no
           * sliver of an anti-aliased circle edge can flash the old picture
           * back through.
           */
          tl.set(card, { autoAlpha: 0 }, at + span * 1.5);
        }
      });

      /*
       * Declare the timeline exactly one unit long.
       *
       * Its duration is otherwise whatever its last child happens to end at —
       * 0.945, because the twelfth plate fades in and has no hand-over after
       * it. Scrub maps the scroll range onto that 0.945, so scroll progress and
       * timeline time drifted apart by about 6% by the end: the readout, which
       * counts from scroll progress, announced step 8 over a visible step 7 and
       * step 12 over a visible step 11. It also meant the last plate finished
       * arriving on the final pixel of the pin and was never once held still.
       *
       * A zero-duration marker at 1 fixes both — the mapping becomes 1:1, and
       * the twelfth plate gets the closing beat the other eleven each had.
       */
      tl.set({}, {}, 1);

      // useGSAP's scope handles reverting the tween targets; the trigger is
      // killed with it so a route change cannot leave a pin behind.
      return () => { tl.scrollTrigger?.kill(); tl.kill(); };
    },
    { scope: root, dependencies: [still, hasGem, tier] },
  );

  return (
    <section
      ref={root}
      className={`${styles.root} ${still ? styles.stillMode : ''}`}
      aria-labelledby="cvd-process"
    >
      <Reveal as="header" className={styles.head}>
        <p className="u-eyebrow">CVD production / Twelve stages</p>
        <SplitHeading as="h2" className={styles.title} id="cvd-process" text="From seed to certificate" />
        <p className={styles.lede}>
          A laboratory-grown diamond is not assembled; it is grown, one atomic
          layer at a time, and then cut like any other rough. These are the
          twelve stages a New Grown Diamond passes through before it reaches a
          grading report.
        </p>
      </Reveal>

      {/* The wrapper keeps the stage's place in the layout; the stage itself is
          what gets pinned. Pinning a gapped grid item directly is what
          collapsed it to zero height. */}
      <div className={styles.pinArea}>
        <div ref={stage} className={styles.stage}>
          {!still && (
            <div ref={atmosphere} className={styles.atmosphere} aria-hidden="true">
              <span /><span /><span />
            </div>
          )}
          {hasGem && (
            <div ref={gemWrap} className={styles.gem}>
              <div className={styles.intro} aria-hidden="true">
                <span className={styles.introEyebrow}>The art of growing brilliance</span>
                <span className={styles.introTitle}>An extraordinary journey.<br />One carbon atom at a time.</span>
                <span ref={introPhase} className={styles.introPhase}>01 / A perfect seed</span>
                <span className={styles.scrollCue}>Scroll to discover <span>↓</span></span>
              </div>
              {/* No fallback element: the stone is an opening flourish, and a
                  spinner where a diamond will be is worse than nothing. */}
              <div ref={reactorWrap} className={styles.reactorWrap}><CvdReactor /></div>
              {tier !== 'off' && (
                <div ref={stoneWrap} className={styles.stoneWrap}>
                  <Suspense fallback={null}>
                    <ProcessGem progressRef={gemProgress} tier={tier} />
                  </Suspense>
                </div>
              )}
            </div>
          )}

          <ol className={styles.plates}>
            {steps.map((step, i) => (
              <li
                key={step.n}
                ref={(node) => { plates.current[i] = node; }}
                className={styles.plate}
              >
                {/* The words the plate carries as artwork, given to anything that
                    cannot read a picture. */}
                <h3 className="u-visually-hidden">
                  {`Step ${step.n}. ${step.title}. ${step.body} ${step.points.join('. ')}.`}
                </h3>
                <img
                  ref={(node) => { shots.current[i] = node; }}
                  src={PLATES[step.n]}
                  alt={step.alt}
                  /* The first two are wanted immediately — one is on screen the
                     moment the stone clears, the other is next. The rest arrive
                     as the reader does. */
                  loading={i < 2 ? 'eager' : 'lazy'}
                  fetchPriority={i === 0 ? 'high' : 'auto'}
                  decoding="async"
                  width="1536"
                  height="1024"
                />
                {/* The travelling edge. Decorative, and inside the plate so the
                    plate's own overflow keeps it over the picture. */}
                {!still && (
                  <span className={styles.sheen} aria-hidden="true" />
                )}
                {!still && (
                  <span
                    ref={(node) => { rings.current[i] = node; }}
                    className={styles.ring}
                    aria-hidden="true"
                  />
                )}
              </li>
            ))}
          </ol>

          {!still && (
            <div className={styles.hud} aria-hidden="true">
              <span ref={num} className={styles.hudNum}>01</span>
              <span ref={bar} className={styles.hudBar} />
              <span className={styles.hudTotal}>{String(steps.length).padStart(2, '0')}</span>
              <span ref={label} className={styles.hudLabel}>{steps[0]?.title}</span>
              <div className={styles.chapters}>
                {steps.map((step, i) => (
                  <span key={step.n} ref={(node) => { markers.current[i] = node; }}
                    data-state={i === 0 ? 'active' : 'pending'}>
                    <i /><span>{String(step.n).padStart(2, '0')}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Reveal as="p" className={styles.note}>
        Process imagery is illustrative of chemical vapour deposition and is not
        a record of a specific growth run.
      </Reveal>
    </section>
  );
}
