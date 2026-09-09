import PageHero from '@/components/layout/PageHero.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import styles from './EditorialPage.module.css';
/**
 * Editorial template.
 *
 * `children` is an optional full-bleed slot between the hero and the numbered
 * sections, used by Our Story for its scroll film. `after` is the same slot on
 * the far side of them, for anything that only makes sense once the page has
 * been read — Education puts its contents list there, because "read next" above
 * the thing you have not read yet is an instruction out of order.
 *
 * A page may carry no sections at all — Shapes states its content beside its
 * turning wheel instead — so the list and its rules are skipped entirely
 * rather than rendering an empty bordered block.
 */
export default function EditorialPage({ page, children, after, motif, accent, backdrop }) {
  return (
    <main className={styles.page}>
      <PageHero
        eyebrow={page.eyebrow}
        title={page.title}
        intro={page.intro}
        motif={motif}
        accent={accent}
        backdrop={backdrop}
      />

      {children}

      {page.sections.length > 0 && (
        <div className={styles.sections}>
          {page.sections.map(([title, copy], index) => (
            <Reveal as="section" key={title} className={styles.section} delay={index * 90}>
              <p className={styles.number}>{String(index + 1).padStart(2, '0')}</p>
              <h2>{title}</h2>
              <p>{copy}</p>
              <span className={styles.mark} aria-hidden="true" />
            </Reveal>
          ))}
        </div>
      )}

      {after}

      <a className={styles.cta} href="/contact"><span>Discuss your requirement</span><strong>→</strong></a>
    </main>
  );
}
