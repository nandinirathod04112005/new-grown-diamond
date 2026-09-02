import { useState } from 'react';

import { useScrollPhase } from '@/hooks/useScrollPhase.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import styles from './ScrollScene.module.css';

/**
 * One chapter, built the way the reference site builds every one of them.
 *
 * A `position: sticky` visual block, then a spacer whose children carry the
 * scroll distance as literal viewport heights. No pin, no scrub, no
 * ScrollTrigger — the spacer IS the timeline, and re-timing a chapter means
 * editing a vh number.
 *
 * The block receives `data-section` (the phase) plus `--p` and `--sp`, which
 * is the entire contract every child animates against.
 */
export default function ScrollScene({
  phases,
  className,
  children,
  id,
  label,
  progressRef,
  mobileStack = false,
}) {
  const { sceneRef, targetRef, phase } = useScrollPhase(phases, progressRef);

  // Written once, deterministically, so the first paint is never a flash of
  // the wrong state. CSS also defaults --p to 1, so a JS failure leaves the
  // chapter readable rather than blank.
  const [initial] = useState(() => (prefersReducedMotion() ? 1 : 0));

  return (
    <section
      ref={sceneRef}
      className={styles.scene}
      id={id}
      aria-label={label}
      data-mobile-stack={mobileStack ? '' : undefined}
    >
      <div
        ref={targetRef}
        className={`${styles.sticky} ${className ?? ''}`}
        data-section={phase}
        style={{ '--p': initial, '--sp': initial }}
      >
        {children}
      </div>

      <div className={styles.spacer} aria-hidden="true">
        {phases.map((p) => (
          <div key={p.name} data-marker={p.name} style={{ height: `${p.vh}vh` }} />
        ))}
      </div>
    </section>
  );
}
