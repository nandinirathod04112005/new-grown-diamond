import diamond from '@/assets/diamonds/ngd-brilliant-macro.webp';
import ringAssembly from '@/assets/process/ring-assembly.webp';
import PageHero from '@/components/layout/PageHero.jsx';
import { useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import { ENQUIRY_DESK } from './siteContent.js';
import Reveal from '@/components/motion/Reveal.jsx';
import COPY from './JewelleryPage.copy.js';
import styles from './JewelleryPage.module.css';

export default function JewelleryPage() {
  const { t } = useLocale();
  const c = useCopy(COPY);

  return (
    <main className={styles.page}>
      <PageHero
        eyebrow={c.hero.eyebrow}
        title={c.hero.title}
        intro={c.hero.intro}
        accent="#c9a24a"
        motif="rings"
        backdrop={ringAssembly}
        backdropFocus="50% 42%"
        action={{ href: '/contact', label: c.hero.action }}
      />

      <section className={styles.process}>
        <p className="u-eyebrow">{c.process}</p>
        {c.steps.map((item, index) => (
          <Reveal as="article" key={item.no} delay={index * 90}>
            <span>{item.no}</span><h2>{item.title}</h2><p>{item.text}</p>
          </Reveal>
        ))}
      </section>

      <Reveal as="section" className={styles.close}>
        <img
          src={diamond}
          alt={c.close.alt}
          width="754"
          height="541"
          loading="lazy"
          decoding="async"
        />
        <div>
          <p className="u-eyebrow">{c.close.eyebrow}</p>
          <h2>{c.close.title}</h2>
          <p>{c.close.text}</p>
          <a href="/diamonds">{c.close.explore} →</a>
          <p className={styles.callLine}>
            <span>{t('common.talkItThrough')} —</span>{' '}
            <a href={`tel:${ENQUIRY_DESK.tel}`}>{ENQUIRY_DESK.phone}</a>
          </p>
        </div>
      </Reveal>
    </main>
  );
}
