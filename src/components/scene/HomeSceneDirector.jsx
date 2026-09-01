import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { gsap, useGSAP, ScrollTrigger } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import { supports3D } from '@/components/three/capability.js';
import { HANDOFF, ramp } from '@/lib/journey.js';
import stoneUrl from '@/assets/diamonds/ngd-brilliant-macro.webp';
import JourneyRail from './JourneyRail.jsx';
import { viewportOverlap } from './stickyGeometry.js';
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
  const innerRef = useRef(null);
  const progress = useRef(0);
  // The director's own 0..1. Kept apart from `progress`, which holds the
  // SCENE's remapped value — feeding one back into the other divides by
  // SCENE_END twice and lands the whole stage on its end state.
  const rawProgress = useRef(0);
  const listeners = useRef(new Set());

  // Mirrors `use3D` for the per-frame path, which must not close over state.
  const use3DRef = useRef(false);
  /**
   * Whether a canvas is actually MOUNTED — not merely whether the device could
   * run one.
   *
   * The fade used to key off capability, which resolves one frame after mount,
   * while JourneyScene is React.lazy behind the 234 kB `three` chunk that only
   * starts downloading after first paint. For the whole of that download the
   * director believed there was something to dissolve into and drove the
   * photograph to opacity 0 over a canvas that did not exist yet — a black
   * rectangle with the chapter copy floating on it, which is precisely the
   * outcome the comment in apply() says may never happen.
   */
  const canvasUpRef = useRef(false);
  // True only while the desktop director is actually scrubbing.
  const scrubRef = useRef(false);
  /**
   * Where the six-chapter scene ends, as a fraction of the director's span —
   * MEASURED, not assumed.
   *
   * This was the constant SCENE_END = 0.58, which silently hard-coded the ratio
   * between the chapter slots (sized in svh) and the three sections after them
   * (sized by their content). That ratio moves with the viewport, so the
   * crossfades only lined up with the panels near 1440x900. At 960x540
   * chapters 05 and 06 never reached any opacity at all, and at 1920x1080 there
   * was a dead band of pure photograph between chapters. It is now read from
   * the layout on every ScrollTrigger refresh.
   */
  const sceneBounds = useRef({ from: 0, to: 0 });
  /** Cached document-space geometry of each chapter panel. */
  const slotGeom = useRef([]);
  /** The measurements apply() took this frame, for consumers after it. */
  const frame = useRef({ scrollNow: 0, viewH: 0 });

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

  /**
   * Is the stage on screen at all?
   *
   * `pinned` came only from the ScrollTrigger's onToggle, which does not fire
   * while the scroller is sitting exactly at the trigger's start — so on load,
   * and every time the reader returned to the top, the canvas was mounted with
   * frameloop 'never' and drew zero frames. The carbon field then popped in on
   * the first wheel tick. An observer answers the question directly.
   */
  useEffect(() => {
    const node = stageRef.current;
    if (!node) return undefined;
    const io = new IntersectionObserver(
      ([e]) => setPinned(e.isIntersecting),
      { threshold: 0.01 }
    );
    io.observe(node);
    return () => io.disconnect();
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
  const toScene = useCallback(() => {
    const { from, to } = sceneBounds.current;
    if (!(to > from)) return 0;
    return Math.min(1, Math.max(0, (window.scrollY - from) / (to - from)));
  }, []);


  /**
   * The scene's extent, in page pixels, taken from the panels themselves.
   *
   * Scene progress used to be `raw / SCENE_END`, a fraction of the director's
   * span. That is a different quantity from where the panels actually are, and
   * the two drift with the viewport — which is how the rail came to name one
   * chapter while a different chapter's copy was on screen. Both now come from
   * the same measured pixels, so they cannot disagree.
   */
  /**
   * The chapter whose panel currently occupies most of the viewport.
   *
   * Arithmetic on cached geometry, not seven getBoundingClientRect() calls a
   * frame. Those ran after the director's ten style writes, so each one forced
   * a synchronous layout — the panels' positions only move on resize or
   * reflow, which is when they are measured.
   */
  const visibleChapter = useCallback((scrollNow, viewH) => {
    const geom = slotGeom.current;
    if (!geom.length) return 0;
    const y = scrollNow === undefined ? window.scrollY : scrollNow;
    const h = viewH === undefined ? window.innerHeight : viewH;
    let best = 0;
    let bestOverlap = 0;
    for (let i = 0; i < geom.length; i += 1) {
      const overlap = viewportOverlap(geom[i], y, h);
      if (overlap > bestOverlap) { bestOverlap = overlap; best = i; }
    }
    return best;
  }, []);

  const measureSceneEnd = useCallback(() => {
    const el = scope.current;
    if (!el) return;
    const slots = el.querySelectorAll('[data-chapter-slot]');
    const first = slots[0];
    const last = slots[slots.length - 1];
    if (!first || !last) return;
    // Document coordinates, via getBoundingClientRect + scrollY.
    //
    // offsetTop is relative to the nearest POSITIONED ancestor, and the
    // chapter sections are position: relative — so these came back measured
    // from the top of their own section rather than the top of the page. The
    // scene then ended after the first section's slots, and every chapter
    // after the third stayed at zero opacity forever.
    const top = window.scrollY;
    sceneBounds.current = {
      from: first.getBoundingClientRect().top + top,
      to: last.getBoundingClientRect().bottom + top - window.innerHeight,
    };
    // Every panel's position, cached here so the per-frame path never measures.
    slotGeom.current = [...slots].map((slot) => {
      const panel = slot.firstElementChild || slot;
      return {
        slotTop: slot.getBoundingClientRect().top + top,
        slotHeight: slot.offsetHeight,
        panelHeight: panel.offsetHeight,
      };
    });
  }, []);

  const apply = useCallback((raw) => {
    rawProgress.current = raw;
    const p = toScene();
    progress.current = p;

    /*
     * READ FIRST, THEN WRITE.
     *
     * apply() used to write ten inline styles and only then read window.scrollY
     * for the stage fade — a read after a write in the same frame, which
     * flushes style and forces a synchronous layout. Measured across 150
     * rAF-paced scroll steps: 0 forced layouts per frame before this scene
     * existed against 0.4-0.6 after, with script time per frame roughly
     * doubling. Every measurement this function needs is taken here, before
     * anything is mutated.
     */
    const scrollNow = window.scrollY;
    const viewH = window.innerHeight;
    frame.current = { scrollNow, viewH };
    const stoneBase = stoneRef.current ? stoneRef.current.clientWidth : 0;
    const stoneNatural = stoneRef.current ? stoneRef.current.naturalWidth : 0;

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
    // Arrives only after the crystal has finished leaving (see JourneyScene).
    const returned = ramp(p, (HANDOFF.from + HANDOFF.to) / 2, HANDOFF.to);

    const stone = stoneRef.current;
    if (stone) {
      // With no canvas there is nothing to dissolve INTO, so the photograph
      // simply carries the whole journey. Fading it out on a device without
      // WebGL would leave a blank stage — the one outcome this may never
      // produce.
      stone.style.opacity = canvasUpRef.current
        ? String(Math.max(opening, returned))
        : '1';
      // Slow push toward the viewer at both ends, never past the source width.
      //
      // The cap is enforced here as well as in CSS, against the element's own
      // layout width and the file's natural width. A base width and a maximum
      // scale that multiply out past the source is exactly the arithmetic that
      // put a 754px photograph on screen at 760px.
      let grow = 1 + ramp(p, 0, 0.15) * 0.3 + ramp(p, HANDOFF.from, 1) * 0.22;
      // clientWidth is the LAYOUT width and is unaffected by a transform, so it
      // is the unscaled base directly — no need to divide out the last scale,
      // which would compound its own rounding every frame.
      if (stoneBase > 0 && stoneNatural > 0) {
        grow = Math.min(grow, stoneNatural / stoneBase);
      }
      stone.style.transform = `scale(${grow.toFixed(4)})`;
      // MASK REVEAL. The photograph is uncovered rather than merely faded up:
      // an inset mask opens from the centre across the handover. Masking is on
      // the short list of treatments a real photograph may receive, because it
      // changes what you can SEE of the stone, never how the stone looks.
      //
      // Guarded on the canvas, exactly like the opacity above it. Written
      // unconditionally, the mask closed to inset(50% 30%) on a device with no
      // WebGL — erasing the photograph that the opacity guard three lines up
      // exists to keep on screen. There is nothing to reveal FROM when there is
      // no scene to hand over from, so there is nothing to mask.
      // The mask belongs to the RETURN, and only to the return.
      //
      // `openMask` is (1 - returned) * 50, which is 50 — a full clip — whenever
      // `returned` is 0. That is the whole of the hero, before the handover has
      // started. Gating on `openMask > 0.01` therefore erased the hero diamond
      // completely, and the suite stayed green because its photograph test
      // checks the LAST chapter, where `returned` is 1 and no mask applies.
      //
      // So the guard is the range of the handover itself, plus the canvas guard
      // above it: no canvas means nothing to reveal from, and outside the
      // handover there is nothing being revealed.
      const masking = canvasUpRef.current && returned > 0.001 && returned < 0.999;
      const openMask = (1 - returned) * 50;
      stone.style.clipPath = masking
        ? `inset(${openMask.toFixed(2)}% ${(openMask * 0.6).toFixed(2)}% round 2%)`
        : 'none';

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
    // DEPTH AND ROTATION. The stage carries a slow scroll-driven yaw and a
    // small push in Z, so the scene reads as a space being moved through
    // rather than a flat image being cross-faded. It is applied to the STAGE,
    // which is the same thing the pointer lean already leans — the photograph
    // is not being turned on its own axis, which a single fixed viewpoint
    // cannot honestly do.
    // The rotating layer holds the ATMOSPHERE and the canvas — never the
    // photograph.
    //
    // rotateY under a perspective is a projective transform: it keystones what
    // it turns, magnifying one side of the frame relative to the other
    // (measured at 1920: a 507px left edge against a 488px right edge). On a
    // photograph of a real graded stone that is a distortion of the goods, and
    // it is not on the list of treatments one may receive. The stone is now a
    // sibling of this layer rather than a child, so the scene turns around it
    // and the photograph is only ever scaled and masked.
    const inner = innerRef.current;
    if (inner) {
      const yaw = (p - 0.5) * 9;
      const push = -60 + ramp(p, 0, 1) * 120;
      inner.style.transform =
        `translate3d(0, 0, ${push.toFixed(1)}px) rotateY(${yaw.toFixed(2)}deg)`;
    }

    // The stage recedes once the scene is over, so the dense content sections
    // that follow are read on their own ground rather than over a photograph.
    //
    // Only while scrubbing. The still path applies progress 1 exactly once, so
    // running this there would leave the stage permanently at 18% — a mobile
    // reader would meet a ghost of the stone rather than the stone.
    const stage = stageRef.current;
    if (stage) {
      // Recede only once the scene is genuinely OVER — measured against the
      // last chapter slot, not against a hardcoded fraction of the director's
      // span. Those thresholds (0.62-0.76) were tuned when the scene ended
      // earlier in the page; adding the Jewellery chapter pushed the last
      // panel past them, so the stage faded out from under the chapter the
      // journey now resolves on.
      const { to } = sceneBounds.current;
      const past = to > 0 ? scrollNow - to : 0;
      const fade = Math.min(1, Math.max(0, past / (viewH * 0.9)));
      stage.style.opacity = scrubRef.current ? String(1 - fade * 0.85) : '1';
    }

    // Hand the frame's measurements to the listeners so they do not each
    // have to take their own — seven getBoundingClientRect() calls after ten
    // style writes is seven forced layouts a frame.
    listeners.current.forEach((fn) => fn(p, raw, scrollNow, viewH));
  }, [toScene]);

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
        measureSceneEnd();
        const st = ScrollTrigger.create({
          trigger: scope.current,
          onRefresh: () => { measureSceneEnd(); apply(rawProgress.current); },
          start: 'top top',
          end: 'bottom bottom',
          scrub: 0.85,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            apply(self.progress);
            const sp = progress.current;
            // Named from the panels, not from a progress fraction, so the rail
            // can never say one chapter while another's copy is on screen.
            setChapter(visibleChapter(frame.current.scrollNow, frame.current.viewH));
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
        measureSceneEnd();
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
          // Push it through the listeners as well. Only setting React state
          // left the rail's progress fill pinned at the 100% that apply(1) had
          // written at mount, for the whole page.
          rawProgress.current = raw;
          progress.current = toScene();
          listeners.current.forEach((fn) => fn(progress.current, raw));
          setChapter(visibleChapter(window.scrollY, window.innerHeight));
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
          {/* The moving part of the stage. Kept separate from .stage so the
              rotation has a parent that owns the perspective. */}
          <div ref={innerRef} className={styles.stageInner}>
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
                <JourneyScene
                  progress={progress}
                  active={canvasLive}
                  onReady={() => {
                    canvasUpRef.current = true;
                    apply(rawProgress.current);
                  }}
                />
              </div>
            </Suspense>
          )}

          {/* Contrast for the copy column. Over the PLATE, never composited
              into the stone — it darkens the air the text sits on, and the
              photograph keeps its own exposure. */}
          <span className={styles.readable} aria-hidden="true" />
          </div>

          {/* Outside .stageInner, deliberately: the photograph does not turn. */}
          <span className={styles.vignette} aria-hidden="true" />
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
        </div>

        {/* Inside the provider, deliberately. Rendered as a sibling of the
            director it would read a null context and sit frozen on chapter one
            — which is exactly what it did. */}
        <JourneyRail onJump={onJump} hidden={sceneOver} />

        <div className={styles.flow}>{children}</div>
      </div>
    </SceneProgressContext.Provider>
  );
}
