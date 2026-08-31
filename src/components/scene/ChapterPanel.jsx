import { useEffect, useRef } from 'react';

import SplitReveal from '@/components/motion/SplitReveal.jsx';
import { CHAPTERS, ramp } from '@/lib/journey.js';
import { useSceneProgressOptional } from './sceneProgress.js';
import styles from './ChapterPanel.module.css';

/**
 * One chapter of text, held sticky over the fixed scene.
 *
 * The panel's own crossfade is driven by the director's single progress value
 * through `subscribe`, NOT by a ScrollTrigger of its own. That is the whole
 * point of the architecture: one controller decides where the journey is, and
 * everything else is a pure function of that number. A panel cannot disagree
 * with the scene about which chapter is showing, because it is not being told
 * separately.
 *
 * The feather is deliberately wide and asymmetric — a panel is fully opaque
 * across the middle of its range and dissolves at both ends, so two adjacent
 * panels are briefly both faint rather than one cutting to the next.
 */
export default function ChapterPanel({ index, children, className = '' }) {
  const panel = useRef(null);
  const scene = useSceneProgressOptional();
  const chapter = CHAPTERS[index];

  useEffect(() => {
    const node = panel.current;
    if (!node || !scene) return undefined;

    const { at, to } = chapter;
    const span = to - at;
    // Feather over a fifth of the chapter at each end.
    const feather = span * 0.2;
    const isFirst = index === 0;
    const isLast = index === CHAPTERS.length - 1;

    return scene.subscribe((p) => {
      // The journey's outer edges are NOT feathered.
      //
      // The last chapter runs to progress 1, so its exit ramp was centred on 1
      // and could only ever reach smoothstep(0.5) — the sixth chapter, which
      // the whole page builds to, was mathematically incapable of reaching full
      // opacity and sat permanently at 0.5. The same applies at the other end.
      const enter = isFirst ? 1 : ramp(p, at - feather, at + feather);
      const exit = isLast ? 1 : 1 - ramp(p, to - feather, to + feather);
      const shown = Math.min(enter, exit);
      node.style.opacity = String(shown);
      // A clip mask that opens from below as the panel arrives, so the text is
      // revealed rather than merely faded up.
      const cut = (1 - shown) * 16;
      node.style.clipPath = `inset(${cut.toFixed(2)}% 0% ${cut.toFixed(2)}% 0%)`;
      // Off at the extremes so a faded panel never intercepts a click.
      node.style.pointerEvents = shown > 0.5 ? 'auto' : 'none';
    });
  }, [scene, chapter, index]);

  // Each panel sticks inside its OWN slot.
  //
  // They used to be sticky siblings sharing the section as a containing block,
  // so once that section's sticky region was exhausted all three came to rest
  // at the same screen offset — and the crossfade, which knows only about
  // progress, then held two superimposed panels at ~0.5 opacity each. Two
  // headlines and two spec tables printed over one another. Giving each panel
  // its own slot means only one is ever in sticky position.
  return (
    <div className={styles.slot}>
      <div ref={panel} className={`${styles.panel} ${className}`}>
        {children}
      </div>
    </div>
  );
}

/** The technical register: small paired labels and values, as on a spec sheet. */
export function ChapterData({ rows }) {
  return (
    <dl className={styles.data}>
      {rows.map(([k, v]) => (
        <div key={k} className={styles.dataRow}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Chapter eyebrow — number, rule, name. */
export function ChapterMark({ n, label }) {
  return (
    <p className={styles.mark}>
      <span className={styles.markN}>{n}</span>
      <span className={styles.markRule} aria-hidden="true" />
      <span className={styles.markLabel}>{label}</span>
    </p>
  );
}

export { SplitReveal };
