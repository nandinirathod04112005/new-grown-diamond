import styles from './Eyebrow.module.css';

/** Small-caps champagne label that sits above a heading. */
export default function Eyebrow({ children, as: Tag = 'p', className = '' }) {
  return (
    <Tag className={`${styles.eyebrow} ${className}`}>
      <span className={styles.rule} aria-hidden="true" />
      {children}
    </Tag>
  );
}
