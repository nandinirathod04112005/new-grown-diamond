import { Link } from 'react-router-dom';

import ChapterPanel, { ChapterData, ChapterMark } from '@/components/scene/ChapterPanel.jsx';
import SplitReveal from '@/components/motion/SplitReveal.jsx';
import AssetSlot from '@/components/media/AssetSlot.jsx';
import MediaSlot from '@/components/media/MediaSlot.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import useAsyncData from '@/hooks/useAsyncData.js';
import { fetchFeaturedJewellery } from '@/lib/data/source.js';
import useChapterEntrance from '@/hooks/useChapterEntrance.js';
import { CHAPTERS } from '@/lib/journey.js';
import styles from './Atelier.module.css';

/**
 * Chapter 07 — JEWELLERY, and the journey's last scene chapter.
 *
 * It opens with the seventh chapter panel, so the fixed scene resolves here
 * rather than stopping at the certified stone: the stone is grown, cut, graded
 * — and then worn. Below the panel the section becomes a magazine spread.
 *
 * Roughly a quarter of the page's weight, and it earns that by being quieter
 * than the diamond chapters rather than louder: one large plate, two smaller
 * ones set off-axis, and a pull-quote. Explicitly not a repeating card grid.
 *
 * Photography does not exist yet, so each plate is an AssetSlot naming the
 * exact shot required. The product NAMES and specs are real data from the
 * adapter, so the layout is already bound to the source it will ship with.
 */
export default function Atelier() {
  const chapter = useChapterEntrance();
  const { data, loading, error } = useAsyncData(() => fetchFeaturedJewellery(3));
  const pieces = data ?? [];

  const seventh = CHAPTERS[6];

  return (
    <section id="atelier" className={styles.atelier} aria-labelledby="atelier-title">
      {/* The section's own heading, as in Genesis and Precision. Without it the
          chapter-07 panel was an h2 while chapters 01-06 are h3, so the seventh
          chapter sat at a different level from the six it belongs with and the
          gallery's heading came after it at the same level. */}
      <h2 id="atelier-title" className="ngd-visually-hidden">
        Jewellery: the finished stone, set by hand
      </h2>

      {/* The journey's final chapter, over the shared stage. */}
      <ChapterPanel index={6}>
        <div className={`ngd-page ngd-grid ${styles.inner}`}>
          <div className={styles.chapterCopy}>
            <ChapterMark n={seventh.n} label={seventh.label} />
            <SplitReveal as="h3" className={styles.chapterTitle}>{seventh.title}</SplitReveal>
            <p className={styles.chapterBlurb}>{seventh.blurb}</p>
            <ChapterData rows={seventh.data} />
          </div>
        </div>
      </ChapterPanel>

      <div className={styles.gallery}>
      <div ref={chapter} className={`ngd-page ngd-grid ${styles.inner}`}>
        <p className={`ngd-tech ${styles.chapter}`}>Inside the atelier</p>

        <SplitReveal as="h3" className={styles.title}>
          Once the stone is right, the setting can begin.
        </SplitReveal>

        <Reveal className={styles.lede}>
          <p>
            We do not design a piece and then look for a diamond to fill it.
            Every setting here was drawn around a stone we already owned.
          </p>
        </Reveal>

        {error && <p className={styles.state} role="alert">The collection could not be loaded.</p>}

        {!error && (
          <>
            <figure className={styles.plateLead}>
              <AssetSlot
                ratio="4 / 5"
                label={loading ? 'Signature piece' : pieces[0]?.product_name ?? 'Signature piece'}
                spec="Three-quarter view on black, single hard key light. ≥2000px on the long edge, sRGB."
              />
              {!loading && pieces[0] && (
                <figcaption className={styles.caption}>
                  <span className={styles.capName}>{pieces[0].product_name}</span>
                  <span className={styles.capSpec}>
                    {pieces[0].subcategory} · {pieces[0].diamond_weight}
                  </span>
                </figcaption>
              )}
            </figure>

            {/* The jewellery chapter's moving image. Editorial footage of NGD
                settings, not a stock clip of somebody else's goods. */}
            <div className={styles.film}>
              <MediaSlot
                label="Jewellery editorial"
                spec="NGD settings worn or on a hand model — ring, pendant, studs. Editorial, natural light. 10–20s silent loop, ≥1920×1080, H.264 MP4 + WebM. No CGI stones."
                ratio="16 / 9"
              />
            </div>

            <blockquote className={styles.quote}>
              <p>
                A setting should be the last thing anybody notices, and the
                first thing that fails if it is done badly.
              </p>
              <cite>Head of atelier, Surat</cite>
            </blockquote>

            <div className={styles.pair}>
              {(loading ? [null, null] : pieces.slice(1, 3)).map((p, i) => (
                <figure key={p?.public_id ?? i} className={styles.plateSmall}>
                  <AssetSlot
                    ratio={i === 0 ? '1 / 1' : '3 / 4'}
                    label={p?.product_name ?? 'Collection piece'}
                    spec="Macro detail of the setting. Shallow depth of field, ≥1600px, transparent or black ground."
                  />
                  {p && (
                    <figcaption className={styles.caption}>
                      <span className={styles.capName}>{p.product_name}</span>
                      <span className={styles.capSpec}>{p.category} · {p.diamond_weight}</span>
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>

            <Link to="/jewellery" className={styles.more} data-cursor="Browse">
              The collection →
            </Link>
          </>
        )}
      </div>
      </div>
    </section>
  );
}
