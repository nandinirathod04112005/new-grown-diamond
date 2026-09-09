import { useEffect } from 'react';
import useReducedMotion from './useReducedMotion.js';

// Enhances content that does not already have a bespoke scroll timeline.
// Nothing is hidden before observation, so fast scrolling and lazy routes
// always retain readable content.
const TARGETS = 'main h1:not([aria-label]), main h2:not([aria-label]), main details, main form > div, footer > div';

export default function usePageAnimations(path) {
  const reduced = useReducedMotion();
  useEffect(() => {
    if (reduced) return undefined;
    const seen = new WeakSet();
    const animations = new Set();
    let frame = 0;
    const observer = new IntersectionObserver((entries) => {
      let index = 0;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const node = entry.target;
        observer.unobserve(node);
        // Focused form fields must remain stationary and immediately readable.
        if (node.contains(document.activeElement)) continue;
        const animation = node.animate([
          { opacity: 0.25, translate: '0 16px' },
          { opacity: 1, translate: '0 0' },
        ], { duration: 700, delay: Math.min(index++ * 60, 240), easing: 'cubic-bezier(.22,1,.36,1)' });
        animations.add(animation);
        animation.onfinish = () => animations.delete(animation);
      }
    }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });
    const scan = () => {
      frame = 0;
      document.querySelectorAll(TARGETS).forEach((node) => {
        if (seen.has(node)) return;
        seen.add(node);
        if (node.closest('[data-reveal], [aria-labelledby="cvd-process"], [data-motion="off"]')) return;
        // Existing CSS/GSAP entrances keep ownership of their own elements.
        if (node.getAnimations().length || node.style.transform || node.style.opacity) return;
        observer.observe(node);
      });
    };
    const changes = new MutationObserver((records) => {
      // Counters and scroll readouts replace text every frame; only newly
      // mounted elements can introduce animation targets.
      const hasElements = records.some((record) =>
        Array.from(record.addedNodes).some((node) => node.nodeType === 1));
      if (hasElements && !frame) frame = requestAnimationFrame(scan);
    });
    changes.observe(document.body, { childList: true, subtree: true });
    scan();
    return () => {
      changes.disconnect();
      observer.disconnect();
      cancelAnimationFrame(frame);
      animations.forEach((animation) => animation.cancel());
    };
  }, [path, reduced]);
}
