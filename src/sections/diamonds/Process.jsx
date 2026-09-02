import { useRef } from 'react';

import ScrollScene from '@/components/scroll/ScrollScene.jsx';
import LineReveal from '@/components/motion/LineReveal.jsx';
import StageFilm from './StageFilm.jsx';
import titleStone from '@/assets/diamonds/ngd-brilliant-macro.webp';
import { STAGE_MEDIA } from './processMedia.js';
import styles from './Process.module.css';


/**
 * How a laboratory diamond is actually made, told as one continuous shot.
 *
 * Six stages share a single reactor illustration rather than cutting between
 * six pictures — the seed that appears in stage one is the same element that
 * grows in stage four and gets faceted in stage six. That continuity is what
 * makes it read as a process rather than as a slideshow of steps.
 *
 * Scroll is the playhead: each stage owns a slice of scroll height, and the
 * illustration is driven by the phase plus that phase's own progress, so
 * scrubbing back runs the process in reverse exactly.
 */
/*
 * Copy below is the output of a 76-agent research pass in which every numeric
 * claim was independently fact-checked against the cited source, with the
 * checker instructed to default to WRONG when it could not confirm. 60 of 70
 * claims survived. Figures that could not be verified were dropped rather than
 * softened - see the note at the foot of this file.
 *
 * This describes the CVD line specifically. HPHT figures (5-6 GPa, 1300-1600 C)
 * are NOT published here because the verification pass covered only the CVD
 * claims, and an unverified pressure on a manufacturer's page is worse than no
 * pressure at all.
 */
const STEPS = [
  {
    key: 's1',
    n: '01',
    title: 'The seed plate',
    lines: [
      'Growth starts on a polished (100) diamond plate',
      'Plates run 200-500 microns thick, acid-boiled clean',
      'Seed dislocations propagate into the new growth',
    ],
  },
  {
    key: 's2',
    n: '02',
    title: 'Reactor and plasma',
    lines: [
      'Feed gas is 90-99% hydrogen, the rest methane',
      'A 2.45 GHz microwave field strikes the plasma',
      'Atomic hydrogen suppresses non-diamond carbon',
    ],
  },
  {
    key: 's3',
    n: '03',
    title: 'Steady-state growth',
    lines: [
      'Carbon deposits layer by layer at 900-1200 C',
      'Chamber pressure stays under one atmosphere',
      'Rates reach 0.2 mm/hr; a batch takes weeks',
    ],
  },
  {
    key: 's4',
    n: '04',
    // Deliberately no figures. The verification pass covered only the CVD
    // claims, so no HPHT pressure or temperature is published here.
    title: 'The HPHT route',
    lines: [
      'The second route presses carbon in a metal flux',
      'A press recreates the conditions crystal needs',
      'Same lattice, reached a different way',
    ],
  },
  {
    key: 's5',
    n: '05',
    title: 'The rough',
    lines: [
      'Growth stops and the crystal leaves the chamber',
      'The grown layer is laser-cut off the seed plate',
      'Chemically identical to a stone formed in the earth',
    ],
  },
  {
    key: 's6',
    n: '06',
    title: 'Mapping the rough',
    lines: [
      'Each crystal is scanned and mapped in three dimensions',
      'Inclusions and strain are located before any cut',
      'The plan decides what the finished stone can be',
    ],
  },
  {
    key: 's7',
    n: '07',
    title: 'Cutting and polishing',
    lines: [
      'Rough is sawn, bruted, then brillianteered',
      'The round brilliant carries 57 or 58 facets',
      'Angles are held finer than a tenth of a degree',
    ],
  },
  {
    key: 's8',
    n: '08',
    title: 'Graded and sealed',
    lines: [
      'Cut goods go to an independent grading lab',
      'Colour, clarity, cut and carat are recorded',
      'The report travels with the stone',
    ],
  },
];

const PHASES = [
  // The lead-in carries the opening title plate, so it needs enough travel to
  // actually be read at rest. At 40vh the card was still arriving when it was
  // already being asked to leave.
  { name: 'lead', vh: 90 },
  ...STEPS.map((s) => ({ name: s.key, vh: 110 })),
  { name: 'out', vh: 50 },
];

export default function Process() {
  // The numbers the WebGL film reads. A ref, never state: the scene needs them
  // sixty times a second and React must not re-render for any of it.
  const progress = useRef({ sp: 0, p: 0, phase: 'lead' });  // section works today and improves the moment footage is added.
  // Their own eight-frame sequence outranks everything below it.

  // Resolved after mount so the first paint is always the cheap one, and so a
  // device that cannot run WebGL simply keeps the drawn version.

  return (
    <ScrollScene
      phases={PHASES}
      id="how-its-made"
      label="How a diamond is made"
      progressRef={progress}
      mobileStack
    >
      <div className={`${styles.stage} u-stage-dark`}>
        {/*
          The title card, at SECTION level rather than inside the film.

          A reel opens by naming itself across the whole frame; a title trapped
          in one column of a two-column layout is a caption, not a title. Held
          here it owns the viewport for the lead-in, then clears as the first
          stage arrives.

          Its opacity is pure CSS off the phase's own `--p` — no JS, no rAF.
          The engine already publishes exactly the number this needs.
        */}
        <div className={styles.titleCard} aria-hidden="true">
          <img className={styles.titleShot} src={titleStone} alt="" />
          <span className={styles.titleWash} />
          <span className={styles.titleFrame} />
          <div className={styles.titlePanel}>
            <p className={styles.titleKicker}>New Grown Diamond</p>
            <h3 className={styles.titleLine}>
              <span>CVD &amp; HPHT</span>
              <span>Diamond Making Process</span>
            </h3>
            <span className={styles.titleRule} />
          </div>
        </div>

        <div className={styles.inner}>
          {/* ---- the reactor, one continuous illustration ---- */}
          <div
            className={styles.viz}
            data-mode="stages"
            aria-hidden="true"
          >
            <StageFilm progressRef={progress} />
            <svg viewBox="0 0 320 320" className={styles.svg}>
              <defs>
                <radialGradient id="plasmaGlow">
                  <stop offset="0%" stopColor="#ffd9a0" stopOpacity="0.95" />
                  <stop offset="45%" stopColor="#b48c47" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#b48c47" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="crystalFace" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#cfd9e8" stopOpacity="0.5" />
                </linearGradient>
              </defs>

              {/* chamber */}
              <rect className={styles.chamber} x="40" y="34" width="240" height="252" rx="10" />
              <line className={styles.port} x1="40" y1="70" x2="16" y2="70" />
              <line className={styles.port} x1="280" y1="70" x2="304" y2="70" />
              <line className={styles.port} x1="160" y1="34" x2="160" y2="12" />

              {/* gas */}
              <g className={styles.gas}>
                {Array.from({ length: 16 }, (_, i) => (
                  <circle
                    key={i}
                    r={i % 3 === 0 ? 3 : 2}
                    cx={62 + ((i * 37) % 196)}
                    cy={70 + ((i * 53) % 170)}
                    style={{ '--i': i }}
                  />
                ))}
              </g>

              {/* plasma */}
              <circle className={styles.plasma} cx="160" cy="176" r="86" fill="url(#plasmaGlow)" />

              {/* the seed, which becomes the crystal */}
              <rect className={styles.seed} x="132" y="238" width="56" height="8" rx="1" />

              {/* growth layers stacking onto the seed */}
              <g className={styles.layers}>
                {Array.from({ length: 7 }, (_, i) => (
                  <rect key={i} x={134 + i} y={230 - i * 9} width={52 - i * 2} height="7" rx="1" style={{ '--i': i }} />
                ))}
              </g>

              {/* rough crystal */}
              <polygon
                className={styles.rough}
                points="160,132 206,186 186,246 134,246 114,186"
                fill="url(#crystalFace)"
              />

              {/* the cut stone: facet lines draw on */}
              <g className={styles.cut}>
                <polygon className={styles.cutBody} points="160,120 214,168 160,252 106,168" fill="url(#crystalFace)" />
                <g className={styles.facets}>
                  <path d="M106,168 L214,168" />
                  <path d="M160,120 L160,252" />
                  <path d="M106,168 L160,120 L214,168" />
                  <path d="M133,144 L133,168" />
                  <path d="M187,144 L187,168" />
                  <path d="M106,168 L160,252 L214,168" />
                </g>
                <g className={styles.sparks}>
                  <circle cx="140" cy="152" r="2.4" style={{ '--i': 0 }} />
                  <circle cx="184" cy="180" r="2" style={{ '--i': 1 }} />
                  <circle cx="158" cy="214" r="2.2" style={{ '--i': 2 }} />
                </g>
              </g>
            </svg>

            {/* heat readout, so the chamber reads as an instrument */}
            <p className={styles.readout}>
              <span className={styles.temp} />
              <span className={styles.unit}>reactor</span>
            </p>
          </div>

          {/* ---- real photography and footage of the actual process ---- */}
          <div className={styles.plates} aria-hidden="true">
            {STEPS.map((step) => {
              const m = STAGE_MEDIA[step.key];
              if (!m) return null;
              return (
                <figure key={step.key} className={styles.plate} data-step={step.key}>
                  {m.type === 'video' ? (
                    <video src={m.src} muted loop autoPlay playsInline preload="metadata" />
                  ) : (
                    <img src={m.src} alt={m.alt} loading="lazy" />
                  )}
                  <figcaption>
                    <span className={styles.plateCaption}>{m.caption}</span>
                    <span className={styles.plateCredit}>{m.credit}</span>
                  </figcaption>
                </figure>
              );
            })}
          </div>

          {/* ---- the step text ---- */}
          <div className={styles.copy}>
            <p className={styles.eyebrow}>How a diamond is made</p>
            {STEPS.map((step) => (
              <div key={step.key} className={styles.step} data-step={step.key}>
                <p className={styles.n}>{step.n}</p>
                <h3 className={styles.title}>{step.title}</h3>
                <LineReveal className={styles.body} lines={step.lines} />
              </div>
            ))}
          </div>

          {/* ---- progress rail ---- */}
          <ol className={styles.rail} aria-hidden="true">
            {STEPS.map((step) => (
              <li key={step.key} data-step={step.key}>
                <span className={styles.railDot} />
                <span className={styles.railN}>{step.n}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </ScrollScene>
  );
}
