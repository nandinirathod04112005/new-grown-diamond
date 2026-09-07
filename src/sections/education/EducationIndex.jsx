import Reveal from '@/components/motion/Reveal.jsx';
import styles from './EducationIndex.module.css';

/**
 * What Education actually contains.
 *
 * The four topics here already existed as pages — FAQ, the shape guide, the
 * case for lab-grown — but only ever as a flat nav link or a line in the
 * footer, so arriving at Education told a visitor nothing about what else was
 * written. The old site solved this with a dropdown off the Education menu;
 * the same four are gathered here instead, where they can carry a sentence
 * each rather than a bare label.
 *
 * The topics are listed, not discovered, because unlike stock or partner logos
 * these are authored pages: a route that exists is a page someone wrote, and
 * there is no drift for a glob to protect against.
 */
const TOPICS = [
  {
    href: '/cvd-vs-natural',
    label: 'Comparison between CVD & natural diamond',
    blurb: 'The same crystal from two origins — what is identical, what differs, and who can actually tell.',
  },
  {
    href: '/why-lab-grown',
    label: 'Why choose a lab-grown diamond?',
    blurb: 'Quality you can inspect and an origin you can explain, set against what it costs.',
  },
  {
    href: '/shapes',
    label: 'Shapes',
    blurb: 'How an outline changes the face-up size, the light return and the setting.',
  },
  {
    href: '/faq',
    label: 'FAQ',
    blurb: 'Short answers on growth, certification, durability and verifying origin.',
  },
];

export default function EducationIndex() {
  return (
    <section className={styles.index} aria-labelledby="education-index">
      <h2 className={styles.title} id="education-index">Read next</h2>

      <ul className={styles.list}>
        {TOPICS.map((topic, i) => (
          <Reveal as="li" key={topic.href} className={styles.item} delay={i * 80}>
            <a href={topic.href}>
              <span className={styles.label}>{topic.label}</span>
              <span className={styles.blurb}>{topic.blurb}</span>
              <span className={styles.go} aria-hidden="true">→</span>
            </a>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
