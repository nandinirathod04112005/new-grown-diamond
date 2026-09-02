import styles from './Blueprint.module.css';

/**
 * The engineering layer.
 *
 * This is the one piece of custom artwork that can sit over a real photograph
 * without ever competing with it. A drawn diamond always reads as a drawing of
 * a diamond; a drawn MEASUREMENT of a real diamond reads as a specification —
 * which is what a manufacturer sells. So nothing here depicts the stone. It
 * only annotates the one already in the frame.
 *
 * No numeric proportion is printed here. The actual photographed stone has no
 * certificate bound to this component, so standard round-brilliant numbers
 * would look like measurements of this specific diamond. The overlay names
 * regions only and identifies itself as an optical study.
 *
 * What it names are the five real parts of a round brilliant — table, crown,
 * girdle, pavilion, culet. Those are facts about the CUT, true of every round
 * brilliant ever polished, so they can be stated with no certificate at all.
 * An earlier pass paired each part with a filler word ("Plane crown", "Return
 * pavilion") to avoid printing figures; the effect was a hero covered in terms
 * that do not exist. A name a jeweller uses every day beats an invented one.
 *
 * Geometry is normalised to a 1000×1000 box held square and centred, so the
 * callouts stay anchored to the middle of the frame — where a macro subject
 * sits — at every viewport, rather than sliding off it as the crop changes.
 */

// `pathLength="1"` normalises every path regardless of its real length, so a
// single dasharray/dashoffset pair draws them all at a matched rate. Without
// it each line would need its own measured length.
const LEADERS = [
  /*
   * The part name and nothing else.
   *
   * A first pass appended a plain-English gloss to each ("Girdle — the widest
   * edge"), which was friendlier and immediately unusable: the labels grew
   * wide enough to run off the right edge at every tested width and to print
   * "Table" across the headline. The bare terms are what a jeweller says out
   * loud, and they fit.
   *
   * Right-hand labels are held at x=790 rather than out at the box edge,
   * because the drafting box is square and fits to HEIGHT — the room to its
   * right shrinks fast on a 16:9 laptop and vanishes on a 4:3 one.
   */
  { d: 'M470,286 L318,206', dot: [470, 286], name: 'Table', tx: 310, ty: 200, anchor: 'end' },
  { d: 'M612,352 L782,272', dot: [612, 352], name: 'Crown', tx: 790, ty: 266, anchor: 'start' },
  { d: 'M642,486 L782,486', dot: [642, 486], name: 'Girdle', tx: 790, ty: 480, anchor: 'start' },
  { d: 'M604,640 L782,714', dot: [604, 640], name: 'Pavilion', tx: 790, ty: 720, anchor: 'start' },
  { d: 'M500,742 L336,812', dot: [500, 742], name: 'Culet', tx: 328, ty: 818, anchor: 'end' },
];

export default function Blueprint({ className, tone = 'gold' }) {
  return (
    <svg
      className={`${styles.root} ${className ?? ''}`}
      data-tone={tone}
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
      focusable="false"
    >
      {/* The ground grid. Kept far back so it reads as drafting paper rather
          than as a table. */}
      <g className={styles.grid}>
        {[100, 200, 300, 400, 500, 600, 700, 800, 900].map((n) => (
          <g key={n}>
            <line x1={n} y1="60" x2={n} y2="940" />
            <line x1="60" y1={n} x2="940" y2={n} />
          </g>
        ))}
      </g>

      {/* Corner brackets: the frame device from the reference, drawn on. */}
      <g className={styles.brackets}>
        {[
          'M96,190 L96,96 L190,96',
          'M810,96 L904,96 L904,190',
          'M904,810 L904,904 L810,904',
          'M190,904 L96,904 L96,810',
        ].map((d, i) => (
          <path key={d} d={d} pathLength="1" style={{ '--i': i }} />
        ))}
      </g>

      

      

      {/* Angle callouts, each pinned to the facet it describes. */}
      {LEADERS.map((l, i) => (
        <g key={l.name} className={styles.leader} style={{ '--i': 6 + i }}>
          <path d={l.d} pathLength="1" />
          <circle cx={l.dot[0]} cy={l.dot[1]} r="4" />
          <text className={styles.value} x={l.tx} y={l.ty} textAnchor={l.anchor}>
            {l.name}
          </text>
        </g>
      ))}

      {/* The facet count, bottom left, as a plate stamp. */}
      <text className={styles.stamp} x="100" y="836" style={{ '--i': 10 }}>
        Optical study · not measured
      </text>
      <text className={styles.stamp} x="900" y="836" textAnchor="end" style={{ '--i': 11 }}>
        Real NGD photograph
      </text>

      {/* A slow reticle, so the layer is never completely still. */}
      <circle className={styles.reticle} cx="500" cy="500" r="330" pathLength="1" />

      {/* The measuring pass: one line travelling down the plate on a long
          cycle, the way a scanner reads a stone. */}
      <line className={styles.scan} x1="96" y1="0" x2="904" y2="0" />
    </svg>
  );
}
