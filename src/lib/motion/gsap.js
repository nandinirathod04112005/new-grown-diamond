/**
 * The only place GSAP is configured.
 *
 * Every plugin in the library is registered here, so any component can reach
 * for the right tool without repeating registration and without a plugin
 * silently doing nothing because it was never registered. GSAP 3.13 made the
 * former Club plugins free, and 3.15 ships all of them in the public package —
 * so DrawSVG, MorphSVG, SplitText, Inertia, Physics2D and the rest are simply
 * available here now.
 *
 * REGISTERING IS NOT USING, and the house rules below still hold.
 *
 * ScrollTrigger was deliberately absent here for a long time, and the reason
 * still stands for the rest of the site: the reference build contains zero
 * `scrub:` and zero `pin:` usages, and every scroll-driven chapter on this site
 * is a phase state machine expressed in CSS. That approach survives a failed
 * script — the content is simply finished — which a scrubbed timeline does not.
 * It is registered for exactly ONE consumer: the CVD production sequence on
 * /diamonds, which was specified as a pinned, scrubbed story. Nothing else may
 * pin or scrub without the same deliberate decision being made again.
 *
 * ScrollTrigger must also be told when Lenis moves the page — see lenis.js.
 *
 * ScrollSmoother is registered and MUST NOT be started. This site's smooth
 * scrolling is Lenis (lib/motion/lenis.js); two smoothers on one page fight
 * over the same scroll position and the result is a document that stutters or
 * refuses to move. If ScrollSmoother is ever wanted, Lenis comes out first.
 *
 * PixiPlugin is registered but inert: it needs a Pixi application handed to it
 * with PixiPlugin.registerPIXI(), and this project renders WebGL through
 * three.js instead. It costs a few hundred bytes and is kept so the set is
 * complete and predictable rather than nearly complete.
 */
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

import { CustomEase } from 'gsap/CustomEase';
// CustomBounce and CustomWiggle are built on CustomEase, so it must come first.
import { CustomBounce } from 'gsap/CustomBounce';
import { CustomWiggle } from 'gsap/CustomWiggle';
import { ExpoScaleEase, RoughEase, SlowMo } from 'gsap/EasePack';

import { Draggable } from 'gsap/Draggable';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Flip } from 'gsap/Flip';
import { InertiaPlugin } from 'gsap/InertiaPlugin';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import { MorphSVGPlugin } from 'gsap/MorphSVGPlugin';
import { Observer } from 'gsap/Observer';
import { Physics2DPlugin } from 'gsap/Physics2DPlugin';
import { PhysicsPropsPlugin } from 'gsap/PhysicsPropsPlugin';
import { PixiPlugin } from 'gsap/PixiPlugin';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
// ScrollSmoother requires ScrollTrigger.
import { ScrollSmoother } from 'gsap/ScrollSmoother';
import { ScrollToPlugin } from 'gsap/ScrollToPlugin';
import { SplitText } from 'gsap/SplitText';
import { TextPlugin } from 'gsap/TextPlugin';

gsap.registerPlugin(
  useGSAP,
  Draggable,
  DrawSVGPlugin,
  Flip,
  InertiaPlugin,
  MotionPathPlugin,
  MorphSVGPlugin,
  Observer,
  Physics2DPlugin,
  PhysicsPropsPlugin,
  PixiPlugin,
  ScrambleTextPlugin,
  ScrollTrigger,
  ScrollSmoother,
  ScrollToPlugin,
  SplitText,
  TextPlugin,
  RoughEase,
  ExpoScaleEase,
  SlowMo,
  CustomEase,
  CustomBounce,
  CustomWiggle,
);

/*
 * GSDevTools and MotionPathHelper are the two that do not ship.
 *
 * They are authoring tools: GSDevTools draws a scrubber over the page and
 * MotionPathHelper makes a path draggable to edit it. Both are wanted while
 * building an animation and neither belongs in front of a customer — a
 * playback bar over the inventory is not a feature, it is a bug someone will
 * report. `import.meta.env.DEV` is a compile-time constant, so the production
 * build drops this branch and never downloads them.
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

export {
  gsap,
  useGSAP,
  CustomBounce,
  CustomEase,
  CustomWiggle,
  Draggable,
  DrawSVGPlugin,
  ExpoScaleEase,
  Flip,
  InertiaPlugin,
  MorphSVGPlugin,
  MotionPathPlugin,
  Observer,
  Physics2DPlugin,
  PhysicsPropsPlugin,
  PixiPlugin,
  RoughEase,
  ScrambleTextPlugin,
  ScrollSmoother,
  ScrollToPlugin,
  ScrollTrigger,
  SlowMo,
  SplitText,
  TextPlugin,
};
