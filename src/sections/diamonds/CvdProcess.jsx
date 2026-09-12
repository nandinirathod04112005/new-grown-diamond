import SplitHeading from '@/components/motion/SplitHeading.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './CvdProcess.copy.js';
import CvdFilm from './CvdFilm.jsx';
import styles from './CvdProcess.module.css';

/** A normal autoplay film: no pinning and no scroll-controlled playhead. */
export default function CvdProcess() {
  const c = useCopy(COPY);

  return (
    <section className={`${styles.root} ${styles.playMode}`} aria-labelledby="cvd-process">
      <Reveal as="header" className={styles.head}>
        <p className="u-eyebrow">{c.eyebrow}</p>
        <SplitHeading as="h2" className={styles.title} id="cvd-process" text={c.title} />
        <p className={styles.lede}>{c.lede}</p>
      </Reveal>

      <ol className="u-visually-hidden">
        {c.phases.map((phase) => <li key={phase}>{phase}</li>)}
      </ol>

      <Reveal className={styles.playStage}>
        <CvdFilm autoplay />
        <div className={styles.playCaption} aria-hidden="true">
          <span>{c.intro.eyebrow}</span>
          <strong>{c.intro.title[0]} {c.intro.title[1]}</strong>
          <small>Film · plays automatically</small>
        </div>
      </Reveal>

      <Reveal as="p" className={styles.note}>{c.note}</Reveal>
    </section>
  );
}
