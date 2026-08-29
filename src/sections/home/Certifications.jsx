import { ShieldCheck, FileCheck2, Gem, Recycle } from 'lucide-react';

import Section from '@/components/layout/Section.jsx';
import SectionHeading from '@/components/layout/SectionHeading.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import styles from './Certifications.module.css';

const PILLARS = [
  {
    Icon: FileCheck2,
    title: 'Independently graded',
    copy: 'Every stone above 0.30 ct carries an IGI or GIA report. The grade is theirs, not ours, and the report number is printed on the listing.',
  },
  {
    Icon: Gem,
    title: 'Laser-inscribed',
    copy: 'The report number is inscribed on the girdle. Your stone can be matched to its certificate under a loupe, at any point, by anyone.',
  },
  {
    Icon: ShieldCheck,
    title: 'Origin stated',
    copy: 'CVD or HPHT, named on every certificate and every product page. A lab-grown diamond has nothing to hide behind.',
  },
  {
    Icon: Recycle,
    title: 'Traceable by design',
    copy: 'Grown, cut and polished in one facility. We can tell you which reactor a stone came from and the week it was cut.',
  },
];

export default function Certifications() {
  return (
    <Section id="certification" tone="raised" aria-labelledby="cert-title">
      <SectionHeading
        id="cert-title"
        eyebrow="Certification & trust"
        lines={['Verified by', { text: 'someone else.', node: <em>someone else.</em> }]}
        standfirst="Trust in this trade is built on paperwork that a third party signs. Here is exactly what comes with your stone."
        align="center"
      />

      <Reveal className={styles.grid} selector={`.${styles.pillar}`} stagger={0.1} y={30}>
        {PILLARS.map(({ Icon, title, copy }) => (
          <div key={title} className={styles.pillar}>
            <span className={styles.icon} aria-hidden="true">
              <Icon size={20} strokeWidth={1.3} />
            </span>
            <h3 className={styles.title}>{title}</h3>
            <p className={styles.copy}>{copy}</p>
          </div>
        ))}
      </Reveal>

      <Reveal className={styles.labs} delay={0.2}>
        <p className={styles.labsLabel}>Graded by</p>
        <ul className={styles.labsList}>
          <li>IGI</li>
          <li>GIA</li>
          <li>SGL</li>
        </ul>
      </Reveal>
    </Section>
  );
}
