import ScrollScene from '@/components/scroll/ScrollScene.jsx';
import ShapeGlyph from '@/components/product/ShapeGlyph.jsx';
import LivePhoto from '@/components/media/LivePhoto.jsx';
import styles from './Exhibit.module.css';

// Real photography in every panel. The drawn shapes that were here read as
// wireframe placeholders next to the artwork this section is based on.
import heritage from '@/assets/diamonds/ngd-brilliant-macro.webp';
import evolution from '@/assets/diamonds/ngd-brilliant-macro.webp';
import furnace from '@/assets/process/cvd-furnace.webm';
import ethical from '@/assets/process/hpht-rough.jpg';
import press from '@/assets/process/belt-press.png';

/**
 * The house exhibit, assembled by scroll.
 *
 * Five real panels, each carrying an actual photograph or, for the growth
 * stage, real CVD furnace footage. The drawn shapes that were here first read
 * as wireframe placeholders — abstract blobs where the reference artwork has
 * a workshop, a reactor and a globe.
 *
 * The layout stays in code rather than becoming one flat JPEG, so it still
 * reflows on a phone and keeps its text selectable for search and screen
 * readers — but every picture in it is now a real picture.
 *
 * One golden thread runs through every panel and DRAWS itself as the scene is
 * scrolled — that thread is the composition's spine, and watching it travel is
 * what turns a wall of panels into a single continuous statement.
 */
/*
 * Each panel's label now describes what its picture ACTUALLY shows.
 *
 * They were mismatched before: a jewellery consultation stood for "four
 * decades of excellence", and a scientific rough-crystal shot with a 2 mm
 * scale bar stood for "ethical, conflict-free". A caption that does not match
 * its photograph is the fastest way to lose a trade buyer's trust, so the
 * headings were rewritten to the images rather than the reverse. The ethical
 * and global claims still appear — in the mission line, as words, where they
 * belong.
 */
const MEDIA = {
  p1: { type: 'image', src: heritage, alt: 'A real New Grown Diamond round brilliant photographed loose against black' },
  p2: { type: 'image', src: evolution, alt: 'A polished laboratory-grown brilliant, close' },
  p3: { type: 'video', src: furnace, alt: 'A CVD diamond growth furnace running' },
  p4: { type: 'image', src: press, alt: 'A belt-type high pressure press used for HPHT synthesis' },
  p5: { type: 'image', src: ethical, alt: 'As-grown synthetic diamond rough crystals' },
};

const PANELS = [
  {
    key: 'p1',
    kicker: 'Four decades',
    title: 'The stone first',
    note: 'Real NGD photography anchors the heritage story.',
  },
  {
    key: 'p2',
    kicker: '2012',
    title: 'The evolution',
    note: 'From mined-diamond expertise to lab-grown manufacturing.',
  },
  {
    key: 'p3',
    kicker: 'CVD',
    title: 'Growth under plasma',
    note: 'Carbon settles onto the seed, layer by layer.',
  },
  {
    key: 'p4',
    kicker: 'HPHT',
    title: 'The press',
    note: 'The second route to the same crystal.',
  },
  {
    key: 'p5',
    kicker: 'As grown',
    title: 'The rough',
    note: 'Chemically identical to a stone formed in the earth.',
  },
];

const SHAPES = ['Round', 'Cushion', 'Heart', 'Marquise', 'Oval', 'Pear', 'Princess', 'Radiant', 'Emerald'];

const MISSION = [
  'Innovation',
  'Education',
  'Consistent quality and quantity',
  'A superior ethical alternative to mined diamonds',
];

const PHASES = [
  { name: 'in', vh: 60 },
  { name: 'assemble', vh: 240 },
  { name: 'hold', vh: 90 },
  { name: 'out', vh: 60 },
];

export default function Exhibit() {
  return (
    <ScrollScene phases={PHASES} id="the-exhibit" label="Four decades of diamond excellence">
      <div className={`${styles.stage} u-stage-dark`}>
        <header className={styles.head}>
          <p className={styles.brand}>New Grown Diamond</p>
          <h2 className={styles.title}>Four decades of diamond excellence</h2>
          <span className={styles.rule} aria-hidden="true">
            <i /><ShapeGlyph shape="Round" className={styles.ruleGem} /><i />
          </span>
        </header>

        {/*
          The thread. It is drawn with stroke-dashoffset bound to the scene's
          own progress, so it travels left to right exactly as fast as the
          visitor scrolls — and runs backwards if they scroll back.
        */}
        <svg className={styles.thread} viewBox="0 0 1000 120" preserveAspectRatio="none" aria-hidden="true">
          <path
            className={styles.threadPath}
            d="M0,86 C120,86 150,30 250,30 C350,30 380,92 500,92 C620,92 650,26 760,26 C870,26 900,72 1000,72"
          />
        </svg>

        <div className={styles.panels}>
          {PANELS.map((panel, i) => (
            <article key={panel.key} className={styles.panel} style={{ '--i': i }}>
              <div className={styles.art}>
                {MEDIA[panel.key].type === 'video' ? (
                  <video
                    className={styles.artVideo}
                    src={MEDIA[panel.key].src}
                    muted
                    loop
                    autoPlay
                    playsInline
                    preload="metadata"
                    aria-label={MEDIA[panel.key].alt}
                  />
                ) : (
                  <LivePhoto
                    src={MEDIA[panel.key].src}
                    alt={MEDIA[panel.key].alt}
                    sparks={2}
                    tilt={5}
                  />
                )}
              </div>

              <p className={styles.kicker}>{panel.kicker}</p>
              <h3 className={styles.panelTitle}>{panel.title}</h3>
              <p className={styles.note}>{panel.note}</p>
            </article>
          ))}
        </div>

        {/* The row of cuts, with the house stone held large at the centre. */}
        <div className={styles.cuts}>
          {SHAPES.map((shape, i) => (
            <figure key={shape} className={styles.cut} style={{ '--i': i }} data-hero={i === 4 ? '' : undefined}>
              <span className={styles.cutGlow} aria-hidden="true" />
              <ShapeGlyph shape={shape} className={styles.cutGem} />
              <figcaption>{shape}</figcaption>
            </figure>
          ))}
        </div>

        <div className={styles.mission}>
          <p className={styles.missionLabel}>Our mission</p>
          <ul>
            {MISSION.map((m, i) => (
              <li key={m} style={{ '--i': i }}>{m}</li>
            ))}
          </ul>
        </div>
      </div>
    </ScrollScene>
  );
}
