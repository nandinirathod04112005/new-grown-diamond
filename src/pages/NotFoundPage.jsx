import PageHero from '@/components/layout/PageHero.jsx';
import macro from '@/assets/diamonds/ngd-brilliant-macro.webp';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './NotFoundPage.copy.js';
import styles from './UtilityPages.module.css';

export default function NotFoundPage() {
  const c = useCopy(COPY);
  return (
    <main className={styles.page}>
      <PageHero
        eyebrow={c.eyebrow}
        title={c.title}
        intro={c.intro}
        motif="facets"
        accent="#8aa2c8"
        backdrop={macro}
        action={{ href: '/', label: c.action }}
      />
    </main>
  );
}
