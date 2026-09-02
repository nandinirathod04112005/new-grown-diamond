import styles from './Motif.module.css';

/**
 * The per-page figure.
 *
 * Each is a slow, quiet loop rather than a hero animation — it has to hold the
 * right-hand side of a page indefinitely without ever asking to be watched.
 * They are SVG, not WebGL: these run on every device including the phones the
 * capability probe refuses a canvas to, and they cost nothing.
 */
export default function Motif({ kind }) {
  if (kind === 'facets') {
    return (
      <svg viewBox="0 0 240 240" className={styles.svg}>
        <g className={styles.spinSlow}>
          <polygon className={styles.face} points="120,42 178,110 120,198 62,110" />
          {[0, 45, 90, 135].map((a) => (
            <line key={a} className={styles.spoke} x1="120" y1="110" x2="120" y2="42"
              transform={`rotate(${a} 120 110)`} />
          ))}
        </g>
        <circle className={styles.halo} cx="120" cy="120" r="96" />
      </svg>
    );
  }

  if (kind === 'arcs') {
    return (
      <svg viewBox="0 0 240 240" className={styles.svg}>
        {[92, 74, 56, 38].map((r, i) => (
          <circle
            key={r}
            className={i % 2 ? styles.arcB : styles.arcA}
            cx="120" cy="120" r={r}
            strokeDasharray={`${r * 1.5} ${r * 4.6}`}
            style={{ '--i': i }}
          />
        ))}
        <circle className={styles.core} cx="120" cy="120" r="7" />
      </svg>
    );
  }

  if (kind === 'rings') {
    return (
      <svg viewBox="0 0 240 240" className={styles.svg}>
        {[96, 68, 42].map((r, i) => (
          <g key={r} className={i % 2 ? styles.orbitB : styles.orbitA} style={{ '--i': i }}>
            <circle className={styles.ring} cx="120" cy="120" r={r} />
            <circle className={styles.bead} cx={120 + r} cy="120" r="4.5" />
          </g>
        ))}
      </svg>
    );
  }

  if (kind === 'waves') {
    return (
      <svg viewBox="0 0 240 240" className={styles.svg}>
        {[0, 1, 2, 3, 4].map((i) => (
          <path
            key={i}
            className={styles.wave}
            style={{ '--i': i }}
            d={`M8,${74 + i * 22} q30,-22 60,0 t60,0 t60,0 t60,0`}
          />
        ))}
      </svg>
    );
  }

  if (kind === 'pulse') {
    return (
      <svg viewBox="0 0 240 240" className={styles.svg}>
        {[0, 1, 2, 3].map((i) => (
          <circle key={i} className={styles.ripple} cx="120" cy="120" r="30" style={{ '--i': i }} />
        ))}
        <circle className={styles.core} cx="120" cy="120" r="9" />
      </svg>
    );
  }

  if (kind === 'orbit') {
    return (
      <svg viewBox="0 0 240 240" className={styles.svg}>
        <ellipse className={styles.band} cx="120" cy="120" rx="94" ry="34" />
        <ellipse className={styles.band2} cx="120" cy="120" rx="94" ry="34" />
        <circle className={styles.gem} cx="120" cy="120" r="20" />
        <g className={styles.spinSlow}>
          <circle className={styles.bead} cx="214" cy="120" r="5" />
        </g>
      </svg>
    );
  }

  // lattice — the default
  const NODES = [[120, 120], [84, 98], [156, 98], [120, 76], [84, 142], [156, 142], [48, 120], [192, 120], [120, 164]];
  const EDGES = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 3], [2, 3], [1, 6], [2, 7], [4, 6], [5, 7], [4, 8], [5, 8]];
  return (
    <svg viewBox="0 0 240 240" className={styles.svg}>
      <g className={styles.spinSlow}>
        {EDGES.map(([a, z]) => (
          <line key={`${a}-${z}`} className={styles.bond}
            x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[z][0]} y2={NODES[z][1]} />
        ))}
        {NODES.map(([x, y], i) => (
          <circle key={`${x}-${y}`} className={styles.atom} cx={x} cy={y} r={i === 0 ? 6 : 4} style={{ '--i': i }} />
        ))}
      </g>
      <circle className={styles.halo} cx="120" cy="120" r="100" />
    </svg>
  );
}
