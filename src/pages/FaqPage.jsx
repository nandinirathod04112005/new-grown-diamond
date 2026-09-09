import PageHero from '@/components/layout/PageHero.jsx';
import { FAQS } from './siteContent.js';
import schematic from '@/assets/process/cvd-technical-schematic.webp';
import styles from './UtilityPages.module.css';

export default function FaqPage() {
  return (
    <main className={styles.page}>
      <PageHero
        eyebrow="Education / FAQ"
        title="Questions, answered clearly."
        intro="Technical and purchasing essentials for laboratory-grown diamonds."
        motif="waves"
        accent="#7aa9d6"
        backdrop={schematic}
      />
      <div className={styles.accordion}>
        {FAQS.map(([question, answer], index) => (
          <details key={question} className={styles.item}>
            <summary><span>{String(index + 1).padStart(2, '0')}</span>{question}<i>+</i></summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
