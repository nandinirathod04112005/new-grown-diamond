import { useRef } from 'react';
import { ArrowRight, ArrowUpRight, Check, X } from 'lucide-react';

import { gsap, useGSAP } from '@/lib/motion/gsap.js';
import { prefersReducedMotion } from '@/lib/motion/media.js';
/* WebP of the same two photographs (20 kB and 17 kB where the PNGs were
   228 kB and 171 kB), transparency kept. */
import quote from '@/assets/company/lab-diamond-detail.webp';
import loose from '@/assets/company/lab-diamond-unique.webp';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './LabGrownStory.copy.js';
import s from './LabGrownStory.module.css';

/**
 * "The Lab-Grown Diamonds" and "Uniqueness of Lab-Grown Diamonds".
 *
 * The house's own copy from its previous site, carried over in full and in the
 * owner's words: only split into shorter paragraphs so it can be read at this
 * size, with three typos corrected ("HPTP" → HPHT, "What's makes", "scare the
 * earth" → scar). The emphasised phrases are the ones the old site emphasised.
 * The words, in all three languages, are in LabGrownStory.copy.js.
 *
 * The comparison under the second block adds nothing new: it is the second
 * paragraph's own argument — lab-grown and mined share one chemistry, and
 * simulants share neither the carbon nor the properties — set out as a table.
 *
 * MOTION. The section animates itself (data-motion="off" keeps the site-wide
 * reveal away from it, so nothing animates twice): the rule draws, the
 * heading rises word by word out of masks, paragraphs follow, the emphasised
 * phrases underline once they are on screen, and each photograph opens from
 * below and then drifts against the scroll. Under reduced motion none of it
 * runs and everything is simply there.
 */

/* A heading, one mask per word, so the words rise out of nothing. The spaces
   stay real text so the heading still reads as a sentence to anything that
   extracts it. */
function Words({ text, className }) {
  const words = text.split(' ');
  return words.map((w, i) => (
    <span key={`${w}-${i}`}>
      <span className={s.mask}><span className={`${s.word} ${className ?? ''}`}>{w}</span></span>
      {i < words.length - 1 ? ' ' : ''}
    </span>
  ));
}

/* A paragraph from the copy, its `**phrase**` marks set in <strong>: the
   phrases the old site emphasised, wherever a translation's word order puts
   them. */
function emphasis(text) {
  return text.split('**').map((part, i) => (i % 2 ? <strong key={i}>{part}</strong> : part));
}

export default function LabGrownStory() {
  const root = useRef(null);
  const c = useCopy(COPY);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const q = gsap.utils.selector(root);

      q(`.${s.row}`).forEach((row) => {
        const inRow = (sel) => row.querySelectorAll(sel);
        const tl = gsap.timeline({
          defaults: { ease: 'expo.out' },
          scrollTrigger: { trigger: row, start: 'top 78%', once: true },
        });
        tl.fromTo(inRow(`.${s.rule}`), { scaleX: 0 }, { scaleX: 1, duration: 0.9 }, 0)
          .fromTo(inRow(`.${s.word}`), { yPercent: 115 }, { yPercent: 0, duration: 1.1, stagger: 0.05 }, 0.05)
          .fromTo(inRow(`.${s.body} > p`), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.12, ease: 'power3.out' }, 0.3)
          .fromTo(inRow(`.${s.compare} tbody tr`), { x: -14, opacity: 0 }, { x: 0, opacity: 1, duration: 0.7, stagger: 0.09 }, 0.75)
          .fromTo(inRow(`.${s.actions} > *`), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.08 }, 0.8)
          .call(() => row.classList.add(s.lit), null, 0.85);

        const frame = row.querySelector(`.${s.frame}`);
        if (!frame) return;
        /* The photograph opens from below… */
        gsap.fromTo(
          frame,
          { clipPath: 'inset(100% 0% 0% 0%)' },
          { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.inOut', scrollTrigger: { trigger: row, start: 'top 76%', once: true } },
        );
        /* …then drifts against the scroll for as long as it is on screen. */
        gsap.fromTo(
          frame.querySelector('img'),
          { yPercent: -7, scale: 1.16 },
          { yPercent: 7, scale: 1.04, ease: 'none', scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: true } },
        );
        /* The gold plate behind it slides the other way: two planes, one depth. */
        gsap.fromTo(
          row.querySelector(`.${s.plate}`),
          { yPercent: 12 },
          { yPercent: -12, ease: 'none', scrollTrigger: { trigger: row, start: 'top bottom', end: 'bottom top', scrub: true } },
        );
      });
    },
    { scope: root },
  );

  return (
    <section ref={root} className={s.story} data-motion="off" aria-label={c.sectionLabel}>
      {/* ---------------- The Lab-Grown Diamonds ---------------- */}
      <div className={s.row} aria-labelledby="lgd-title">
        <div className={s.copy}>
          <p className={s.eyebrow}><i className={s.rule} aria-hidden="true" /> {c.lgd.eyebrow}</p>
          <h2 id="lgd-title" className={s.title}>
            <Words text={c.lgd.titleLead} /> <em><Words text={c.lgd.titleAccent} /></em>
          </h2>
          <div className={s.body}>
            {c.lgd.paragraphs.map((text, i) => <p key={i}>{emphasis(text)}</p>)}
          </div>
          <div className={s.actions}>
            <a className={s.primary} href="/contact">{c.lgd.quote} <ArrowUpRight size={17} aria-hidden="true" /></a>
            <a className={s.link} href="/why-lab-grown">{c.lgd.more} <ArrowRight size={16} aria-hidden="true" /></a>
          </div>
        </div>
        <figure className={s.media}>
          <span className={s.plate} aria-hidden="true" />
          <div className={s.frame}>
            <img
              src={quote}
              alt={c.lgd.imageAlt}
              width="351"
              height="439"
              loading="lazy"
              decoding="async"
            />
          </div>
        </figure>
      </div>

      {/* ---------------- Uniqueness ---------------- */}
      <div className={`${s.row} ${s.flip}`} aria-labelledby="unique-title">
        <figure className={s.media}>
          <span className={s.plate} aria-hidden="true" />
          <div className={s.frame}>
            <img
              src={loose}
              alt={c.unique.imageAlt}
              width="351"
              height="439"
              loading="lazy"
              decoding="async"
            />
          </div>
        </figure>
        <div className={s.copy}>
          <p className={s.eyebrow}><i className={s.rule} aria-hidden="true" /> {c.unique.eyebrow}</p>
          <h2 id="unique-title" className={s.title}>
            <Words text={c.unique.titleLead} /> <em><Words text={c.unique.titleAccent} /></em>
          </h2>
          <div className={s.body}>
            {c.unique.paragraphs.map((text, i) => <p key={i}>{emphasis(text)}</p>)}
          </div>

          <div className={s.compareWrap} role="region" aria-label={c.compare.region} tabIndex={0}>
            <table className={s.compare}>
              <caption className={s.vh}>{c.compare.caption}</caption>
              <thead>
                <tr>
                  <th scope="col"><span className={s.vh}>{c.compare.property}</span></th>
                  <th scope="col">{c.compare.labGrown}</th>
                  <th scope="col">{c.compare.mined}</th>
                  <th scope="col">{c.compare.simulant}</th>
                </tr>
              </thead>
              <tbody>
                {c.compare.rows.map(({ label, cells }) => (
                  <tr key={label}>
                    <th scope="row">{label}</th>
                    {cells.map((cell, i) => (
                      <td key={i} data-yes={cell === true ? '' : undefined} data-no={cell === false ? '' : undefined}>
                        {cell === true && <><Check size={16} aria-hidden="true" /><span className={s.vh}>{c.compare.yes}</span></>}
                        {cell === false && <><X size={16} aria-hidden="true" /><span className={s.vh}>{c.compare.no}</span></>}
                        {typeof cell === 'string' && cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={s.actions}>
            <a className={s.primary} href="/diamonds">{c.unique.browse} <ArrowUpRight size={17} aria-hidden="true" /></a>
            <a className={s.link} href="/cvd-vs-natural">{c.unique.compareLink} <ArrowRight size={16} aria-hidden="true" /></a>
          </div>
        </div>
      </div>
    </section>
  );
}
