import { useMemo } from 'react';
import PageHero from '@/components/layout/PageHero.jsx';
import { useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import { localizeFaqs } from './siteContent.i18n.js';
import COPY from './FaqPage.copy.js';
import schematic from '@/assets/process/cvd-technical-schematic.webp';
import styles from './UtilityPages.module.css';

export default function FaqPage() {
  const { locale } = useLocale();
  const c = useCopy(COPY);
  const faqs = useMemo(() => localizeFaqs(locale), [locale]);

  return (
    <main className={styles.page}>
      <PageHero
        eyebrow={c.hero.eyebrow}
        title={c.hero.title}
        intro={c.hero.intro}
        motif="waves"
        accent="#7aa9d6"
        backdrop={schematic}
      />
      <div className={styles.accordion}>
        {faqs.map(([question, answer], index) => (
          <details key={question} className={styles.item}>
            <summary><span>{String(index + 1).padStart(2, '0')}</span>{question}<i>+</i></summary>
            <p>{answer}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
