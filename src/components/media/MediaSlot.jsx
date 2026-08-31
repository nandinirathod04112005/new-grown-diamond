import { useEffect, useRef, useState } from 'react';

import stoneUrl from '@/assets/diamonds/ngd-brilliant-macro.webp';
import styles from './MediaSlot.module.css';

/**
 * A slot for real production footage.
 *
 * Give it a `src` and it renders a muted, looped, playsInline video that plays
 * ONLY while it is on screen and the tab is visible. Give it no `src` — which
 * is every slot today — and it renders the one real NGD photograph we hold,
 * under a plainly labelled notice stating the exact footage required.
 *
 * It never invents anything. No stock clip, no generated gemstone, no
 * illustrated stand-in. If the footage does not exist, the page says so, and
 * the requirement is legible off the screen rather than living in an inbox.
 *
 * Swapping a placeholder for real footage is adding one `src` prop.
 */
export default function MediaSlot({
  label,
  spec,
  src,
  poster,
  ratio = '16 / 9',
  className = '',
}) {
  const holder = useRef(null);
  const video = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = holder.current;
    if (!node || !src) return undefined;

    let onScreen = false;
    const sync = () => {
      const el = video.current;
      if (!el) return;
      const shouldPlay = onScreen && !document.hidden;
      setVisible(shouldPlay);
      if (shouldPlay) {
        // Autoplay can still be refused; a rejected promise must not surface
        // as an unhandled rejection in the console.
        el.play().catch(() => {});
      } else {
        el.pause();
      }
    };

    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      sync();
    }, { threshold: 0.15 });
    io.observe(node);
    document.addEventListener('visibilitychange', sync);

    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', sync);
    };
  }, [src]);

  if (src) {
    return (
      <figure
        ref={holder}
        className={`${styles.slot} ${className}`}
        style={{ '--ratio': ratio }}
      >
        <video
          ref={video}
          className={styles.video}
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          preload="metadata"
          // Decorative motion beside prose that already describes it; the
          // accessible name lives on the figure so it is announced once.
          aria-label={label}
          data-playing={visible ? 'true' : 'false'}
        />
        <figcaption className={styles.caption}>{label}</figcaption>
      </figure>
    );
  }

  return (
    <figure
      ref={holder}
      className={`${styles.slot} ${styles.pending} ${className}`}
      style={{ '--ratio': ratio }}
    >
      {/* The real stone stands here rather than a stock clip. It is the only
          genuine NGD asset we hold, and it is honest about being a stand-in. */}
      <img
        className={styles.standIn}
        src={stoneUrl}
        alt=""
        width={754}
        height={541}
        loading="lazy"
        decoding="async"
      />
      <span className={styles.scrim} aria-hidden="true" />
      <figcaption className={styles.notice}>
        <span className={styles.tag}>Footage required</span>
        <span className={styles.label}>{label}</span>
        <span className={styles.spec}>{spec}</span>
      </figcaption>
    </figure>
  );
}
