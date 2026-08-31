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
    const slot = node.parentElement;
    if (!slot) return undefined;

    /**
     * Opacity comes from where this panel actually IS, not from where the
     * scene thinks the journey has got to.
     *
     * It used to be a pure function of scene progress. Panel opacity was
     * therefore driven by a normalized number while panel POSITION was driven
     * by layout — svh-sized slots against content-sized sections — and the two
     * drift apart as the viewport changes. At 1920x1080 that produced screens
     * showing the photograph and nothing else: a panel was at full opacity
     * while its copy sat below the fold, and the panel whose copy was on screen
     * was at zero. Reading the element's own rect cannot drift, because there
     * is nothing left to drift from.
     */
    const measure = () => {
      // How much of THIS PANEL is on screen, as a fraction of the viewport.
      //
      // The first attempt measured progress through the slot's sticky travel,
      // which only describes the panel once it is already stuck — so a panel
      // approaching the top of the viewport, fully on screen, was held at
      // opacity 0. Overlap answers the question the reader actually cares
      // about: is this text in front of me?
      const r = node.getBoundingClientRect();
      const vh = window.innerHeight;
      const overlap = Math.max(0, Math.min(r.bottom, vh) - Math.max(r.top, 0));
      const frac = vh > 0 ? overlap / vh : 0;

      const shown = ramp(frac, 0.3, 0.82);
      node.style.opacity = String(shown);
      const cut = (1 - shown) * 14;
      node.style.clipPath = `inset(${cut.toFixed(2)}% 0% ${cut.toFixed(2)}% 0%)`;
      node.style.pointerEvents = shown > 0.5 ? 'auto' : 'none';
    };

    measure();
    // Ticked by the director's single controller — no ScrollTrigger of its own.
    const stop = scene.subscribe(measure);
    window.addEventListener('resize', measure, { passive: true });
    return () => {
      stop();
      window.removeEventListener('resize', measure);
    };
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
    <div className={styles.slot} data-chapter-slot={index}>
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
