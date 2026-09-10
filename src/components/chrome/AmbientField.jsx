import styles from './AmbientField.module.css';

/**
 * The room the whole site sits in.
 *
 * A fixed layer behind every page: two very slow light masses that drift
 * against each other, and a faint faceted lattice that turns once every few
 * minutes. It is deliberately close to invisible — the test is that removing
 * it should make the site feel flatter without anyone being able to say what
 * changed.
 *
 * WHY IT IS SAFE TO HAVE ON EVERY PAGE. It is three elements and pure CSS: no
 * script, no canvas, no scroll listener, nothing that can fail. `position:
 * fixed` means it never grows the page, `pointer-events: none` means it can
 * never take a click, and it is hidden from assistive technology entirely.
 *
 * WHAT IT MUST NOT DO. Compete. Every colour here is a hair off the page's own
 * background, and the movement is measured in minutes, so it can never pull
 * the eye away from a headline or a photograph. Under reduced motion it stops
 * dead and stays as a still gradient.
 */
export default function AmbientField() {
  return (
    <div className={styles.field} aria-hidden="true">
      <span className={styles.driftA} />
      <span className={styles.driftB} />
      <span className={styles.lattice} />
    </div>
  );
}
