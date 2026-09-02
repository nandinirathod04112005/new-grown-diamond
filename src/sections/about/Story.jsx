import { useRef, useState } from 'react';
import ScrollScene from '@/components/scroll/ScrollScene.jsx';
import LineReveal from '@/components/motion/LineReveal.jsx';
import StoryPanorama from './StoryPanorama.jsx';
import styles from './Story.module.css';
/**
 * The house story, told as one continuous shot.
 *
 * The through-line is a carbon lattice: it starts as four atoms in stage one,
 * extends, is enclosed by a reactor, fans into a range of cuts, spreads across
 * the world, and finally resolves into a single graded stone. The same nodes
 * carry through every stage — nothing is cut away and replaced — which is what
 * makes six chapters read as one history rather than six slides.
 *
 * Every value is driven by the stage plus that stage's own progress, so
 * scrolling back runs the history backwards exactly.
 */
const STEPS = [
  {
    key: 'b1',
    marker: '1980s',
    title: 'A cutting house',
    lines: [
      'The business began in Surat with',
      'earth-mined diamonds, and with the',
      'cutting tradition the city is known for.',
    ],
  },
  {
    key: 'b2',
    marker: '2012',
    title: 'The turn to grown',
    lines: [
      'We moved into polished laboratory-grown',
      'manufacturing, carrying four decades of',
      'cutting practice across with us.',
    ],
  },
  {
    key: 'b3',
    marker: 'CVD · HPHT',
    title: 'The technology',
    lines: [
      'State-of-the-art production in Surat,',
      'supporting certified and non-certified',
      'CVD and HPHT diamonds.',
    ],
  },
  {
    key: 'b4',
    marker: '0.30 — 6.00 ct',
    title: 'The range',
    lines: [
      'Colours D through J, in round, cushion,',
      'heart, marquise, pear, princess, radiant,',
      'emerald, square radiant and oval.',
    ],
  },
  {
    key: 'b5',
    marker: 'Surat · Mumbai · New York · Hong Kong',
    title: 'The reach',
    lines: [
      'We supply B2B clients, retailers and',
      'jewellery traders worldwide, direct from',
      'the manufacturing floor.',
    ],
  },
  {
    key: 'b6',
    marker: 'IGI · GIA',
    title: 'The standard',
    lines: [
      'We invest in current technology, consistent',
      'quality and clear diamond education, so',
      'clients can evaluate a stone with confidence.',
    ],
  },
];

const PHASES = [
  { name: 'lead', vh: 40 },
  ...STEPS.map((s) => ({ name: s.key, vh: 110 })),
  { name: 'out', vh: 50 },
];

/** Lattice node positions, shared by every stage so the figure never jumps. */
const NODES = [
  [160, 176], [118, 152], [202, 152], [160, 128],
  [118, 200], [202, 200], [76, 176], [244, 176],
  [160, 224], [96, 118], [224, 118], [160, 80],
];

const EDGES = [
  [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [1, 3], [2, 3],
  [1, 6], [2, 7], [4, 6], [5, 7], [4, 8], [5, 8],
  [1, 9], [2, 10], [3, 11],
];

const CITIES = [[92, 196], [134, 178], [196, 172], [236, 190]];

export default function Story() {
  // The camera reads these every frame; a ref, never state.
  const progress = useRef({ sp: 0, p: 0, phase: 'lead' });
  // The mural outranks the drawn lattice when the artwork is present.
  const [hasMural, setHasMural] = useState(true);

  return (
    <ScrollScene phases={PHASES} id="the-house" label="Our story" progressRef={progress}>
      <div className={styles.stage} data-mural={hasMural ? '' : undefined}>
        {hasMural && (
          <StoryPanorama progressRef={progress} onUnavailable={() => setHasMural(false)} />
        )}
        <div className={styles.inner}>
          <div className={styles.viz} aria-hidden="true">
            <svg viewBox="0 0 320 300" className={styles.svg}>
              <defs>
                <radialGradient id="storyGlow">
                  <stop offset="0%" stopColor="#ffd9a0" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#b48c47" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="storyFace" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#c9d5e6" stopOpacity="0.45" />
                </linearGradient>
              </defs>

              {/* reactor ring, arriving in stage three */}
              <circle className={styles.ring} cx="160" cy="176" r="104" />
              <circle className={styles.glow} cx="160" cy="176" r="96" fill="url(#storyGlow)" />

              {/* the lattice: bonds, then atoms */}
              <g className={styles.bonds}>
                {EDGES.map(([a, z], i) => (
                  <line
                    key={`${a}-${z}`}
                    x1={NODES[a][0]} y1={NODES[a][1]}
                    x2={NODES[z][0]} y2={NODES[z][1]}
                    style={{ '--i': i }}
                  />
                ))}
              </g>
              <g className={styles.atoms}>
                {NODES.map(([x, y], i) => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r={i === 0 ? 5 : 3.6} style={{ '--i': i }} />
                ))}
              </g>

              {/* the range: cut outlines fanning out */}
              <g className={styles.cuts}>
                <polygon points="160,146 186,172 160,214 134,172" style={{ '--i': 0 }} />
                <ellipse cx="160" cy="176" rx="20" ry="32" style={{ '--i': 1 }} />
                <rect x="140" y="156" width="40" height="40" rx="2" style={{ '--i': 2 }} />
                <polygon points="160,140 184,176 160,216 136,176" style={{ '--i': 3 }} />
                <polygon points="160,144 180,164 180,190 140,190 140,164" style={{ '--i': 4 }} />
              </g>

              {/* the reach: an arc of the world with four desks on it */}
              <g className={styles.world}>
                <path className={styles.arc} d="M56,214 Q160,132 264,214" />
                {CITIES.map(([x, y], i) => (
                  <circle key={`${x}-${y}`} cx={x} cy={y} r="4" style={{ '--i': i }} />
                ))}
              </g>

              {/* the standard: one graded stone */}
              <g className={styles.final}>
                <polygon className={styles.finalBody} points="160,124 212,170 160,242 108,170" fill="url(#storyFace)" />
                <g className={styles.finalFacets}>
                  <path d="M108,170 L212,170" />
                  <path d="M160,124 L160,242" />
                  <path d="M108,170 L160,124 L212,170" />
                </g>
                <g className={styles.seal}>
                  <circle cx="232" cy="238" r="17" />
                  <path d="M224,238 l6,6 l12,-13" />
                </g>
              </g>
            </svg>
          </div>

          <div className={styles.copy}>
            <p className={styles.eyebrow}>The house</p>
            {STEPS.map((step) => (
              <div key={step.key} className={styles.step} data-step={step.key}>
                <p className={styles.marker}>{step.marker}</p>
                <h3 className={styles.title}>{step.title}</h3>
                <LineReveal className={styles.body} lines={step.lines} />
              </div>
            ))}
          </div>

          <ol className={styles.rail} aria-hidden="true">
            {STEPS.map((step, i) => (
              <li key={step.key} data-step={step.key}>
                <span className={styles.railDot} />
                <span className={styles.railN}>{String(i + 1).padStart(2, '0')}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </ScrollScene>
  );
}
