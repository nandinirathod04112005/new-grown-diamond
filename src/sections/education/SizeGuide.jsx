import Reveal from '@/components/motion/Reveal.jsx';
import SplitHeading from '@/components/motion/SplitHeading.jsx';
import ShapeGlyph from '@/components/product/ShapeGlyph.jsx';
import { useCopy } from '@/i18n/useCopy.js';
import { MELEE, ROUND_MM, SHAPE_GRID } from './sizeData.js';
import COPY from './SizeGuide.copy.js';
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
      <div className={`${styles.tableWrap} ${className ?? ''}`} role="region" aria-label={caption} tabIndex={0}>
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
  const c = useCopy(COPY);

  return (
    <section className={styles.root} aria-labelledby="size-guide">
      <Reveal as="header" className={styles.head}>
        <p className="u-eyebrow">{c.head.eyebrow}</p>
        <SplitHeading as="h2" className={styles.title} id="size-guide" text={c.head.title} />
        <p className={styles.lede}>{c.head.lede}</p>
      </Reveal>

      {/* The shape set. Outlines rather than photographs: at this size the job
          is telling twenty-three silhouettes apart, which a drawing does and a
          rendered stone does not. */}
      <Reveal>
        <h3 className={styles.subTitle}>{c.shapesTitle}</h3>
        <ul className={styles.shapes}>
          {SHAPE_GRID.map((shape, i) => (
            <li key={shape} style={{ '--i': step(i) }}>
              <ShapeGlyph shape={shape} className={styles.glyph} />
              {/* The English name is the glyph's key; only the label changes. */}
              <span>{c.shapes[shape] ?? shape}</span>
            </li>
          ))}
        </ul>
      </Reveal>

      <Table
        caption={c.round.caption}
        head={c.round.head}
        rows={ROUND_MM}
      />

      <Table
        caption={c.melee.caption}
        head={c.melee.head}
        rows={MELEE}
        className={styles.wide}
      />

      <Table
        caption={c.proportionsTable.caption}
        head={c.proportionsTable.head}
        rows={c.proportions}
        className={styles.wide}
      />

      <Table
        caption={c.ratioTable.caption}
        head={c.ratioTable.head}
        rows={c.ratio}
      />

      <Reveal as="p" className={styles.caveat}>{c.caveat}</Reveal>

      <Reveal as="p" className={styles.quote}>
        {c.quote.before}
        <a href="/contact">{c.quote.desk}</a>{c.quote.or}
        <a href="/diamonds">{c.quote.stock}</a>{c.quote.after}
      </Reveal>
    </section>
  );
}
