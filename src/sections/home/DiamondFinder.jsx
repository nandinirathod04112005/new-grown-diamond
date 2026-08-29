import { Link } from 'react-router-dom';

import Section from '@/components/layout/Section.jsx';
import SectionHeading from '@/components/layout/SectionHeading.jsx';
import Button from '@/components/primitives/Button.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import ShapeGlyph from '@/components/product/ShapeGlyph.jsx';
import { SHAPE_NAMES } from '@/lib/shapes.js';
import styles from './DiamondFinder.module.css';

const STEPS = [
  { n: '01', title: 'Shape', copy: 'Start with the outline you are drawn to. Everything else follows from it.' },
  { n: '02', title: 'Weight & budget', copy: 'Set a carat range and a ceiling. We show only what genuinely fits.' },
  { n: '03', title: 'Colour & clarity', copy: 'We explain what actually shows to the eye, and what only shows on paper.' },
  { n: '04', title: 'Your shortlist', copy: 'A handful of stones, matched and ready to compare side by side.' },
];

export default function DiamondFinder() {
  return (
    <Section id="diamond-finder" tone="raised" aria-labelledby="finder-title">
      <SectionHeading
        id="finder-title"
        eyebrow="Guided selection"
        lines={['Four questions.', { text: 'Your diamond.', node: <em>Your diamond.</em> }]}
        standfirst="Most people arrive knowing roughly what they want and unsure how to ask for it. The finder turns that into a shortlist in about a minute."
      />

      <Reveal className={styles.shapes} selector={`.${styles.shape}`} stagger={0.05} y={24}>
        {SHAPE_NAMES.map((shape) => (
          <Link
            key={shape}
            to={`/diamonds?shape=${shape.toLowerCase()}`}
            className={styles.shape}
          >
            <ShapeGlyph shape={shape} className={styles.shapeGlyph} />
            <span>{shape}</span>
          </Link>
        ))}
      </Reveal>

      <Reveal className={styles.steps} selector={`.${styles.step}`} stagger={0.1} y={30}>
        {STEPS.map((step) => (
          <div key={step.n} className={styles.step}>
            <span className={styles.stepNo}>{step.n}</span>
            <h3 className={styles.stepTitle}>{step.title}</h3>
            <p className={styles.stepCopy}>{step.copy}</p>
          </div>
        ))}
      </Reveal>

      <Reveal className={styles.cta} delay={0.15}>
        <Button to="/diamond-finder" variant="solid" size="lg" magnetic>
          Start the diamond finder
        </Button>
      </Reveal>
    </Section>
  );
}
