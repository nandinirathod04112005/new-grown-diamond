import ChapterPanel, { ChapterData, ChapterMark } from '@/components/scene/ChapterPanel.jsx';
import SplitReveal from '@/components/motion/SplitReveal.jsx';
import MediaSlot from '@/components/media/MediaSlot.jsx';
import { CHAPTERS } from '@/lib/journey.js';
import styles from './Genesis.module.css';

/**
 * Chapters 01–03 — CARBON, PLASMA, CRYSTAL GROWTH.
 *
 * Text only. The visual is the director's shared stage behind it, so this
 * section owns no ScrollTrigger, no canvas and no image of its own — which is
 * exactly why the scene and the captions can no longer disagree about which
 * chapter is showing.
 */
const MINE = [0, 1, 2];

export default function Genesis() {
  return (
    <section id="genesis" className={styles.genesis} aria-labelledby="genesis-title">
      <h2 id="genesis-title" className="ngd-visually-hidden">
        Diamond genesis: carbon, plasma and crystal growth
      </h2>

      {MINE.map((i) => {
        const c = CHAPTERS[i];
        return (
          <ChapterPanel key={c.key} index={i}>
            <div className={`ngd-page ngd-grid ${styles.inner}`}>
              <div className={styles.copy}>
                <ChapterMark n={c.n} label={c.label} />
                <SplitReveal as="h3" className={styles.title}>{c.title}</SplitReveal>
                <p className={styles.blurb}>{c.blurb}</p>
                <ChapterData rows={c.data} />
              </div>

              {i === 1 && (
                <div className={styles.media}>
                  <MediaSlot
                    label="CVD reactor plasma"
                    spec="Through the reactor viewport, plasma ball visible, static locked-off shot. 10–20s silent loop, ≥1920×1080, H.264 MP4 + WebM."
                    ratio="16 / 10"
                  />
                </div>
              )}
            </div>
          </ChapterPanel>
        );
      })}
    </section>
  );
}
