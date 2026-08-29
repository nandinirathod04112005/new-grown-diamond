import { Link } from 'react-router-dom';

import styles from './Logo.module.css';

/**
 * Brand lockup: an original brilliant-cut mark (top view — girdle, table,
 * kite and star facets) beside the wordmark set in Cormorant Garamond.
 *
 * The wordmark is real HTML text, not SVG <text>, so it renders in the
 * loaded webfont on every platform and stays selectable and accessible.
 *
 * PLACEHOLDER: this is a considered stand-in, not official brand identity.
 * Replace with the real NGD logo when it exists.
 */
export default function Logo({ compact = false }) {
  return (
    <Link to="/" className={styles.logo} aria-label="New Grown Diamond — home">
      <svg className={styles.mark} viewBox="0 0 48 48" fill="none" aria-hidden="true" focusable="false">
        <polygon points="43.40,32.04 32.04,43.40 15.96,43.40 4.60,32.04 4.60,15.96 15.96,4.60 32.04,4.60 43.40,15.96" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
        <polygon points="31.95,27.29 27.29,31.95 20.71,31.95 16.05,27.29 16.05,20.71 20.71,16.05 27.29,16.05 31.95,20.71" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
        <g stroke="currentColor" strokeWidth="0.7" opacity="0.75" strokeLinecap="round">
          <path d="M43.40 32.04L31.95 27.29"/>
          <path d="M32.04 43.40L27.29 31.95"/>
          <path d="M15.96 43.40L20.71 31.95"/>
          <path d="M4.60 32.04L16.05 27.29"/>
          <path d="M4.60 15.96L16.05 20.71"/>
          <path d="M15.96 4.60L20.71 16.05"/>
          <path d="M32.04 4.60L27.29 16.05"/>
          <path d="M43.40 15.96L31.95 20.71"/>
          <path d="M29.62 29.62L37.72 37.72"/>
          <path d="M24.00 31.95L24.00 43.40"/>
          <path d="M18.38 29.62L10.28 37.72"/>
          <path d="M16.05 24.00L4.60 24.00"/>
          <path d="M18.38 18.38L10.28 10.28"/>
          <path d="M24.00 16.05L24.00 4.60"/>
          <path d="M29.62 18.38L37.72 10.28"/>
          <path d="M31.95 24.00L43.40 24.00"/>
        </g>
      </svg>
      {!compact && (
        <span className={styles.words}>
          <span className={styles.name}>New Grown Diamond</span>
          <span className={styles.tag}>Lab Grown Diamonds &amp; Fine Jewellery</span>
        </span>
      )}
    </Link>
  );
}
