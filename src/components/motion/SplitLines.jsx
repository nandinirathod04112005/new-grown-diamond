import { Fragment, useRef } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import styles from './SplitLines.module.css';

/**
 * Line-by-line masked typography reveal.
 *
 * Lines are authored explicitly as an array rather than measured from rendered
 * text: measuring requires a layout pass that reflows on every font load and
 * resize, and gets it wrong at exactly the breakpoints that matter. Explicit
 * lines also keep the heading a single readable string for assistive tech —
 * the visible spans are aria-hidden and the full text is exposed once.
 */
export default function SplitLines({
  lines,
  as: Tag = 'h2',
  className,
  delay = 0,
  stagger = 0.12,
  duration = 1.3,
  trigger = true,
  id,
}) {
  const scope = useRef(null);

  useGSAP(
    () => {
      const targets = gsap.utils.toArray(`.${styles.inner}`, scope.current);
      if (!targets.length) return;

      const mm = gsap.matchMedia();

      mm.add(MQ.motion, () => {
        gsap.from(targets, {
          yPercent: 118,
          duration,
          delay,
          stagger,
          ease: 'expo.out',
          ...(trigger
            ? {
                scrollTrigger: {
                  trigger: scope.current,
                  start: 'top 85%',
                  once: true,
                },
              }
            : {}),
        });
      });

      mm.add(MQ.still, () => {
        gsap.set(targets, { clearProps: 'transform' });
      });

      return () => mm.revert();
    },
    { scope, dependencies: [lines, delay, stagger, duration, trigger] }
  );

  const plain = lines.map((l) => (typeof l === 'string' ? l : l.text)).join(' ');

  return (
    <Tag ref={scope} className={className} id={id}>
      <span className="ngd-visually-hidden">{plain}</span>
      <span aria-hidden="true">
        {lines.map((line, i) => (
          <Fragment key={i}>
            <span className={styles.line}>
              <span className={styles.inner}>
                {typeof line === 'string' ? line : line.node}
              </span>
            </span>
          </Fragment>
        ))}
      </span>
    </Tag>
  );
}
