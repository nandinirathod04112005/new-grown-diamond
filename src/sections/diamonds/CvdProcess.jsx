import Reveal from '@/components/motion/Reveal.jsx';
import SplitHeading from '@/components/motion/SplitHeading.jsx';
import { CVD_STEPS } from './cvdSteps.js';
import styles from './CvdProcess.module.css';

/**
 * How a New Grown Diamond is actually made, in twelve stages.
 *
 * PLATES ARE DISCOVERED, NOT LISTED. Any file dropped into
 * `src/assets/process/cvd-steps/` named for its step number — `01.webp`,
 * `02.jpg` — becomes that stage's photograph with no code change. Until one
 * exists the stage still reads: the number, the heading, the description and
 * the checklist are all real text, and the picture is the part that is missing
 * rather than the part that carries the meaning.
 *
 * That ordering is deliberate. The supplied plates have their headings and
 * bullets rendered into the artwork, which cannot be selected, searched,
 * translated or read aloud, and is illegible at phone width. The words are HTML
 * here and the plate is cropped to its photographic half.
 */
const PLATES = Object.fromEntries(
  Object.entries(
    import.meta.glob('@/assets/process/cvd-steps/*.{webp,png,jpg,jpeg}', {
      eager: true,
      import: 'default',
    }),
  ).map(([path, url]) => [
    // "01.webp" and "cvd-step-01.webp" both key to 1, so the filenames can be
    // whatever is convenient as long as the number is in them.
    Number(path.split('/').pop().replace(/\D/g, '')),
    url,
  ]),
);

export default function CvdProcess() {
  return (
    <section className={styles.root} aria-labelledby="cvd-process">
      <Reveal as="header" className={styles.head}>
        <p className="u-eyebrow">CVD production / Twelve stages</p>
        <SplitHeading as="h2" className={styles.title} id="cvd-process" text="From seed to certificate" />
        <p className={styles.lede}>
          A laboratory-grown diamond is not assembled; it is grown, one atomic
          layer at a time, and then cut like any other rough. These are the
          twelve stages a New Grown Diamond passes through before it reaches a
          grading report.
        </p>
      </Reveal>

      <ol className={styles.steps}>
        {CVD_STEPS.map((step) => (
          /*
           * Each stage reveals on its own, as it is reached — the section is
           * long enough that revealing all twelve together would mean eleven of
           * them animating far off screen where nobody sees it happen.
           */
          <Reveal as="li" key={step.n} className={styles.step}>
            <div className={styles.copy}>
              <p className={styles.num}>
                <span className={styles.numLabel}>Step</span>
                <span className={styles.numValue}>{String(step.n).padStart(2, '0')}</span>
              </p>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.body}>{step.body}</p>
              <ul className={styles.points}>
                {step.points.map((point, i) => (
                  <li key={point} style={{ '--i': i }}>{point}</li>
                ))}
              </ul>
            </div>

            {PLATES[step.n] ? (
              <figure className={styles.plate}>
                <img
                  src={PLATES[step.n]}
                  alt={step.alt}
                  loading="lazy"
                  decoding="async"
                />
              </figure>
            ) : (
              /* No plate supplied yet. A ruled empty frame keeps the rhythm of
                 the sequence without pretending a picture is there. */
              <div className={styles.plateEmpty} aria-hidden="true" />
            )}
          </Reveal>
        ))}
      </ol>

      <Reveal as="p" className={styles.note}>
        Process imagery is illustrative of chemical vapour deposition and is not
        a record of a specific growth run.
      </Reveal>
    </section>
  );
}
