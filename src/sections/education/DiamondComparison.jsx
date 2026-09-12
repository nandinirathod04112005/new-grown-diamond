import Reveal from '@/components/motion/Reveal.jsx';
import CountUp from '@/components/motion/CountUp.jsx';
import SplitHeading from '@/components/motion/SplitHeading.jsx';
import { useTilt } from '@/hooks/useTilt.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './DiamondComparison.copy.js';
import styles from './DiamondComparison.module.css';

/**
 * Mined against laboratory-grown, set out row by row.
 *
 * The prose above this answers "how are they different"; a buyer who has to
 * defend the answer to their own customer needs the figures side by side, and
 * a table is the honest shape for that. Everything here is either a measured
 * physical constant, a documented industry condition, or — clearly marked as
 * such — a position this company holds. Mixing the three silently is how
 * comparison pages lose their credibility.
 *
 * The tables themselves — measured properties, basic facts, industry,
 * conflict, environment, the diamond types and growth methods — live in
 * DiamondComparison.copy.js with the notes on where each figure came from, so
 * that every language reads the same rows.
 */

/**
 * One card that leans toward the pointer.
 *
 * The same six-degree tilt the stone cards use, on the same
 * `--rx`/`--ry`/`--tz` contract, so the two read as the same object type. The
 * hook drops itself on coarse pointers and under reduced motion, so this is a
 * plain card in both cases.
 */
function TiltCard({ badge, title, children }) {
  const tilt = useTilt({ max: 4.5, scale: 1.02 });
  return (
    <li className={styles.tiltHost}>
      <div ref={tilt} className={styles.tiltPlane}>
        <span className={styles.badge} aria-hidden="true">{badge}</span>
        <h4>{title}</h4>
        <p>{children}</p>
      </div>
    </li>
  );
}

function Table({ caption, rows, headLabel }) {
  const c = useCopy(COPY);
  return (
    <div className={styles.tableWrap} role="region" aria-label={caption} tabIndex={0}>
      {/* The rule draws before anything under it arrives — the same opening
          gesture the page hero uses on its own underline, so a table announces
          itself the way the rest of the site does. */}
      <span className={styles.rule} aria-hidden="true" />
      <table className={styles.table}>
        <caption className={styles.caption}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{headLabel}</th>
            <th scope="col">{c.mined}</th>
            <th scope="col">{c.grown}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, mined, grown], i) => (
            /* The index drives the stagger in CSS — one custom property beats a
               transition-delay written thirty times. */
            <tr key={label} style={{ '--i': i }}>
              <th scope="row">{label}</th>
              <td>{mined}</td>
              <td>{grown}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DiamondComparison() {
  const c = useCopy(COPY);
  const { tables } = c;

  return (
    <section className={styles.root} aria-labelledby="comparison">
      <Reveal as="header" className={styles.head}>
        <p className="u-eyebrow">{c.head.eyebrow}</p>
        <SplitHeading as="h2" className={styles.title} id="comparison" text={c.head.title} />
        <p className={styles.lede}>{c.head.lede}</p>
      </Reveal>

      <Reveal>
        <Table caption={tables.properties.caption} headLabel={tables.properties.head} rows={c.properties} />
      </Reveal>

      <Reveal>
        <Table caption={tables.basic.caption} headLabel={tables.basic.head} rows={c.basic} />
      </Reveal>

      <Reveal>
        <Table caption={tables.industry.caption} headLabel={tables.industry.head} rows={c.industry} />
      </Reveal>

      <Reveal>
        <Table caption={tables.conflict.caption} headLabel={tables.conflict.head} rows={c.conflict} />
      </Reveal>

      <Reveal as="p" className={styles.note}>{c.note}</Reveal>

      <Reveal as="div" className={styles.envHead}>
        <SplitHeading as="h3" className={styles.subTitle} text={c.environmentTitle} />
      </Reveal>

      <ul className={styles.env}>
        {c.environment.map((row, i) => (
          <Reveal as="li" key={row.metric} className={styles.envRow} delay={i * 70}>
            <h4>{row.metric}</h4>
            <div className={styles.envPair}>
              {[[c.mined, row.mined], [c.grown, row.grown]].map(([who, side]) => (
                <div key={who}>
                  <p className={styles.envWho}>{who}</p>
                  <p className={styles.envNote}>{side.note}</p>
                  <p className={styles.envFigure}>
                    <CountUp value={side.value} decimals={side.dp} className={styles.envNum} />
                    <span className={styles.envUnit}>{side.unit}</span>
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        ))}
      </ul>

      <Reveal as="p" className={styles.source}>
        {c.source.before}<em>Environmental Impact Analysis: Cultured vs Mined
        Diamonds</em>{c.source.after}
      </Reveal>

      <Reveal as="div" className={styles.split}>
        <div>
          <SplitHeading as="h3" className={styles.subTitle} text={c.natural.title} />
          <p className={styles.body}>{c.natural.body}</p>
          <ol className={styles.types}>
            {c.naturalTypes.map((t) => (
              <TiltCard key={t.title} badge={t.n} title={t.title}>{t.body}</TiltCard>
            ))}
          </ol>
        </div>

        <div>
          <SplitHeading as="h3" className={styles.subTitle} text={c.grownSide.title} />
          <p className={styles.body}>{c.grownSide.body}</p>
          <ol className={styles.types}>
            {c.growthMethods.map((m, i) => (
              <TiltCard key={m.title} badge={i + 1} title={m.title}>{m.body}</TiltCard>
            ))}
          </ol>
        </div>
      </Reveal>
    </section>
  );
}
