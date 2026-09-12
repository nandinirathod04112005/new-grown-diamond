import { useRef } from 'react';

import { useHeroProgress } from '@/hooks/useHeroProgress.js';
import { srcSetFor } from '@/lib/responsiveImages.js';
import styles from './HeroBackdrop.module.css';

/**
 * The photograph behind a banner, and everything that keeps the type readable
 * on top of it.
 *
 * One component for every banner on the site — the shared PageHero, the
 * journal's own opening and the inventory's — so the photographs move the
 * same way everywhere: they settle from a slight scale offset while remaining
 * visible, lean away from the pointer, and
 * fall behind the page as it scrolls. The arrived state and every one of
 * those motions is CSS; the two hooks only write numbers (--mx/--my from the
 * pointer, --hp from scroll), so with no script at all this is a finished,
 * still photograph with its scrim in place.
 *
 * Decorative by construction. The banner's words carry the meaning, and a
 * page's real photograph — one with something to say — is still passed as
 * PageHero's `image`, which keeps its alt text. This one is hidden from
 * assistive technology and has none.
 *
 * `focus` is the point the crop keeps and the drift orbits — the stone, the
 * hands, the bench — as an object-position value.
 */
export default function HeroBackdrop({ src, focus = '50% 50%', mobileFocus = focus, className = '' }) {
  const ref = useRef(null);
  useHeroProgress(ref);

  if (!src) return null;

  return (
    <div
      ref={ref}
      className={`${styles.backdrop} ${className}`.trim()}
      aria-hidden="true"
      style={{ '--focus': focus, '--focus-mobile': mobileFocus }}
    >
      {/* Eager and high priority: on every route that shows it, this is the
          Largest Contentful Paint element — which is also why a phone is
          offered the 900 px copy rather than the full photograph. */}
      <img
        className={styles.image}
        src={src}
        srcSet={srcSetFor(src)}
        /* Half the width on a phone, deliberately: at 3x density "100vw"
           asks for 1170 px and the full photograph wins, while under the
           banner's tint and scrim the 900 px copy is indistinguishable. */
        sizes="(max-width: 767px) 50vw, 100vw"
        alt=""
        loading="eager"
        fetchPriority="high"
        decoding="async"
        draggable="false"
      />
      <span className={styles.tint} />
      <span className={styles.scrim} />
      <span className={styles.shine} />
    </div>
  );
}
