import { Link } from 'react-router-dom';

import Magnetic from '@/components/motion/Magnetic.jsx';
import styles from './Button.module.css';

/**
 * One button, three finishes. Renders a real <a>, <Link> or <button> depending
 * on what it does, so keyboard and screen-reader behaviour is correct by
 * construction rather than patched with roles.
 */
export default function Button({
  children,
  to,
  href,
  variant = 'solid',
  size = 'md',
  magnetic = false,
  className = '',
  ...rest
}) {
  const cls = [styles.btn, styles[variant], styles[size], className]
    .filter(Boolean)
    .join(' ');

  const label = (
    <>
      <span className={styles.label}>{children}</span>
      <span className={styles.sheen} aria-hidden="true" />
    </>
  );

  let node;
  if (to) {
    node = (
      <Link to={to} className={cls} {...rest}>
        {label}
      </Link>
    );
  } else if (href) {
    node = (
      <a href={href} className={cls} {...rest}>
        {label}
      </a>
    );
  } else {
    node = (
      <button type="button" className={cls} {...rest}>
        {label}
      </button>
    );
  }

  return magnetic ? <Magnetic>{node}</Magnetic> : node;
}
