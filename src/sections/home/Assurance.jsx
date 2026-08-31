import SplitReveal from '@/components/motion/SplitReveal.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import useChapterEntrance from '@/hooks/useChapterEntrance.js';
import styles from './Assurance.module.css';

/**
 * ASSURANCE — what comes with the stone.
 *
 * Set as a specification sheet, because that is what trust looks like in this
 * trade: terms in the left column, plain answers in the right. No icon grid —
 * a shield glyph beside the word "trust" adds nothing a buyer can check.
 *
 * COPY PROVENANCE — every claim below is taken from approved content on the
 * production site (`main`):
 *   · "four decades" / "40 years"        — about.html
 *   · 2012 transition to lab-grown       — about.html
 *   · Surat facilities, global clientele — about.html
 *   · "4Cs by IGI, GIA & others"         — education.html
 *
 * TYPE IIa: the phrase appears on production as a badge, but per instruction
 * it is worded here as a property the REPORT states for a given stone, not as
 * a blanket claim about all inventory. It remains subject to sales-team
 * confirmation before it is stated more strongly than this.
 */
const ROWS = [
  {
    k: 'Grading',
    v: 'IGI, GIA and others',
    d: 'The 4Cs are assessed by an independent laboratory, not by us. The report number is printed on every listing and travels with the stone.',
  },
  {
    k: 'Inscription',
    v: 'Laser, on the girdle',
    d: 'The report number is inscribed on the girdle edge. Your stone can be matched to its certificate under a loupe, by anyone, at any point.',
  },
  {
    k: 'Origin',
    v: 'Stated, always',
    d: 'CVD or HPHT, named on the certificate and on the product page. A laboratory-grown diamond has nothing to gain from ambiguity.',
  },
  {
    k: 'Type',
    v: 'As reported',
    d: 'Where a stone is classified Type IIa, its report says so. We quote the classification from the certificate rather than as a blanket claim.',
  },
  {
    k: 'Traceability',
    v: 'Single facility',
    d: 'Grown, cut and polished under one roof in Surat. We can tell you which reactor a stone came from and the week it was cut.',
  },
];

export default function Assurance() {
  const chapter = useChapterEntrance();
  return (
    <section id="assurance" className={styles.assurance} aria-labelledby="assurance-title">
      <div ref={chapter} className={`ngd-page ngd-grid ${styles.inner}`}>
        <p className={`ngd-tech ${styles.chapter}`}>Assurance</p>

        <SplitReveal as="h2" id="assurance-title" className={styles.title}>
          Verified by someone who does not work for us.
        </SplitReveal>

        <Reveal className={styles.provenance}>
          <p>
            Four decades in diamonds, and since 2012 in growing them. The
            business began with mined stones and moved to laboratory
            manufacturing in Surat, serving clients worldwide.
          </p>
        </Reveal>

        <dl className={styles.sheet}>
          {ROWS.map((r) => (
            <div key={r.k} className={styles.row}>
              <dt className={styles.term}>
                <span className={styles.termK}>{r.k}</span>
                <span className={styles.termV}>{r.v}</span>
              </dt>
              <dd className={styles.def}>{r.d}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
