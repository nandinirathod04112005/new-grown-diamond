import { useRef } from 'react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import useReducedMotion from '@/hooks/useReducedMotion.js';
import { usePointerParallax } from '@/hooks/usePointerParallax.js';
import { lettersOf } from '@/i18n/letters.js';
import HeroBackdrop from './HeroBackdrop.jsx';
import Motif from './Motif.jsx';
import styles from './PageHero.module.css';

/** Words stay whole so wrapping still behaves; characters are the animated
    unit, except in Hindi and Gujarati, where a word is (see lettersOf). */
function toWords(text) {
  return String(text).split(' ').map((word) => ({ word, chars: lettersOf(word) }));
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
 *
 * `backdrop` is the photograph the whole banner is set against — full bleed,
 * under the tinted field, moving with pointer and scroll (HeroBackdrop). Every
 * page now has one, so the banners read as one family of rooms rather than a
 * shared template with a different drawing in the corner. `image` is still
 * the page's own photograph beside the type, with its alt text, for pages
 * that have something to show at close range.
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
  backdrop,
  /* Where the crop keeps its subject as the frame changes shape. */
  backdropFocus = '50% 50%',
  backdropMobileFocus = backdropFocus,
}) {
  const scope = useRef(null);
  const reduced = useReducedMotion();

  usePointerParallax(scope, 1);

  useGSAP(
    () => {
      if (reduced) return;
      const q = gsap.utils.selector(scope);
      const mobile = window.matchMedia('(pointer: coarse)').matches;
      const tl = gsap.timeline({ defaults: { ease: 'expo.out', duration: 1.3 } });

      /* Over a photograph the field is the light on it, not a glow beside
         it, and the motif an etched ornament rather than a second subject —
         so both settle lower when a backdrop is present. */
      tl.fromTo(q(`.${styles.field}`), { opacity: 0 }, { opacity: backdrop ? 0.45 : 1, duration: 1.6 }, 0)
        .fromTo(
          q(`.${styles.brow} span`),
          { y: 5, opacity: 1 },
          { y: 0, opacity: 1, duration: 0.45, stagger: 0.015 },
          0,
        )
        .fromTo(
          q(`.${styles.char}`),
          { y: mobile ? 3 : 6, opacity: 1 },
          { y: 0, opacity: 1, duration: 0.55, stagger: { amount: 0.12 } },
          0,
        )
        .fromTo(q(`.${styles.rule}`), { scaleX: 0 }, { scaleX: 1, duration: 1.3 }, 0.75)
        .fromTo(
          q(`.${styles.introLine}`),
          { y: 5, opacity: 1 },
          { y: 0, opacity: 1, duration: 0.5 },
          0,
        )
        .fromTo(q(`.${styles.action}`), { y: 3, opacity: 1 }, { y: 0, opacity: 1, duration: 0.45 }, 0)
        .fromTo(q(`.${styles.motif}`), { opacity: 0, scale: 0.86 }, { opacity: backdrop ? 0.55 : 1, scale: 1, duration: 1.8 }, 0.3)
        .fromTo(
          q(`.${styles.shot}`),
          { clipPath: 'inset(12% 0 88% 0)' },
          { clipPath: 'inset(0 0 0% 0)', duration: 1.35, ease: 'expo.inOut' },
          0.3,
        );
      const focus = () => tl.progress(1);
      const visibility = () => { if (document.hidden) tl.pause(); else tl.resume(); };
      const node = scope.current;
      node.addEventListener('focusin', focus);
      document.addEventListener('visibilitychange', visibility);
      return () => {
        node.removeEventListener('focusin', focus);
        document.removeEventListener('visibilitychange', visibility);
      };
    },
    { scope, dependencies: [title, backdrop, reduced], revertOnUpdate: true },
  );

  return (
    <header
      ref={scope}
      className={styles.hero}
      data-backdrop={backdrop ? '' : undefined}
      style={{ '--accent-page': accent }}
    >
      <HeroBackdrop src={backdrop} focus={backdropFocus} mobileFocus={backdropMobileFocus} className={styles.backdrop} />
      {/* Ambient field, tinted per page — the cheapest way to make two pages
          with the same structure feel like different rooms. */}
      <div className={styles.field} aria-hidden="true">
        <span /><span /><span />
      </div>
      <div className={styles.grain} aria-hidden="true" />

      <div className={styles.depth}>
        <div className={styles.copy}>
          {/*
            * Split for the eye, whole for everything else.
            *
            * These three blocks used to render their text TWICE — once visually
            * hidden for assistive technology, once split into animated pieces —
            * which left the h1's own textContent reading "One material. Two
            * origins.Onematerial.Twoorigins." Screen readers coped; crawlers,
            * copy-paste and anything summarising the page saw the title twice,
            * the second time with the spaces eaten by the split.
            *
            * Labelling the elements gets assistive technology the same clean
            * string with the text present exactly once, and keeping the spaces
            * as real text nodes means what is extracted is a sentence.
            */}
          <p className={`u-eyebrow ${styles.brow}`}>
            <span className="u-visually-hidden">{eyebrow}</span>
            {/*
              * The space is a SIBLING of the word, not inside it.
              *
              * Each word is `inline-block` so it can be lifted independently,
              * and an inline-block trims whitespace at its own edges — a space
              * kept inside the span simply vanishes, which collapsed the line
              * to "EDUCATION/ORIGINCOMPARED". As a text node between the spans
              * it renders normally, and the GSAP selector still matches only
              * the words.
              */}
            {String(eyebrow).split(' ').flatMap((word, i, all) => [
              <span key={`w-${word}-${i}`} aria-hidden="true">{word}</span>,
              i < all.length - 1 ? ' ' : null,
            ])}
          </p>

          <h1 className={styles.title} aria-label={title}>
            <span aria-hidden="true">
              {toWords(title).map(({ word, chars }, wi, all) => (
                <span key={`${word}-${wi}`}>
                  <span className={styles.word}>
                    {chars.map((ch, ci) => (
                      <span key={`${ch}-${ci}`} className={styles.char}>{ch}</span>
                    ))}
                  </span>
                  {wi < all.length - 1 ? ' ' : null}
                </span>
              ))}
            </span>
          </h1>

          <span className={styles.rule} aria-hidden="true" />

          {intro && (
            <p className={styles.intro}>
              {/* The mask is purely visual — it clips the line while it rises —
                  so the text inside it is the real one and is read normally. */}
              <span className={styles.introMask}>
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
            {/*
              * Eager and high priority, because this is the LCP element.
              *
              * It was `loading="lazy"`, which on an image that is above the fold
              * by definition is self-defeating: the browser defers the request
              * until layout has run, and that deferral is precisely the delay
              * Largest Contentful Paint measures. Nine routes render this hero.
              * Everything BELOW the fold should still be lazy — this is the one
              * image on the page that must not be.
              */}
            <img
              src={image}
              alt={imageAlt}
              loading="eager"
              fetchPriority={backdrop ? 'auto' : 'high'}
              decoding="async"
            />
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
