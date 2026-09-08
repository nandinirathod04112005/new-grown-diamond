import PageHero from '@/components/layout/PageHero.jsx';
import { FAQS } from './siteContent.js';
import hphtRough from '@/assets/process/hpht-rough.jpg';
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
        image={hphtRough}
        imageAlt="Rough laboratory-grown diamond crystals beside a two-millimetre scale bar."
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
