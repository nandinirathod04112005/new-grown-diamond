import { useRef, useState } from 'react';

import SplitReveal from '@/components/motion/SplitReveal.jsx';
import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import stoneUrl from '@/assets/diamonds/ngd-brilliant-macro.webp';
import styles from './Precision.module.css';

/**
 * Chapter 02 — the four Cs, as an instrument rather than four KPI cards.
 *
 * A single photograph of the stone sits under a moving light. Selecting a
 * property re-aims that light and swaps the prose; the numbers live in the
 * margin as specification, not as headline statistics. The point is that the
 * four Cs are properties OF ONE OBJECT, which a row of cards actively hides.
 */
const FACETS = [
  {
    k: 'Cut',
    v: 'Excellent',
    angle: '34.5° crown · 40.75° pavilion',
    t: 'Cut is the only one of the four we control. Angles decide whether light entering the table comes back through it or leaks out of the pavilion. A carat of poorly cut rough is worth less than three quarters of a well-cut one.',
    light: { x: 30, y: 22 },
  },
  {
    k: 'Colour',
    v: 'D–F',
    angle: 'Colourless range',
    t: 'Graded by absence. D is the top of the scale and means no detectable body colour at all; by J most people still see nothing without a reference stone beside it. We stock the colourless range because the difference is visible where it matters — against white metal.',
    light: { x: 70, y: 30 },
  },
  {
    k: 'Clarity',
    v: 'VVS1–VS2',
    angle: '10× magnification',
    t: 'Inclusions are the growth record — where the lattice hesitated. VVS means a trained grader needs ten-power magnification and time to find anything. Nothing we sell has an inclusion visible to the naked eye.',
    light: { x: 46, y: 62 },
  },
  {
    k: 'Carat',
    v: '0.30 – 5.00',
    angle: 'Current inventory',
    t: 'Weight, not size — 0.2 grams to the carat. Two stones of identical weight can look markedly different across the finger, which is why cut is quoted beside carat on every listing we publish.',
    light: { x: 58, y: 44 },
  },
];

export default function Precision() {
  const scope = useRef(null);
  const [active, setActive] = useState(0);
  const facet = FACETS[active];

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        // The light re-aims rather than cutting — it reads as one lamp being
        // moved around a fixed stone.
        gsap.to(`.${styles.light}`, {
          '--lx': `${facet.light.x}%`,
          '--ly': `${facet.light.y}%`,
          duration: 1.1,
          ease: 'power3.inOut',
        });
        gsap.fromTo(`.${styles.copy}`,
          { opacity: 0, y: 14 },
          { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' });
      });
      return () => mm.revert();
    },
    { scope, dependencies: [active] }
  );

  return (
    <section ref={scope} id="precision" className={styles.precision} aria-labelledby="precision-title">
      <div className={`ngd-page ngd-grid ${styles.inner}`}>
        <p className={`ngd-tech ${styles.chapter}`}>Chapter 02 — Precision</p>

        <SplitReveal as="h2" id="precision-title" className={styles.title}>
          Four properties. One stone.
        </SplitReveal>

        <div className={styles.stage}>
          <div
            className={styles.light}
            style={{ '--lx': `${facet.light.x}%`, '--ly': `${facet.light.y}%` }}
          >
            <img
              src={stoneUrl}
              alt="A New Grown Diamond round brilliant under directed light"
              width={754}
              height={541}
              loading="lazy"
              decoding="async"
            />
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.tabs} role="tablist" aria-label="The four Cs" aria-orientation="vertical">
            {FACETS.map((f, i) => (
              <button
                key={f.k}
                type="button"
                role="tab"
                id={`c-${f.k}`}
                aria-selected={i === active}
                aria-controls={`cp-${f.k}`}
                className={`${styles.tab} ${i === active ? styles.tabOn : ''}`}
                onClick={() => setActive(i)}
              >
                <span className={styles.tabK}>{f.k}</span>
                <span className={styles.tabV}>{f.v}</span>
              </button>
            ))}
          </div>

          <div
            className={styles.copy}
            role="tabpanel"
            id={`cp-${facet.k}`}
            aria-labelledby={`c-${facet.k}`}
          >
            <p className={styles.spec}>{facet.angle}</p>
            <p className={styles.prose}>{facet.t}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
