import { useRef, useState } from 'react';

import Section from '@/components/layout/Section.jsx';
import SectionHeading from '@/components/layout/SectionHeading.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import styles from './GrowthMethods.module.css';

const METHODS = [
  {
    id: 'cvd',
    name: 'CVD',
    full: 'Chemical Vapour Deposition',
    lede: 'A diamond seed in a vacuum chamber, fed carbon-rich plasma at around 800 °C. Carbon settles layer upon layer, one atomic plane at a time.',
    points: [
      ['Growth time', '3–4 weeks for a 3 ct rough'],
      ['Best for', 'Large, clean, near-colourless stones'],
      ['Typical colour', 'D–G after treatment'],
      ['Crystal habit', 'Cubic, grown in flat plates'],
    ],
  },
  {
    id: 'hpht',
    name: 'HPHT',
    full: 'High Pressure, High Temperature',
    lede: 'The earth’s own recipe, run faster. Carbon under roughly 60,000 atmospheres at 1,500 °C, crystallising around a seed exactly as it does at depth.',
    points: [
      ['Growth time', '5–12 days for a 3 ct rough'],
      ['Best for', 'Exceptional colour and brilliance'],
      ['Typical colour', 'D–F without treatment'],
      ['Crystal habit', 'Cubo-octahedral, grown as a block'],
    ],
  },
];

/**
 * The two growth routes, as a tab pair. Tabs are real buttons in a tablist so
 * arrow-key navigation and screen-reader semantics come for free.
 */
export default function GrowthMethods() {
  const [active, setActive] = useState('cvd');
  const scope = useRef(null);
  const method = METHODS.find((m) => m.id === active);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.from(`.${styles.panel} > *`, {
          opacity: 0,
          y: 18,
          duration: 0.7,
          stagger: 0.06,
          ease: 'power3.out',
        });
      });
      return () => mm.revert();
    },
    { scope, dependencies: [active] }
  );

  return (
    <Section id="expertise" tone="hairline" aria-labelledby="expertise-title">
      <SectionHeading
        id="expertise-title"
        eyebrow="Our expertise"
        lines={['Two ways to grow', { text: 'the same thing.', node: <em>the same thing.</em> }]}
        standfirst="Both produce real diamond — identical in chemistry, hardness and refraction to a mined stone. They differ in how the carbon is persuaded to crystallise, and that changes what each is best at."
      />

      <div ref={scope} className={styles.wrap}>
        <div className={styles.tabs} role="tablist" aria-label="Growth methods">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="tab"
              id={`tab-${m.id}`}
              aria-selected={active === m.id}
              aria-controls={`panel-${m.id}`}
              className={`${styles.tab} ${active === m.id ? styles.tabActive : ''}`}
              onClick={() => setActive(m.id)}
            >
              <span className={styles.tabName}>{m.name}</span>
              <span className={styles.tabFull}>{m.full}</span>
            </button>
          ))}
        </div>

        <div
          className={styles.panel}
          role="tabpanel"
          id={`panel-${method.id}`}
          aria-labelledby={`tab-${method.id}`}
        >
          <p className={styles.lede}>{method.lede}</p>
          <dl className={styles.specs}>
            {method.points.map(([term, value]) => (
              <div key={term} className={styles.spec}>
                <dt>{term}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <Reveal className={styles.note} delay={0.1}>
        <p>
          Every stone we sell states its growth method on the certificate. We
          have never believed that detail should be buried.
        </p>
      </Reveal>
    </Section>
  );
}
