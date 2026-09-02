import ScrollScene from '@/components/scroll/ScrollScene.jsx';
import polished from '@/assets/diamonds/ngd-brilliant-macro.webp';
import StarRays from '@/components/media/StarRays.jsx';
import styles from './Atelier.module.css';

/**
 * The atelier: one stone, lit on a plinth, becoming itself.
 *
 * Built from the four-panel sequence the client supplied. The reference is not
 * four pictures — it is one object photographed at four moments of the same
 * transformation, and the whole idea is that the plinth, the spotlight and the
 * frame never move while the STONE changes. Rebuilding it as four separate
 * slides would have thrown away the only thing that makes it work.
 *
 * So there is one stage and one vertical seam that travels across it:
 *
 *   rough        the as-grown crystal, alone
 *   facet        seam mid-frame: rough on the left, the cut plan on the right
 *   design       seam travels on: the plan gives way to the finished stone
 *   atelier      the polished brilliant, alone
 *
 * Each layer is clipped by the SAME pair of numbers, so the three can never
 * overlap or leave a gap however fast the page is scrolled — the seam is one
 * value, not three animations trying to agree.
 *
 * It is also the company's actual process, which is why it earns the space: a
 * visitor scrolling this has been shown what the business does before reading
 * a word of copy.
 *
 * THE FIRST TWO STAGES ARE DRAWN AND THE LAST IS A PHOTOGRAPH, deliberately.
 * The only as-grown image in the project is a laboratory specimen sheet — six
 * crystals on grey rock with a 2 mm scale bar — and it has an opaque
 * background, so on a lit plinth it reads as a rectangle of rock rather than a
 * stone. Faking it was not an option and neither was cropping it.
 *
 * Drawing the first two states turns that limitation into the arc: the
 * sequence starts as a PLAN and resolves into a real photograph. The stone
 * becomes real in front of you, which is a better telling of this business
 * than three photographs would have been.
 */
const PHASES = [
  { name: 'rough', vh: 90 },
  { name: 'facet', vh: 90 },
  { name: 'design', vh: 90 },
  { name: 'atelier', vh: 120 },
  { name: 'out', vh: 60 },
];

const LINES = [
  { key: 'rough', top: 'The beginning', bottom: 'of brilliance.' },
  { key: 'facet', top: 'Every facet', bottom: 'matters.' },
  { key: 'design', top: 'Endless design', bottom: 'possibilities.' },
  { key: 'atelier', top: 'Every stone has a tale', bottom: 'at the atelier.' },
];

export default function Atelier() {
  return (
    <ScrollScene phases={PHASES} id="top" label="From rough crystal to polished diamond">
      <div className={styles.stage}>
        {/* The hard overhead source and the cone it throws. Everything else in
            the frame is lit by this one lamp, which is what makes the black
            read as a room rather than as a background colour. */}
        <span className={styles.spot} aria-hidden="true" />
        <span className={styles.cone} aria-hidden="true" />

        {/*
          The starfield and the rays the stone throws through it. The origin is
          set to where the subject actually sits on the plinth, so the beams
          read as coming FROM the diamond rather than being projected onto it.
        */}
        <StarRays className={styles.sky} origin={[0.5, 0.44]} />

        {/* The drafting grid arrives only for the design stage, exactly as it
            does in the reference — the plan appears when planning happens. */}
        <span className={styles.grid} aria-hidden="true" />

        <div className={styles.marks} aria-hidden="true">
          <span>N</span><span>G</span>
        </div>

        <h1 className={styles.head}>
          {/* Every line stays in the document for screen readers and search;
              only one is visible at a time. */}
          <span className="u-visually-hidden">
            {LINES.map((l) => `${l.top} ${l.bottom}`).join(' ')}
          </span>
          {LINES.map((line) => (
            <span key={line.key} className={styles.line} data-for={line.key} aria-hidden="true">
              <em>{line.top}</em>
              <b>{line.bottom}</b>
            </span>
          ))}
        </h1>

        <div className={styles.plinth}>
          <div className={styles.subject}>
            {/* Three states of one stone, clipped by one travelling seam. */}
            <RoughPlan className={styles.rough} />
            <CutPlan className={styles.wire} />
            <img className={styles.polished} src={polished} alt="" />
          </div>

          {/* The lit top of the pedestal, then the drape falling from it. */}
          <span className={styles.top} aria-hidden="true" />
          <span className={styles.drape} aria-hidden="true" />
        </div>

        <p className={styles.sub}>
          <span>Grown in Surat · CVD &amp; HPHT · IGI certified options</span>
        </p>

        <div className={styles.actions}>
          <a href="/diamonds">Discover the diamonds</a>
          <a href="/contact">Request inventory</a>
        </div>
      </div>
    </ScrollScene>
  );
}

/**
 * The rough: an as-grown crystal, drawn.
 *
 * Irregular on purpose — a rough diamond is a blocky octahedral lump with
 * uneven faces, and anything symmetrical here would read as a cut stone and
 * ruin the point of the first stage. Same stroke language as the cut plan, so
 * the two read as pages from one notebook.
 */
function RoughPlan({ className }) {
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <path
        className={styles.wireLine}
        d="M46 6 L70 18 L84 40 L80 66 L62 88 L38 92 L18 76 L12 50 L22 24 Z"
        pathLength="1"
      />
      {/* Internal cleavage planes — the faces an as-grown crystal actually
          shows, not a facet pattern. */}
      <path className={styles.wireLine} d="M46 6 L38 44 L12 50" pathLength="1" />
      <path className={styles.wireLine} d="M38 44 L80 66" pathLength="1" />
      <path className={styles.wireLine} d="M38 44 L38 92" pathLength="1" />
      <path className={styles.wireLine} d="M70 18 L38 44" pathLength="1" />
      <path className={styles.wireLine} d="M84 40 L38 44" pathLength="1" />
      <path className={styles.wireLine} d="M18 76 L38 44" pathLength="1" />
      <path className={styles.wireLine} d="M62 88 L38 44" pathLength="1" />
      {/* A faint fill, so it reads as a solid body rather than a wire cage. */}
      <path
        className={styles.roughBody}
        d="M46 6 L70 18 L84 40 L80 66 L62 88 L38 92 L18 76 L12 50 L22 24 Z"
      />
    </svg>
  );
}

/**
 * The cut plan: a cushion outline with its facet layout, drawn the way a
 * planner marks up a rough stone. Line only — this is the stage where the
 * diamond does not exist yet, so a rendered gem here would be a lie about the
 * order of events.
 */
function CutPlan({ className }) {
  const R = 46;
  const outline = 'M50 4 C74 4 96 26 96 50 C96 74 74 96 50 96 C26 96 4 74 4 50 C4 26 26 4 50 4 Z';
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      {/* Construction circle and crosshairs, as on the reference. */}
      <circle className={styles.dash} cx="50" cy="50" r={R} pathLength="1" />
      {[[50, 2], [50, 98], [2, 50], [98, 50]].map(([x, y]) => (
        <g key={`${x}-${y}`} className={styles.tick}>
          <line x1={x - 2} y1={y} x2={x + 2} y2={y} />
          <line x1={x} y1={y - 2} x2={x} y2={y + 2} />
        </g>
      ))}

      <path className={styles.wireLine} d={outline} pathLength="1" />
      {/* The table, inset and turned — the flat top seen from above. */}
      <path
        className={styles.wireLine}
        d="M50 20 C66 20 80 34 80 50 C80 66 66 80 50 80 C34 80 20 66 20 50 C20 34 34 20 50 20 Z"
        pathLength="1"
      />
      {/* Crown facets: girdle out to table, the star pattern of a cushion. */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const outer = [50 + Math.cos(a) * 45, 50 + Math.sin(a) * 45];
        const inner = [50 + Math.cos(a) * (i % 2 ? 30 : 24), 50 + Math.sin(a) * (i % 2 ? 30 : 24)];
        return (
          <line
            key={i}
            className={styles.wireLine}
            x1={outer[0].toFixed(1)} y1={outer[1].toFixed(1)}
            x2={inner[0].toFixed(1)} y2={inner[1].toFixed(1)}
            pathLength="1"
          />
        );
      })}
      {/* Pavilion mains crossing to the culet. */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        return (
          <line
            key={`p${i}`}
            className={styles.wireLine}
            x1={(50 + Math.cos(a) * 30).toFixed(1)} y1={(50 + Math.sin(a) * 30).toFixed(1)}
            x2="50" y2="50"
            pathLength="1"
          />
        );
      })}
    </svg>
  );
}
