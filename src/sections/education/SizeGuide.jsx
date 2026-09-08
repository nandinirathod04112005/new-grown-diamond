import Reveal from '@/components/motion/Reveal.jsx';
import SplitHeading from '@/components/motion/SplitHeading.jsx';
import ShapeGlyph from '@/components/product/ShapeGlyph.jsx';
import { MELEE, PROPORTIONS, RATIO, ROUND_MM, SHAPE_GRID } from './sizeData.js';
import styles from './SizeGuide.module.css';

/**
 * Carat weight against the millimetre size it actually produces.
 *
 * The part of "price and size" that can be stated as fact and stays true. Rates
 * move week to week and are not published here; a well-cut one-carat round has
 * measured about 6.5mm across for as long as the modern brilliant has existed,
 * and will next year too.
 *
 * Four tables, in the order a buyer needs them: the shape set, the round-cut
 * conversion, melee with its sieve sizes, and the proportions that decide
 * whether a stone of a given weight spreads or hides.
 */

/*
 * The stagger index is capped.
 *
 * Thirty-two melee rows at 40ms apart would leave the last one arriving a
 * second and a quarter after the first, which stops reading as a sequence and
 * starts reading as a queue. After the twelfth row the delay simply stops
 * growing and the remainder arrive together.
 */
const STAGGER_CAP = 12;
const step = (i) => Math.min(i, STAGGER_CAP);

function Table({ caption, head, rows, className }) {
  return (
    <Reveal>
      <div className={`${styles.tableWrap} ${className ?? ''}`}>
        <span className={styles.rule} aria-hidden="true" />
        <table className={styles.table}>
          <caption className={styles.caption}>{caption}</caption>
          <thead>
            <tr>
              {head.map((h) => <th key={h} scope="col">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row[0]} style={{ '--i': step(i) }}>
                <th scope="row">{row[0]}</th>
                {row.slice(1).map((cell, c) => <td key={`${row[0]}-${c}`}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Reveal>
  );
}

export default function SizeGuide() {
  return (
    <section className={styles.root} aria-labelledby="size-guide">
      <Reveal as="header" className={styles.head}>
        <p className="u-eyebrow">Carat to millimetre</p>
        <SplitHeading as="h2" className={styles.title} id="size-guide" text="Diamond sizes in millimetres" />
        <p className={styles.lede}>
          Carat is a weight, not a width. These are the sizes a well-cut stone
          tends to produce, the shapes we cut, and the proportions that decide
          whether a given weight spreads across the finger or hides below the
          girdle.
        </p>
      </Reveal>

      {/* The shape set. Outlines rather than photographs: at this size the job
          is telling twenty-three silhouettes apart, which a drawing does and a
          rendered stone does not. */}
      <Reveal>
        <h3 className={styles.subTitle}>The shapes we cut</h3>
        <ul className={styles.shapes}>
          {SHAPE_GRID.map((shape, i) => (
            <li key={shape} style={{ '--i': step(i) }}>
              <ShapeGlyph shape={shape} className={styles.glyph} />
              <span>{shape}</span>
            </li>
          ))}
        </ul>
      </Reveal>

      <Table
        caption="Brilliant round cut — 0.21 to 5.20 ct"
        head={['Carat weight (ct)', 'Diameter (mm)']}
        rows={ROUND_MM}
      />

      <Table
        caption="Round melee — 0.005 to 0.20 ct, with sieve sizes"
        head={['Carat weight (ct)', 'Size (mm)', 'Stones per carat', 'Sieve size']}
        rows={MELEE}
        className={styles.wide}
      />

      <Table
        caption="Ideal table and depth, brilliant round cut"
        head={['Proportion', 'Excellent', 'Very good', 'Good']}
        rows={PROPORTIONS}
        className={styles.wide}
      />

      <Table
        caption="Ideal length to width ratio"
        head={['Measure', 'Excellent / very good', 'Good']}
        rows={RATIO}
      />

      <Reveal as="p" className={styles.caveat}>
        Sizes are approximate and follow cut proportions rather than weight
        alone — a deeper stone of the same carat measures smaller across the
        top. Exact measurements for any individual stone are recorded on its
        grading report.
      </Reveal>

      <Reveal as="p" className={styles.quote}>
        Per-carat rates are not published here because they move. For a current
        figure on a specific shape, weight and quality, or for a size not listed
        above,{' '}
        <a href="/contact">tell the desk what you need</a> or{' '}
        <a href="/diamonds">search live stock</a>.
      </Reveal>
    </section>
  );
}
