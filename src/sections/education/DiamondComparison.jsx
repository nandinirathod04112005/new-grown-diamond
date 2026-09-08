import Reveal from '@/components/motion/Reveal.jsx';
import CountUp from '@/components/motion/CountUp.jsx';
import SplitHeading from '@/components/motion/SplitHeading.jsx';
import { useTilt } from '@/hooks/useTilt.js';
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
 */

/*
 * Measured properties. These are the rows that are not up for argument: both
 * materials are carbon in the same cubic lattice, and every optical and
 * physical constant below follows from that.
 */
const PROPERTIES = [
  ['Chemical composition', 'C', 'C'],
  ['Crystalline structure', 'Cubic', 'Cubic'],
  ['Refractive index', '2.42', '2.42'],
  ['Dispersion', '0.044', '0.044'],
  ['Hardness (Mohs)', '10', '10'],
  ['Density', '3.52 g/cm³', '3.52 g/cm³'],
  ['Thermal conductivity', 'Excellent', 'Excellent'],
  ['Unit of measurement', 'Carats', 'Carats'],
  /*
   * Corrected against the source table this page was built from, which read
   * "100% Type IIa" for laboratory-grown. That is not true of this company's
   * own output and contradicts the HPHT note further down the page: CVD growth
   * is typically Type IIa, while HPHT commonly produces nitrogen-bearing Type
   * Ib material. Claiming otherwise would be corrected by the first gemmologist
   * who read it.
   */
  ['Intrinsic purity', 'About 2% are Type IIa', 'CVD is typically Type IIa; HPHT is commonly Type Ib'],
  ['Blue fluorescence', 'Strong to none', 'Usually none to faint'],
  ['Phosphorescence', 'Rare', 'Sometimes, more often in HPHT'],
  ['Colour distribution', 'Even', 'Even'],
];

/* What a buyer is actually asked across the counter. */
const BASIC_FACTS = [
  ['Is it a diamond?', 'Yes', 'Yes'],
  ['Is it synthetic?', 'No', 'No'],
  ['Is it fake?', 'No', 'No'],
  ['Is it artificial?', 'No', 'No'],
  ['Is it certified by a laboratory?', 'Yes', 'Yes'],
  ['What is the life expectancy?', 'Forever', 'Forever'],
];

/* Trade conditions rather than gemmology — supply, not stones. */
const INDUSTRY = [
  ['Origin guaranteed', 'No', 'Yes'],
  ['Security of supply', 'No', 'Yes'],
  ['Security of future growth', 'No', 'Yes'],
  ['Security of employment', 'No', 'Yes'],
];

const CONFLICT = [
  ['Is it a conflict diamond?', 'Possibly', 'No'],
  ['Engages bonded labour', 'Possibly', 'No'],
  ['Engages child labour', 'Possibly', 'No'],
];

/*
 * Environmental figures.
 *
 * Carried with their source ON THE PAGE, not stated as bare fact. These numbers
 * circulate widely through lab-grown marketing without attribution, and an
 * unsubstantiated environmental claim is a regulatory problem in several of the
 * markets this company sells into, not merely a credibility one. Naming the
 * study — and that it was commissioned by the laboratory-grown sector — lets a
 * reader weigh it, which is what a trade buyer will do anyway.
 */
const ENVIRONMENT = [
  {
    metric: 'Land excavated',
    mined: { note: 'Thousands of acres of soil moved', value: 98, dp: 0, unit: 'square feet / carat' },
    grown: { note: 'No soil movement', value: 0.076, dp: 3, unit: 'square feet / carat' },
  },
  {
    metric: 'Carbon emissions',
    mined: { note: 'High air pollution', value: 2011, dp: 0, unit: 'ounces / carat' },
    grown: { note: 'Negligible air pollution', value: 0.001, dp: 3, unit: 'ounces / carat' },
  },
  {
    metric: 'Water usage',
    mined: { note: 'Gallons of water used', value: 127, dp: 0, unit: 'gallons / carat' },
    grown: { note: 'Lower by a factor of seven', value: 18, dp: 0, unit: 'gallons / carat' },
  },
  {
    metric: 'Lost time injury rate',
    mined: { note: 'High-risk work environment', value: 8, dp: 0, unit: 'days / 1,000 employees / year' },
    grown: { note: 'High employee safety standards', value: 0, dp: 0, unit: 'days / 100 employees / year' },
  },
];

const NATURAL_TYPES = [
  {
    n: '1',
    title: 'Type Ia',
    body: 'Contains nitrogen, with the atoms grouped in clusters. This is by far the most plentiful kind of natural diamond, and its colour runs from near-colourless to light yellow.',
  },
  {
    n: '2',
    title: 'Type IIb',
    body: 'Carries no measurable nitrogen, and boron instead. Mostly colourless, though it can show light shades of brown or blue. The Hope Diamond is a Type IIb stone.',
  },
];

const GROWTH_METHODS = [
  {
    title: 'High-Pressure High-Temperature (HPHT)',
    body: 'Grows diamond in a press that recreates the pressure and temperature under which natural crystals form. The technique dates to 1955 and was industrial long before it was gemmological. HPHT crystals grow in a cubo-octahedral form, and often start brown or grey before an annealing step brings them to colourless.',
  },
  {
    title: 'Chemical Vapour Deposition (CVD)',
    body: 'Starts with a thin diamond seed in a chamber. A carbon-bearing gas is introduced and energised into a plasma; free carbon settles onto the seed and the crystal extends layer by layer. CVD crystals grow in a tabular form, which is one of the features a grading laboratory reads to identify them.',
  },
];

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
  return (
    <div className={styles.tableWrap}>
      {/* The rule draws before anything under it arrives — the same opening
          gesture the page hero uses on its own underline, so a table announces
          itself the way the rest of the site does. */}
      <span className={styles.rule} aria-hidden="true" />
      <table className={styles.table}>
        <caption className={styles.caption}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{headLabel}</th>
            <th scope="col">Earth mined</th>
            <th scope="col">Lab grown</th>
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
  return (
    <section className={styles.root} aria-labelledby="comparison">
      <Reveal as="header" className={styles.head}>
        <p className="u-eyebrow">Side by side</p>
        <SplitHeading as="h2" className={styles.title} id="comparison" text="Diamond properties" />
        <p className={styles.lede}>
          Every optical and physical constant below is identical, because both
          materials are the same one. What differs is where the crystal formed,
          what the industry around it looks like, and what a laboratory can read
          in its growth structure.
        </p>
      </Reveal>

      <Reveal>
        <Table caption="Measured physical and optical properties" headLabel="Property" rows={PROPERTIES} />
      </Reveal>

      <Reveal>
        <Table caption="Questions a buyer is commonly asked" headLabel="Basic facts" rows={BASIC_FACTS} />
      </Reveal>

      <Reveal>
        <Table caption="Supply and trade conditions" headLabel="Advantages for industry" rows={INDUSTRY} />
      </Reveal>

      <Reveal>
        <Table caption="Provenance and labour" headLabel="Conflict diamond" rows={CONFLICT} />
      </Reveal>

      <Reveal as="p" className={styles.note}>
        The property table states measured constants. The supply, provenance and
        environmental tables describe industry conditions rather than the stones
        themselves, and reflect New Grown Diamond&rsquo;s own position on them.
      </Reveal>

      <Reveal as="div" className={styles.envHead}>
        <SplitHeading as="h3" className={styles.subTitle} text="Environmental impact" />
      </Reveal>

      <ul className={styles.env}>
        {ENVIRONMENT.map((row, i) => (
          <Reveal as="li" key={row.metric} className={styles.envRow} delay={i * 70}>
            <h4>{row.metric}</h4>
            <div className={styles.envPair}>
              {[['Earth mined', row.mined], ['Lab grown', row.grown]].map(([who, side]) => (
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
        Figures from <em>Environmental Impact Analysis: Cultured vs Mined
        Diamonds</em> (Frost &amp; Sullivan, 2014), a study commissioned by the
        laboratory-grown diamond sector. Independent estimates vary, and energy
        use per carat depends heavily on the electricity supplying the reactor.
      </Reveal>

      <Reveal as="div" className={styles.split}>
        <div>
          <SplitHeading as="h3" className={styles.subTitle} text="The natural diamond" />
          <p className={styles.body}>
            Natural diamonds formed over a billion years ago in the Earth&rsquo;s
            mantle. They are divided into types by their impurities, and when a
            stone is graded for clarity only those impurities visible to a
            trained eye at 10× magnification are taken into account.
          </p>
          <ol className={styles.types}>
            {NATURAL_TYPES.map((t) => (
              <TiltCard key={t.title} badge={t.n} title={t.title}>{t.body}</TiltCard>
            ))}
          </ol>
        </div>

        <div>
          <SplitHeading as="h3" className={styles.subTitle} text="Laboratory-grown diamonds" />
          <p className={styles.body}>
            Laboratory-grown diamonds share the physical, chemical and optical
            properties of natural ones. Colourless material is generally Type II;
            yellow material is generally Type Ib. They are not imitations and not
            simulants — they are diamond.
          </p>
          <ol className={styles.types}>
            {GROWTH_METHODS.map((m, i) => (
              <TiltCard key={m.title} badge={i + 1} title={m.title}>{m.body}</TiltCard>
            ))}
          </ol>
        </div>
      </Reveal>
    </section>
  );
}
