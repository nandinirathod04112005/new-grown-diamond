import { useEffect, useRef } from 'react';

import { onPageProgress } from '@/lib/motion/pageProgress.js';
import poster from '@/assets/diamonds/ngd-brilliant-macro.webp';
import styles from './StoneFilm.module.css';

/** How far forward the film is allowed to come. 0 = off, 1 = full strength. */
const FILM_MAX = 0.55;

/**
 * Fades one verified NGD photograph behind the narrative. The old conditional
 * WebGL import still shipped a quarter-megabyte renderer even though it was
 * permanently disabled; keeping this component photographic removes that
 * payload and avoids presenting a procedural stone as inventory media.
 */
export default function StoneFilm() {
  const layer = useRef(null);

  useEffect(() => {
    const el = layer.current;
    if (!el) return undefined;
    // Absent through the hero, present for the chapters, easing out at the end
    // so the film never fights the closing scene.
    return onPageProgress((p) => {
      // Full strength while the hero holds it, then eased back to a ground
      // the chapters can be read against, then out before the closing scene.
      // Absent through the hero, which has its own diamond, then eased in as
      // the ground the chapters are read against.
      const heroToFilm = Math.min(1, Math.max(0, (p - 0.07) / 0.08)) * FILM_MAX;
      const outFilm = 1 - Math.min(1, Math.max(0, (p - 0.86) / 0.1));
      // Capped: the film is the ground the chapters are cut over, never the
      // subject competing with them. Raise FILM_MAX to push it forward.
      el.style.setProperty('--film-opacity', String(Math.min(heroToFilm, outFilm)));
    });
  }, []);

  return (
    <div ref={layer} className={styles.layer} aria-hidden="true">
      <img className={styles.poster} src={poster} alt="" loading="lazy" />
      <div className={styles.scrim} />
    </div>
  );
}
