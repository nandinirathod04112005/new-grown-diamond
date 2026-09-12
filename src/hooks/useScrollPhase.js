import { useEffect, useRef, useState } from 'react';

import { prefersReducedMotion } from '@/lib/motion/media.js';

/**
 * The scroll engine, rebuilt on the reference site's model.
 *
 * That site pins nothing and scrubs nothing. Instead each chapter is a tall
 * spacer whose child markers carry explicit viewport heights — `in` at 50vh,
 * `view` at 150vh, `out` at 80vh — while the visual block above it is plain
 * `position: sticky`. As the spacer passes, JS writes the current marker name
 * onto the block as a data attribute and CSS transitions do every pixel of the
 * motion. Scroll distance is therefore authored as CSS height, not as timeline
 * duration, which is why the whole site needs no ScrollTrigger.
 *
 * Two values come out of one measurement per frame:
 *   phase  — React state, changes ~3x per chapter, so re-renders stay cheap
 *   --p    — phase-local progress 0..1, written straight to the element, so
 *            the sixty-per-second value never touches React at all
 *
 * The rAF loop only runs while the chapter is near the viewport; an
 * IntersectionObserver gates it, so off-screen chapters cost nothing.
 *
 * @param {{name: string, vh: number}[]} phases
 */
export function useScrollPhase(phases, progressRef) {
  const sceneRef = useRef(null);
  const targetRef = useRef(null);
  // Initialised, not corrected in an effect: under reduced motion the
  // chapter's first paint is already its arrived state.
  const [phase, setPhase] = useState(() =>
    prefersReducedMotion() ? 'view' : (phases[0]?.name ?? 'in'),
  );

  useEffect(() => {
    const scene = sceneRef.current;
    const target = targetRef.current;
    if (!scene || !target) return undefined;

    // Reduced motion never animates through the states: the chapter simply
    // presents itself, fully arrived, and stays that way.
    if (prefersReducedMotion()) {
      target.style.setProperty('--p', '1');
      target.style.setProperty('--sp', '1');
      return undefined;
    }

    const total = phases.reduce((sum, p) => sum + p.vh, 0);

    // Normalised cumulative boundaries, so a chapter can be re-weighted by
    // editing one vh number without touching any other value.
    const bounds = [];
    let walked = 0;
    for (const p of phases) {
      const start = walked / total;
      walked += p.vh;
      bounds.push({ name: p.name, start, end: walked / total });
    }

    let frame = 0;
    let running = false;
    let lastPhase = null;
    let lastSp = -1;

    /*
     * Where the chapter sits on the page, read when something changes size
     * rather than on every frame. Asking getBoundingClientRect() inside the
     * loop forced a layout sixty times a second for as long as the chapter was
     * anywhere near the screen, scrolling or not; on a phone that was a steady
     * share of every frame. The page's own height changing (a section above
     * loading its pictures, fonts arriving) and the chapter's changing are the
     * only things that move it, so those are what trigger a fresh reading.
     */
    let top = 0;
    let height = 0;
    const locate = () => {
      const rect = scene.getBoundingClientRect();
      top = rect.top + window.scrollY;
      height = rect.height;
    };
    locate();
    const resized = new ResizeObserver(() => { locate(); lastSp = -1; });
    resized.observe(document.body);
    resized.observe(scene);

    const measure = (loop = true) => {
      const travel = height - window.innerHeight;
      const raw = travel > 0 ? (window.scrollY - top) / travel : 0;
      const sp = Math.min(1, Math.max(0, raw));
      /* Unmoved since the last frame: nothing to write, nothing to restyle. */
      if (sp === lastSp) {
        if (loop) frame = requestAnimationFrame(measure);
        return;
      }
      lastSp = sp;

      const band =
        bounds.find((b) => sp >= b.start && sp < b.end) ?? bounds[bounds.length - 1];
      const span = band.end - band.start;
      const p = span > 0 ? Math.min(1, Math.max(0, (sp - band.start) / span)) : 1;

      target.style.setProperty('--sp', sp.toFixed(4));
      target.style.setProperty('--p', p.toFixed(4));

      // A canvas cannot read a CSS custom property, so the same numbers are
      // published to a ref. Never to state: at sixty readings a second that
      // would re-render the tree on every pixel of scroll.
      if (progressRef) progressRef.current = { sp, p, phase: band.name };

      if (band.name !== lastPhase) {
        lastPhase = band.name;
        setPhase(band.name);
      }

      // `loop` is false for the single settling read taken when a chapter
      // leaves the observed band, so it resolves without starting a loop.
      if (loop) frame = requestAnimationFrame(measure);
    };

    const start = () => {
      if (running) return;
      running = true;
      frame = requestAnimationFrame(measure);
    };

    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          start();
          return;
        }
        // Without this final reading, a chapter scrolled past in one jump —
        // an anchor link, a restored scroll position, a fast flick — never
        // runs a frame, so its phase stays at whatever it was initialised to
        // and it renders as an arriving chapter forever.
        stop();
        measure(false);
      },
      // One viewport of lead-in on both sides, so a chapter is already
      // measuring by the time any part of it can be seen.
      { rootMargin: '100% 0px 100% 0px' },
    );
    io.observe(scene);

    return () => {
      io.disconnect();
      resized.disconnect();
      stop();
    };
  }, [phases, progressRef]);

  return { sceneRef, targetRef, phase };
}
