import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import SplitHeading from '@/components/motion/SplitHeading.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './CvdProcess.copy.js';
import CvdFilm from './CvdFilm.jsx';
import styles from './CvdProcess.module.css';

/*
 * How much scrolling the film is given, in screen heights, and how long its
 * last frame (the finished stone) is held before the section lets go.
 *
 * Generous on purpose: the film is 16.8 seconds and this is roughly five
 * screens, so an ordinary scroll carries it at a slow, readable pace rather
 * than flicking through the whole journey in two. (It was about two screens
 * while the twelve step plates followed it.)
 */
const FILM_VH = 480;
const HOLD_VH = 45;

/*
 * Where the film's shots change, as a fraction of its length — seed plate and
 * sealed chamber, then plasma, then the harvested crystal, then laser, wheel,
 * loupe and the finished stone — so the four captions turn over on those cuts.
 */
const PHASE_AT = [0.198, 0.382, 0.58];

/**
 * The CVD production story: one pinned pane, one film, moved by the scroll.
 *
 * ONE ScrollTrigger drives everything — the window opening, the film's
 * playhead, the captions — as positions on a single timeline, so scrolling
 * back runs the journey backwards exactly.
 *
 * Two things deliberately do not depend on the timeline:
 *   - Under reduced motion nothing pins and nothing scrubs: the film is an
 *     ordinary player that plays only if pressed.
 *   - Until the film has loaded, its poster (its own first frame) holds the
 *     window, so a slow connection sees a still, never an empty frame.
 *
 * The four captions are also given to assistive technology as a plain list,
 * since the film itself carries no words.
 */
export default function CvdProcess() {
  const root = useRef(null);
  const stage = useRef(null);
  const atmosphere = useRef(null);
  const introPhase = useRef(null);
  /* The film's scrubber (0..1 → that moment), handed over by CvdFilm. */
  const film = useRef(null);
  const takeScrubber = useCallback((fn) => { film.current = fn; }, []);

  /* Settled at mount, so the first render is already the final one. */
  const [still] = useState(() => prefersReducedMotion());
  const c = useCopy(COPY);

  /*
   * The captions, in the current language, read by the timeline through a ref:
   * the timeline is built once, and rebuilding it for a change of language
   * would re-pin the section under the reader. A language change swaps what
   * the ref holds and rewrites the caption on screen, in a layout effect so
   * the old words are never painted.
   */
  const phases = useRef(c.phases);
  const phaseShown = useRef(0);
  useLayoutEffect(() => {
    phases.current = c.phases;
    if (introPhase.current) introPhase.current.textContent = c.phases[phaseShown.current];
  }, [c.phases]);

  useGSAP(
    () => {
      if (still) return;
      const pinned = stage.current;
      if (!pinned) return;

      const filmShare = FILM_VH / (FILM_VH + HOLD_VH);
      const tl = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          /*
           * The STAGE is the trigger and the thing pinned, flush against the
           * top of the window, where it is exactly one viewport tall.
           * Pinned by transform, not position: fixed — the default pin takes
           * the element out of flow, which the layout-shift metric scores as
           * the page collapsing (measured CLS 1.72 before this was set).
           */
          trigger: pinned,
          start: 'top top',
          end: `+=${FILM_VH + HOLD_VH}%`,
          pin: pinned,
          pinType: 'transform',
          pinSpacing: true,
          /* A soft follow: the film glides to where the scroll is, over
             about a second, instead of jumping frame to frame. */
          scrub: 0.9,
        },
      });

      tl.fromTo(atmosphere.current, { rotation: -18, scale: 0.85 },
        { rotation: 65, scale: 1.15, duration: 1 }, 0);

      const window_ = pinned.querySelector(`.${styles.film}`);
      const picture = window_?.querySelector('video');
      if (window_) {
        /* The window opens out of a smaller rounded aperture as the pane pins. */
        tl.fromTo(window_,
          { y: 30, scale: 0.92, clipPath: 'inset(9% 11% 9% 11% round 22px)' },
          { y: 0, scale: 1, clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 0.07, ease: 'power2.out' },
          0);
      }
      if (picture) {
        /* The picture drifts a little closer the whole way through. */
        tl.fromTo(picture, { scale: 1.02 }, { scale: 1.09, duration: filmShare }, 0);
      }
      /* "Scroll to discover" has done its job once the scrolling has begun. */
      tl.to(pinned.querySelector(`.${styles.scrollCue}`), { autoAlpha: 0, duration: 0.04 }, 0.03);

      const reel = { p: 0 };
      tl.to(reel, {
        p: 1,
        duration: filmShare - 0.02,
        onUpdate: () => {
          film.current?.(reel.p);
          const n = reel.p < PHASE_AT[0] ? 0 : reel.p < PHASE_AT[1] ? 1 : reel.p < PHASE_AT[2] ? 2 : 3;
          if (n !== phaseShown.current && introPhase.current) {
            phaseShown.current = n;
            introPhase.current.textContent = phases.current[n];
            /* The caption rises into place on each cut, at its own pace. */
            gsap.fromTo(introPhase.current, { yPercent: 60, autoAlpha: 0 },
              { yPercent: 0, autoAlpha: 1, duration: 0.45, ease: 'power3.out', overwrite: 'auto' });
          }
        },
      }, 0.02);

      /* The timeline is exactly one unit long, so scroll and film map 1:1. */
      tl.set({}, {}, 1);

      return () => { tl.scrollTrigger?.kill(); tl.kill(); };
    },
    { scope: root, dependencies: [still] },
  );

  return (
    <section
      ref={root}
      className={`${styles.root} ${still ? styles.stillMode : ''}`}
      aria-labelledby="cvd-process"
    >
      <Reveal as="header" className={styles.head}>
        <p className="u-eyebrow">{c.eyebrow}</p>
        <SplitHeading as="h2" className={styles.title} id="cvd-process" text={c.title} />
        <p className={styles.lede}>{c.lede}</p>
      </Reveal>

      {/* The journey in words, for anything that cannot watch the film. */}
      <ol className="u-visually-hidden">
        {c.phases.map((phase) => <li key={phase}>{phase}</li>)}
      </ol>

      {still ? (
        /* Reduced motion: the film as an ordinary player, fetched only if the
           visitor presses play. */
        <CvdFilm interactive />
      ) : (
        /* The wrapper keeps the stage's place in the layout; the stage itself
           is what gets pinned. */
        <div className={styles.pinArea}>
          <div ref={stage} className={styles.stage}>
            <div ref={atmosphere} className={styles.atmosphere} aria-hidden="true">
              <span /><span /><span />
            </div>
            <div className={styles.gem}>
              <div className={styles.intro} aria-hidden="true">
                <span className={styles.introEyebrow}>{c.intro.eyebrow}</span>
                <span className={styles.introTitle}>{c.intro.title[0]}<br />{c.intro.title[1]}</span>
                <span ref={introPhase} className={styles.introPhase}>{c.phases[0]}</span>
                <span className={styles.scrollCue}>{c.intro.scrollCue} <span>↓</span></span>
              </div>
              {/* The journey on film, moved by the scroll (CvdFilm). */}
              <CvdFilm onScrubber={takeScrubber} />
            </div>
          </div>
        </div>
      )}

      <Reveal as="p" className={styles.note}>{c.note}</Reveal>
    </section>
  );
}
