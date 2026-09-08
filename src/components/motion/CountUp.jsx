import { useEffect, useRef } from 'react';

import { prefersReducedMotion } from '@/lib/motion/media.js';

/**
 * A number that counts to itself when it first comes into view.
 *
 * Used where the figure IS the argument. "98 square feet per carat" against
 * "0.076" is a difference of three orders of magnitude, and a number that
 * arrives already settled asks the reader to do that arithmetic themselves. A
 * number that runs makes the distance between the two legible as duration —
 * one races, the other barely moves — which is the same fact told in a way the
 * eye can catch.
 *
 * THE FINAL VALUE IS THE RENDERED DEFAULT. It is written into the DOM at
 * render, so the prerendered HTML, a no-JS crawler and a reader who has asked
 * for reduced motion all get the real figure. The animation only ever replaces
 * a correct number with a temporarily smaller one; it never supplies the
 * number in the first place.
 */

/* Ease-out cubic. Fast at the start, settling at the end — a counter that
   decelerates reads as arriving, one at constant speed reads as a stopwatch. */
const ease = (t) => 1 - (1 - t) ** 3;

const DURATION = 1500;

export default function CountUp({ value, decimals = 0, className }) {
  const ref = useRef(null);

  const format = (n) => n.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return undefined;

    /*
     * The width is reserved before anything moves.
     *
     * Counting 0 → 2,011 grows the text from one glyph to five, and an element
     * that widens mid-animation drags its neighbours with it. Locking the box
     * to the FINAL string keeps the layout still — the whole point of tabular
     * figures, finished properly.
     */
    el.style.minWidth = `${el.textContent.length}ch`;

    let raf = 0;
    let start = 0;

    const run = (now) => {
      if (!start) start = now;
      const t = Math.min((now - start) / DURATION, 1);
      el.textContent = format(value * ease(t));
      if (t < 1) raf = requestAnimationFrame(run);
    };

    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      raf = requestAnimationFrame(run);
    }, { threshold: 0.4 });

    io.observe(el);
    return () => { io.disconnect(); cancelAnimationFrame(raf); };
    // `format` closes over `decimals`, which never changes for a given figure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, decimals]);

  return <span ref={ref} className={className}>{format(value)}</span>;
}
