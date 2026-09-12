import { useRef } from 'react';

import { usePointerParallax } from '@/hooks/usePointerParallax.js';
import HeroBackdrop from '@/components/layout/HeroBackdrop.jsx';
import stoneInHand from '@/assets/company/custom-jewellery-optimized.jpg';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './AuthShell.copy.js';
import styles from './Auth.module.css';

/*
 * What the panel says (AuthShell.copy.js, `panel`), and why every line of it
 * is true.
 *
 * The account page's activity widgets are favourites, quotes, holds,
 * inspections and enquiries (queries/account.js), enquiries carry a public
 * reference the desk works from, and the inventory promises certificates and
 * inspection media on request. Nothing here promises anything the site does
 * not already do.
 */

/**
 * The frame every account page is set in.
 *
 * Two halves. On the left, the reason to have an account: a photograph of a
 * stone in the tweezers — the same treatment every page banner uses
 * (HeroBackdrop) — with the mark, three lines of what the desk keeps for a
 * trade buyer, and the four cities. On the right, the task: one card, on a
 * quiet built ground, that turns a few degrees toward the pointer.
 *
 * It used to be one card in the middle of a room lit by moving water-light
 * and a drafting drawing. The light out-shouted the form and the drawing's
 * labels — Table, Crown, Girdle, Pavilion — showed through beside the fields.
 * A photograph carries the atmosphere now, on its own side, and the side that
 * is typed into is still.
 *
 * Nothing on the page moves on its own except the photograph's slow drift:
 * this is a page someone is trying to read and type into, and unrequested
 * motion under a cursor that is aiming at a text field is hostile, however
 * impressive it looks.
 *
 * In a hand the photograph becomes a short band above the card, keeping the
 * mark and the title; the three lines return when there is room for them. On
 * the wide account workspace the band stays short so the work has the width.
 */
export default function AuthShell({ eyebrow, title, intro, children, aside, wide = false, panel: panelProp }) {
  const stage = useRef(null);
  usePointerParallax(stage, 1);
  const c = useCopy(COPY);
  const panel = panelProp ?? c.panel;

  return (
    <main ref={stage} className={styles.stage} data-wide={wide ? '' : undefined}>
      <aside className={styles.panel} aria-label={c.about}>
        <HeroBackdrop src={stoneInHand} focus="62% 46%" mobileFocus="58% 42%" />

        {/* The way back. These pages render outside the site shell, so
            without this there is no route home except the browser's back
            button — and someone who arrived at /register from a link has no
            back button worth pressing. */}
        <a className={styles.mark} href="/" aria-label="New Grown Diamond — home">
          <span className={styles.markGlyph} aria-hidden="true">N</span>
          <span>New Grown Diamond</span>
        </a>

        <div className={styles.panelCopy}>
          <p className={styles.panelEyebrow}>{panel.eyebrow}</p>
          <p className={styles.panelTitle}>{panel.title}</p>
          <ul className={styles.points}>
            {panel.points.map((point) => <li key={point}>{point}</li>)}
          </ul>
        </div>

        <p className={styles.panelFoot}>Surat · Mumbai · New York · Hong Kong</p>
      </aside>

      <section className={styles.side}>
        {/* The built ground the card sits on: a key pool, a vignette, grain.
            Still — the photograph on the other side is the thing that moves. */}
        <div className={styles.field} aria-hidden="true" />
        <div className={styles.pool} aria-hidden="true" />
        <div className={styles.grain} aria-hidden="true" />

        <div className={styles.dimension} aria-hidden="true">
          <span className={styles.orbit} />
          <span className={styles.orbit} />
          <span className={styles.orbit} />
          <span className={styles.gem}>
            <span className={styles.gemCore} />
          </span>
        </div>

        <div className={`${styles.frame} ${wide ? styles.frameWide : ''}`}>
          <a className={styles.back} href="/">
            <span aria-hidden="true">←</span> Back to collection
          </a>
          <div className={styles.card}>
            <header className={styles.head}>
              <p className={styles.eyebrow}>{eyebrow}</p>
              <h1 className={styles.title}>{title}</h1>
              {intro ? <p className={styles.intro}>{intro}</p> : null}
              <span className={styles.rule} aria-hidden="true" />
            </header>

            <div className={styles.body}>
              {children}
            </div>

            {aside ? <footer className={styles.aside}>{aside}</footer> : null}

            {/* Forward of the surface, so it parts from the card as it turns. */}
            <span className={styles.rim} aria-hidden="true" />
          </div>

          <p className={styles.security}>
            <span aria-hidden="true">◇</span> Secure account access
          </p>
        </div>
      </section>
    </main>
  );
}
