import { useRef } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';

/**
 * Scroll-triggered reveal for any block of content.
 *
 * Children animate in once, on entering the viewport. Under reduced motion the
 * matchMedia `still` context clears the inline styles, so content is simply
 * present — never a jump-cut, never stuck invisible.
 */
export default function Reveal({
  children,
  as: Tag = 'div',
  y = 40,
  delay = 0,
  duration = 1.1,
  stagger = 0.08,
  selector = null,
  className,
  ...rest
}) {
  const scope = useRef(null);

  useGSAP(
    () => {
      const targets = selector
        ? gsap.utils.toArray(selector, scope.current)
        : [scope.current];
      if (!targets.length) return;

      const mm = gsap.matchMedia();

      mm.add(MQ.motion, () => {
        gsap.from(targets, {
          opacity: 0,
          y,
          duration,
          delay,
          stagger,
          ease: 'expo.out',
          scrollTrigger: {
            trigger: scope.current,
            start: 'top 82%',
            once: true,
          },
        });
      });

      mm.add(MQ.still, () => {
        gsap.set(targets, { clearProps: 'opacity,transform' });
      });

      return () => mm.revert();
    },
    { scope, dependencies: [selector, y, delay, duration, stagger] }
  );

  return (
    <Tag ref={scope} className={className} {...rest}>
      {children}
    </Tag>
  );
}
