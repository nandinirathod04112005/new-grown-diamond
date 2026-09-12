import { useEffect } from 'react';
import useReducedMotion from './useReducedMotion.js';

/**
 * The reveal that every page gets for free.
 *
 * WHAT CHANGED AND WHY. This used to watch four selectors — h1, h2, details,
 * form rows and footer blocks — which meant that on most of the site the only
 * thing that ever moved was a heading. Paragraphs, photographs, cards, lists
 * and tables all simply appeared. The page read as static, because it was.
 *
 * It now treats a page as a sequence of blocks and gives each KIND of block
 * the entrance that suits it:
 *
 *   heading      rises furthest and slowest; it is the anchor of the section
 *   image        opens from a slight scale with the light coming up behind it
 *   card         rises with its siblings, staggered, so a grid deals itself in
 *   text         rises a little, quickly, because it exists to be read
 *
 * Four rules keep it from becoming noise or breaking something:
 *
 *   1. NOTHING IS HIDDEN BEFORE IT IS OBSERVED. Every element is animated with
 *      `fill: 'backwards'` from its own resting state, so a failed script, a
 *      lazy route or a fast flick leaves finished, readable content — never a
 *      page of invisible boxes waiting for a callback that never comes.
 *   2. BESPOKE TIMELINES KEEP OWNERSHIP. Anything already animating, already
 *      carrying an inline transform, or inside a section that runs its own
 *      choreography, is left alone. Two systems moving one element is how a
 *      hero ends up jittering.
 *   3. A FOCUSED FIELD NEVER MOVES. If focus lands inside an element mid-flight
 *      the animation is cancelled outright.
 *   4. STAGGER IS PER SECTION, not per callback batch. Sibling blocks deal in
 *      one after another; a section further down does not inherit a long delay
 *      from the one above it.
 */

/*
 * What counts as a block. Deliberately not "every div": animating every
 * wrapper on a page produces a slot machine, costs compositor memory, and
 * moves elements a reader is already looking at. These are the things a
 * visitor perceives as content.
 */
const TARGETS = [
  'main h1', 'main h2', 'main h3', 'main h4',
  'main p', 'main li', 'main dt', 'main dd', 'main blockquote',
  'main figure', 'main picture', 'main img', 'main video',
  'main table', 'main details', 'main fieldset',
  /* Content-level divs move as composed groups. Restricting this to direct
     layout children prevents five nested wrappers from multiplying one
     20px entrance into a 100px jump while still covering every visible
     section, card, form row and page panel. */
  'main > div', 'main section > div', 'main article > div', 'main form > div',
  'main article', 'main hr', 'main a', 'main button',
  'footer > div', 'footer h2', 'footer p', 'footer li',
].join(', ');

/* Sections that run their own timeline, and everything inside them. */
const OWNED = '[data-reveal], [data-motion="off"], [aria-labelledby="cvd-process"]';

const KIND = (node) => {
  const tag = node.tagName;
  if (/^H[1-4]$/.test(tag)) return 'heading';
  if (tag === 'IMG' || tag === 'PICTURE' || tag === 'FIGURE' || tag === 'VIDEO') return 'image';
  if (tag === 'ARTICLE') return 'card';
  if (tag === 'DIV') return 'container';
  if (tag === 'A' || tag === 'BUTTON') return 'interactive';
  if (tag === 'HR') return 'rule';
  if (node.closest('form')) return 'field';
  return 'text';
};

/* Distance, duration and easing per kind. Phones move things less: a small
   screen exaggerates travel, and the whole block is closer to the eye. They
   also move things faster (see LITE_PACE): a thumb flicks past a screen of
   content in a fraction of a second, and an entrance still running a second
   later reads as content that is late, not content that is arriving. */
const LITE_PACE = 0.62;

function recipe(kind, coarse) {
  const base = recipeFor(kind, coarse);
  return coarse ? { ...base, duration: Math.round(base.duration * LITE_PACE) } : base;
}

function recipeFor(kind, coarse) {
  switch (kind) {
    case 'heading':
      return { y: coarse ? 18 : 34, scale: 1, duration: 950 };
    case 'image':
      return { y: coarse ? 14 : 26, scale: 1.035, duration: 1150 };
    case 'card':
      return { y: coarse ? 16 : 28, scale: 1.012, duration: 900 };
    case 'container':
      return { y: coarse ? 12 : 22, scale: 1.008, duration: 880 };
    case 'interactive':
      return { y: coarse ? 7 : 11, scale: 0.985, duration: 620 };
    case 'rule':
      return { y: 0, scale: 1, duration: 800, ruled: true };
    case 'field':
      return { y: 0, scale: 1, duration: 320 };
    default:
      return { y: coarse ? 10 : 18, scale: 1, duration: 780 };
  }
}

export default function usePageAnimations(path) {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return undefined;
    if (path === '/admin' || path.startsWith('/admin/')) return undefined;
    if (typeof IntersectionObserver === 'undefined') return undefined;
    if (typeof Element === 'undefined' || !Element.prototype.animate) return undefined;

    const seen = new WeakSet();
    const animations = new Map();
    /* One counter per section, so a grid staggers within itself. */
    const order = new WeakMap();
    /* Touch screens and narrow windows get the light version: shorter, no
       blur, and started just before the block scrolls in rather than after.
       Animating blur() re-draws the whole block through a filter on every
       frame, which a phone's graphics chip does slowly enough to stutter the
       scroll, and the same entrance without it still reads. */
    const coarse = window.matchMedia('(pointer: coarse), (max-width: 767px)').matches;
    let frame = 0;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const node = entry.target;
          observer.unobserve(node);

          /* A field the visitor is typing in must not move under them. */
          if (node.contains(document.activeElement)) continue;

          const kind = KIND(node);
          const { y, scale, duration, ruled } = recipe(kind, coarse);

          /* An article is itself one of the targets, so asking it for the
             closest article made every card its own group and every delay was
             zero. Cards now inherit their containing section as the group and
             deal into view in a real sequence. */
          const group = node.tagName === 'ARTICLE'
            ? (node.parentElement?.closest('section, main, footer') || document.body)
            : (node.closest('section, footer, article') || document.body);
          const index = (order.get(group) ?? 0);
          order.set(group, index + 1);
          const delay = coarse ? Math.min(index * 40, 160) : Math.min(index * 65, 260);

          const from = ruled
            ? { opacity: 0, transform: 'scaleX(0)', transformOrigin: 'left center' }
            : {
              opacity: 0,
              transform: `translate3d(0, ${y}px, 0) scale(${scale})`,
              filter: coarse ? 'none' : kind === 'image' ? 'blur(9px) saturate(.72)' : kind === 'heading' ? 'blur(5px)' : 'none',
              clipPath: kind === 'heading' ? 'inset(0 0 100% 0)' : kind === 'image' && !coarse ? 'inset(3% 0 3% 0)' : 'inset(0)',
            };
          const to = ruled
            ? { opacity: 1, transform: 'scaleX(1)', transformOrigin: 'left center' }
            : {
              opacity: 1,
              transform: 'translate3d(0, 0, 0) scale(1)',
              filter: 'none',
              clipPath: 'inset(0)',
            };

          const animation = node.animate([from, to], {
            duration,
            delay,
            /* An expo-out curve: most of the distance is covered immediately,
               and the last few pixels take their time. It is what makes a
               move read as weight rather than as a slide. */
            easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
            /* backwards, never both: the element keeps its own resting style
               once the animation is done, so nothing is left overridden. */
            fill: 'backwards',
          });

          animations.set(node, animation);
          animation.onfinish = () => animations.delete(node);
          animation.oncancel = () => animations.delete(node);
        }
      },
      /* A phone starts the entrance as the block reaches the bottom edge, so
         it is already under way when it comes into sight after a flick. */
      { threshold: 0.06, rootMargin: coarse ? '0px 0px 6% 0px' : '0px 0px -8% 0px' },
    );

    const scan = () => {
      frame = 0;
      document.querySelectorAll(TARGETS).forEach((node) => {
        if (seen.has(node)) return;
        seen.add(node);

        /* Empty wrappers and spacers are not content. */
        if (!node.textContent?.trim() && !/^(IMG|PICTURE|FIGURE|VIDEO|HR|TABLE)$/.test(node.tagName)) return;
        if (node.closest(OWNED)) return;
        /* An image inside a figure we are already animating would move twice. */
        if (node.parentElement?.closest('figure, picture') && node.tagName === 'IMG') return;
        /* Bespoke entrances keep ownership of their own elements. */
        if (node.getAnimations().length || node.style.transform || node.style.opacity) return;

        observer.observe(node);
      });
    };

    const changes = new MutationObserver((records) => {
      const addedElements = records.some((record) =>
        Array.from(record.addedNodes).some((node) => node.nodeType === 1));
      if (addedElements && !frame) frame = requestAnimationFrame(scan);
    });

    changes.observe(document.body, { childList: true, subtree: true });
    scan();

    const focus = (event) => {
      animations.forEach((animation, node) => {
        if (node.contains(event.target)) {
          animation.cancel();
          animations.delete(node);
        }
      });
    };

    const visibility = () => animations.forEach((animation) => {
      if (document.hidden) animation.pause();
      else animation.play();
    });

    document.addEventListener('focusin', focus);
    document.addEventListener('visibilitychange', visibility);

    return () => {
      document.removeEventListener('focusin', focus);
      document.removeEventListener('visibilitychange', visibility);
      changes.disconnect();
      observer.disconnect();
      cancelAnimationFrame(frame);
      animations.forEach((animation) => animation.cancel());
    };
  }, [path, reduced]);
}
