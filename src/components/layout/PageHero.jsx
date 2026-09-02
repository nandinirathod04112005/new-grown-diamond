import { useRef } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';
import { usePointerParallax } from '@/hooks/usePointerParallax.js';
import Motif from './Motif.jsx';
import styles from './PageHero.module.css';

/** Words stay whole so wrapping still behaves; characters are the animated unit. */
function toWords(text) {
  return String(text).split(' ').map((word) => ({ word, chars: [...word] }));
}

/**
 * The shared opening for every page that is not the homepage.
 *
 * Four pages used to render the identical editorial header, which is why they
 * all felt like the same page. The structure is shared here — that is what
 * keeps them a family — but the motif, the accent and the ambient field are
 * chosen per page, so each one is recognisably itself.
 *
 * Everything has its arrived state in CSS and its opening state in GSAP, so a
 * page whose script never runs is finished rather than blank.
 */
export default function PageHero({
  eyebrow,
  title,
  intro,
  motif = 'lattice',
  /* Falls back to the house accent; pages override it for their own field. */
  accent = 'var(--accent)',
  action,
  image,
  imageAlt = '',
}) {
  const scope = useRef(null);
  const depth = useRef(null);

  usePointerParallax(depth, 1);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(scope);
      const tl = gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.3 } });

      tl.fromTo(q(`.${styles.field}`), { opacity: 0 }, { opacity: 1, duration: 1.6 }, 0)
        .fromTo(
          q(`.${styles.brow} span`),
          { yPercent: 130, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 0.9, stagger: 0.05 },
          0.15,
        )
        .fromTo(
          q(`.${styles.char}`),
          { yPercent: 118, rotate: 3, opacity: 0 },
          { yPercent: 0, rotate: 0, opacity: 1, duration: 1.4, stagger: { each: 0.016 } },
          0.25,
        )
        .fromTo(q(`.${styles.rule}`), { scaleX: 0 }, { scaleX: 1, duration: 1.3 }, 0.75)
        .fromTo(
          q(`.${styles.introLine}`),
          { yPercent: 110, opacity: 0 },
          { yPercent: 0, opacity: 1, duration: 1.2 },
          0.85,
        )
        .fromTo(q(`.${styles.action}`), { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1 }, 1)
        .fromTo(q(`.${styles.motif}`), { opacity: 0, scale: 0.86 }, { opacity: 1, scale: 1, duration: 1.8 }, 0.3)
        .fromTo(
          q(`.${styles.shot}`),
          { clipPath: 'inset(0 0 100% 0)' },
          { clipPath: 'inset(0 0 0% 0)', duration: 1.8, ease: 'expo.inOut' },
          0.3,
        );
    },
    { scope, dependencies: [title] },
  );

  return (
    <header ref={scope} className={styles.hero} style={{ '--accent-page': accent }}>
      {/* Ambient field, tinted per page — the cheapest way to make two pages
          with the same structure feel like different rooms. */}
      <div className={styles.field} aria-hidden="true">
        <span /><span /><span />
      </div>
      <div className={styles.grain} aria-hidden="true" />

      <div ref={depth} className={styles.depth}>
        <div className={styles.copy}>
          <p className={`u-eyebrow ${styles.brow}`}>
            <span className="u-visually-hidden">{eyebrow}</span>
            {String(eyebrow).split(' ').map((word, i) => (
              <span key={`${word}-${i}`} aria-hidden="true">{word}</span>
            ))}
          </p>

          <h1 className={styles.title}>
            <span className="u-visually-hidden">{title}</span>
            <span aria-hidden="true">
              {toWords(title).map(({ word, chars }, wi) => (
                <span key={`${word}-${wi}`} className={styles.word}>
                  {chars.map((ch, ci) => (
                    <span key={`${ch}-${ci}`} className={styles.char}>{ch}</span>
                  ))}
                </span>
              ))}
            </span>
          </h1>

          <span className={styles.rule} aria-hidden="true" />

          {intro && (
            <p className={styles.intro}>
              <span className="u-visually-hidden">{intro}</span>
              <span className={styles.introMask} aria-hidden="true">
                <span className={styles.introLine}>{intro}</span>
              </span>
            </p>
          )}

          {action && (
            <a className={styles.action} href={action.href}>
              {action.label} <span aria-hidden="true">→</span>
            </a>
          )}
        </div>

        {image ? (
          /* Pages with real photography keep it — a drawn motif is the
             fallback for pages that have none, not a replacement for one. */
          <figure className={styles.shot}>
            <img src={image} alt={imageAlt} loading="lazy" />
          </figure>
        ) : (
          <div className={styles.motif} aria-hidden="true">
            <Motif kind={motif} />
          </div>
        )}
      </div>
    </header>
  );
}
