import { useRef } from 'react';
import { ArrowRight, ArrowUpRight, FileCheck2, Microscope, PanelsTopLeft } from 'lucide-react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import bench from '@/assets/process/grading-bench.webp';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './Transparency.copy.js';
import s from './Transparency.module.css';

/**
 * The transparency block from the previous site, in the owner's words.
 *
 * The heading is new — the old block had none — and the three points under
 * the copy are the paragraph's own first sentence taken apart: the inventory
 * is online, it carries certificates and videos, and the desk inspects on
 * request. Nothing is claimed here that the paragraph does not already say.
 *
 * MOTION. The photograph opens from the right and keeps drifting while it is
 * on screen; the card rises over it, its words following in order; the three
 * points arrive last. Owned by this section (data-motion="off"), and entirely
 * absent under reduced motion.
 */
/* Each point's words are `points[id]` in Transparency.copy.js. */
const POINTS = [
  { Icon: PanelsTopLeft, id: 'inventory' },
  { Icon: FileCheck2, id: 'certificates' },
  { Icon: Microscope, id: 'inspection' },
];

/* A paragraph from the copy, its `**phrase**` marks set in <strong>, wherever
   a translation's word order puts them. */
function emphasis(text) {
  return text.split('**').map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));
}

export default function Transparency() {
  const root = useRef(null);
  const c = useCopy(COPY);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({
        defaults: { ease: 'expo.out' },
        scrollTrigger: { trigger: root.current, start: 'top 72%', once: true },
      });
      tl.fromTo(q(`.${s.frame}`), { clipPath: 'inset(0% 0% 0% 100%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.6, ease: 'expo.inOut' }, 0)
        .fromTo(q(`.${s.card}`), { y: 70, opacity: 0 }, { y: 0, opacity: 1, duration: 1.3 }, 0.35)
        .fromTo(q(`.${s.rule}`), { scaleX: 0 }, { scaleX: 1, duration: 0.9 }, 0.6)
        .fromTo(q(`.${s.word}`), { yPercent: 115 }, { yPercent: 0, duration: 1, stagger: 0.05 }, 0.6)
        .fromTo(q(`.${s.card} p:not(.${s.eyebrow})`), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, stagger: 0.1 }, 0.8)
        .fromTo(q(`.${s.points} li`), { y: 14, opacity: 0, scale: 0.96 }, { y: 0, opacity: 1, scale: 1, duration: 0.7, stagger: 0.09 }, 1.05)
        .fromTo(q(`.${s.actions} > *`), { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.08 }, 1.15);

      gsap.fromTo(
        q(`.${s.frame} img`),
        { xPercent: -4, scale: 1.14 },
        { xPercent: 4, scale: 1.04, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom top', scrub: true } },
      );
      gsap.fromTo(
        q(`.${s.band}`),
        { scaleX: 0.6 },
        { scaleX: 1, ease: 'none', scrollTrigger: { trigger: root.current, start: 'top 90%', end: 'center center', scrub: true } },
      );
    },
    { scope: root },
  );

  const heading = c.heading.split(' ');
  const accent = c.accent.split(' ');

  return (
    <section ref={root} className={s.section} data-motion="off" aria-labelledby="transparency-title">
      <span className={s.band} aria-hidden="true" />
      <figure className={s.media}>
        <div className={s.frame}>
          <img
            src={bench}
            alt={c.imageAlt}
            width="1672"
            height="941"
            loading="lazy"
            decoding="async"
          />
        </div>
      </figure>

      <div className={s.card}>
        <p className={s.eyebrow}><i className={s.rule} aria-hidden="true" /> {c.eyebrow}</p>
        {/* The spaces sit OUTSIDE the masks. Inside an inline-block, a
            trailing space is trimmed at the end of its line box, and the
            heading rendered as "Everystone,intheopen." */}
        <h2 id="transparency-title" className={s.title}>
          {heading.map((w) => <span key={w}><span className={s.mask}><span className={s.word}>{w}</span></span>{' '}</span>)}
          <em>
            {accent.map((w, i) => (
              <span key={w}><span className={s.mask}><span className={s.word}>{w}</span></span>{i < accent.length - 1 ? ' ' : ''}</span>
            ))}
          </em>
        </h2>
        {c.paragraphs.map((text, i) => <p key={i}>{emphasis(text)}</p>)}
        <ul className={s.points}>
          {POINTS.map(({ Icon, id }) => (
            <li key={id}><Icon size={18} strokeWidth={1.4} aria-hidden="true" />{c.points[id]}</li>
          ))}
        </ul>
        <div className={s.actions}>
          <a className={s.primary} href="/diamonds">{c.browse} <ArrowUpRight size={17} aria-hidden="true" /></a>
          <a className={s.link} href="/contact">{c.contact} <ArrowRight size={16} aria-hidden="true" /></a>
        </div>
      </div>
    </section>
  );
}
