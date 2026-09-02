import { useEffect, useRef } from 'react';

import { prefersReducedMotion } from '@/lib/motion/media.js';
import Blueprint from '@/components/media/Blueprint.jsx';
import styles from './StageFilm.module.css';

import schematic from '@/assets/process/cvd-technical-schematic.webp';
import furnace from '@/assets/process/cvd-furnace.webm';
import press from '@/assets/process/belt-press.png';
import bars from '@/assets/process/bars-apparatus.jpg';
import rough from '@/assets/process/hpht-rough.jpg';

import cut from '@/assets/process/cut-stone.jpg';

/**
 * The manufacturing film, in real photography.
 *
 * Eight frames cross-dissolved by scroll position. The scroll is the playhead:
 * every frame's opacity is a continuous function of a floating stage position,
 * so mid-scroll you are genuinely between two frames and scrubbing back
 * dissolves backwards exactly. That is the difference between a slideshow and
 * something that reads as footage.
 *
 * Documentary photographs and furnace footage are used wherever the project
 * has a licensed source. The seed chapter uses the requested conceptual CVD
 * schematic and labels it visibly; it is never presented as factory evidence.
 *
 * Each frame is captioned with what it ACTUALLY shows. Where the closest
 * honest image is not a literal photograph of that step — there is no public
 * photograph of a CVD seed plate — the caption says what the picture is rather
 * than what the stage is. Mislabelling a photograph is worse than not having
 * one.
 */
/*
 * Sources that are too small to fill the plate.
 *
 * belt-press is 180x237, hpht-rough 526x292, bars-apparatus 543x443 — against
 * a plate around 520x650 those are upscaled by up to 2.9x, and an upscaled
 * photograph does not look like a big photograph, it looks like a cheap one.
 *
 * They are therefore CONTAINED rather than covered: shown near their own size,
 * centred on the plate ground like a plate in a book. A small photograph
 * presented as a small photograph reads as deliberate. The same file stretched
 * to the edges reads as the best that could be found — which, on a site meant
 * to look expensive, is the more damaging of the two.
 *
 * The real fix is higher-resolution sources; this stops the interim from
 * looking careless.
 */
const SMALL_SOURCES = ['hpht-rough', 'bars-apparatus'];

/*
 * belt-press is a separate tier at 180px wide. Even contained in the plate it
 * still came out at 2.24x, so it gets a tighter slot again and lands near its
 * own resolution — small and sharp, rather than large and soft.
 */
const TINY_SOURCES = ['belt-press'];

const sizeTier = (src) => {
  const name = String(src);
  if (TINY_SOURCES.some((n) => name.includes(n))) return 'tiny';
  if (SMALL_SOURCES.some((n) => name.includes(n))) return 'small';
  return undefined;
};

const FRAMES = [
  { key: 's1', type: 'image', src: schematic, alt: 'Educational CVD reactor schematic', caption: 'Seed-to-growth overview', credit: 'Educational schematic · not factory footage' },
  { key: 's2', type: 'video', src: furnace, alt: 'A CVD diamond growth furnace running', caption: 'CVD growth furnace', credit: 'Wikimedia Commons · CC BY 2.0' },
  { key: 's3', type: 'video', src: furnace, alt: 'A CVD diamond growth furnace during deposition', caption: 'Deposition under way', credit: 'Wikimedia Commons · CC BY 2.0' },
  { key: 's4', type: 'image', src: press, alt: 'A belt-type high pressure press used for HPHT synthesis', caption: 'Belt press · HPHT route', credit: 'Wikimedia Commons · Public domain' },
  { key: 's5', type: 'image', src: rough, alt: 'As-grown synthetic diamond rough crystals', caption: 'As-grown rough', credit: 'Wikimedia Commons · Public domain' },
  { key: 's6', type: 'image', src: bars, alt: 'A BARS high-pressure growth apparatus', caption: 'Growth apparatus', credit: 'Wikimedia Commons · Public domain' },
  { key: 's7', type: 'image', src: cut, alt: 'A cut and polished laboratory-grown diamond', caption: 'Cut result', credit: 'Wikimedia Commons · CC BY 2.0' },
  { key: 's8', type: 'image', src: cut, alt: 'A cut and polished laboratory-grown diamond', caption: 'Cut and polished', credit: 'Wikimedia Commons · CC BY 2.0', gem: true },
];

export default function StageFilm({ progressRef }) {
  const root = useRef(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return undefined;
    const shots = [...el.querySelectorAll('[data-frame]')];
    if (!shots.length) return undefined;

    if (prefersReducedMotion()) {
      shots.forEach((s, i) => {
        s.style.opacity = i === shots.length - 1 ? '1' : '0';
      });
      const still = el.querySelector(`.${styles.blueprint}`);
      if (still) still.style.opacity = FRAMES[FRAMES.length - 1].gem ? '0.9' : '0';
      return undefined;
    }

    // Round-brilliant proportions are true of a polished stone and of nothing
    // else. Annotating a belt press with a 57% table would be exactly the kind
    // of mislabelling that costs a trade buyer's trust, so the drafting layer
    // is tied to the frames that actually show a cut diamond and fades out
    // over the furnace, the press and the bench.
    const plan = el.querySelector(`.${styles.blueprint}`);
    const gemAt = FRAMES.map((f) => Boolean(f.gem));

    let frame = 0;
    const tick = () => {
      const sp = progressRef.current?.sp ?? 0;

      // The lead-in and out-run carry no frame, so the eight images are spread
      // across the middle of the scroll rather than the whole of it.
      const t = Math.min(1, Math.max(0, (sp - 0.06) / 0.86));
      const pos = t * (shots.length - 1);

      let gemO = 0;
      for (let i = 0; i < shots.length; i += 1) {
        // Fully on at its own position, gone one position away, so exactly two
        // frames are ever mixing.
        const o = Math.max(0, 1 - Math.abs(i - pos));
        shots[i].style.opacity = o.toFixed(3);
        shots[i].style.transform = `scale(${(1.08 - o * 0.06).toFixed(4)})`;
        if (gemAt[i]) gemO = Math.max(gemO, o);
      }
      if (plan) plan.style.opacity = (gemO * 0.9).toFixed(3);
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [progressRef]);

  return (
    <div ref={root} className={styles.film}>
      {FRAMES.map((f, i) =>
        f.type === 'video' ? (
          <video
            key={f.key}
            data-frame={i}
            className={styles.frame}
            src={f.src}
            muted
            loop
            autoPlay
            playsInline
            preload="auto"
            aria-label={f.alt}
          />
        ) : (
          <img
            key={f.key}
            data-frame={i}
            className={styles.frame}
            data-small={sizeTier(f.src)}
            src={f.src}
            alt={f.alt}
            loading={i < 2 ? 'eager' : 'lazy'}
            decoding="async"
          />
        ),
      )}

      <span className={styles.sweep} aria-hidden="true" />
      <span className={styles.grain} aria-hidden="true" />
      <span className={styles.vignette} aria-hidden="true" />

      {/* The measured layer, over the footage. */}
      <Blueprint className={styles.blueprint} tone="ivory" />

      {/* The inner rule. A frame held a little inside the crop is what
          separates a plate from a photograph that simply ran out. */}
      <span className={styles.innerFrame} aria-hidden="true" />

      {/* Credits track the frame, because CC BY requires attribution. */}
      <div className={styles.credits} aria-hidden="true">
        {FRAMES.map((f, i) => (
          <span key={f.key} data-cap={i}>
            <b>{f.caption}</b>
            <i>{f.credit}</i>
          </span>
        ))}
      </div>
    </div>
  );
}
