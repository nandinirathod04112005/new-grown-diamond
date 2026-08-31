import { useRef } from 'react';
import { Link } from 'react-router-dom';

import SplitReveal from '@/components/motion/SplitReveal.jsx';
import styles from './Manufacture.module.css';

/**
 * Chapter 04 — reactor to polished stone.
 *
 * A horizontal traverse. Each stage is a tall plate with its number set large
 * in the background, so the sequence reads as a contact sheet rather than a
 * row of cards. It is a native horizontal
 * scroller with snap points — still a traverse, still one gesture, but the
 * user keeps control of it.
 */
const STAGES = [
  { n: '01', t: 'Reactor', c: 'Nine weeks. Plasma, a seed plate, and a chamber nobody opens.' },
  { n: '02', t: 'Rough', c: 'The crystal comes out clouded and angular. Nothing suggests yet what it will become.' },
  { n: '03', t: 'Mapping', c: 'Scanned in three dimensions. Every inclusion is plotted before a single facet is cut.' },
  { n: '04', t: 'Cleaving', c: 'The first cut decides the yield. It is the one decision that cannot be revisited.' },
  { n: '05', t: 'Bruting', c: 'Two stones turned against each other until the girdle is round to the micron.' },
  { n: '06', t: 'Polish', c: 'Fifty-seven facets, each indexed and set down on a wheel charged with diamond dust.' },
  { n: '07', t: 'Grading', c: 'Sent to IGI or GIA. The grade comes back independent of anything we might claim.' },
];

export default function Manufacture() {
  const scope = useRef(null);
  const track = useRef(null);

  /*
   * No ScrollTrigger here any more, deliberately.
   *
   * This section used to pin itself and drive the rail horizontally on scroll.
   * That was a second controller: it fought the journey's sticky stage for the
   * same scroll, and a pin inside a sticky container is a spacer inserted
   * underneath one — the two disagree the moment anything is resized.
   *
   * The traverse is now a native horizontal scroller at every width. It is
   * focusable and labelled, so arrow keys drive it, and it costs nothing.
   */

  return (
    <section ref={scope} id="manufacture" className={styles.manufacture} aria-labelledby="mfg-title">
      <div className={styles.head}>
        <div className="ngd-page">
          <p className="ngd-tech">Chapter 04 — Manufacture</p>
          <SplitReveal as="h2" id="mfg-title" className={styles.title}>
            Seven stages, one roof.
          </SplitReveal>
        </div>
      </div>

      {/*
        A scrollable region with no focusable content cannot be reached by
        keyboard at all (WCAG 2.1.1). Making the scroller itself focusable and
        naming it lets arrow keys drive the traverse on touch and small
        screens, where this is a native scroller rather than a GSAP pin.
      */}
      <div
        className={styles.viewport}
        tabIndex={0}
        role="region"
        aria-label="Manufacturing stages, scrollable"
      >
        <ol ref={track} className={styles.track}>
          {STAGES.map((s) => (
            <li key={s.n} className={styles.stage}>
              <span className={styles.ghost} aria-hidden="true">{s.n}</span>
              <div className={styles.stageBody}>
                <p className={styles.stageNo}>{s.n}</p>
                <h3 className={styles.stageTitle}>{s.t}</h3>
                <p className={styles.stageCopy}>{s.c}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className={`ngd-page ${styles.foot}`}>
        <Link to="/manufacturing" className={styles.more}>Inside the facility →</Link>
      </div>
    </section>
  );
}
