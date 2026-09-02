import { useEffect, useRef } from 'react';

import { prefersReducedMotion } from '@/lib/motion/media.js';
import { onPageProgress } from '@/lib/motion/pageProgress.js';

/**
 * Reveals its children once, when they first come into view.
 *
 * An IntersectionObserver rather than a scroll listener: the browser does the
 * intersection maths off the main thread, and one observer serves every
 * element on the page instead of each one measuring itself on every scroll
 * event. It unobserves after firing, so a long page does not keep watching
 * content the reader has already passed.
 *
 * The revealed state is the CSS default and the hidden state is applied only
 * when the observer is actually running, so no-JS and reduced-motion both get
 * finished content rather than an empty page.
 */
export default function Reveal({ children, as: Tag = 'div', className, delay = 0, ...rest }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return undefined;

    // Already on screen or already scrolled past at mount — an anchor link or a
    // restored scroll position lands here — so it is arrived, not pending.
    // Without this an instant jump produces no intersection callback at all and
    // the content stays invisible permanently.
    const box = el.getBoundingClientRect();
    if (box.top < window.innerHeight * 0.9) {
      el.dataset.reveal = 'in';
      return undefined;
    }

    el.dataset.reveal = 'pending';
    const io = new IntersectionObserver(
      ([entry]) => {
        // Reveal when it comes into view, but ALSO when it is already above the
        // viewport: an anchor jump or a fast flick can carry content past
        // without ever intersecting, and it would then stay invisible forever.
        const passed = entry.boundingClientRect.bottom < 0;
        if (!entry.isIntersecting && !passed) return;
        el.dataset.reveal = 'in';
        io.unobserve(el);
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.15 },
    );
    io.observe(el);

    // Safety net. An instant jump — an anchor link, a restored position, a fast
    // flick — can cross a section without ever producing an intersection
    // callback, and the content would then stay invisible for good. This rides
    // the page's existing scroll subscription rather than adding a listener per
    // section, and unsubscribes the moment it fires.
    const stop = onPageProgress(() => {
      if (el.dataset.reveal === 'in') {
        stop();
        return;
      }
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) {
        el.dataset.reveal = 'in';
        io.unobserve(el);
        stop();
      }
    });

    return () => {
      io.disconnect();
      stop();
    };
  }, []);

  return (
    /* Remaining props are forwarded so callers can attach data attributes and
       ARIA to the revealed element. Without this they were accepted at the
       call site and then silently dropped, which is the worst of both: no
       error, no effect. */
    <Tag ref={ref} className={className} style={{ '--reveal-delay': `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}
