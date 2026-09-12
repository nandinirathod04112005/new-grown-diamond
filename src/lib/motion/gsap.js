/**
 * The only place GSAP is configured.
 *
 * ONLY WHAT IS USED IS REGISTERED. This file used to import and register every
 * plugin in the library — DrawSVG, MorphSVG, SplitText, Flip, Draggable,
 * Inertia, Physics2D, ScrambleText, ScrollSmoother, Pixi and the rest — "so
 * any component could reach for them". None was used: every component imports
 * only `gsap` and `useGSAP`, and no tween anywhere sets a plugin property. They
 * were still downloaded and run on every page, on every phone, as part of a
 * 268 kB animation bundle loaded before anything could render.
 *
 * To use another plugin, import it here, add it to registerPlugin() and to
 * the exports below. The build fails loudly if a component asks for one that is
 * not exported, so nothing can silently depend on a plugin that is not loaded.
 *
 * ScrollTrigger is the one plugin registered, and the house rule for it still
 * holds: every scroll-driven chapter on this site is a phase state machine in
 * CSS, which survives a failed script — the content is simply finished. Pinned,
 * scrubbed timelines are reserved for the CVD production sequence on
 * /diamonds and the few reveals already built on it; nothing else may pin or
 * scrub without the same deliberate decision being made again.
 *
 * ScrollTrigger must also be told when Lenis moves the page — see lenis.js.
 * Smooth scrolling is Lenis; ScrollSmoother is deliberately not loaded, since
 * two smoothers on one page fight over the same scroll position.
 */
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/*
 * GSDevTools and MotionPathHelper are authoring tools: a scrubber drawn over
 * the page, and a draggable path editor. Wanted while building an animation,
 * never in front of a customer. `import.meta.env.DEV` is a compile-time
 * constant, so the production build drops this branch and never downloads
 * them.
 */
if (import.meta.env.DEV) {
  Promise.all([import('gsap/GSDevTools'), import('gsap/MotionPathHelper')])
    .then(([devTools, helper]) => {
      gsap.registerPlugin(devTools.GSDevTools, helper.MotionPathHelper);
    })
    .catch((error) => {
      console.warn('[NGD motion] GSAP authoring tools not loaded:', error?.message || error);
    });
}

gsap.defaults({ ease: 'power3.out', duration: 0.5 });

export { gsap, useGSAP, ScrollTrigger };
