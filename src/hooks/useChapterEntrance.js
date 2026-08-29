import { useRef } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';

/**
 * The one shared transition between chapters.
 *
 * Each chapter's content lifts and settles as it enters, scrubbed against the
 * scroll rather than fired once, so the hand-off from one chapter to the next
 * is continuous instead of seven independent entrances that happen to follow
 * each other. Desktop only — on a phone the chapters already arrive one at a
 * time and a scrubbed offset just fights the scroll.
 *
 * fromTo with explicit values, because a plain `to` would capture whatever
 * opacity a reveal happened to be mid-way through when it was created.
 */
export default function useChapterEntrance({ lift = 26 } = {}) {
  const scope = useRef(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(MQ.desktop, () => {
        const target = scope.current;
        if (!target) return undefined;

        const tween = gsap.fromTo(
          target,
          { y: lift, opacity: 0.55 },
          {
            y: 0,
            opacity: 1,
            ease: 'none',
            immediateRender: false,
            scrollTrigger: {
              trigger: target,
              start: 'top bottom',
              end: 'top 58%',
              scrub: 0.9,
            },
          }
        );
        return () => { tween.scrollTrigger?.kill(); tween.kill(); };
      });

      // Anything else: no offset at all, nothing to strand.
      mm.add('(max-width: 899px), (prefers-reduced-motion: reduce)', () => {
        gsap.set(scope.current, { clearProps: 'transform,opacity' });
      });

      return () => mm.revert();
    },
    { scope, dependencies: [lift] }
  );

  return scope;
}
