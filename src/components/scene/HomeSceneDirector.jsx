import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { gsap, useGSAP, ScrollTrigger } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import { supports3D } from '@/components/three/capability.js';
import { HANDOFF, chapterAt, ramp, sceneProgressOf } from '@/lib/journey.js';
import stoneUrl from '@/assets/diamonds/ngd-brilliant-macro.webp';
import JourneyRail from './JourneyRail.jsx';
import { SceneProgressContext } from './sceneProgress.js';
import styles from './HomeSceneDirector.module.css';

const JourneyScene = lazy(() => import('@/components/three/JourneyScene.jsx'));

/**
 * Out-of-focus lights in the air: [xPct, yPct, sizePx, blurPx, opacity].
 * Far discs are large, soft and faint; near ones small, tight and brighter —
 * what a fast lens actually does, and what stops these reading as a row of
 * identical circles.
 */
const AIR = [
  [14, 24, 190, 44, 0.17], [80, 18, 140, 34, 0.15],
  [30, 74, 230, 54, 0.12], [88, 62, 170, 40, 0.16],
  [60, 12, 110, 24, 0.22], [9, 58, 120, 26, 0.14],
  [70, 84, 150, 36, 0.12], [45, 34, 90, 17, 0.24],
];

/**
 * HOME SCENE DIRECTOR — the fixed visual stage the whole homepage scrolls over.
 *
 * ONE ScrollTrigger, spanning Hero through Atelier, normalized to 0..1. Every
 * chapter, the scene, the rail and the crossfades read that single number.
 * The previous architecture gave each section its own trigger — a pin here, a
 * scrub there — which is precisely how two animations end up disagreeing about
 * the same element after a resize. There is now nothing to disagree with.
 *
 * What is fixed behind the page:
 *   · the WebGL journey (carbon → plasma → growth → rough), when earned
 *   · the REAL PHOTOGRAPH, which takes over before the polished chapter
 *   · a light field that contracts into the stone as the journey begins
 *
 * The photograph is not optional scenery. Generated geometry depicts rough
 * crystal only; from HANDOFF onward the diamond on screen is a photograph of
 * an actual company-owned stone. That is why the <img> is always mounted and
 * only ever crossfaded — never conditionally rendered on a capability flag.
 */
export default function HomeSceneDirector({ children, onJump }) {
  const scope = useRef(null);
  const stageRef = useRef(null);
  const stoneRef = useRef(null);
  const haloRef = useRef(null);
  const airRef = useRef(null);
  const progress = useRef(0);
  // The director's own 0..1. Kept apart from `progress`, which holds the
  // SCENE's remapped value — feeding one back into the other divides by
  // SCENE_END twice and lands the whole stage on its end state.
  const rawProgress = useRef(0);
  const listeners = useRef(new Set());

  // Mirrors `use3D` for the per-frame path, which must not close over state.
  const use3DRef = useRef(false);
  // True only while the desktop director is actually scrubbing.
  const scrubRef = useRef(false);

  const [chapter, setChapter] = useState(0);
  const [pinned, setPinned] = useState(false);
  const [use3D, setUse3D] = useState(false);
  const [live, setLive] = useState(true);
  // The six-chapter scene finishes well before the director's span does. Past
  // that the canvas has nothing left to draw.
  const [sceneOver, setSceneOver] = useState(false);

  // Capability is read after first paint so the photograph renders first and
  // the canvas is a genuine enhancement rather than a render blocker.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      const ok = supports3D();
      use3DRef.current = ok;
      setUse3D(ok);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  // Nothing renders or animates behind a hidden tab.
  useEffect(() => {
    const onVis = () => setLive(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const subscribe = useCallback((fn) => {
    listeners.current.add(fn);
    fn(progress.current);
    return () => listeners.current.delete(fn);
  }, []);

  const value = useMemo(
    () => ({ progress, subscribe, chapter, pinned }),
    [subscribe, chapter, pinned]
  );

  /**
   * Applies one normalized position to everything that is not React state.
   *
   * `raw` is the director's own 0..1 across Hero→Atelier. `p` is the SCENE's
   * progress, which completes earlier — the last three sections are read
   * against a finished stone rather than being further stages of its making.
   */
  const apply = useCallback((raw) => {
    rawProgress.current = raw;
    const p = sceneProgressOf(raw);
    progress.current = p;

    // The stone: the light contracts into it, then it grows toward the viewer.
    // Written straight to style — this runs every scrub frame and must not
    // re-render the tree.
    // The stone appears twice, and they are the same photograph both times.
    //
    //   OPENING   it is the hero. It enlarges as the reader scrolls and
    //             dissolves into the carbon it is made of.
    //   RETURN    it comes back at the handover, because from the moment
    //             cutting begins the diamond on screen must be a photograph of
    //             a real stone rather than anything generated.
    const opening = 1 - ramp(p, 0.03, 0.15);
    const returned = ramp(p, HANDOFF.from, HANDOFF.to);

    const stone = stoneRef.current;
    if (stone) {
      // With no canvas there is nothing to dissolve INTO, so the photograph
      // simply carries the whole journey. Fading it out on a device without
      // WebGL would leave a blank stage — the one outcome this may never
      // produce.
      stone.style.opacity = use3DRef.current
        ? String(Math.max(opening, returned))
        : '1';
      // Slow push toward the viewer at both ends, never past the source width.
      const grow = 1 + ramp(p, 0, 0.15) * 0.3 + ramp(p, HANDOFF.from, 1) * 0.22;
      stone.style.transform = `scale(${grow.toFixed(4)})`;
      // NO FILTER ON THE PHOTOGRAPH. Ever.
      //
      // There was a focus pull here. Scoped to the dissolve it still put 1.2px
      // of blur on the stone while it was 70% visible, and before that it had
      // been 7.2px through the whole handover. Narrowing the window was
      // treating the symptom: blur is not on the list of things a real
      // photograph may receive (background isolation, masking, slow scale and
      // parallax, a light sweep across the plate, contrast beneath it,
      // editorial crop, a genuine 360 sequence). It changes how the goods look,
      // which is the one thing none of this may do.
      //
      // The focus pull moved to the AIR, below, where defocusing is free and
      // reads the same to the eye.
      stone.style.filter = 'none';
    }

    const halo = haloRef.current;
    if (halo) {
      // The background light contracts into the stone as the journey starts,
      // then opens again behind the finished one.
      const contract = 1 - ramp(p, 0.02, 0.28) * 0.6 + ramp(p, HANDOFF.from, 1) * 0.32;
      halo.style.transform = `scale(${contract.toFixed(4)})`;
      halo.style.opacity = String(0.34 + Math.max(opening, returned) * 0.5);
    }

    // Atmosphere: soft out-of-focus light, present while the stone is, gone
    // while the scene is carbon and plasma. This is the hero's bloom, and it
    // lives strictly in the AIR — never composited onto the photograph.
    const air = airRef.current;
    if (air) {
      air.style.opacity = String(Math.max(opening, returned) * 0.9);
      air.style.transform = `translate3d(0, ${(-p * 8).toFixed(2)}%, 0)`;
      // The focus pull lives here instead of on the stone. These are
      // out-of-focus points of light — defocusing them further is what they
      // already are, and it costs the photograph nothing.
      const pull = ramp(p, 0.04, 0.16) * opening;
      air.style.filter = pull > 0.01 ? `blur(${(pull * 9).toFixed(2)}px)` : 'none';
    }
    // The stage recedes once the scene is over, so the dense content sections
    // that follow are read on their own ground rather than over a photograph.
    //
    // Only while scrubbing. The still path applies progress 1 exactly once, so
    // running this there would leave the stage permanently at 18% — a mobile
    // reader would meet a ghost of the stone rather than the stone.
    const stage = stageRef.current;
    if (stage) {
      stage.style.opacity = scrubRef.current
        ? String(1 - ramp(raw, 0.62, 0.76) * 0.82)
        : '1';
    }

    listeners.current.forEach((fn) => fn(p, raw));
  }, []);

  // Capability resolves one frame after mount; re-apply so the stone's
  // opacity reflects whether a canvas actually exists.
  useEffect(() => {
    apply(rawProgress.current);
  }, [use3D, apply]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // DESKTOP — the journey is pinned and scrubbed. The pin is earned: the
      // scroll IS the transformation, not decoration laid over static copy.
      mm.add(MQ.desktop, () => {
        scrubRef.current = true;
        const st = ScrollTrigger.create({
          trigger: scope.current,
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.85,
          invalidateOnRefresh: true,
          onToggle: (self) => setPinned(self.isActive),
          onUpdate: (self) => {
            apply(self.progress);
            const sp = sceneProgressOf(self.progress);
            setChapter(chapterAt(sp));
            // One flip, not a per-frame write: the canvas ran at full cost for
            // the last stretch of the journey producing frames nobody sees.
            setSceneOver(sp >= 1);
          },
        });
        return () => { scrubRef.current = false; st.kill(); };
      });

      // MOBILE AND REDUCED MOTION — no pin, no scrub, no canvas. The stage
      // rests on its finished state: the real photograph, fully visible, with
      // the chapters read as plain vertical prose beneath it. A different
      // telling, not a broken one.
      mm.add('(max-width: 899px), (prefers-reduced-motion: reduce)', () => {
        scrubRef.current = false;
        setPinned(false);
        // The scene rests on its finished state: no scrub, no canvas, the real
        // photograph fully present.
        apply(1);

        // The RAIL, though, still has to say where the reader is.
        //
        // This used to set the last chapter once and never update, so the rail
        // highlighted "06 Certified Brilliance" from the top of the page and
        // announced it with aria-current="step" — telling a screen reader user
        // they were at the end of a journey they had not started. It is read
        // from the journey's own position, using the same mapping the scrubbed
        // path uses, so the two can never disagree.
        const el = scope.current;
        if (!el) return undefined;

        let frame = 0;
        const read = () => {
          frame = 0;
          const rect = el.getBoundingClientRect();
          const travel = rect.height - window.innerHeight;
          const raw = travel > 0
            ? Math.min(1, Math.max(0, -rect.top / travel))
            : 0;
          setChapter(chapterAt(sceneProgressOf(raw)));
        };
        const onScroll = () => {
          if (!frame) frame = requestAnimationFrame(read);
        };

        read();
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', onScroll, { passive: true });
        return () => {
          if (frame) cancelAnimationFrame(frame);
          window.removeEventListener('scroll', onScroll);
          window.removeEventListener('resize', onScroll);
        };
      });

      return () => mm.revert();
    },
    { scope }
  );

  // Rendered only where there is something to render: WebGL earned, tab
  // visible, the journey on screen, and the scene not yet finished.
  const canvasLive = use3D && live && pinned && !sceneOver;

  return (
    <SceneProgressContext.Provider value={value}>
      <div ref={scope} id="journey" className={styles.journey}>
        {/* The stage is NOT hidden wholesale. It holds the page's principal
            image — a photograph of a real, graded stone — and hiding that from
            assistive technology to save narrating a few gradients is the wrong
            trade. The decorative layers carry aria-hidden individually; the
            photograph keeps a real description. */}
        <div ref={stageRef} className={styles.stage}>
          <span ref={haloRef} className={styles.halo} aria-hidden="true" />

          {/* Out-of-focus points of light, strictly BEHIND the photograph.
              They are lights, not gems, and nothing here is a diamond. */}
          <div ref={airRef} className={styles.air} aria-hidden="true">
            {AIR.map(([x, y, size, blur, op], i) => (
              <span
                key={i}
                className={styles.mote}
                style={{
                  left: `${x}%`, top: `${y}%`,
                  width: size, height: size,
                  opacity: op,
                  filter: `blur(${blur}px)`,
                }}
              />
            ))}
          </div>

          {use3D && (
            <Suspense fallback={null}>
              {/* Decorative: the carbon, plasma and rough crystal are told in
                  words by the panels beside them. */}
              <div className={styles.canvasHolder} aria-hidden="true">
                <JourneyScene progress={progress} active={canvasLive} />
              </div>
            </Suspense>
          )}

          {/* ALWAYS mounted. The finished diamond is a photograph of a real
              stone — never a render — so it can never depend on WebGL being
              available. Without a canvas it simply starts visible. */}
          <img
            ref={stoneRef}
            className={styles.stone}
            src={stoneUrl}
            alt="A New Grown Diamond round brilliant, photographed loose against black"
            width={754}
            height={541}
            fetchPriority="high"
            decoding="async"
          />
          <span className={styles.vignette} aria-hidden="true" />
          {/* Contrast for the copy column. Over the PLATE, never composited
              into the stone — it darkens the air the text sits on, and the
              photograph keeps its own exposure. */}
          <span className={styles.readable} aria-hidden="true" />
        </div>

        {/* Inside the provider, deliberately. Rendered as a sibling of the
            director it would read a null context and sit frozen on chapter one
            — which is exactly what it did. */}
        <JourneyRail onJump={onJump} />

        <div className={styles.flow}>{children}</div>
      </div>
    </SceneProgressContext.Provider>
  );
}
