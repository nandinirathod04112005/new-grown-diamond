import { useCallback, useEffect, useMemo, useState } from 'react';

import DiamondCard from '@/components/product/DiamondCard.jsx';
import CvdCodex from '@/sections/diamonds/CvdCodex.jsx';
import Process from '@/sections/diamonds/Process.jsx';
import StoneViewer from '@/components/product/StoneViewer.jsx';
import { listDiamonds } from '@/lib/supabase/queries/diamonds.js';
import { isConfigured } from '@/lib/supabase/client.js';
import macro from '@/assets/diamonds/ngd-brilliant-macro.webp';
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
  const [shape, setShape] = useState('All');
  const [viewing, setViewing] = useState(null);

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

  // Shapes come from the stock actually held, not from a fixed list that can
  // drift out of step with the table.
  const shapes = useMemo(
    () => ['All', ...[...new Set(stones.map((s) => s.shape))].filter(Boolean).sort()],
    [stones],
  );

  const rows = useMemo(
    () => (shape === 'All' ? stones : stones.filter((s) => s.shape === shape)),
    [stones, shape],
  );

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        {/* Ambient field: the stock page was the one hero with nothing moving
            in it at rest. */}
        <div className={styles.field} aria-hidden="true"><span /><span /></div>
        <div>
          <p className="u-eyebrow">Diamond inventory / Trade &amp; retail</p>
          <h1>Find the stone.<br /><em>See the proof.</em></h1>
          <p>
            Live stock with grading, growth method and photography. Request
            availability, videos and certificates from the desk.
          </p>
          <a href="/contact">Request current inventory →</a>
        </div>
        <figure>
          <span className={styles.orbit} />
          <img src={macro} alt="A real New Grown Diamond round brilliant photographed loose against black" width="754" height="541" />
        </figure>
      </header>

      <CvdCodex />

      <Process />

      <section className={styles.finder}>
        <div className={styles.bar}>
          <div className={styles.filters} role="group" aria-label="Filter by shape">
            {shapes.map((item) => (
              <button
                key={item}
                type="button"
                className={shape === item ? styles.on : ''}
                aria-pressed={shape === item}
                onClick={() => setShape(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <p className={styles.count} role="status">
            {stage === 'ready'
              ? `${rows.length} ${rows.length === 1 ? 'stone' : 'stones'}`
              : ''}
          </p>
        </div>

        {stage === 'loading' && (
          <div className={styles.grid} aria-hidden="true">
            {[0, 1, 2].map((i) => <div key={i} className={styles.skeleton} />)}
          </div>
        )}

        {stage === 'error' && (
          <div className={styles.state}>
            <h2>The inventory could not be loaded</h2>
            <p>This is on our side. Please try again in a moment.</p>
            <button type="button" onClick={retry}>Retry</button>
          </div>
        )}

        {stage === 'unconfigured' && (
          <div className={styles.state}>
            <h2>Inventory is not connected</h2>
            <p>Add the Supabase project details to .env.local to show live stock.</p>
          </div>
        )}

        {stage === 'ready' && rows.length === 0 && (
          <div className={styles.state}>
            <h2>{stones.length === 0 ? 'No stones published yet' : 'No stones in this shape'}</h2>
            <p>
              {stones.length === 0
                ? 'Stock added in the admin appears here immediately.'
                : 'Try another shape, or ask the desk what is arriving.'}
            </p>
            {stones.length > 0 && (
              <button type="button" onClick={() => setShape('All')}>Show all shapes</button>
            )}
          </div>
        )}

        {stage === 'ready' && rows.length > 0 && (
          <div className={styles.grid}>
            {rows.map((stone, i) => (
              <DiamondCard key={stone.publicId} stone={stone} index={i} onInspect={setViewing} />
            ))}
          </div>
        )}
      </section>

      {viewing && <StoneViewer stone={viewing} onClose={() => setViewing(null)} />}

      <section className={styles.proof}>
        <img src={macro} alt="Close view of a round brilliant laboratory-grown diamond" width="754" height="541" />
        <div>
          <p className="u-eyebrow">What accompanies a stone</p>
          <h2>Certificate. Video. A direct answer.</h2>
          <p>Ask for current availability with the grading information and inspection material needed to evaluate the diamond.</p>
          <a href="mailto:newgrowndiamonds@gmail.com?subject=Current diamond inventory">Email the diamond desk →</a>
        </div>
      </section>
    </main>
  );
}
