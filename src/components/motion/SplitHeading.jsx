import { useRef } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import styles from './SplitHeading.module.css';

/**
 * A heading whose characters rise into place.
 *
 * The same device PageHero uses on every page title, lifted out so headings
 * further down a page can have it too. Two differences from that one, both
 * forced by where it sits: it fires on scroll rather than on mount, because a
 * heading four thousand pixels down has already finished animating by the time
 * anyone reaches it; and it holds a shorter, quieter throw, because a section
 * heading arriving as loudly as the page title flattens the difference between
 * them.
 *
 * WORDS STAY WHOLE and characters are the animated unit — a per-character
 * split that breaks words would let "Environmental" wrap mid-word the moment
 * the column narrows.
 *
 * The accessible name comes from `aria-label` and the split copy is
 * `aria-hidden`, with REAL SPACES between the words.
 *
 * PageHero solves the same problem by rendering the text twice — once visually
 * hidden for assistive technology, once split for the eye — which leaves the
 * heading's `textContent` reading "Diamond propertiesDiamondproperties".
 * Harmless to a screen reader, untidy for anything that extracts text: a
 * crawler, a copy-paste, a summary. Labelling the heading instead gets the same
 * result for assistive technology with the string present exactly once, and
 * keeping the spaces as real text nodes means what is extracted is the sentence
 * rather than a run of letters.
 *
 * The settled state is the CSS default, so a page whose script never runs shows
 * a finished heading rather than an invisible one.
 */
export default function SplitHeading({ as: Tag = 'h2', text, className, ...rest }) {
  const scope = useRef(null);

  useGSAP(
    (_context, contextSafe) => {
      if (prefersReducedMotion()) return;
      const el = scope.current;
      if (!el) return;

      const chars = el.querySelectorAll(`.${styles.char}`);
      if (!chars.length) return;

      // Already on screen at mount — an anchor jump or a restored scroll lands
      // here — so it is arrived, not pending. Without this the observer never
      // fires and the heading would sit hidden for ever.
      const play = contextSafe(() => gsap.fromTo(
        chars,
        { yPercent: 108, rotate: 2, opacity: 0 },
        { yPercent: 0, rotate: 0, opacity: 1, ease: 'power3.out', duration: 0.9,
          stagger: { amount: Math.min(0.32, chars.length * 0.012) } },
      ));

      if (el.getBoundingClientRect().top < window.innerHeight * 0.92) {
        play();
        return;
      }

      gsap.set(chars, { yPercent: 108, rotate: 2, opacity: 0 });
      const io = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        play();
      }, { rootMargin: '0px 0px -10% 0px', threshold: 0.2 });

      io.observe(el);
      return () => io.disconnect();
    },
    { scope, dependencies: [text] },
  );

  const words = String(text).split(' ');

  return (
    <Tag ref={scope} className={className} aria-label={text} {...rest}>
      <span aria-hidden="true">
        {words.map((word, wi) => (
          <span key={`${word}-${wi}`}>
            <span className={styles.word}>
              {[...word].map((ch, ci) => (
                <span key={`${ch}-${ci}`} className={styles.char}>{ch}</span>
              ))}
            </span>
            {/* A real space, not a margin: it is what makes the extracted text
                a sentence instead of one long word. */}
            {wi < words.length - 1 ? ' ' : null}
          </span>
        ))}
      </span>
    </Tag>
  );
}
