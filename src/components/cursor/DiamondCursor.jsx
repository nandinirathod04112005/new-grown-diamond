import { useEffect, useRef } from 'react';

import { prefersReducedMotion } from '@/lib/motion/media.js';
import styles from './DiamondCursor.module.css';

/*
 * Referenced by URL, not imported. Anything under public/ is copied verbatim
 * and served from the site root — importing it as a module asks the bundler to
 * resolve a path that only exists at runtime.
 */
const GEM_SRC = '/assets/brand/ngd-cursor-diamond.png';

/**
 * The house gem, following the pointer.
 *
 * Only the cyan stone from the New Grown Diamond lockup — never the laurel or
 * the wordmark. At the ~22px a cursor occupies, the wreath collapses into a
 * green smear and the company name is unreadable; a logo used below the size
 * its wordmark survives stops identifying anything and becomes noise. The gem
 * is the part that reads small, and it is what people already recognise.
 *
 * Two layers on two clocks, which is the whole trick:
 *   the GEM follows tightly, so it never feels laggy under a moving hand
 *   the RING follows loosely, so it trails and settles a beat later
 * One damping constant for both would give either a stuck sticker or a
 * balloon on a string. The gap between them is what reads as weight.
 *
 * Nothing here touches React state. A cursor updates sixty times a second and
 * a re-render per frame would cost more than everything it is drawing.
 */

/** Follow strength per frame. Higher is tighter. */
const GEM_EASE = 0.34;
const RING_EASE = 0.13;

/** Below this width the pointer is probably a stylus or a small hybrid. */
const MIN_WIDTH = 900;

/** Clickable things the gem should react to. */
const INTERACTIVE = 'a[href], button, [role="button"], input, textarea, select, summary, label[for], [tabindex]:not([tabindex="-1"])';

/**
 * Where a "VIEW" label is actually useful.
 *
 * Not on every clickable thing — a label reading VIEW over a theme toggle or a
 * form field is nonsense, and one that appears everywhere stops being read at
 * all. It belongs on things you look AT: a stone, a journal entry, a card that
 * opens something. Anything can opt in explicitly with data-cursor="view".
 */
const VIEWABLE = '[data-cursor="view"], article a[href], a[href] img, figure a[href]';

export default function DiamondCursor() {
  const root = useRef(null);
  const gemRef = useRef(null);
  const ringRef = useRef(null);
  const labelRef = useRef(null);

  useEffect(() => {
    const wrap = root.current;
    const dot = gemRef.current;
    const ring = ringRef.current;
    const label = labelRef.current;
    if (!wrap || !dot || !ring) return undefined;

    /*
     * Three refusals, all deliberate:
     *   coarse pointer  — a finger has no cursor to replace
     *   small screen    — hiding the system cursor on a hybrid device can
     *                     leave someone with no pointer at all
     *   reduced motion  — a trailing, easing, sparking cursor is exactly the
     *                     unrequested movement that setting asks us to drop
     * In every case the native cursor is left completely alone.
     */
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    const narrow = window.innerWidth < MIN_WIDTH;
    if (coarse || narrow || prefersReducedMotion()) return undefined;

    document.documentElement.dataset.customCursor = 'on';

    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let gx = tx, gy = ty, rx = tx, ry = ty;
    let raf = 0;
    let seen = false;

    const frame = () => {
      gx += (tx - gx) * GEM_EASE;
      gy += (ty - gy) * GEM_EASE;
      rx += (tx - rx) * RING_EASE;
      ry += (ty - ry) * RING_EASE;
      // translate3d, not top/left: position via the compositor rather than
      // asking the browser to lay the page out again sixty times a second.
      dot.style.transform = `translate3d(${gx.toFixed(2)}px, ${gy.toFixed(2)}px, 0)`;
      ring.style.transform = `translate3d(${rx.toFixed(2)}px, ${ry.toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(frame);
    };

    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      if (!seen) {
        seen = true;
        // Held hidden until the pointer actually moves, so it never flashes
        // at the centre of the screen on load.
        wrap.dataset.ready = '';
      }
    };

    const onOver = (e) => {
      const hit = e.target.closest?.(INTERACTIVE);
      wrap.dataset.active = hit ? '' : undefined;
      if (!hit) {
        delete wrap.dataset.active;
        delete wrap.dataset.label;
        return;
      }
      wrap.dataset.active = '';
      const wantsLabel = e.target.closest?.(VIEWABLE);
      if (wantsLabel && label) {
        label.textContent = wantsLabel.dataset?.cursorLabel || 'View';
        wrap.dataset.label = '';
      } else {
        delete wrap.dataset.label;
      }
    };

    /* A short burst of chips thrown off the point of contact. */
    const onDown = () => {
      wrap.dataset.press = '';
      const burst = document.createElement('span');
      burst.className = styles.burst;
      burst.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
      for (let i = 0; i < 7; i += 1) {
        const chip = document.createElement('i');
        // Fixed angles with a little jitter: evenly spaced looks mechanical,
        // fully random clumps and leaves gaps.
        const a = (i / 7) * Math.PI * 2 + Math.random() * 0.5;
        const d = 16 + Math.random() * 14;
        chip.style.setProperty('--dx', `${(Math.cos(a) * d).toFixed(1)}px`);
        chip.style.setProperty('--dy', `${(Math.sin(a) * d).toFixed(1)}px`);
        chip.style.setProperty('--delay', `${(i * 8).toFixed(0)}ms`);
        burst.append(chip);
      }
      wrap.append(burst);
      // Self-removing, so a long session cannot accumulate dead nodes.
      burst.addEventListener('animationend', () => burst.remove(), { once: true });
      window.setTimeout(() => burst.remove(), 900);
    };

    const onUp = () => { delete wrap.dataset.press; };
    const onLeave = () => { delete wrap.dataset.ready; };
    const onEnter = () => { wrap.dataset.ready = ''; };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.addEventListener('pointerleave', onLeave);
    document.addEventListener('pointerenter', onEnter);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointerleave', onLeave);
      document.removeEventListener('pointerenter', onEnter);
      delete document.documentElement.dataset.customCursor;
    };
  }, []);

  return (
    <div ref={root} className={styles.root} aria-hidden="true">
      <span ref={ringRef} className={styles.ring} />
      <span ref={gemRef} className={styles.gem}>
        <img src={GEM_SRC} alt="" width="24" height="24" draggable="false" />
        <em ref={labelRef} className={styles.label} />
      </span>
    </div>
  );
}
