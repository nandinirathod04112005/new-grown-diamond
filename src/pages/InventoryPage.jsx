import { useCallback, useEffect, useMemo, useState } from 'react';

import CvdProcess from '@/sections/diamonds/CvdProcess.jsx';
import DiamondCard from '@/components/product/DiamondCard.jsx';
import StoneFilters from '@/components/product/StoneFilters.jsx';
import { EMPTY, isActive, matches } from '@/components/product/stoneFilter.js';
import StoneViewer from '@/components/product/StoneViewer.jsx';
import { listDiamonds } from '@/lib/supabase/queries/diamonds.js';
import { isConfigured } from '@/lib/supabase/client.js';
import macro from '@/assets/diamonds/ngd-brilliant-macro.webp';
import diamondSpin from '@/assets/diamonds/ngd-brilliant-spin.webp';
import cutStone from '@/assets/process/cut-stone.webp';
import HeroBackdrop from '@/components/layout/HeroBackdrop.jsx';
import { useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import { ENQUIRY_DESK } from './siteContent.js';
import COPY from './InventoryPage.copy.js';
import styles from './InventoryPage.module.css';

/**
 * Live inventory.
 *
 * Every stone, photograph and specification on this page comes from the
 * diamonds table and the diamond-images bucket — the same rows the admin
 * writes. Nothing here is hard-coded, so adding a stone in the admin makes it
 * appear here with no code change.
 */
export default function InventoryPage() {
  const [stones, setStones] = useState([]);
  // Initialised, not corrected in an effect: with no project configured the
  // first render is already the settled state.
  const [stage, setStage] = useState(() => (isConfigured ? 'loading' : 'unconfigured'));
  const [filters, setFilters] = useState(EMPTY);
  const [viewing, setViewing] = useState(null);
  const { t } = useLocale();
  const c = useCopy(COPY);

  // The fetch never sets state synchronously: the effect's first write happens
  // after the await, and Retry sets the loading state from the click that
  // caused it. That keeps the render pass free of cascading updates.
  const fetchStones = useCallback(async () => {
    try {
      setStones(await listDiamonds());
      setStage('ready');
    } catch (err) {
      // The visitor never sees Supabase internals; the console does.
      console.error('[NGD Inventory] load failed:', err);
      setStage('error');
    }
  }, []);

  useEffect(() => {
    // fetchStones happens after an await, and loading rows from the database
    // is exactly the external-system synchronisation effects are for.
    // oxlint-disable-next-line react/set-state-in-effect
    if (isConfigured) fetchStones();
  }, [fetchStones]);

  const retry = useCallback(() => {
    setStage('loading');
    fetchStones();
  }, [fetchStones]);

  const rows = useMemo(
    () => stones.filter((s) => matches(s, filters)),
    [stones, filters],
  );

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        {/* Ambient field: the stock page was the one hero with nothing moving
            in it at rest. */}
        <div className={styles.field} aria-hidden="true"><span /><span /></div>
        {/* A cut stone under the stock page, above the ambient field and
            below the copy and the hero stone. */}
        <HeroBackdrop src={cutStone} focus="55% 50%" className={styles.backdrop} />
        <div>
          <p className="u-eyebrow">{c.hero.eyebrow}</p>
          {/* The space is explicit: a <br> yields nothing in textContent, so
              without it the extracted heading reads "stone.See the proof." */}
          <h1>{c.hero.title}{' '}<br /><em>{c.hero.titleEm}</em></h1>
          <p>{c.hero.intro}</p>
          <a href="/contact">{t('common.requestInventory')} →</a>
          <p className={styles.callLine}>
            <span>{t('common.callTheDesk')}</span>{' '}
            <a href={`tel:${ENQUIRY_DESK.tel}`}>{ENQUIRY_DESK.phone}</a>
          </p>
        </div>
        <figure className={styles.diamondStage}>
          <span className={styles.orbit} aria-hidden="true" />
          <span className={styles.orbitInner} aria-hidden="true" />
          <span className={styles.diamondShadow} aria-hidden="true" />
          <span
            className={styles.realDiamond}
            role="img"
            aria-label={c.hero.alt}
            style={{ '--diamond-spin': `url(${diamondSpin})` }}
          >
            <i aria-hidden="true" />
          </span>
          <figcaption className={styles.spinLabel}>
            <span aria-hidden="true" />
            Real diamond · 360° light study
          </figcaption>
        </figure>
      </header>

      {/* Straight after the hero: how the stock on this page is made,
          before the stock itself. */}
      <CvdProcess />

      <section className={styles.finder}>
        {/*
          * Mounted while the stock is still loading, not after it arrives.
          *
          * Waiting for `ready` looked tidier and cost a Cumulative Layout Shift
          * of 1.0 — four times the "poor" threshold. The panel is roughly
          * 1200px tall, so dropping it in after the fetch pushed every card and
          * the whole footer down the page in one jump. It is the same height
          * before and after the rows arrive, so rendering it from the start
          * reserves exactly the right space and the page never moves.
          */}
        {(stage === 'loading' || (stage === 'ready' && stones.length > 0)) && (
          <StoneFilters
            stones={stones}
            value={filters}
            onChange={setFilters}
            shown={rows.length}
            loading={stage === 'loading'}
          />
        )}

        {stage === 'loading' && (
          <div className={styles.grid} aria-hidden="true">
            {[0, 1, 2].map((i) => <div key={i} className={styles.skeleton} />)}
          </div>
        )}

        {stage === 'error' && (
          <div className={styles.state}>
            <h2>{c.error.title}</h2>
            <p>{c.error.body}</p>
            <button type="button" onClick={retry}>{c.error.retry}</button>
          </div>
        )}

        {stage === 'unconfigured' && (
          <div className={styles.state}>
            <h2>{c.unconfigured.title}</h2>
            <p>{c.unconfigured.body}</p>
          </div>
        )}

        {stage === 'ready' && rows.length === 0 && (
          <div className={styles.state}>
            <h2>{stones.length === 0 ? c.empty.noneTitle : c.empty.noMatchTitle}</h2>
            <p>
              {stones.length === 0
                ? c.empty.noneBody
                : c.empty.noMatchBody}
            </p>
            {isActive(filters) && (
              <button type="button" onClick={() => setFilters(EMPTY)}>{c.empty.clear}</button>
            )}
          </div>
        )}

        {stage === 'ready' && rows.length > 0 && (
          <div id="stones" className={styles.grid}>
            {rows.map((stone, i) => (
              <DiamondCard key={stone.publicId} stone={stone} index={i} onInspect={setViewing} />
            ))}
          </div>
        )}
      </section>

      {viewing && <StoneViewer stone={viewing} onClose={() => setViewing(null)} />}

      <section className={styles.proof}>
        <img src={macro} alt={c.proof.alt} width="754" height="541" />
        <div>
          <p className="u-eyebrow">{c.proof.eyebrow}</p>
          <h2>{c.proof.title}</h2>
          <p>{c.proof.body}</p>
          {/* The subject is what the desk reads, so it stays English. */}
          <a href="mailto:newgrowndiamonds@gmail.com?subject=Current diamond inventory">{c.proof.email} →</a>
        </div>
      </section>
    </main>
  );
}
