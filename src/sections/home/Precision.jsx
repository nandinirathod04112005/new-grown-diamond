import ChapterPanel, { ChapterData, ChapterMark } from '@/components/scene/ChapterPanel.jsx';
import SplitReveal from '@/components/motion/SplitReveal.jsx';
import MediaSlot from '@/components/media/MediaSlot.jsx';
import { CHAPTERS } from '@/lib/journey.js';
import styles from './Precision.module.css';

/**
 * Chapters 04–06 — ROUGH DIAMOND, PRECISION CUT, CERTIFIED BRILLIANCE.
 *
 * The handover happens across these three: generated geometry may depict the
 * rough crystal, and from the moment cutting begins the diamond on screen is
 * the real photograph on the director's stage. Nothing here renders a polished
 * stone, because nothing may.
 */
const MINE = [3, 4, 5];

const MEDIA = {
  3: {
    label: 'Rough diamond scanning',
    spec: 'Rough crystal on the scanner bed, inclusion map on the operator screen. 10–20s silent loop, ≥1920×1080, H.264 MP4 + WebM.',
  },
  4: {
    label: 'Laser cutting and polishing',
    spec: 'Laser sawing and the polishing wheel, macro, real sparks and slurry. 10–20s silent loop, ≥1920×1080, H.264 MP4 + WebM.',
  },
  5: {
    label: 'Polished loose diamond — macro / 360',
    spec: 'The graded stone in tweezers on black, macro. Ideally a genuine 24–60 frame 360° sequence at constant exposure, ≥2400px per frame.',
  },
};

export default function Precision() {
  return (
    <section id="precision" className={styles.precision} aria-labelledby="precision-title">
      <h2 id="precision-title" className="ngd-visually-hidden">
        From rough crystal to a certified, polished diamond
      </h2>

      {MINE.map((i) => {
        const c = CHAPTERS[i];
        const m = MEDIA[i];
        return (
          <ChapterPanel key={c.key} index={i}>
            <div className={`ngd-page ngd-grid ${styles.inner}`}>
              <div className={styles.copy}>
                <ChapterMark n={c.n} label={c.label} />
                <SplitReveal as="h3" className={styles.title}>{c.title}</SplitReveal>
                <p className={styles.blurb}>{c.blurb}</p>
                <ChapterData rows={c.data} />
              </div>
              <div className={styles.media}>
                <MediaSlot label={m.label} spec={m.spec} ratio="4 / 3" />
              </div>
            </div>
          </ChapterPanel>
        );
      })}
    </section>
  );
}
