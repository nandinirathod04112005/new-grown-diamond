import { useEffect, useRef, useState } from 'react';

import ScrollScene from '@/components/scroll/ScrollScene.jsx';
import ShapeGlyph from '@/components/product/ShapeGlyph.jsx';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import { listShapePhotos } from '@/lib/supabase/queries/diamonds.js';
import { interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './ShapeWheel.copy.js';
import styles from './ShapeWheel.module.css';

/**
 * The cutting wheel.
 *
 * Nine cuts on the rim of a disc whose centre sits off the left edge, so only
 * the arc crosses the frame — the crop is what tells you the wheel is bigger
 * than the screen, and a wheel you can see all of is just a circle of icons.
 *
 * The stone that reaches the READING POSITION names itself in the panel beside
 * it. That is the whole idea: the description is not a list underneath the
 * animation, it is the animation's own caption, and it changes because the
 * wheel moved.
 *
 * Rotation is driven in JS rather than by a CSS animation plus a CSS scroll
 * expression. Two independent rotations cannot be read back reliably, and the
 * caption has to know the REAL angle or it will name a stone that is not
 * there. So one loop owns the angle: a slow constant drift so the wheel is
 * never dead, plus the scene's own scroll progress so the visitor drives it.
 *
 * The cuts in wheel order, by their English names — the id each photograph,
 * outline and stock lookup is keyed by. What each is called on screen, and its
 * description, are in ShapeWheel.copy.js in every language.
 */
const CUTS = ['Round', 'Oval', 'Emerald', 'Pear', 'Princess', 'Cushion', 'Radiant', 'Marquise', 'Heart'];

/*
 * The house photographs of each cut — the same nine the homepage collection
 * strip shows, discovered from the same folder.
 *
 * This page's whole job is telling nine cuts apart, and it was doing it with
 * line drawings while real photographs of exactly those nine cuts sat in the
 * bundle. A photograph belongs to a cut by FILENAME: `round.webp` is the round,
 * and a cut with no file keeps its outline rather than borrowing another
 * shape's picture.
 */
const SHOTS = Object.fromEntries(
  Object.entries(
    import.meta.glob('@/assets/diamonds/cuts/*.{webp,png,jpg,jpeg}', {
      eager: true,
      import: 'default',
    }),
  ).map(([path, url]) => [path.split('/').pop().replace(/\.\w+$/, '').toLowerCase(), url]),
);

/*
 * Live stock photographs, which would OUTRANK the house shot for any cut
 * actually held — a real stone with its carat weight on the plate beats a
 * library picture of the same cut.
 *
 * Still off, and the reason is data, not code. The two stones currently
 * carrying an image_path are a company LOGO and a PORTRAIT of a person in a
 * showroom — neither is a diamond. Switching this on would put the logo on a
 * plate captioned "a 0.23 ct round in current stock", which is a mislabelled
 * picture on the one page that cannot afford one.
 *
 * Everything behind it is built and tested. Upload real photographs of real
 * stones and flip this to true: each cut with stock shows its own stone and
 * names the carat weight, and every other cut keeps the house photograph.
 */
const USE_STOCK_PHOTOS = false;

const PHASES = [
  { name: 'in', vh: 60 },
  { name: 'turn', vh: 240 },
  { name: 'out', vh: 60 },
];

/** Degrees of wheel turn contributed by scrolling the whole scene. */
const SCROLL_SWEEP = 200;
/** Degrees per second of idle drift, so the wheel lives while nobody moves. */
const IDLE_RATE = 3.2;

export default function ShapeWheel() {
  const progress = useRef({ sp: 0, p: 0, phase: 'in' });
  const root = useRef(null);
  const ring = useRef(null);
  const [active, setActive] = useState(0);
  const c = useCopy(COPY);

  /*
   * Real stones, keyed by cut, from live inventory. A cut with stock shows a
   * PHOTOGRAPH of an actual New Grown Diamond of that shape; a cut without
   * keeps its drawn outline rather than borrowing a picture of a different
   * shape, which would be a mislabelled image on a page whose entire job is
   * telling shapes apart.
   *
   * Decoration only: if this never resolves, the wheel is exactly what it was.
   */
  const [photos, setPhotos] = useState({});

  useEffect(() => {
    if (!USE_STOCK_PHOTOS) return undefined;
    let alive = true;
    listShapePhotos()
      .then((map) => { if (alive) setPhotos(map); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const el = root.current;
    const wheel = ring.current;
    if (!el || !wheel) return undefined;

    const step = 360 / CUTS.length;
    const still = prefersReducedMotion();

    let frame = 0;
    let running = false;
    let t0 = 0;
    let current = -1;

    const measure = (now) => {
      if (!t0) t0 = now;
      const sp = progress.current?.sp ?? 0;
      // Reduced motion: the wheel holds and the panel simply describes the
      // stone at the reading position. No drift, no scroll-driven spin.
      const angle = still ? 0 : ((now - t0) / 1000) * IDLE_RATE + sp * SCROLL_SWEEP;
      wheel.style.transform = `rotate(${angle.toFixed(2)}deg)`;

      // Which segment sits at the reading position — 90 degrees clockwise from
      // the top, pointing at the panel. Segment i starts at i*step from the
      // top, so the nearest one is found by inverting that.
      const i = Math.round((90 - angle) / step);
      const next = ((i % CUTS.length) + CUTS.length) % CUTS.length;
      if (next !== current) {
        current = next;
        setActive(next);
      }

      if (running) frame = requestAnimationFrame(measure);
    };

    const start = () => {
      if (running) return;
      running = true;
      t0 = 0;
      frame = requestAnimationFrame(measure);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    // Turns only while on screen: an off-screen rAF loop is pure battery.
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: '20% 0px 20% 0px' },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      stop();
    };
  }, []);

  const activeCut = CUTS[active];
  const { name, note } = c.cuts[activeCut];

  return (
    <ScrollScene phases={PHASES} id="the-cuts" label={c.label} progressRef={progress}>
      <div ref={root} className={`${styles.stage} u-stage-dark`}>
        <span className={styles.disc} aria-hidden="true" />

        {/*
          The house mark: a round brilliant seen plan-on — girdle, table,
          bezels and stars. Line only, the same register as the drafting layer
          in the hero, so the two sections read as one house. Cropped by the
          frame on purpose; the wheel is bigger than the screen.
        */}
        <svg className={styles.mark} viewBox="-110 -110 220 220" aria-hidden="true" focusable="false">
          <circle className={styles.markRing} r="100" />
          <circle className={styles.markRing} r="92" />
          <polygon
            className={styles.markLine}
            points={Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2 - Math.PI / 8;
              return `${(Math.cos(a) * 40).toFixed(1)},${(Math.sin(a) * 40).toFixed(1)}`;
            }).join(' ')}
          />
          {Array.from({ length: 16 }, (_, i) => {
            const a = (i / 16) * Math.PI * 2;
            const inner = i % 2 ? 40 : 46;
            return (
              <line
                key={i}
                className={styles.markLine}
                x1={(Math.cos(a) * inner).toFixed(1)}
                y1={(Math.sin(a) * inner).toFixed(1)}
                x2={(Math.cos(a) * 92).toFixed(1)}
                y2={(Math.sin(a) * 92).toFixed(1)}
              />
            );
          })}
        </svg>

        <div className={styles.wheel} aria-hidden="true">
          <div ref={ring} className={styles.ring}>
            {CUTS.map((cut, i) => (
              <div
                key={cut}
                className={styles.seg}
                style={{ '--i': i, '--n': CUTS.length }}
                data-on={i === active ? '' : undefined}
              >
                <span className={styles.pool} />

                {/* Live stock first, the house photograph next, the drawn
                    outline only if neither exists. */}
                {(photos[cut]?.url ?? SHOTS[cut.toLowerCase()]) ? (
                  <>
                    <img
                      className={styles.shot}
                      src={photos[cut]?.url ?? SHOTS[cut.toLowerCase()]}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                    {/* The same photograph, mirrored and crushed — a stone on a
                        polished tray throws a dark compressed double. */}
                    <img
                      className={styles.shotEcho}
                      src={photos[cut]?.url ?? SHOTS[cut.toLowerCase()]}
                      alt=""
                      aria-hidden="true"
                    />
                  </>
                ) : (
                  <>
                    <ShapeGlyph shape={cut} className={styles.stone} />
                    <ShapeGlyph shape={cut} className={styles.echo} />
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* The caption for whatever the wheel has brought round. */}
        <div className={styles.copy}>
          <p className={styles.kicker}>{c.label}</p>

          <div className={styles.readout} key={activeCut}>
            <h2 className={styles.title}>{name}</h2>
            <p className={styles.note}>{note}</p>
            {photos[activeCut] ? (
              <p className={styles.stock}>
                {interpolate(c.shown, { carat: photos[activeCut].carat.toFixed(2), name: name.toLowerCase() })}
              </p>
            ) : null}
          </div>

          <span className={styles.rule} aria-hidden="true" />

          {/*
            Every cut stays in the document. Only one is enlarged at a time,
            but a screen reader and a search engine still find the complete
            shape list with each description attached — otherwise animating the
            copy would have quietly deleted the page's content.
          */}
          <ol className={styles.index}>
            {CUTS.map((id, i) => (
              <li key={id} data-on={i === active ? '' : undefined}>
                <b>{c.cuts[id].name}</b>
                <span className="u-visually-hidden">{c.cuts[id].note}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </ScrollScene>
  );
}
