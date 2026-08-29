/**
 * The ONLY place GSAP plugins are registered. Import gsap/ScrollTrigger from
 * here so registration can never be duplicated or missed.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// Defaults every tween inherits unless it overrides them.
gsap.defaults({ ease: 'expo.out', duration: 1.1 });

export { gsap, ScrollTrigger, useGSAP };
