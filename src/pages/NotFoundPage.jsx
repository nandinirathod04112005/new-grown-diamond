import PageHero from '@/components/layout/PageHero.jsx';
import macro from '@/assets/diamonds/ngd-brilliant-macro.webp';
import styles from './UtilityPages.module.css';

export default function NotFoundPage() {
  return (
    <main className={styles.page}>
      <PageHero
        eyebrow="404 / Outside the collection"
        title="This page is not in the cut."
        intro="The address may have changed, or the page may no longer exist. Return to the collection to continue browsing verified inventory and educational material."
        motif="facets"
        accent="#8aa2c8"
        backdrop={macro}
        action={{ href: '/', label: 'Return home' }}
      />
    </main>
  );
}
