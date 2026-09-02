import styles from './PageTransition.module.css';

/**
 * The cover the page change happens underneath.
 *
 * Built from a reference the client supplied: the outgoing page scales up and
 * clips past the frame, the screen holds dark, and the incoming page is
 * uncovered through a row of ARCHES that travel on past the top rather than
 * retreating the way they came.
 *
 * The arch is the whole idea, and it is worth being deliberate about why it
 * survives translation here. A flat rectangular wipe reads as a slide deck. An
 * arch reads as a doorway — you are not being shown the next page, you are
 * being walked into it — and a vitrine, a shopfront and a display case are all
 * arches, which is the right vocabulary for a house that sells stones in
 * cases. Same motion as the reference, in this site's own language.
 *
 * COLOUR IS DELIBERATELY NOT THE REFERENCE'S. Theirs flashes white, which on a
 * dark site is a strobe between two dark pages and would undo the whole point
 * of hiding the seam. These carry the site's own ink and drafting grid, with
 * an accent hairline on the leading edge so the shape still reads.
 *
 * `aria-hidden` throughout — the route change is announced by the live region
 * in App, which says where you arrived rather than that a shape moved.
 */

/** Five reads as a colonnade; three reads as a garage door. */
const ARCHES = [0, 1, 2, 3, 4];

export default function PageTransition({ phase }) {
  if (phase === 'idle') return null;

  return (
    <div className={styles.root} data-phase={phase} aria-hidden="true">
      {ARCHES.map((i) => (
        <span
          key={i}
          className={styles.arch}
          /*
           * The stagger runs from the centre outwards, so the colonnade closes
           * around the middle of the screen and opens away from it. Left to
           * right would read as a wipe; centre-out reads as a doorway.
           */
          style={{ '--i': Math.abs(i - 2) }}
        >
          <i className={styles.grid} />
          <i className={styles.edge} />
        </span>
      ))}

      <span className={styles.mark}>New Grown Diamond</span>
    </div>
  );
}
