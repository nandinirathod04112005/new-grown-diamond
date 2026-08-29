import styles from './DiamondStill.module.css';

/**
 * The static hero stone: an original vector round-brilliant in side profile,
 * geometrically constructed (table, crown facets, girdle, pavilion, culet).
 *
 * Vector rather than photographic because it stays crisp at any viewport, adds
 * about a kilobyte instead of hundreds, and needs no art direction pass. It
 * renders on the server-less first paint, on phones, under reduced motion, and
 * behind the WebGL scene while that loads.
 *
 * PLACEHOLDER: intended to be replaced by commissioned photography of a real
 * NGD stone (>= 1400px, transparent background) when it exists.
 */
export default function DiamondStill() {
  return (
    <div className={styles.wrap}>
      <div className={styles.glow} aria-hidden="true" />
      <svg
        className={styles.gem}
        viewBox="-130 -70 260 200"
        role="img"
        aria-label="Illustration of a round brilliant cut diamond"
      >
        <defs>
          <linearGradient id="ngd-crown" x1="0" y1="0" x2="0.4" y2="1">
            <stop offset="0%" stopColor="#fdfaf4" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#cbb287" stopOpacity="0.35" />
          </linearGradient>
          <linearGradient id="ngd-pav" x1="0.1" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="#e8d9b8" stopOpacity="0.55" />
            <stop offset="55%" stopColor="#9c7c4c" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#f7f2ea" stopOpacity="0.14" />
          </linearGradient>
        </defs>

        <g className={styles.body}>
          <path d="M-100 0L-44 -40H44L100 0Z" fill="url(#ngd-crown)" />
          <path d="M-100 0L0 104L100 0Z" fill="url(#ngd-pav)" />

          <g stroke="#f7f2ea" strokeOpacity="0.34" strokeWidth="0.7" fill="none">
            <path d="M-71.4 0L-31.4 -40" />
            <path d="M-42.9 0L-18.9 -40" />
            <path d="M-14.3 0L-6.3 -40" />
            <path d="M14.3 0L6.3 -40" />
            <path d="M42.9 0L18.9 -40" />
            <path d="M71.4 0L31.4 -40" />
          </g>

          <g stroke="#f7f2ea" strokeOpacity="0.22" strokeWidth="0.7" fill="none">
            <path d="M-71.4 0L0 104" />
            <path d="M-42.9 0L0 104" />
            <path d="M-14.3 0L0 104" />
            <path d="M14.3 0L0 104" />
            <path d="M42.9 0L0 104" />
            <path d="M71.4 0L0 104" />
          </g>

          <g stroke="#ddc79b" strokeOpacity="0.85" strokeWidth="1.1" fill="none">
            <path d="M-100 0H100" />
            <path d="M-44 -40H44" />
            <path d="M-100 0L-44 -40M44 -40L100 0M-100 0L0 104L100 0" />
          </g>
        </g>
      </svg>
    </div>
  );
}
