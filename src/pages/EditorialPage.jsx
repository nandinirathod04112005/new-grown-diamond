import PageHero from '@/components/layout/PageHero.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import { useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import { usePageIntro } from '@/hooks/useSiteSettings.js';
import { localizePage } from './siteContent.i18n.js';
import COPY from './EditorialPage.copy.js';
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
 *
 * `page` arrives in English; `path` says which page it is, so its words can be
 * found in the visitor's language. Fields without a translation stay English.
 *
 * The eyebrow, title and intro can then be overridden per language from the
 * Control Centre (Website Content → Page introductions). usePageIntro reads
 * the saved override from the browser's copy on the first render and holds it
 * for the life of the route, so the hero never changes under the reader.
 */
export default function EditorialPage({ path, page: source, children, after, motif, accent, backdrop, backdropFocus, backdropMobileFocus, hero }) {
  const { locale } = useLocale();
  const c = useCopy(COPY);
  const page = usePageIntro(path, localizePage(path, source, locale), locale);

  return (
    <main className={styles.page}>
      {hero || <PageHero
        eyebrow={page.eyebrow}
        title={page.title}
        intro={page.intro}
        motif={motif}
        accent={accent}
        backdrop={backdrop}
        backdropFocus={backdropFocus}
        backdropMobileFocus={backdropMobileFocus}
      />}

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

      <a className={styles.cta} href="/contact"><span>{c.cta}</span><strong>→</strong></a>
    </main>
  );
}
