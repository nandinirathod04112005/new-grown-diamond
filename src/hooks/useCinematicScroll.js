import { useEffect } from 'react';

import { gsap, ScrollTrigger } from '@/lib/motion/gsap.js';
import useReducedMotion from './useReducedMotion.js';

/**
 * The public-site choreography modelled on the supplied reference: a hero
 * camera move, strongly travelling media and chapters that rise over the
 * previous one. GSAP owns these transforms end-to-end, just as it does on the
 * reference, instead of relying on optional CSS scroll-timeline support.
 */
export default function useCinematicScroll(path) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced || path.startsWith('/admin') || path === '/diamonds') return undefined;
    const main = document.querySelector('.u-above-film main');
    if (!main) return undefined;

    const context = gsap.context(() => {
        const sections = gsap.utils.toArray(':scope > section', main);
        const hero = sections[0];

        if (hero) {
          const media = hero.querySelector('img, picture, video');
          if (media) {
            gsap.fromTo(media,
              { scale: 1.18, yPercent: 0 },
              {
                scale: 1, yPercent: 7, ease: 'none',
                scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: 0.85 },
              });
          }
          const copy = hero.querySelector('h1')?.parentElement;
          if (copy) {
            gsap.to(copy, {
              yPercent: -12, opacity: 0.34, ease: 'none',
              scrollTrigger: { trigger: hero, start: '18% top', end: 'bottom top', scrub: 0.7 },
            });
          }
        }

        sections.slice(1).forEach((section, index) => {
          section.dataset.cinematicPanel = '';
          const media = section.querySelector('figure, picture, img, video');
          if (media && !media.closest('article')) {
            gsap.fromTo(media,
              { xPercent: index % 2 ? 22 : -22, scale: 1.14, rotate: index % 2 ? 1.5 : -1.5 },
              {
                xPercent: 0, scale: 1, rotate: 0, ease: 'none',
                scrollTrigger: { trigger: section, start: 'top 92%', end: 'center 48%', scrub: 0.9 },
              });
          }

          const heading = section.querySelector('h2, h3');
          if (heading) {
            gsap.fromTo(heading,
              { y: 70, opacity: 0, clipPath: 'inset(0 0 100% 0)' },
              {
                y: 0, opacity: 1, clipPath: 'inset(0)', duration: 1.15, ease: 'expo.out',
                scrollTrigger: { trigger: heading, start: 'top 88%', toggleActions: 'play none none reverse' },
              });
          }
        });

        ScrollTrigger.refresh();
    }, main);

    return () => {
      context.revert();
      main.querySelectorAll('[data-cinematic-panel]').forEach((node) => delete node.dataset.cinematicPanel);
    };
  }, [path, reduced]);
}
