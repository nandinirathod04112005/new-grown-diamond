import { useEffect, useRef } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import stoneUrl from '@/assets/diamonds/ngd-brilliant-macro.webp';
import styles from './HeroVisual.module.css';

/**
 * The hero stage: a real NGD diamond photograph, staged like a macro shot.
 *
 * THE STONE IS NEVER GENERATED, AND NEVER ALTERED. Everything cinematic happens
 * in the AIR AROUND the photograph — which is how a macro lens produces this
 * look in the first place: out-of-focus lights behind, beams across the stage,
 * fine sparkle in front, the frame closing in, and the whole scene dollying
 * toward the viewer on scroll. Nothing composites onto the diamond.
 *
 * NO CANVAS, deliberately: the hero is asserted to contain zero WebGL.
 */

/**
 * Bokeh discs: [xPct, yPct, sizePx, blurPx, opacity, layer]
 *
 * The far discs are the biggest, the most blurred and the faintest; the near
 * ones are small, tight and brighter. That ordering is what a real lens does,
 * and it is what stops these reading as a row of identical circles.
 */
const BOKEH = [
  [12, 22, 190, 44, 0.20, 1], [78, 16, 140, 34, 0.18, 2],
  [30, 74, 230, 54, 0.15, 1], [88, 62, 170, 40, 0.19, 3],
  [58, 12, 110, 24, 0.26, 4], [8, 58, 120, 26, 0.17, 4],
  [68, 82, 150, 36, 0.14, 2], [44, 36, 90, 17, 0.30, 6],
  [92, 34, 100, 20, 0.20, 5], [22, 44, 76, 14, 0.28, 7],
  [72, 50, 70, 12, 0.25, 7], [36, 88, 130, 30, 0.13, 3],
];

/** Sparkle motes: [xPct, yPct, sizePx, opacity] */
const MOTES = Array.from({ length: 22 }, (_, i) => {
  const a = (i * 137.5 * Math.PI) / 180;
  const r = 18 + (i % 7) * 5.5;
  return [
    50 + Math.cos(a) * r,
    50 + Math.sin(a) * r * 0.72,
    1.5 + (i % 3),
    0.25 + (i % 4) * 0.14,
  ];
});

export default function HeroVisual() {
  const scope = useRef(null);
  /** The repeating tweens, so they can be paused without being rebuilt. */
  const loops = useRef([]);
  /** Read by the pointer handler, which must not re-bind on every scroll. */
  const liveRef = useRef(true);

  /**
   * Nothing in this stage animates while the hero is off-screen.
   *
   * The drift and twinkle tweens repeat forever and the pointer lean is bound
   * to the window — without this gate, scrolling to the footer leaves a dozen
   * promoted layers mutating and re-compositing behind a page nobody is
   * looking at.
   *
   * It PAUSES the tweens; it deliberately does not rebuild the scene. Driving
   * this through a useGSAP dependency would revert and replay the whole context
   * on every re-entry — and re-entry happens at scroll progress ~0.98, where the
   * intro's `from(stone, { scale: 1.16 })` would fight the scrubbed push-in
   * holding that same stone at 1.55. Two tweens on one property, which is the
   * trap this file exists to avoid.
   */
  useEffect(() => {
    const node = scope.current;
    if (!node) return undefined;

    let onScreen = true;
    const apply = () => {
      const on = onScreen && !document.hidden;
      if (liveRef.current === on) return;
      liveRef.current = on;
      loops.current.forEach((t) => (on ? t.resume() : t.pause()));
    };

    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      apply();
    }, { threshold: 0.02 });
    io.observe(node);
    document.addEventListener('visibilitychange', apply);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', apply);
    };
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MQ.motion, () => {
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

        tl.from(`.${styles.plate}`, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.5 })
          .from(`.${styles.stone}`, { scale: 1.16, duration: 2.1 }, 0)
          .from(`.${styles.bokeh}`, { opacity: 0, scale: 0.62, duration: 2, stagger: 0.05 }, 0.2)
          // fromTo with an explicit resting opacity of 1. The beams' authored
          // strength lives in their gradients, so element opacity is only ever
          // the intro's to animate — stating it beats inheriting whatever is
          // computed at build time.
          .fromTo(`.${styles.beam}`,
            { opacity: 0, xPercent: -40 },
            { opacity: 1, xPercent: 0, duration: 2.4, stagger: 0.3 }, 0.4);

        const drifts = gsap.utils.toArray(`.${styles.bokeh}`).map((el, i) =>
          gsap.to(el, {
            xPercent: gsap.utils.random(-14, 14),
            yPercent: gsap.utils.random(-12, 12),
            duration: gsap.utils.random(9, 16),
            ease: 'sine.inOut',
            repeat: -1, yoyo: true, delay: i * 0.12,
          })
        );

        // fromTo with immediateRender:false, and explicit endpoints read from
        // the element's own authored opacity. A plain to() here captures its
        // start value at creation — the same tick the intro from() has set
        // opacity to 0 — so the motes would oscillate around 0 and never reach
        // the value they were authored with.
        const twinkle = gsap.fromTo(`.${styles.mote}`,
          { opacity: (i, t) => Number(t.dataset.o) },
          {
            opacity: (i, t) => Number(t.dataset.o) * 0.28,
            duration: 2.4, ease: 'sine.inOut',
            repeat: -1, yoyo: true, immediateRender: false,
            stagger: { each: 0.18, from: 'random' },
          });

        // Hand the repeating tweens to the visibility gate. If the hero was
        // already off-screen when this built (a deep link, or a reload part-way
        // down the page), they start paused rather than running unseen.
        loops.current = [...drifts, twinkle];
        if (!liveRef.current) loops.current.forEach((t) => t.pause());

        return () => {
          loops.current = [];
          tl.kill();
          drifts.forEach((d) => d.kill());
          twinkle.kill();
        };
      });

      // The push-in. Scrolling dollies the stage forward.
      //
      // The bokeh layer TRANSLATES and fades; it is deliberately not scaled.
      // Scaling a parent of soft-edged children forces each one to re-rasterise
      // every frame, which is the single most expensive thing this hero could
      // do — and translate reads as depth just as well.
      mm.add(MQ.desktop, () => {
        const st = { trigger: scope.current, start: 'top top', end: 'bottom top', scrub: 1 };

        const push = gsap.fromTo(`.${styles.stone}`,
          { scale: 1, yPercent: 0 },
          { scale: 1.55, yPercent: -6, ease: 'none', immediateRender: false, scrollTrigger: st });

        const near = gsap.fromTo(`.${styles.bokehLayer}`,
          { yPercent: 0, opacity: 1 },
          { yPercent: -16, opacity: 0.2, ease: 'none', immediateRender: false, scrollTrigger: st });

        const grain = gsap.fromTo(`.${styles.moteLayer}`,
          { yPercent: 0 },
          { yPercent: -26, ease: 'none', immediateRender: false, scrollTrigger: st });

        const close = gsap.fromTo(`.${styles.vignette}`,
          { opacity: 0.55 },
          { opacity: 1, ease: 'none', immediateRender: false, scrollTrigger: st });

        return () => {
          [push, near, grain, close].forEach((t) => { t.scrollTrigger?.kill(); t.kill(); });
        };
      });

      // Pointer lean. Bound once; the handler no-ops while the hero is off
      // screen, so a pointermove over the footer never touches this transform.
      mm.add(MQ.pointer, () => {
        const stage = scope.current.querySelector(`.${styles.stage}`);
        const rx = gsap.quickTo(stage, 'rotationX', { duration: 0.9, ease: 'power3.out' });
        const ry = gsap.quickTo(stage, 'rotationY', { duration: 0.9, ease: 'power3.out' });
        const px = gsap.quickTo(`.${styles.stone}`, 'xPercent', { duration: 1.1, ease: 'power3.out' });

        const onMove = (e) => {
          if (!liveRef.current) return;
          const nx = (e.clientX / window.innerWidth) * 2 - 1;
          const ny = (e.clientY / window.innerHeight) * 2 - 1;
          ry(nx * 7); rx(-ny * 5); px(nx * 2.2);
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        return () => {
          window.removeEventListener('pointermove', onMove);
          gsap.set(stage, { rotationX: 0, rotationY: 0 });
        };
      });

      // NO clearProps here, deliberately.
      //
      // The bokeh and motes carry their position, size and opacity as React
      // inline styles. clearProps:'all' erases those too, collapsing all 34
      // elements to 0x0 in one corner — which is exactly what it did. Nothing
      // needs clearing anyway: matchMedia reverts its own context's tweens, and
      // under reduced motion the motion branch never ran in the first place.

      return () => mm.revert();
    },
    { scope }
  );

  return (
    <div ref={scope} className={styles.visual}>
      <div className={styles.stage}>
        <div className={styles.bokehLayer} aria-hidden="true">
          {BOKEH.map(([x, y, size, blur, op, layer], i) => (
            <span
              key={i}
              className={styles.bokeh}
              style={{
                left: `${x}%`, top: `${y}%`,
                width: size, height: size,
                opacity: op,
                zIndex: layer,
                // A real blur, not a gradient approximating one. Baking the
                // softness into colour stops gave hard-edged khaki spheres —
                // they read as balls, not as light.
                //
                // The cost this was avoiding is re-rasterisation, and that came
                // from the parent being SCALED on scroll. The parent translates
                // now, so these rasterise once and are only ever composited.
                filter: `blur(${blur}px)`,
                background: `radial-gradient(circle,
                  rgba(255,244,222,0.9) 0%,
                  rgba(232,205,152,0.5) 55%,
                  rgba(214,180,116,0) 100%)`,
              }}
            />
          ))}
        </div>

        <span className={`${styles.beam} ${styles.beamA}`} aria-hidden="true" />
        <span className={`${styles.beam} ${styles.beamB}`} aria-hidden="true" />

        <figure className={styles.plate}>
          <span className={styles.pool} aria-hidden="true" />
          {/* A static shadow behind the stone, rather than a drop-shadow filter
              on the element being scaled — a filter on a scaling element is
              re-rasterised every frame. */}
          <span className={styles.cast} aria-hidden="true" />
          <img
            className={styles.stone}
            src={stoneUrl}
            alt="A New Grown Diamond loose round brilliant, photographed against black"
            width={754}
            height={541}
            fetchPriority="high"
            decoding="async"
          />
        </figure>

        <div className={styles.moteLayer} aria-hidden="true">
          {MOTES.map(([x, y, size, op], i) => (
            <span
              key={i}
              className={styles.mote}
              data-o={op}
              style={{ left: `${x}%`, top: `${y}%`, width: size, height: size, opacity: op }}
            />
          ))}
        </div>

        <span className={styles.vignette} aria-hidden="true" />
      </div>
    </div>
  );
}
