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
 *   the GEM is the pointer — written the instant the pointer moves, no easing
 *   the RING follows loosely, so it trails and settles a beat later
 * The gap between them is what reads as weight.
 *
 * THE GEM USED TO BE EASED TOO, at 0.34 a frame, and that was the bug people
 * actually felt. The native cursor is hidden while this runs, so the gem is not
 * a decoration near the pointer — it IS the pointer, and every frame of easing
 * is a frame of input lag with nothing on screen to check it against. Measured
 * on a sweep across the home page: the gem sat a median 26px behind the hand,
 * 33px at the 95th percentile, which is more than its own width. Easing a
 * trailing ring looks like weight; easing the mark you are aiming with just
 * feels like a slow computer.
 *
 * Nothing here touches React state. A cursor updates sixty times a second and
 * a re-render per frame would cost more than everything it is drawing.
 */

/**
 * How hard the ring pulls towards the pointer, per 60Hz frame.
 *
 * Tightened from 0.13 when the gem stopped easing. The look this is aiming at
 * is the GAP between the two layers, not the ring's own speed: the gem used to
 * sit about two frames of travel behind the hand and the ring about seven, so
 * the gap was five. Pinning the gem to the hand without touching this would
 * have widened that gap by half again and left the ring visibly lagging off on
 * its own. At 0.18 the ring sits about five frames back, so the distance
 * between gem and ring is what it always was — the gem simply caught up to
 * where it should have been all along.
 *
 * Applied per elapsed millisecond rather than per frame, or the trail would be
 * twice as tight on a 120Hz screen as on a 60Hz one — the same code reading as
 * two different designs depending on the monitor.
 */
const RING_EASE = 0.18;

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

/**
 * ...and where it is not, despite sitting inside one of those.
 *
 * `article a[href]` was catching EVERY link inside a card, not the card's own
 * link, and the result was the precise nonsense the note above warns about.
 * On the stone list the label appeared on nothing but "Enquire on WhatsApp"
 * and "Send a written enquiry" — the two links on the page that are not views
 * of anything — while the stones themselves got none. On the home page it read
 * VIEW over four phone numbers and three email addresses.
 *
 * These are actions and contact details: they start a conversation rather than
 * open a thing to look at. A card's real link — the one wrapping the picture or
 * the headline — still labels, because it is not on this list.
 */
const NOT_VIEWABLE = '[data-cursor="off"], a[href^="tel:"], a[href^="mailto:"], a[href^="sms:"], a[href*="wa.me/"], a[href*="whatsapp"], a[href*="/contact"]';

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
      let rx = tx, ry = ty;
      let raf = 0;
      let last = 0;
      let seen = false;

      /*
       * The ring only. The gem is written by the move handler below, and the
       * loop PARKS ITSELF once the ring has caught up: a cursor with a hand
       * resting on the desk used to hold a requestAnimationFrame callback open
       * for the entire visit, competing with the scroll smoother and every
       * ScrollTrigger on the page for the same frames.
       */
      const frame = (now) => {
        /* Eased per millisecond, not per frame, and capped so that returning
           to a backgrounded tab does not snap the ring across the screen. */
        const dt = last ? Math.min(64, now - last) : 16.7;
        last = now;
        const k = 1 - (1 - RING_EASE) ** (dt / 16.7);
        rx += (tx - rx) * k;
        ry += (ty - ry) * k;
        if (Math.abs(tx - rx) < 0.1 && Math.abs(ty - ry) < 0.1) {
          rx = tx; ry = ty;
          ring.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
          raf = 0; last = 0;
          return;
        }
        ring.style.transform = `translate3d(${rx.toFixed(2)}px, ${ry.toFixed(2)}px, 0)`;
        raf = requestAnimationFrame(frame);
      };

      const onMove = (e) => {
        tx = e.clientX;
        ty = e.clientY;
        /*
         * Written HERE, in the event, not a frame later in the loop. A pointer
         * event is dispatched just before the frame it belongs to is rendered,
         * so this lands on screen in that same frame — the gem is exactly where
         * the hand is, which is the entire job of a cursor.
         *
         * translate3d, not top/left: position via the compositor rather than
         * asking the browser to lay the page out again on every move.
         */
        dot.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
        if (!seen) {
          seen = true;
          /* The ring starts under the gem rather than swooping in from the
             middle of the screen on the first movement. */
          rx = tx; ry = ty;
          ring.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
          // Held hidden until the pointer actually moves, so it never flashes
          // at the centre of the screen on load.
          wrap.dataset.ready = '';
        }
        if (!raf) raf = requestAnimationFrame(frame);
      };

      const onOver = (e) => {
        const hit = e.target.closest?.(INTERACTIVE);
        if (!hit) {
          delete wrap.dataset.active;
          delete wrap.dataset.label;
          return;
        }
        wrap.dataset.active = '';
        const wantsLabel = e.target.closest?.(VIEWABLE);
        /* Asked from the matched element, so an image inside a mailto link is
           refused along with the link itself. */
        if (wantsLabel && label && !wantsLabel.closest(NOT_VIEWABLE)) {
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
      /* No opening frame: the loop is started by the first movement and stops
         again as soon as the ring has settled. */

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
