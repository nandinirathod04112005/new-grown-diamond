import ScrollScene from '@/components/scroll/ScrollScene.jsx';
import ShapeGlyph from '@/components/product/ShapeGlyph.jsx';
import styles from './Exhibit.module.css';

/**
 * The house exhibit, assembled by scroll: the masthead, the nine cuts rising
 * one after another, and the mission.
 *
 * The five-panel strip that used to sit between the masthead and the cuts
 * ("The stone first", "The evolution", "Growth under plasma", "The press",
 * "The rough"), and the golden thread drawn through it, were removed at the
 * owner's request. The scene's scroll length was shortened with them, so the
 * pinned stage no longer holds the screen for the distance those panels took.
 */
const SHAPES = ['Round', 'Cushion', 'Heart', 'Marquise', 'Oval', 'Pear', 'Princess', 'Radiant', 'Emerald'];

const MISSION = [
  'Innovation',
  'Education',
  'Consistent quality and quantity',
  'A superior ethical alternative to mined diamonds',
];

const PHASES = [
  { name: 'in', vh: 60 },
  { name: 'assemble', vh: 120 },
  { name: 'hold', vh: 70 },
  { name: 'out', vh: 60 },
];

export default function Exhibit() {
  return (
    <ScrollScene
      phases={PHASES}
      id="the-exhibit"
      label="Four decades of diamond excellence"
      /* The worst offender at phone width: nearly 400px of this exhibit's copy
         sat below the pinned pane and was never visible at any scroll position.
         Stacked, the whole case is readable. */
      mobileStack
    >
      <div className={`${styles.stage} u-stage-dark`}>
        <header className={styles.head}>
          <p className={styles.brand}>New Grown Diamond</p>
          <h2 className={styles.title}>Four decades of diamond excellence</h2>
          <span className={styles.rule} aria-hidden="true">
            <i /><ShapeGlyph shape="Round" className={styles.ruleGem} /><i />
          </span>
        </header>

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
