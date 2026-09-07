import Reveal from '@/components/motion/Reveal.jsx';
import { EDUCATION_TOPICS } from '@/pages/siteContent.js';
import styles from './EducationIndex.module.css';

/**
 * What Education actually contains.
 *
 * The header dropdown names these four in passing; this is where they are
 * actually described. A nav item has room for a label and nothing else, so the
 * same list is set out here with a sentence each — the difference between
 * knowing a page exists and knowing whether it answers your question.
 *
 * The list lives in siteContent because both places render it, and a nav that
 * has drifted from the page it describes is worse than either alone.
 */
export default function EducationIndex() {
  return (
    <section className={styles.index} aria-labelledby="education-index">
      <h2 className={styles.title} id="education-index">Read next</h2>

      <ul className={styles.list}>
        {EDUCATION_TOPICS.map((topic, i) => (
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
