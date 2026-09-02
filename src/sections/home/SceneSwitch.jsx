import ScrollScene from '@/components/scroll/ScrollScene.jsx';
import polished from '@/assets/diamonds/ngd-brilliant-macro.webp';
import grown from '@/assets/process/hpht-rough.jpg';
import styles from './SceneSwitch.module.css';

const PHASES = [
  { name: 'in', vh: 30 },
  { name: 'view', vh: 100 },
  { name: 'out', vh: 30 },
];

/**
 * Rough to polished, told as one uninterrupted wipe.
 *
 * Both states are pinned to the SAME plate, at the same size and position, so
 * the wipe reads as one stone changing rather than two pictures swapping. That
 * is the entire effect; if the plates drift apart it stops working.
 *
 * The photographs are 525px and 754px wide. They used to be `object-fit:
 * cover` across the full viewport, which on a 1920px screen meant upscaling
 * the rough by 3.7x — the pixels and the "2 mm" scale bar were both plainly
 * visible, on a page whose job is to look expensive. They are now held in a
 * plate small enough that neither is enlarged past its own resolution.
 *
 * On the search side this section used to be close to invisible: no heading
 * anywhere, two `<p>` labels, and an empty alt on the polished stone. A
 * full-viewport block with no heading and four words of text is a block a
 * crawler has no reason to index. It now carries real headings, real alt text
 * and a sentence of substance per state.
 */
export default function SceneSwitch() {
  return (
    <ScrollScene phases={PHASES} id="atelier" label="Rough to polished">
      <div className={styles.stage}>
        <article className={`${styles.panel} ${styles.base}`}>
          <figure className={styles.plate}>
            <img
              src={grown}
              alt="As-grown HPHT lab-grown diamond rough crystals on a dark bed, beside a two-millimetre scale bar."
              width="525"
              height="293"
              loading="lazy"
              decoding="async"
            />
          </figure>
          <p className={styles.note}>Documentary reference · HPHT route</p>
          <h2 className={styles.label}>As-grown rough</h2>
          <p className={styles.copy}>
            Every stone starts as crystallised carbon, grown under high pressure
            and high temperature. Millimetres across, still uncut, and already a
            diamond by every physical and chemical measure.
          </p>
        </article>

        <article className={`${styles.panel} ${styles.over}`}>
          <figure className={styles.plate}>
            <img
              src={polished}
              alt="A finished New Grown Diamond round brilliant, cut to 58 facets and photographed loose."
              width="754"
              height="541"
              loading="lazy"
              decoding="async"
            />
          </figure>
          <p className={styles.note}>After 58 facets</p>
          <h2 className={styles.label}>Brilliant</h2>
          <p className={styles.copy}>
            The same carbon, cut and polished in Surat to the proportions that
            return light to the eye. Graded independently, and sold with the
            certificate that says so.
          </p>
        </article>

        <span className={styles.edge} aria-hidden="true" />
      </div>
    </ScrollScene>
  );
}
