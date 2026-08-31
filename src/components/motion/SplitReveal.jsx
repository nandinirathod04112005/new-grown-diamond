import { useRef } from 'react';
import SplitType from 'split-type';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';

/**
 * Line-by-line typographic reveal driven by SplitType.
 *
 * Two things make this safe rather than the usual leak:
 *
 * 1. `split.revert()` runs in cleanup, restoring the original DOM. Without it,
 *    StrictMode's second mount splits already-split markup and you get nested
 *    wrappers that never animate correctly.
 * 2. The split happens INSIDE gsap.matchMedia, so a resize across a breakpoint
 *    re-splits against the new line breaks instead of animating stale lines.
 *
 * The undivided text stays available to assistive technology because SplitType
 * preserves the text content; the wrapper carries the accessible string.
 */
export default function SplitReveal({
  children,
  as: Tag = 'h2',
  className,
  id,
  delay = 0,
  stagger = 0.09,
  duration = 1.25,
  trigger = true,
  start = 'top 84%',
}) {
  const scope = useRef(null);

  useGSAP(
    () => {
      const el = scope.current?.querySelector('[data-split]');
      if (!el) return undefined;

      const mm = gsap.matchMedia();

      mm.add(MQ.motion, () => {
        const split = new SplitType(el, {
          types: 'lines',
          lineClass: 'line',
          tagName: 'span',
        });

        // SplitType gives us .line; we need an inner element to slide inside
        // the overflow mask, so wrap each line's contents once.
        const inners = split.lines.map((line) => {
          const inner = document.createElement('span');
          inner.className = 'line-inner';
          while (line.firstChild) inner.appendChild(line.firstChild);
          line.appendChild(inner);
          return inner;
        });

        const tween = gsap.from(inners, {
          yPercent: 116,
          duration,
          delay,
          stagger,
          ease: 'expo.out',
          ...(trigger
            ? { scrollTrigger: { trigger: scope.current, start, once: true } }
            : {}),
        });

        return () => {
          tween.scrollTrigger?.kill();
          tween.kill();
          split.revert();
        };
      });

      mm.add(MQ.still, () => {
        gsap.set(el, { clearProps: 'all' });
      });

      return () => mm.revert();
    },
    { scope, dependencies: [children, delay, stagger, duration, trigger, start] }
  );

  return (
    <Tag ref={scope} className={className} id={id}>
      {/* The unsplit string, for assistive technology. SplitType's per-line
          spans drop the whitespace between lines, which turns a heading into
          one run-together word in the accessible tree. */}
      <span className="ngd-visually-hidden">{children}</span>
      <span data-split aria-hidden="true">{children}</span>
    </Tag>
  );
}
