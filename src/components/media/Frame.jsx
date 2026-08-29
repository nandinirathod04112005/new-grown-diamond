import { useRef } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import styles from './Frame.module.css';

/**
 * An image revealed by a clip-path wipe, with the picture counter-moving
 * behind the mask so the frame opens onto the image rather than dragging it
 * into view. Optional scrubbed parallax on desktop.
 *
 * width/height are required and forwarded to the <img>, so the box is reserved
 * before the file arrives and the reveal never causes layout shift.
 */
export default function Frame({
  src,
  alt,
  width,
  height,
  ratio = '4 / 5',
  parallax = 0,
  from = 'bottom',
  className = '',
  priority = false,
  children,
}) {
  const scope = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      const mask = scope.current.querySelector(`.${styles.mask}`);
      const img = scope.current.querySelector('img');

      const CLOSED = {
        bottom: 'inset(100% 0% 0% 0%)',
        left: 'inset(0% 100% 0% 0%)',
        right: 'inset(0% 0% 0% 100%)',
      }[from];

      mm.add(MQ.motion, () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: scope.current, start: 'top 86%', once: true },
        });
        tl.fromTo(mask,
          { clipPath: CLOSED },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.35, ease: 'expo.inOut' })
         .fromTo(img,
          { scale: 1.22 },
          { scale: 1, duration: 1.6, ease: 'expo.out' }, 0);

        if (parallax) {
          gsap.fromTo(img, { yPercent: -parallax / 2 }, {
            yPercent: parallax / 2,
            ease: 'none',
            scrollTrigger: {
              trigger: scope.current,
              start: 'top bottom', end: 'bottom top', scrub: 0.9,
            },
          });
        }
        return () => tl.scrollTrigger?.kill();
      });

      mm.add(MQ.still, () => {
        gsap.set(mask, { clearProps: 'clipPath' });
        gsap.set(img, { clearProps: 'transform' });
      });

      return () => mm.revert();
    },
    { scope, dependencies: [src, parallax, from] }
  );

  return (
    <figure ref={scope} className={`${styles.frame} ${className}`} style={{ '--ratio': ratio }}>
      <div className={styles.mask}>
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
        />
      </div>
      {children}
    </figure>
  );
}
