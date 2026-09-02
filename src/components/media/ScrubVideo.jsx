import { useEffect, useRef, useState } from 'react';

import { prefersReducedMotion } from '@/lib/motion/media.js';

/**
 * Real footage, with the scroll position as the playhead.
 *
 * The video never plays on its own: `currentTime` is driven from the scroll
 * progress, so scrubbing back runs the footage backwards and the reader
 * controls the pace. That is the effect people mean by "video on scroll", and
 * it is the only one that survives someone scrolling quickly past.
 *
 * Seeking is throttled to animation frames and skipped when the delta is tiny,
 * because a seek per scroll event will stall decoding on any real device —
 * mobile Safari especially.
 *
 * `src` is probed before anything renders. If the file is not there, this
 * component reports unavailable and the caller falls back to the 3D scene,
 * which is why the site works today with no footage at all.
 */
export default function ScrubVideo({ src, poster, progressRef, onUnavailable }) {
  const video = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    // HEAD first: a missing file must not surface as a broken player.
    fetch(src, { method: 'HEAD' })
      .then((res) => {
        if (!alive) return;
        // `res.ok` alone is not enough: a dev server answers unknown paths with
        // index.html, so a missing video came back as a perfectly good 200 and
        // this player hid the 3D scene behind an empty <video>.
        const type = res.headers.get('content-type') || '';
        if (res.ok && type.startsWith('video/')) setReady(true);
        else onUnavailable?.();
      })
      .catch(() => alive && onUnavailable?.());
    return () => {
      alive = false;
    };
  }, [src, onUnavailable]);

  useEffect(() => {
    if (!ready) return undefined;
    const el = video.current;
    if (!el) return undefined;

    // Reduced motion gets one representative frame, never a moving image.
    if (prefersReducedMotion()) {
      const once = () => {
        el.currentTime = el.duration * 0.72;
      };
      el.addEventListener('loadedmetadata', once, { once: true });
      return () => el.removeEventListener('loadedmetadata', once);
    }

    let frame = 0;
    let last = -1;

    const tick = () => {
      const p = progressRef.current?.sp ?? 0;
      const duration = el.duration;
      if (Number.isFinite(duration) && duration > 0) {
        const t = Math.min(duration - 0.05, Math.max(0, p * duration));
        // A seek per frame stalls the decoder; only move when it matters.
        if (Math.abs(t - last) > 0.03) {
          el.currentTime = t;
          last = t;
        }
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [ready, progressRef]);

  if (!ready) return null;

  return (
    <video
      ref={video}
      src={src}
      poster={poster}
      muted
      playsInline
      preload="auto"
      // Decorative: the stages are described in the text beside it.
      aria-hidden="true"
      tabIndex={-1}
    />
  );
}
