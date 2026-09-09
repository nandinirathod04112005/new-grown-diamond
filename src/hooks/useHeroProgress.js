import { useEffect } from 'react';

import { prefersReducedMotion } from '@/lib/motion/media.js';

/**
 * Writes how far a banner has scrolled out of view onto it as --hp: 0 while
 * its top is at or below the top of the viewport, 1 once it has left. CSS
 * reads it to move the photograph slower than the page and let it go dark as
 * the content arrives.
 *
 * Same shape as usePointerParallax and useScrollPhase, for the same reasons:
 * a value written straight to the element rather than React state, so sixty
 * updates a second never touch a render; a rAF loop that runs only while an
 * IntersectionObserver says the banner is near the viewport, so a page that
 * has been scrolled past costs nothing; and nothing at all under reduced
 * motion, where the banner is a still photograph. No ScrollTrigger — the
 * site's rule is that scroll drives values and CSS does the motion, so a
 * banner whose script never runs is finished rather than broken.
 */
export function useHeroProgress(ref) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (prefersReducedMotion()) {
      el.style.setProperty('--hp', '0');
      return undefined;
    }

    let frame = 0;
    let last = -1;

    const tick = () => {
      const rect = el.getBoundingClientRect();
      const p = rect.height > 0 ? Math.min(1, Math.max(0, -rect.top / rect.height)) : 0;
      // Only written when it has moved: a still page must not churn styles.
      if (Math.abs(p - last) > 0.0005) {
        el.style.setProperty('--hp', p.toFixed(4));
        last = p;
      }
      frame = requestAnimationFrame(tick);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!frame) frame = requestAnimationFrame(tick);
        } else {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      },
      { rootMargin: '12% 0px' },
    );
    observer.observe(el);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [ref]);
}
