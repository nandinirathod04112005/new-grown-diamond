import { useRef } from 'react';

import Section from '@/components/layout/Section.jsx';
import SectionHeading from '@/components/layout/SectionHeading.jsx';
import Button from '@/components/primitives/Button.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import styles from './ManufacturingStory.module.css';

const STAGES = [
  { n: '01', title: 'Seed', copy: 'A sliver of diamond, half a millimetre across. Everything that follows is grown from this.' },
  { n: '02', title: 'Growth', copy: 'Weeks in the reactor. Carbon arrives atom by atom and finds its place in the lattice.' },
  { n: '03', title: 'Rough', copy: 'The crystal comes out clouded and angular. Nothing about it yet suggests what it will become.' },
  { n: '04', title: 'Planning', copy: 'Scanned, mapped, modelled. The cut is decided before a single facet is touched.' },
  { n: '05', title: 'Cutting', copy: 'Fifty-seven facets, each placed to a tolerance finer than a human hair.' },
  { n: '06', title: 'Certification', copy: 'Sent to IGI or GIA. The grade comes back independent of anything we might claim.' },
];

/**
 * Horizontal scroll-scrub of the six production stages on desktop; a plain
 * vertical list on smaller screens, where a pinned horizontal rail fights the
 * user's scroll rather than rewarding it.
 */
export default function ManufacturingStory() {
  const scope = useRef(null);
  const track = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MQ.desktop, () => {
        const el = track.current;
        if (!el) return;
        const distance = el.scrollWidth - el.clientWidth;
        if (distance <= 0) return;

        gsap.to(el, {
          x: -distance,
          ease: 'none',
          scrollTrigger: {
            trigger: scope.current,
            start: 'top top',
            end: () => `+=${distance + window.innerHeight * 0.6}`,
            pin: true,
            scrub: 0.85,
            anticipatePin: 1,
            invalidateOnRefresh: true,
          },
        });
      });

      return () => mm.revert();
    },
    { scope }
  );

  return (
    <div ref={scope} className={styles.outer}>
      <Section id="manufacturing" tone="raised" aria-labelledby="mfg-title">
        <SectionHeading
          id="mfg-title"
          eyebrow="From our facility"
          lines={['Six stages,', { text: 'one stone.', node: <em>one stone.</em> }]}
          standfirst="We grow, cut and polish under one roof in Surat. Nothing leaves the building unfinished, and nothing arrives already made."
        />

        <div className={styles.viewport}>
          <ol ref={track} className={styles.track}>
            {STAGES.map((stage) => (
              <li key={stage.n} className={styles.stage}>
                <span className={styles.stageNo}>{stage.n}</span>
                <h3 className={styles.stageTitle}>{stage.title}</h3>
                <p className={styles.stageCopy}>{stage.copy}</p>
              </li>
            ))}
          </ol>
        </div>

        <Reveal className={styles.cta} delay={0.1}>
          <Button to="/manufacturing" variant="ghost">Inside the facility</Button>
        </Reveal>
      </Section>
    </div>
  );
}
