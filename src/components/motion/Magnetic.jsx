import { useRef } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';

/**
 * Magnetic pointer attraction, applied to whatever single child is passed.
 *
 * Registered only under the `pointer` context — a fine pointer AND
 * motion-accepting — so touch devices never pay for it and never get stuck
 * with a transformed element after a tap.
 */
export default function Magnetic({ children, strength = 0.32, className }) {
  const scope = useRef(null);

  useGSAP(
    () => {
      const el = scope.current?.firstElementChild;
      if (!el) return;

      const mm = gsap.matchMedia();

      mm.add(MQ.pointer, () => {
        const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
        const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });

        const onMove = (event) => {
          const rect = el.getBoundingClientRect();
          const relX = event.clientX - (rect.left + rect.width / 2);
          const relY = event.clientY - (rect.top + rect.height / 2);
          xTo(relX * strength);
          yTo(relY * strength);
        };
        const onLeave = () => {
          xTo(0);
          yTo(0);
        };

        const zone = scope.current;
        zone.addEventListener('pointermove', onMove);
        zone.addEventListener('pointerleave', onLeave);
        // A focused control must sit where the keyboard user expects it.
        el.addEventListener('blur', onLeave);

        return () => {
          zone.removeEventListener('pointermove', onMove);
          zone.removeEventListener('pointerleave', onLeave);
          el.removeEventListener('blur', onLeave);
          gsap.set(el, { x: 0, y: 0 });
        };
      });

      return () => mm.revert();
    },
    { scope, dependencies: [strength] }
  );

  return (
    <span ref={scope} className={className} style={{ display: 'inline-block' }}>
      {children}
    </span>
  );
}
