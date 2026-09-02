import { useEffect, useRef } from 'react';

import ScrollScene from '@/components/scroll/ScrollScene.jsx';
import { usePointerParallax } from '@/hooks/usePointerParallax.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import schematic from '@/assets/process/cvd-technical-schematic.webp';
import styles from './CvdCodex.module.css';

const CHAPTERS = [
  {
    key: 'gas',
    number: '01',
    kicker: 'Feed gas → plasma',
    title: 'Energy activates the chemistry.',
    body: 'A hydrogen-rich feed containing a small carbon source such as methane enters the low-pressure chamber. In microwave-plasma CVD, the field sustains a plasma containing molecular, radical and ionic species.',
    facts: [
      ['Feed', 'H₂ + CH₄'],
      ['Role', 'Reactive species'],
    ],
  },
  {
    key: 'lattice',
    number: '02',
    kicker: 'Surface chemistry',
    title: 'The lattice extends one layer at a time.',
    body: 'Carbon-bearing species reach the heated diamond substrate. Atomic hydrogen helps suppress non-diamond carbon while suitable carbon species attach at active surface sites and continue the crystal structure.',
    facts: [
      ['Substrate', 'Diamond seed'],
      ['Growth', 'Layer by layer'],
    ],
  },
  {
    key: 'reactor',
    number: '03',
    kicker: 'Controlled reactor core',
    title: 'Temperature, pressure and power stay in balance.',
    body: 'The requested 1000°C view sits inside a broader published CVD growth range. The chamber illustration visualises heat, gas flow and microwave energy; it is not a readout from an NGD production reactor.',
    facts: [
      ['Typical range*', '900–1200°C'],
      ['Pressure', 'Below atmosphere'],
    ],
  },
  {
    key: 'growth',
    number: '04',
    kicker: 'Time as the fourth dimension',
    title: 'A thin plate becomes as-grown rough.',
    body: 'The exploded sequence uses a 0.3 mm starting plate and a three-week run as an illustrative example. Actual seed geometry, growth rate, interruptions and final rough dimensions depend on the recipe and target crystal.',
    facts: [
      ['Example seed', '0.3 mm'],
      ['Example run', '≈ 3 weeks'],
    ],
  },
];

const PHASES = [
  { name: 'intro', vh: 90 },
  ...CHAPTERS.map((chapter) => ({ name: chapter.key, vh: 120 })),
  { name: 'out', vh: 70 },
];

/* Continuous camera path through the generated educational plate. The image
   remains a single object; scroll changes the viewer's position around it,
   which gives time/depth continuity instead of four unrelated zoom effects. */
const CAMERA = [
  { at: 0, x: 0, y: 0, z: 1.025 },
  { at: 0.15, x: 0, y: 0, z: 1.08 },
  { at: 0.31, x: 22, y: 16, z: 1.52 },
  { at: 0.48, x: 22, y: -15, z: 1.5 },
  { at: 0.66, x: -18, y: 4, z: 1.46 },
  { at: 0.84, x: 0, y: -22, z: 1.34 },
  { at: 1, x: 0, y: 0, z: 1.025 },
];

function cameraAt(progress) {
  const nextIndex = CAMERA.findIndex((keyframe) => progress <= keyframe.at);
  if (nextIndex <= 0) return CAMERA[0];
  const next = CAMERA[nextIndex];
  const previous = CAMERA[nextIndex - 1];
  const span = next.at - previous.at || 1;
  const amount = Math.min(1, Math.max(0, (progress - previous.at) / span));
  const smooth = amount * amount * (3 - 2 * amount);
  return {
    x: previous.x + (next.x - previous.x) * smooth,
    y: previous.y + (next.y - previous.y) * smooth,
    z: previous.z + (next.z - previous.z) * smooth,
  };
}

export default function CvdCodex() {
  const progress = useRef({ sp: 0, p: 0, phase: 'intro' });
  const root = useRef(null);
  const plate = useRef(null);

  usePointerParallax(root, 0.5);

  useEffect(() => {
    const host = root.current;
    const image = plate.current;
    if (!host || !image || prefersReducedMotion()) return undefined;
    if (window.matchMedia?.('(max-width: 760px)').matches) return undefined;

    let frame = 0;
    let active = false;

    const paint = () => {
      const value = Math.min(1, Math.max(0, progress.current?.sp ?? 0));
      const camera = cameraAt(value);
      image.style.transform = `translate3d(${camera.x.toFixed(3)}%, ${camera.y.toFixed(3)}%, 0) scale(${camera.z.toFixed(4)})`;
      host.style.setProperty('--codex-time', value.toFixed(4));
      if (active && !document.hidden) frame = requestAnimationFrame(paint);
    };

    const start = () => {
      if (active || document.hidden) return;
      active = true;
      frame = requestAnimationFrame(paint);
    };

    const stop = () => {
      active = false;
      cancelAnimationFrame(frame);
      frame = 0;
    };

    const observer = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? start() : stop()),
      { rootMargin: '30% 0px 30% 0px' },
    );
    const onVisibility = () => (document.hidden ? stop() : start());

    observer.observe(host);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      stop();
    };
  }, []);

  return (
    <ScrollScene
      phases={PHASES}
      id="cvd-codex"
      label="Interactive CVD diamond growth schematic"
      progressRef={progress}
      className={styles.story}
      mobileStack
    >
      <div ref={root} className={`${styles.root} u-stage-dark`}>
        <div className={styles.plate}>
          <img
            ref={plate}
            src={schematic}
            width="2184"
            height="941"
            loading="lazy"
            decoding="async"
            alt="Illustrative technical schematic showing gas activation, carbon deposition, a cutaway microwave-plasma CVD reactor and growth from a thin seed plate to rough diamond"
          />
          <span className={styles.depthGrid} aria-hidden="true" />
          <span className={styles.scan} aria-hidden="true" />
          <span className={styles.vignette} aria-hidden="true" />
        </div>

        <header className={styles.intro}>
          <p className={styles.system}>CVD / Technical codex 01—04</p>
          <p className="u-eyebrow">Carbon · energy · time</p>
          <h2>A reactor story<br /><em>drawn through depth.</em></h2>
          <p className={styles.lede}>
            Scroll through a conceptual microwave-plasma CVD system, from feed
            gas to as-grown rough. Time is the fourth dimension; the camera
            moves through one continuous technical plate.
          </p>
        </header>

        <ol className={styles.chapters}>
          {CHAPTERS.map((chapter) => (
            <li key={chapter.key} className={styles.chapter} data-chapter={chapter.key}>
              <div className={styles.chapterHead}>
                <span>{chapter.number}</span>
                <p>{chapter.kicker}</p>
              </div>
              <h3>{chapter.title}</h3>
              <p className={styles.body}>{chapter.body}</p>
              <dl className={styles.facts}>
                {chapter.facts.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ol>

        <div className={styles.telemetry} aria-hidden="true">
          <span>00:00</span>
          <span className={styles.timeline}><i /></span>
          <span>03:00</span>
        </div>

        <aside className={styles.note}>
          <strong>Educational visualisation</strong>
          <span>Conceptual schematic · not factory footage · not to scale</span>
          <a href="https://www.gia.edu/UK-EN/hpht-and-cvd-diamond-growth-processes" target="_blank" rel="noreferrer">
            Process ranges: GIA ↗
          </a>
        </aside>
      </div>
    </ScrollScene>
  );
}
