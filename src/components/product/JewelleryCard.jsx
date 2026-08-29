import { Link } from 'react-router-dom';

import styles from './JewelleryCard.module.css';

/** Editorial card for a jewellery piece. Portrait crop, quieter than a stone. */
export default function JewelleryCard({ piece }) {
  return (
    <article className={styles.card}>
      <Link
        to={`/jewellery/${piece.public_id}`}
        className={styles.link}
        aria-label={`${piece.product_name} — ${piece.category}, ${piece.diamond_weight}`}
      >
        <div className={styles.media}>
          {/* Placeholder until jewellery photography is loaded into Storage. */}
          <span className={styles.initial} aria-hidden="true">
            {piece.product_name.charAt(0)}
          </span>
        </div>
        <p className={styles.category}>{piece.category}</p>
        <h3 className={styles.name}>{piece.product_name}</h3>
        <p className={styles.desc}>{piece.short_description}</p>
        <p className={styles.weight}>{piece.diamond_weight}</p>
      </Link>
    </article>
  );
}
