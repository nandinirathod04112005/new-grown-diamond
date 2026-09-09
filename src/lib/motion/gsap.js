/**
 * The only place GSAP is configured.
 *
 * ScrollTrigger was deliberately absent here for a long time, and the reason
 * still stands for the rest of the site: the reference build contains zero
 * `scrub:` and zero `pin:` usages, and every scroll-driven chapter on this site
 * is a phase state machine expressed in CSS. That approach survives a failed
 * script — the content is simply finished — which a scrubbed timeline does not.
 *
 * It is registered now for exactly ONE consumer: the CVD production sequence on
 * /diamonds, which was specified as a pinned, scrubbed story. Registering a
 * plugin does not change any existing behaviour; nothing else may pin or scrub
 * without the same deliberate decision being made again.
 *
 * ScrollTrigger must also be told when Lenis moves the page — see lenis.js.
 */
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(useGSAP, ScrollTrigger);

gsap.defaults({ ease: 'power3.out', duration: 0.5 });

export { gsap, useGSAP, ScrollTrigger };
