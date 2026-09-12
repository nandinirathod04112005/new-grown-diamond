import { useEffect, useRef } from 'react';

import useReducedMotion from '@/hooks/useReducedMotion.js';

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
  const reduced = useReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (reduced || typeof IntersectionObserver === 'undefined') {
      delete el.dataset.reveal;
      return undefined;
    }

    el.dataset.reveal = 'pending';
    /*
     * One observer answers both questions, and nothing measures itself.
     *
     * Its area runs from a line 12% above the bottom of the window up past the
     * top of the page, so the element counts as arrived either when it comes
     * into view or when it has already been carried above the window. The
     * second case matters: an anchor link, a restored scroll position or a
     * fast flick can cross a section without it ever being "in view", and it
     * would then stay pending for good. That case used to be caught by every
     * pending section calling getBoundingClientRect() on every scroll frame,
     * and by one more call per section at mount, each forcing a layout; on a
     * phone that was a steady share of every scroll frame. The observer
     * answers from the layout the browser has already done, and its first
     * report (next frame) also covers a section that is on screen at mount.
     */
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.dataset.reveal = 'in';
        io.disconnect();
      },
      { rootMargin: '100000px 0px -12% 0px', threshold: 0.15 },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      delete el.dataset.reveal;
    };
  }, [reduced]);

  return (
    /* Remaining props are forwarded so callers can attach data attributes and
       ARIA to the revealed element. Without this they were accepted at the
       call site and then silently dropped, which is the worst of both: no
       error, no effect. */
    <Tag ref={ref} data-motion-reveal="" className={className} style={{ '--reveal-delay': `${delay}ms` }} {...rest}>
      {children}
    </Tag>
  );
}
