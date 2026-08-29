import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import SplitReveal from '@/components/motion/SplitReveal.jsx';
import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import useAsyncData from '@/hooks/useAsyncData.js';
import { fetchFeaturedDiamonds } from '@/lib/data/source.js';
import { formatCarat, formatPrice, diamondSpecLine } from '@/lib/format.js';
import ShapeGlyph from '@/components/product/ShapeGlyph.jsx';
import stoneUrl from '@/assets/diamonds/ngd-brilliant-macro.webp';
import useChapterEntrance from '@/hooks/useChapterEntrance.js';
import styles from './Inventory.module.css';

/**
 * Chapter 03 — real stones.
 *
 * A ledger, not a card grid: one row per stone, the way a dealer's list reads.
 * Hovering a row raises that stone's plate in the fixed inspection panel, so
 * the eye stays in one place while the hand moves down the list. Below the
 * breakpoint the rows become self-contained blocks with their own actions.
 */
export default function Inventory() {
  const chapter = useChapterEntrance();
  const scope = useRef(null);
  const [focus, setFocus] = useState(0);
  const { data, loading, error } = useAsyncData(() => fetchFeaturedDiamonds(6));

  useGSAP(
    () => {
      if (!data?.length) return undefined;
      const mm = gsap.matchMedia();
      mm.add(MQ.motion, () => {
        gsap.from(`.${styles.row}`, {
          opacity: 0, y: 26, duration: 0.9, stagger: 0.06, ease: 'expo.out',
          scrollTrigger: { trigger: `.${styles.ledger}`, start: 'top 82%', once: true },
        });
      });
      return () => mm.revert();
    },
    { scope, dependencies: [data] }
  );

  const current = data?.[focus];

  return (
    <section ref={scope} id="inventory" className={styles.inventory} aria-labelledby="inventory-title">
      <div ref={chapter} className={`ngd-page ngd-grid ${styles.inner}`}>
        <p className={`ngd-tech ${styles.chapter}`}>Chapter 03 — Inventory</p>

        <SplitReveal as="h2" id="inventory-title" className={styles.title}>
          Stones we actually hold.
        </SplitReveal>

        <p className={styles.standfirst}>
          Every stone below is in our vault today, graded, and available to
          view. Prices move with the market; the certificate does not.
        </p>

        {error && (
          <p className={styles.state} role="alert">
            The inventory could not be loaded. Please try again shortly, or
            call us and we will read you the list.
          </p>
        )}

        {loading && (
          <div className={styles.ledger} aria-hidden="true">
            {Array.from({ length: 6 }, (_, i) => <div key={i} className={styles.skeleton} />)}
          </div>
        )}

        {!loading && !error && data.length === 0 && (
          <p className={styles.state}>
            Nothing is listed publicly at the moment. Tell us what you are
            looking for and we will source it.
          </p>
        )}

        {!loading && !error && data.length > 0 && (
          <>
            <div className={styles.plate} aria-hidden="true">
              <div className={styles.plateInner}>
                {/* The one real NGD photograph is a round brilliant, so it
                    stands in only for round stones. Showing it beside an
                    emerald or a pear would misrepresent the stock; those keep
                    the schematic glyph, which claims nothing. */}
                {current.shape === 'Round' ? (
                  <img
                    className={styles.platePhoto}
                    src={stoneUrl}
                    alt=""
                    width={754}
                    height={541}
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <ShapeGlyph shape={current.shape} className={styles.plateGlyph} />
                )}
                <p className={styles.plateCarat}>{formatCarat(current.carat)}</p>
                <p className={styles.plateShape}>{current.shape}</p>
                <p className={styles.plateSpec}>{diamondSpecLine(current)}</p>
              </div>
            </div>

            <ul className={styles.ledger}>
              {data.map((s, i) => (
                <li
                  key={s.public_id}
                  className={`${styles.row} ${i === focus ? styles.rowOn : ''}`}
                  onMouseEnter={() => setFocus(i)}
                  onFocusCapture={() => setFocus(i)}
                >
                  <span className={styles.rowCarat}>{formatCarat(s.carat)}</span>
                  <span className={styles.rowShape}>{s.shape}</span>
                  <span className={styles.rowSpec}>{diamondSpecLine(s)}</span>
                  <span className={styles.rowGrowth}>{s.growth_method}</span>
                  <span className={styles.rowPrice}>
                    {s.price_visible ? formatPrice(s.total_price, s.currency) : 'On request'}
                  </span>
                  <span className={styles.rowActions}>
                    <Link
                      to={`/diamonds/${s.public_id}`}
                      className={styles.view}
                      data-cursor="Inspect"
                    >
                      View diamond
                      <span className="ngd-visually-hidden">
                        , {formatCarat(s.carat)} {s.shape}, {diamondSpecLine(s)}
                      </span>
                    </Link>
                    <Link to={`/contact?stone=${s.public_id}`} className={styles.enquire}>
                      Enquire
                    </Link>
                  </span>
                </li>
              ))}
            </ul>

            <Link to="/diamonds" className={styles.all}>
              All {data.length > 5 ? 'inventory' : 'diamonds'} →
            </Link>
          </>
        )}
      </div>
    </section>
  );
}
