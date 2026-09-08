import { useEffect, useRef } from 'react';

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
     * Two refusals, both asked as capability questions rather than size ones.
     *
     * There used to be a third: anything under 900px wide was refused, on the
     * grounds that it was probably a small hybrid where hiding the system
     * cursor could leave someone with no pointer at all. That guard was
     * measuring the wrong thing. A desktop browser window dragged to half a 1366px
     * screen reports 683px with `hover: hover`, `pointer: fine` and
     * `pointer: coarse` false — an ordinary mouse, refused for being narrow.
     *
     * `(hover: hover) and (pointer: fine)` answers the actual question. A
     * tablet in tablet mode reports coarse and is excluded; the same tablet
     * with a mouse attached reports fine, and there the gem is correct. Width
     * never entered into it.
     */
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const still = window.matchMedia('(prefers-reduced-motion: reduce)');

    const start = () => {
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
        /* Clear the visual state too, or a gem frozen mid-screen outlives the
           cursor that was drawing it. */
        delete wrap.dataset.ready;
        delete wrap.dataset.active;
        delete wrap.dataset.label;
        delete wrap.dataset.press;
      };
      };

      /*
       * Re-asked whenever the answer can change, not once at mount.
       *
       * Deciding this a single time meant a window opened narrow and then
       * widened never got the cursor, and one that gained a mouse mid-session
       * never noticed. Plugging in a mouse, unplugging it, or switching
       * reduced-motion on all flip these queries, and the cursor now follows.
       */
    let stop = null;
    const sync = () => {
      const wanted = fine.matches && !still.matches;
      if (wanted && !stop) stop = start();
      else if (!wanted && stop) { stop(); stop = null; }
    };

    sync();
    fine.addEventListener('change', sync);
    still.addEventListener('change', sync);

    return () => {
      fine.removeEventListener('change', sync);
      still.removeEventListener('change', sync);
      stop?.();
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
