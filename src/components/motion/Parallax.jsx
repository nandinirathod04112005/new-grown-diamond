import { useRef } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';

/**
 * Subtle scrubbed parallax. Desktop + motion-accepting only: on phones the
 * effect costs scroll performance and reads as drift rather than depth.
 */
export default function Parallax({
  children,
  amount = 60,
  as: Tag = 'div',
  className,
  ...rest
}) {
  const scope = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MQ.desktop, () => {
        gsap.fromTo(
          scope.current,
          { yPercent: -amount / 10 },
          {
            yPercent: amount / 10,
            ease: 'none',
            scrollTrigger: {
              trigger: scope.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: 0.8,
            },
          }
        );
      });
      return () => mm.revert();
    },
    { scope, dependencies: [amount] }
  );

  return (
    <Tag ref={scope} className={className} {...rest}>
      {children}
    </Tag>
  );
}
