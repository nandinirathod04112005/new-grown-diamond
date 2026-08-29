import styles from './AssetSlot.module.css';

/**
 * An explicit, designed placeholder for photography that does not exist yet.
 *
 * This is deliberately NOT a stock photo, a gradient, or an invented gemstone
 * illustration. It states the exact asset required — subject, orientation,
 * minimum resolution, treatment — so the shot list can be read straight off
 * the page, and so nobody can mistake it for finished work.
 *
 * Every one of these is enumerated in the handover report. Replace with
 * <Frame> once the real file lands in Supabase Storage or src/assets.
 */
export default function AssetSlot({
  label,
  spec,
  ratio = '4 / 5',
  className = '',
  tone = 'dark',
}) {
  return (
    <figure
      className={`${styles.slot} ${styles[tone]} ${className}`}
      style={{ '--ratio': ratio }}
      role="img"
      aria-label={`Placeholder for photography: ${label}. ${spec}`}
    >
      <span className={styles.corner} aria-hidden="true" />
      <span className={styles.body} aria-hidden="true">
        <span className={styles.tag}>Image required</span>
        <span className={styles.label}>{label}</span>
        <span className={styles.spec}>{spec}</span>
      </span>
    </figure>
  );
}
