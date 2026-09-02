import { useRef } from 'react';
import CausticField from '@/components/media/CausticField.jsx';

import { usePointerParallax } from '@/hooks/usePointerParallax.js';
import Blueprint from '@/components/media/Blueprint.jsx';
import styles from './Auth.module.css';

/**
 * The frame every account page is set in.
 *
 * Sign in, register and profile are the three places a visitor stops looking
 * and starts typing, so they get one identical stage: the same drafting layer
 * as the hero, the same darkened room, the same card in perspective. Three
 * pages that each invented their own furniture would read as three different
 * websites bolted together, which is exactly how most sites' account pages
 * feel.
 *
 * The card is a real object in space — perspective on the stage, preserve-3d
 * on the card, and the heading, the fields and the rim at their own depths —
 * so it turns toward the pointer and its layers part from each other. Nothing
 * here moves on its own: this is a page someone is trying to read and type
 * into, and unrequested motion under a cursor that is aiming at a text field
 * is hostile, however impressive it looks.
 */
export default function AuthShell({ eyebrow, title, intro, children, aside, wide = false }) {
  const stage = useRef(null);
  usePointerParallax(stage, 1);

  return (
    <main ref={stage} className={`${styles.stage} u-stage-dark`}>
      {/* The built ground, matching the home hero: a key pool behind the card,
          a drafting grid that dies before it reaches an edge, a vignette. */}
      <div className={styles.field} aria-hidden="true" />
      <CausticField className={styles.caustics} />
      <span className={styles.beam} aria-hidden="true" />
      <div className={styles.grain} aria-hidden="true" />

      {/* The same measured layer the hero uses, held well back so it is
          texture behind the form rather than something competing with it. */}
      <Blueprint className={styles.plan} tone="gold" />

      {/*
        The way back. These pages render outside the site shell, so without
        this there is no route home except the browser's back button — and
        someone who arrived at /register from a link has no back button worth
        pressing. The mark is the standard place people look for it.
      */}
      <a className={styles.mark} href="/">New Grown Diamond</a>

      <div className={`${styles.frame} ${wide ? styles.frameWide : ''}`}>
        <div className={styles.card}>
          <header className={styles.head}>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h1 className={styles.title}>{title}</h1>
            {intro ? <p className={styles.intro}>{intro}</p> : null}
            <span className={styles.rule} aria-hidden="true" />
          </header>

          <div className={styles.body}>{children}</div>

          {aside ? <footer className={styles.aside}>{aside}</footer> : null}

          {/* Forward of the surface, so it parts from the card as it turns. */}
          <span className={styles.rim} aria-hidden="true" />
        </div>
      </div>
    </main>
  );
}
