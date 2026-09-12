import diamond from '@/assets/diamonds/ngd-brilliant-macro.webp';
import { SplitTextReveal } from '@/components/motion/MotionPrimitives.jsx';
import { useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import { localizePage } from '@/pages/siteContent.i18n.js';
import { usePageIntro } from '@/hooks/useSiteSettings.js';
import COPY from './StoryBanner.copy.js';
import styles from './StoryEditorial.module.css';

export default function StoryBanner({ page: source }) {
  const { locale } = useLocale();
  const c = useCopy(COPY);
  /* Handed PAGES['/about'] in English by App.jsx. */
  /* Website Content can override this page's eyebrow, title and intro. */
  const page = usePageIntro('/about', localizePage('/about', source, locale), locale);

  return <header className={styles.banner}>
    <div className={styles.bannerCopy}>
      <p className={styles.label}>{page.eyebrow}</p>
      <h1><SplitTextReveal>{page.title}</SplitTextReveal></h1>
      <p className={styles.intro}>{page.intro}</p>
      <a className={styles.link} href="#who-we-are">{c.explore} <span aria-hidden="true">↓</span></a>
    </div>
    <figure className={styles.bannerMedia}>
      <img src={diamond} alt={c.alt} fetchPriority="high" />
      <figcaption>New Grown Diamond <span>Surat, India</span></figcaption>
    </figure>
    <div className={styles.bannerFoot}><span>{c.foot}</span><span>{c.chapter}</span></div>
  </header>;
}
