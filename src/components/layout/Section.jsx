import styles from './Section.module.css';

/**
 * Vertical rhythm band. `tone` picks the surface; `narrow` switches to the
 * reading-width container used by editorial copy.
 */
export default function Section({
  children,
  id,
  tone = 'base',
  narrow = false,
  className = '',
  as: Tag = 'section',
  ...rest
}) {
  return (
    <Tag
      id={id}
      className={`${styles.section} ${styles[tone]} ${className}`}
      {...rest}
    >
      <div className={narrow ? 'ngd-container-narrow' : 'ngd-container'}>
        {children}
      </div>
    </Tag>
  );
}
