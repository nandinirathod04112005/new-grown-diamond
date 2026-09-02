/**
 * The only place GSAP is configured.
 *
 * Note what is NOT registered: ScrollTrigger. The reference site's compiled
 * bundle contains zero `scrub:` and zero `pin:` usages — its scroll motion is
 * a phase state machine expressed in CSS, not a scrubbed timeline. GSAP is
 * used there only for discrete timelines (preloader, overlays, transitions),
 * so that is all it is used for here.
 */
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

gsap.defaults({ ease: 'power3.out', duration: 0.5 });

export { gsap, useGSAP };
