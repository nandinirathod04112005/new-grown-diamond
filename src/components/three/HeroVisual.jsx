import { useRef } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import stoneUrl from '@/assets/diamonds/ngd-brilliant-macro.webp';
import styles from './HeroVisual.module.css';

/**
 * The hero stage: a real NGD diamond photographed, staged like a macro shot.
 *
 * THE STONE IS NEVER GENERATED, AND NEVER ALTERED. Everything cinematic here
 * happens in the AIR AROUND the photograph — which is exactly how a macro
 * lens produces this look in the first place:
 *
 *   · bokeh      — out-of-focus points of light behind the stone. They are
 *                  lights, not diamonds, and they sit strictly behind.
 *   · beams      — soft shafts crossing the stage, never touching the stone.
 *   · motes      — fine sparkle drifting at different depths.
 *   · vignette   — the frame closing in, as a fast lens does wide open.
 *   · push-in    — the whole stage dollies toward the viewer on scroll.
 *   · tilt       — a damped perspective lean toward the pointer.
 *
 * Depth is the whole trick. The layers move at different rates, so the eye
 * reads distance and the viewer feels placed at the stone rather than shown a
 * picture of it. None of it composites anything onto the diamond.
 *
 * NO CANVAS. This is DOM and GSAP only — deliberately, because the hero is
 * asserted to contain zero WebGL, and because a dozen blurred spans cost a
 * fraction of a renderer.
 */

/** Bokeh discs: [xVw, yVh, sizePx, blurPx, opacity, depth 0..1] */
const BOKEH = [
  [12, 22, 190, 30, 0.50, 0.15], [78, 16, 140, 24, 0.44, 0.25],
  [30, 74, 230, 38, 0.38, 0.10], [88, 62, 170, 28, 0.46, 0.30],
  [58, 12, 110, 20, 0.56, 0.45], [8, 58, 120, 22, 0.38, 0.40],
  [68, 82, 150, 26, 0.34, 0.20], [44, 36, 90, 15, 0.62, 0.60],
  [92, 34, 100, 18, 0.42, 0.55], [22, 44, 76, 13, 0.58, 0.70],
  [72, 50, 70, 12, 0.50, 0.75], [36, 88, 130, 24, 0.32, 0.35],
];

/** Sparkle motes: [xVw, yVh, sizePx, opacity, depth] */
const MOTES = Array.from({ length: 22 }, (_, i) => {
  const a = (i * 137.5 * Math.PI) / 180;
  const r = 18 + (i % 7) * 5.5;
  return [
    50 + Math.cos(a) * r,
    50 + Math.sin(a) * r * 0.72,
    1.5 + (i % 3),
    0.25 + (i % 4) * 0.14,
    0.4 + (i % 5) * 0.12,
  ];
});

export default function HeroVisual() {
  const scope = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MQ.motion, () => {
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });

        // The frame opens, then the stone settles into it.
        tl.from(`.${styles.plate}`, { clipPath: 'inset(0% 0% 100% 0%)', duration: 1.5 })
          .from(`.${styles.stone}`, { scale: 1.16, duration: 2.1 }, 0)
          .from(`.${styles.bokeh}`, { opacity: 0, scale: 0.6, duration: 2, stagger: 0.05 }, 0.2)
          .from(`.${styles.mote}`, { opacity: 0, duration: 1.4, stagger: 0.03 }, 0.7)
          .fromTo(`.${styles.beam}`,
            { opacity: 0, xPercent: -40 },
            { opacity: 1, xPercent: 0, duration: 2.4, stagger: 0.3 }, 0.4);

        // Continuous drift. Slow, wide, and never looping visibly — this is
        // air moving, not an animation playing.
        const drifts = gsap.utils.toArray(`.${styles.bokeh}`).map((el, i) =>
          gsap.to(el, {
            xPercent: gsap.utils.random(-16, 16),
            yPercent: gsap.utils.random(-14, 14),
            duration: gsap.utils.random(9, 16),
            ease: 'sine.inOut',
            repeat: -1,
            yoyo: true,
            delay: i * 0.12,
          })
        );

        const twinkle = gsap.to(`.${styles.mote}`, {
          opacity: (i, t) => Number(t.dataset.o) * 0.25,
          duration: 2.4,
          ease: 'sine.inOut',
          repeat: -1,
          yoyo: true,
          stagger: { each: 0.18, from: 'random' },
        });

        return () => { tl.kill(); drifts.forEach((d) => d.kill()); twinkle.kill(); };
      });

      // THE PUSH-IN. Scrolling the hero dollies the whole stage forward: the
      // stone grows, the bokeh grows faster and spreads outward, the vignette
      // closes. Different rates at different depths is what the eye reads as
      // moving through space toward the stone.
      mm.add(MQ.desktop, () => {
        const st = {
          trigger: scope.current, start: 'top top', end: 'bottom top', scrub: 1,
        };

        // 1 -> 1.55 takes the 470px plate to ~728px, still under the 754px
        // source: the photograph is pushed toward the viewer without ever
        // being enlarged past its true resolution.
        const push = gsap.fromTo(`.${styles.stone}`,
          { scale: 1, yPercent: 0 },
          { scale: 1.55, yPercent: -6, ease: 'none', immediateRender: false, scrollTrigger: st });

        const near = gsap.fromTo(`.${styles.bokehLayer}`,
          { scale: 1, opacity: 1 },
          { scale: 2.1, opacity: 0.25, ease: 'none', immediateRender: false, scrollTrigger: st });

        const grain = gsap.fromTo(`.${styles.moteLayer}`,
          { scale: 1 },
          { scale: 1.7, ease: 'none', immediateRender: false, scrollTrigger: st });

        const close = gsap.fromTo(`.${styles.vignette}`,
          { opacity: 0.55 },
          { opacity: 1, ease: 'none', immediateRender: false, scrollTrigger: st });

        return () => {
          [push, near, grain, close].forEach((t) => { t.scrollTrigger?.kill(); t.kill(); });
        };
      });

      // Pointer lean. The stage has perspective, so this reads as the stone
      // sitting in a space you can look around — not as an image being skewed.
      mm.add(MQ.pointer, () => {
        const stage = scope.current.querySelector(`.${styles.stage}`);
        const rx = gsap.quickTo(stage, 'rotationX', { duration: 0.9, ease: 'power3.out' });
        const ry = gsap.quickTo(stage, 'rotationY', { duration: 0.9, ease: 'power3.out' });
        const px = gsap.quickTo(`.${styles.stone}`, 'xPercent', { duration: 1.1, ease: 'power3.out' });

        const onMove = (e) => {
          const nx = (e.clientX / window.innerWidth) * 2 - 1;
          const ny = (e.clientY / window.innerHeight) * 2 - 1;
          ry(nx * 7);
          rx(-ny * 5);
          px(nx * 2.2);
        };
        window.addEventListener('pointermove', onMove, { passive: true });
        return () => {
          window.removeEventListener('pointermove', onMove);
          gsap.set(stage, { rotationX: 0, rotationY: 0 });
        };
      });

      mm.add(MQ.still, () => {
        gsap.set([`.${styles.plate}`, `.${styles.stone}`, `.${styles.bokeh}`,
          `.${styles.mote}`, `.${styles.beam}`, `.${styles.bokehLayer}`,
          `.${styles.moteLayer}`, `.${styles.vignette}`], { clearProps: 'all' });
      });

      return () => mm.revert();
    },
    { scope }
  );

  return (
    <div ref={scope} className={styles.visual}>
      <div className={styles.stage}>
        {/* Everything below the stone is atmosphere: light, not gems. */}
        <div className={styles.bokehLayer} aria-hidden="true">
          {BOKEH.map(([x, y, size, blur, op, depth], i) => (
            <span
              key={i}
              className={styles.bokeh}
              style={{
                left: `${x}%`, top: `${y}%`,
                width: size, height: size,
                filter: `blur(${blur}px)`,
                opacity: op,
                zIndex: Math.round(depth * 10),
              }}
            />
          ))}
        </div>

        <span className={`${styles.beam} ${styles.beamA}`} aria-hidden="true" />
        <span className={`${styles.beam} ${styles.beamB}`} aria-hidden="true" />

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
        </figure>

        {/* Fine sparkle, in front — the dust a macro lens catches in the air. */}
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
