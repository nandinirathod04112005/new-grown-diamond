import { ArrowUpRight } from 'lucide-react';

import styles from './CircleArrow.module.css';

/** Decorative affordance — the label always lives on the parent control. */
export default function CircleArrow({ className }) {
  return (
    <span className={`${styles.root} ${className ?? ''}`} aria-hidden="true">
      <span className={styles.fill} />
      <span className={styles.glyphs}>
        <ArrowUpRight size={16} strokeWidth={1.25} className={`${styles.glyph} ${styles.glyphOut}`} />
        <ArrowUpRight size={16} strokeWidth={1.25} className={`${styles.glyph} ${styles.glyphIn}`} />
      </span>
    </span>
  );
}
