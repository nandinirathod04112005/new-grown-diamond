import { useRef } from 'react';
import SplitType from 'split-type';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { MQ } from '@/lib/motion/media.js';
import { makeRandom } from '@/lib/journey.js';

/**
 * The headline assembles: letters begin softly scattered and settle into place.
 *
 * Three things keep this safe rather than the usual disaster:
 *
 * 1. IT FAILS VISIBLE. The scatter is applied only to the character spans
 *    SplitType creates, which exist only once JS has run. If the script never
 *    runs, the heading is ordinary text at full opacity — not a blank hero.
 *    The timeline is also built ready to run, never `paused` behind a flag.
 * 2. `split.revert()` runs in cleanup, so StrictMode's double mount restores
 *    the original DOM instead of splitting already-split markup.
 * 3. The split happens INSIDE matchMedia, so crossing a breakpoint re-splits
 *    against the new line breaks rather than animating stale characters.
 *
 * The scatter is seeded, so the assembly is the same every visit rather than a
 * different arrangement each load.
 */
export default function LetterAssemble({
  children,
  as: Tag = 'h1',
  className,
  id,
  delay = 0.15,
  seed = 0x4d1a,
  active = true,
}) {
  const scope = useRef(null);

  useGSAP(
    () => {
      const el = scope.current?.querySelector('[data-assemble]');
      if (!el) return undefined;

      const mm = gsap.matchMedia();

      mm.add(MQ.motion, () => {
        // Nothing is built until the caller says the heading is on screen.
        // The assembly used to run on mount, which is behind the preloader
        // curtain — it played to completion in the dark and the reader arrived
        // to a heading that had already finished assembling.
        //
        // Not building is also the safe state: with no split there are no
        // character spans, so the heading is ordinary, fully opaque text.
        if (!active) return undefined;

        const split = new SplitType(el, {
          types: 'lines,chars',
          lineClass: 'line',
          charClass: 'char',
          tagName: 'span',
        });

        const rnd = makeRandom(seed);
        const chars = split.chars ?? [];

        // fromTo with explicit endpoints, not from(): the resting state is
        // stated rather than captured, so nothing here can inherit a value
        // another tween happens to have set in the same tick.
        const tl = gsap.timeline({ delay });
        tl.fromTo(
          chars,
          {
            opacity: 0,
            // Softly scattered — a drift out of the dark, not an explosion.
            x: () => (rnd() - 0.5) * 90,
            y: () => (rnd() - 0.5) * 70,
            rotate: () => (rnd() - 0.5) * 14,
            filter: 'blur(7px)',
          },
          {
            opacity: 1,
            x: 0,
            y: 0,
            rotate: 0,
            filter: 'blur(0px)',
            duration: 1.5,
            ease: 'expo.out',
            stagger: { each: 0.016, from: 'random' },
          }
        );

        return () => {
          tl.kill();
          split.revert();
        };
      });

      // Reduced motion: no split at all. The heading is simply the heading —
      // nothing to clear, because nothing was ever set.
      return () => mm.revert();
    },
    { scope, dependencies: [children, delay, seed, active] }
  );

  return (
    <Tag ref={scope} className={className} id={id}>
      {/*
        SplitType wraps each line in its own span, and the whitespace BETWEEN
        those lines is dropped from the element's text content — so the split
        heading announced itself as "From carbonto brilliance". A heading is
        the first thing a screen reader user meets on this page; it may not be
        mangled to buy a letter animation.
        So the real string stays in the accessible tree, unsplit, and the
        animated copy is hidden from it.
      */}
      <span className="ngd-visually-hidden">{children}</span>
      <span data-assemble aria-hidden="true">{children}</span>
    </Tag>
  );
}
