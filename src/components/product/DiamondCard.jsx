import { Link } from 'react-router-dom';

import { formatCarat, formatPrice, diamondSpecLine } from '@/lib/format.js';
import ShapeGlyph from './ShapeGlyph.jsx';
import styles from './DiamondCard.module.css';

/**
 * A stone, as a card. The whole card is one link — no nested interactive
 * elements — and the accessible name carries the full spec rather than
 * "Read more".
 */
export default function DiamondCard({ stone }) {
  const price = stone.price_visible ? formatPrice(stone.total_price, stone.currency) : null;
  const label = `${formatCarat(stone.carat)} ${stone.shape}, ${diamondSpecLine(stone)}`;

  return (
    <article className={styles.card}>
      <Link to={`/diamonds/${stone.public_id}`} className={styles.link} aria-label={label}>
        <div className={styles.media}>
          {/* No product photography yet — the shape glyph stands in and keeps
              the grid rhythm intact. Swap for the Storage image in Phase 3. */}
          <ShapeGlyph shape={stone.shape} className={styles.glyph} />
          <span className={styles.availability} data-state={stone.availability}>
            {stone.availability}
          </span>
        </div>

        <div className={styles.body}>
          <p className={styles.carat}>{formatCarat(stone.carat)}</p>
          <h3 className={styles.name}>{stone.shape}</h3>
          <p className={styles.spec}>{diamondSpecLine(stone)}</p>

          <div className={styles.foot}>
            <span className={styles.growth}>{stone.growth_method}</span>
            <span className={styles.price}>{price ?? 'Price on request'}</span>
          </div>
        </div>
      </Link>
    </article>
  );
}
