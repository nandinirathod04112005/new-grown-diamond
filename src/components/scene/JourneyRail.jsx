import { useEffect, useRef } from 'react';

import { CHAPTERS } from '@/lib/journey.js';
import { useSceneProgressOptional } from './sceneProgress.js';
import styles from './JourneyRail.module.css';

/**
 * The fixed chapter rail: where the reader is in the six-stage journey.
 *
 * The fill is written straight to style from the director's subscribe
 * callback, so scrubbing does not re-render anything. Only the active chapter
 * — six discrete changes across the whole page — comes through React.
 *
 * Real <button>s in a <nav>, so it is operable by keyboard rather than being
 * decorative scroll furniture.
 */
export default function JourneyRail({ onJump, hidden = false }) {
  const fill = useRef(null);
  const scene = useSceneProgressOptional();
  const active = scene?.chapter ?? 0;

  useEffect(() => {
    if (!scene) return undefined;
    return scene.subscribe((p) => {
      if (fill.current) fill.current.style.transform = `scaleY(${p})`;
    });
  }, [scene]);

  return (
    /* `hidden` is a real attribute, not a class: reset.css carries
       [hidden] { display: none !important }, so nothing in a stylesheet can
       quietly out-specify it. The rail indexes the JOURNEY, so once the scene
       is over it has nothing left to point at and must get out of the way of
       the sections below. */
    <nav className={styles.rail} aria-label="Journey chapters" hidden={hidden}>
      <span className={styles.track} aria-hidden="true">
        <span ref={fill} className={styles.fill} />
      </span>
      <ol>
        {CHAPTERS.map((c, i) => (
          <li key={c.key}>
            <button
              type="button"
              className={`${styles.mark} ${i === active ? styles.on : ''}`}
              onClick={() => onJump?.(c.key, i)}
              aria-current={i === active ? 'step' : undefined}
            >
              <span className={styles.n}>{c.n}</span>
              <span className={styles.label}>{c.label}</span>
              <span className={styles.tick} aria-hidden="true" />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
