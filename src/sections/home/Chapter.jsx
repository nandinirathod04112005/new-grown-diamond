import { useMemo } from 'react';

import LineReveal from '@/components/motion/LineReveal.jsx';
import LivePhoto from '@/components/media/LivePhoto.jsx';
import ScrollScene from '@/components/scroll/ScrollScene.jsx';
import styles from './Chapter.module.css';

/**
 * A narrative chapter, shaped like the reference site's homeChapter01–06.
 *
 * The weights are the timing: `in` is the approach, `view` is the held state
 * where the text is read, `out` is the departure. A chapter with more lines is
 * given a longer `view` — that is what "30vh per line" means once it is
 * expressed as section height rather than as timeline duration.
 *
 * The plate is a REAL object in perspective, not a picture that slides.
 *
 * It arrives turned away and set back in space, swings square while it is
 * being read, and turns off the other way as it leaves — and the layers inside
 * it (photograph, sheen, rim, index) sit at different depths, so turning the
 * card makes them part from each other. That parallax between layers is the
 * whole difference between something built in space and something drawn to
 * look like it was.
 *
 * Two nested transforms rather than one, because they answer to different
 * clocks: `card` carries the scroll phase and is transitioned, `tilt` carries
 * the pointer and is not. Composed onto one element, the transition would lag
 * the pointer by half a second and the card would feel like it was dragging.
 */
export default function Chapter({ index, title, lines, image, alt, mediaLabel, id, flip = false, wide = false }) {
  const phases = useMemo(() => [
    { name: 'in', vh: 35 },
    { name: 'view', vh: Math.max(70, lines.length * 18) },
    { name: 'out', vh: 45 },
  ], [lines.length]);

  return (
    <ScrollScene phases={phases} id={id} label={title}>
      <div className={styles.wrap} data-flip={flip ? '' : undefined}>
        <div className={styles.text} style={{ order: flip ? 2 : 1 }}>
          <p className={styles.index}>{index}</p>
          {/*
            The title writes itself as the chapter arrives.

            Driven by the scene's own `--sp`, not a timer — so it advances at
            exactly the rate the visitor scrolls, holds where they stop, and
            un-writes if they scroll back. A timed stagger plays AT someone; a
            scroll-driven one is something they are doing.

            Words stay whole so wrapping still behaves; the character is the
            animated unit. The whole title is also present, unsplit, for
            screen readers and search — splitting text into spans is a fast
            way to make a headline unreadable to anything that is not an eye.
          */}
          <h2 className={styles.title}>
            <span className="u-visually-hidden">{title}</span>
            <span aria-hidden="true" className={styles.titleSplit}>
              {title.split(' ').map((word, wi, all) => (
                <span key={`${word}-${wi}`} className={styles.word}>
                  {[...word].map((ch, ci) => {
                    const index = all.slice(0, wi).join(' ').length + ci;
                    /*
                     * NORMALISED to 0..1 across the title, not a raw index.
                     *
                     * With a fixed per-character step, a long title simply
                     * never finishes: its last character needs more scroll
                     * progress than the scene contains, so it stays invisible
                     * forever. Expressed as a fraction, every title — two
                     * words or ten — writes itself over the same stretch.
                     */
                    const span = Math.max(1, title.length - 1);
                    return (
                      <span
                        key={`${ch}-${ci}`}
                        className={styles.char}
                        style={{ '--i': (index / span).toFixed(4) }}
                      >
                        {ch}
                      </span>
                    );
                  })}
                </span>
              ))}
            </span>
          </h2>
          <span className={styles.rule} aria-hidden="true" />
          <LineReveal className={styles.body} lines={lines} />
        </div>

        {/* The perspective root. It must carry no overflow, filter or opacity
            of its own — any of the three collapses the 3D context underneath
            it and the card silently flattens. */}
        {/*
          `wide` gives the plate a landscape frame.
          
          The default is portrait 4:5, which suits a stone shot upright. A
          16:9 illustration in that frame is cropped to a vertical slice — for
          the seed-to-stone image that removed the seed at one end and the
          finished diamond at the other, which is to say all of its meaning.
        */}
        <figure
          className={styles.figure}
          data-wide={wide ? '' : undefined}
          style={{ order: flip ? 1 : 2 }}
        >
          <div className={styles.card}>
            <div className={styles.tilt}>
              {/* Cast onto the ground behind the card, and moved by the same
                  angles — a card that turns without its shadow turning reads
                  as a sticker. */}
              <span className={styles.cast} aria-hidden="true" />

              <div className={styles.frame}>
                <LivePhoto src={image} alt={alt} sparks={3} tilt={5} width="1200" height="1500" />
                {mediaLabel ? <figcaption className={styles.mediaLabel}>{mediaLabel}</figcaption> : null}
              </div>

              {/* Glass over the print, lit from wherever the pointer is. */}
              <span className={styles.sheen} aria-hidden="true" />
              {/* The rim, set forward so it separates from the print. */}
              <span className={styles.edge} aria-hidden="true" />
              {/* Furthest forward, so it floats clear of the plate. */}
              <span className={styles.badge} aria-hidden="true">{index}</span>
            </div>
          </div>
        </figure>
      </div>
    </ScrollScene>
  );
}
