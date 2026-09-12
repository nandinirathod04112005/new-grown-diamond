import { useRef } from 'react';

import CountUp from '@/components/motion/CountUp.jsx';
import { useReveal } from '@/hooks/useReveal.js';
import { useCopy } from '@/i18n/useCopy.js';
import ABOUT from '@/content/aboutCompany.js';
import { CaratScale, ColourScale, FacetStone, JourneyArt, MissionArt, ReachArt } from './AboutArt.jsx';
import COPY from './AboutCompany.copy.js';
import styles from './AboutCompany.module.css';

/** A heading whose emphasised phrase sits wherever the language puts it. */
function Title({ id, text }) {
  return <h2 id={id} className={styles.title}>{text.before}<em>{text.em}</em>{text.after}</h2>;
}

/**
 * Our Story, in the company's own words: who we are, the range, where we
 * work from, and the mission — each beside an illustration drawn for it.
 *
 * The text is the owner's (content/aboutCompany.js). The illustrations are
 * SVG and say so; none stands in for a photograph of the business.
 *
 * The lists below with `data-rv` items are keyed by position, not by their
 * text. The text changes with the language while this component stays
 * mounted; an item keyed by its words would be remounted on a switch, without
 * the `data-in` useReveal gave it on arrival — and stay hidden.
 */
export default function AboutCompany() {
  const root = useRef(null);
  useReveal(root, []);
  const about = useCopy(ABOUT);
  const c = useCopy(COPY);

  return (
    <div ref={root} className={styles.root} data-reveal="">
      {/* ---------------- who we are ---------------- */}
      <section className={styles.block} id="who-we-are" aria-labelledby="who-title">
        <div className={styles.copy} data-rv="">
          <p className={styles.eyebrow}><span />New Grown Diamonds</p>
          <Title id="who-title" text={c.who.title} />
          {about.whoWeAre.map((p) => <p key={p.slice(0, 24)} className={styles.body}>{p}</p>)}
          <ul className={styles.tags} aria-label={c.who.tags}>
            {about.qualities.map((q, i) => <li key={q} style={{ '--i': i }}>{q}</li>)}
          </ul>
        </div>
        <JourneyArt />
      </section>

      {/* The owner's own figures, set large. */}
      <dl className={styles.facts} data-rv="">
        <div style={{ '--i': 0 }}><dt>{c.facts.years}</dt><dd><CountUp value={40} />+</dd></div>
        <div style={{ '--i': 1 }}><dt>{c.facts.since}</dt><dd>2012</dd></div>
        <div style={{ '--i': 2 }}><dt>{c.facts.carats}</dt><dd>0.30<small>–</small>6.00</dd></div>
        <div style={{ '--i': 3 }}><dt>{c.facts.colours}</dt><dd>D<small>–</small>J</dd></div>
        <div style={{ '--i': 4 }}><dt>{c.facts.shapes}</dt><dd><CountUp value={about.shapes.length} /></dd></div>
      </dl>

      {/* ---------------- the range ---------------- */}
      <section className={`${styles.block} ${styles.range}`} id="the-range" aria-labelledby="range-title">
        <div className={styles.copy} data-rv="">
          <p className={styles.eyebrow}><span />{c.range.eyebrow}</p>
          <Title id="range-title" text={c.range.title} />
          <p className={styles.body}>{about.rangeText}</p>
        </div>
        <ul className={styles.shapes} aria-label={c.range.shapes}>
          {about.shapes.map((s, i) => (
            <li key={i} data-rv="" style={{ '--i': i }}>
              <span className={styles.shapePlate}>
                <FacetStone shape={s.facets} stretch={s.stretch} className={styles.shapeArt} />
                <span className={styles.shapeSheen} aria-hidden="true" />
              </span>
              <span className={styles.shapeName}>{s.name}</span>
            </li>
          ))}
        </ul>
        <div className={styles.scales}>
          <ColourScale />
          <CaratScale />
        </div>
      </section>

      {/* ---------------- from Surat ---------------- */}
      <section className={`${styles.block} ${styles.reach}`} id="from-surat" aria-labelledby="reach-title">
        <div className={styles.copy} data-rv="">
          <p className={styles.eyebrow}><span />{c.reach.eyebrow}</p>
          <Title id="reach-title" text={c.reach.title} />
          <p className={styles.body}>{c.reach.body}</p>
        </div>
        <ReachArt />
      </section>

      {/* ---------------- mission ---------------- */}
      <section className={`${styles.block} ${styles.mission}`} id="our-mission" aria-labelledby="mission-title">
        <MissionArt />
        <div className={styles.copy} data-rv="">
          <p className={styles.eyebrow}><span />{c.mission.eyebrow}</p>
          <Title id="mission-title" text={c.mission.title} />
          <p className={styles.lead}>{about.mission[0]}</p>
          <p className={styles.body}>{about.mission[1]}</p>
        </div>
        <ol className={styles.pillars}>
          {about.pillars.map((p, i) => (
            <li key={i} data-rv="" style={{ '--i': i }}>
              <span className={styles.pillarNo}>{String(i + 1).padStart(2, '0')}</span>
              <h3>{p.title}</h3>
              <p>“…{p.quote}…”</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
