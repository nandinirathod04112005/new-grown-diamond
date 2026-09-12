import { FACETS } from '@/components/product/facets.js';
import { roundDiameter } from '@/components/product/stoneGeometry.js';
import { CARATS, COLOURS, PLACES } from '@/content/aboutCompany.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './AboutArt.copy.js';
import styles from './AboutCompany.module.css';

/*
 * Our Story's illustrations. All drawn here as SVG — no image files, so
 * nothing to download on a phone and nothing that pretends to be a photograph
 * of the factory. Each is labelled as an illustration where it sits.
 *
 * They animate from CSS alone, keyed to `data-in` on their figure (set by
 * useReveal as the figure comes on screen), and are finished and still under
 * reduced motion.
 *
 * Their words are in AboutArt.copy.js and are read at render, so a change of
 * language redraws the labels in place; nothing is written from an effect.
 */

/** A diamond's face-up drawing from the facet data the inventory uses. */
export function FacetStone({ shape, stretch = 1, className = '', animated = false }) {
  const art = FACETS[shape];
  if (!art) return null;
  const fit = stretch === 1 ? undefined : `translate(50 50) scale(${stretch} 1) translate(-50 -50)`;
  return (
    <svg className={className} viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g transform={fit}>
        <path d={art.o} fill="#16171b" />
        {art.f.map((f, i) => (
          <path
            key={i}
            d={f.d}
            fill={f.f}
            className={animated ? styles.facet : undefined}
            style={animated ? { '--i': i } : undefined}
          />
        ))}
        <path d={art.o} fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

/* ---------------- 1980s → 2012 → today ---------------- */
const JOURNEY_PATH = 'M70 372 C 150 360, 170 300, 232 262 S 340 170, 452 86';

export function JourneyArt() {
  const c = useCopy(COPY);
  return (
    <figure className={styles.art} data-rv="" data-kind="journey">
      <svg viewBox="0 0 520 440" role="img" aria-labelledby="journey-art-title">
        <title id="journey-art-title">{c.journey.title}</title>
        <defs>
          <radialGradient id="jGlow" cx="70%" cy="25%" r="70%">
            <stop offset="0" style={{ stopColor: 'var(--a-gold)', stopOpacity: 0.22 }} />
            <stop offset="1" style={{ stopColor: 'var(--a-gold)', stopOpacity: 0 }} />
          </radialGradient>
        </defs>
        <rect width="520" height="440" fill="url(#jGlow)" />
        {/* The route, drawn on as the figure arrives. */}
        <path d={JOURNEY_PATH} pathLength="1" className={styles.jTrack} />
        <path d={JOURNEY_PATH} pathLength="1" className={styles.jPath} />

        {/* 1980s — a rough stone. */}
        <g className={styles.jNode} style={{ '--d': 0 }}>
          <g transform="translate(70 372)">
            <circle r="30" className={styles.jHalo} />
            <path d="M-17 -6 L-5 -19 L13 -14 L19 3 L6 18 L-13 12Z" fill="#8f949c" />
            <path d="M-17 -6 L-5 -19 L-2 -2Z M13 -14 L-2 -2 L19 3Z M6 18 L-2 -2 L-13 12Z" fill="#b7bcc4" opacity="0.8" />
            <path d="M-17 -6 L-5 -19 L13 -14 L19 3 L6 18 L-13 12Z" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          </g>
          {/* Below the route, which leaves this stop heading right. */}
          <text x="112" y="404" className={styles.jYear}>{c.journey.decade}</text>
          <text x="112" y="426" className={styles.jNote}>{c.journey.mined}</text>
        </g>

        {/* 2012 — the first polished lab-grown stone. */}
        <g className={styles.jNode} style={{ '--d': 1 }}>
          <circle cx="232" cy="262" r="34" className={styles.jHalo} />
          <svg x="204" y="234" width="56" height="56" viewBox="0 0 100 100" aria-hidden="true">
            <path d={FACETS.Round.o} fill="#16171b" />
            {FACETS.Round.f.map((f, i) => <path key={i} d={f.d} fill={f.f} />)}
          </svg>
          <text x="276" y="256" className={styles.jYear}>2012</text>
          <text x="276" y="278" className={styles.jNote}>{c.journey.polished}</text>
        </g>

        {/* Today — CVD & HPHT, worldwide. */}
        <g className={styles.jNode} style={{ '--d': 2 }}>
          <circle cx="452" cy="86" r="52" className={styles.jOrbit} />
          <circle cx="452" cy="86" r="40" className={styles.jHalo} />
          <svg x="418" y="52" width="68" height="68" viewBox="0 0 100 100" aria-hidden="true">
            <path d={FACETS.Round.o} fill="#16171b" />
            {FACETS.Round.f.map((f, i) => <path key={i} d={f.d} fill={f.f} />)}
          </svg>
          <circle cx="504" cy="86" r="3.5" className={styles.jMoon} />
          {/* Left of the stop and above the route arriving from below-left. */}
          <text x="388" y="74" className={styles.jYear} textAnchor="end">{c.journey.today}</text>
          <text x="388" y="96" className={styles.jNote} textAnchor="end">{c.journey.worldwide}</text>
        </g>

        {/* A spark that travels the route once it is drawn. SVG's own
            animateMotion rather than CSS offset-path, which not every browser
            applies to SVG — where it did not, the spark would sit at 0,0. */}
        <g className={styles.jSparkWrap}>
          <circle r="4" className={styles.jSpark}>
            <animateMotion dur="4.2s" repeatCount="indefinite" path={JOURNEY_PATH} calcMode="spline" keyTimes="0;1" keySplines="0.45 0 0.55 1" />
            <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.08;0.9;1" dur="4.2s" repeatCount="indefinite" />
          </circle>
        </g>
      </svg>
      <figcaption className={styles.artCaption}>{c.illustration}</figcaption>
    </figure>
  );
}

/* ---------------- colour D to J ---------------- */
/* An illustrative tint, from icy colourless at D to a faint warmth at J. */
const TINTS = ['#f4f9ff', '#f3f7fb', '#f4f5f2', '#f5f2e8', '#f6efdc', '#f5eacd', '#f3e3bd'];

export function ColourScale() {
  const c = useCopy(COPY);
  return (
    <figure className={styles.scale} data-rv="">
      <figcaption>
        <b>{c.colour.title}</b>
        <span>{c.colour.note}</span>
      </figcaption>
      <ol className={styles.colours}>
        {COLOURS.map((grade, i) => (
          <li key={grade} style={{ '--i': i, '--tint': TINTS[i] }}>
            <svg viewBox="0 0 100 100" aria-hidden="true">
              <path d={FACETS.Round.o} className={styles.colourStone} />
              <path d="M50 22 L78 50 L50 78 L22 50Z" className={styles.colourFacet} />
            </svg>
            <span>{grade}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}

/* ---------------- 0.30 to 6.00 carats, to scale ---------------- */
/* Face-up diameter of a round brilliant, the same estimate the stone viewer
   uses (6.5 mm × ∛ct), drawn at 7 px per millimetre. Laid out once, here: the
   range never changes, so there is nothing to work out per render. */
const CARAT_LAYOUT = CARATS.reduce((acc, ct) => {
  const mm = roundDiameter(ct);
  const d = mm * 7;
  return { x: acc.x + d + 16, stones: [...acc.stones, { ct, mm, d, cx: acc.x + d / 2 }] };
}, { x: 6, stones: [] });

export function CaratScale() {
  const c = useCopy(COPY);
  const placed = CARAT_LAYOUT.stones;
  const width = CARAT_LAYOUT.x;
  const base = 96;
  return (
    <figure className={styles.scale} data-rv="">
      <figcaption>
        <b>{c.carat.title}</b>
        <span>{c.carat.note}</span>
      </figcaption>
      <div className={styles.caratsWrap} role="region" aria-label={c.carat.region} tabIndex={0}>
        <svg viewBox={`0 0 ${width} 132`} className={styles.carats} role="img" aria-label={c.carat.label}>
          <line x1="0" x2={width} y1={base} y2={base} className={styles.caratBase} />
          {placed.map((s, i) => (
            <g key={s.ct} className={styles.caratStone} style={{ '--i': i }}>
              <svg x={s.cx - s.d / 2} y={base - s.d} width={s.d} height={s.d} viewBox="0 0 100 100" aria-hidden="true">
                <path d={FACETS.Round.o} fill="#16171b" />
                {FACETS.Round.f.map((f, k) => <path key={k} d={f.d} fill={f.f} />)}
              </svg>
              <text x={s.cx} y={base + 16} textAnchor="middle" className={styles.caratCt}>{s.ct < 1 ? s.ct.toFixed(2) : s.ct.toFixed(0)} ct</text>
              <text x={s.cx} y={base + 30} textAnchor="middle" className={styles.caratMm}>{s.mm.toFixed(1)} mm</text>
            </g>
          ))}
        </svg>
      </div>
    </figure>
  );
}

/* ---------------- Surat to the world ---------------- */
/* An equirectangular window from 100°W to 135°E, 62°N to 2°S. */
const MAP = { w: 720, h: 300, lon0: -100, lon1: 135, lat0: 62, lat1: -2 };
const project = ({ lon, lat }) => ({
  x: ((lon - MAP.lon0) / (MAP.lon1 - MAP.lon0)) * MAP.w,
  y: ((MAP.lat0 - lat) / (MAP.lat0 - MAP.lat1)) * MAP.h,
});

export function ReachArt() {
  const c = useCopy(COPY);
  const points = PLACES.map((p) => ({ ...p, ...project(p) }));
  const hub = points.find((p) => p.hub);
  const arcs = points.filter((p) => !p.hub).map((p) => {
    const mx = (hub.x + p.x) / 2;
    const lift = Math.min(150, Math.abs(p.x - hub.x) * 0.35 + 26);
    const my = Math.min(hub.y, p.y) - lift;
    return { to: p, d: `M${hub.x.toFixed(1)} ${hub.y.toFixed(1)} Q ${mx.toFixed(1)} ${my.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}` };
  });
  /* A field of dots, faded out towards the edges, as a globe's texture. */
  const dots = [];
  for (let gx = 12; gx < MAP.w; gx += 18) {
    for (let gy = 10; gy < MAP.h; gy += 18) dots.push([gx, gy]);
  }
  const lines = [];
  for (let lon = -90; lon <= 120; lon += 30) lines.push({ x: project({ lon, lat: 0 }).x });

  return (
    <figure className={`${styles.art} ${styles.reachArt}`} data-rv="" data-kind="reach">
      <svg viewBox={`0 -20 ${MAP.w} ${MAP.h + 40}`} role="img" aria-labelledby="reach-art-title">
        <title id="reach-art-title">{c.reach.title}</title>
        <defs>
          <radialGradient id="rFade" cx="55%" cy="50%" r="60%">
            <stop offset="0" stopColor="#fff" stopOpacity="1" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="rMask"><rect x="0" y="-20" width={MAP.w} height={MAP.h + 40} fill="url(#rFade)" /></mask>
        </defs>
        <g mask="url(#rMask)">
          {dots.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.2" className={styles.rDot} />)}
          {lines.map((l) => <line key={l.x} x1={l.x} x2={l.x} y1="-20" y2={MAP.h + 20} className={styles.rGrid} />)}
          <line x1="0" x2={MAP.w} y1={project({ lon: 0, lat: 23.4 }).y} y2={project({ lon: 0, lat: 23.4 }).y} className={styles.rTropic} />
        </g>
        {arcs.map((a, i) => (
          <g key={a.to.city} style={{ '--i': i }}>
            <path d={a.d} pathLength="1" className={styles.rArc} />
            <g className={styles.rTravelWrap} style={{ '--i': i }}>
              <circle r="3.2" className={styles.rTravel}>
                <animateMotion dur="3.4s" begin={`${i * 0.9}s`} repeatCount="indefinite" path={a.d} calcMode="spline" keyTimes="0;1" keySplines="0.45 0 0.55 1" />
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.1;0.88;1" dur="3.4s" begin={`${i * 0.9}s`} repeatCount="indefinite" />
              </circle>
            </g>
          </g>
        ))}
        {points.map((p, i) => (
          <g key={p.city} className={styles.rPin} style={{ '--i': i }} data-hub={p.hub ? '' : undefined}>
            <circle cx={p.x} cy={p.y} r={p.hub ? 16 : 11} className={styles.rPulse} />
            <circle cx={p.x} cy={p.y} r={p.hub ? 5.5 : 4} className={styles.rCore} />
            {/* Mumbai sits just south of Surat: its name goes below the pin
                so the two never overlap. */}
            <text
              x={p.x}
              y={p.city === 'Mumbai' ? p.y + 24 : p.y - 16}
              textAnchor="middle"
              className={styles.rLabel}
            >
              {p.city}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className={styles.artCaption}>{c.reach.caption}</figcaption>
    </figure>
  );
}

/* ---------------- the mission's stone ---------------- */
const SPARKS = [[78, 70], [318, 98], [300, 318], [96, 300], [200, 34]];

export function MissionArt() {
  const c = useCopy(COPY);
  return (
    <figure className={`${styles.art} ${styles.missionArt}`} data-rv="" data-kind="mission">
      <div className={styles.rays} aria-hidden="true" />
      <svg viewBox="0 0 400 400" role="img" aria-labelledby="mission-art-title">
        <title id="mission-art-title">{c.mission.title}</title>
        <circle cx="200" cy="200" r="176" className={styles.mOrbit} />
        <circle cx="200" cy="200" r="150" className={styles.mOrbitInner} />
        <g transform="translate(80 80)">
          <svg width="240" height="240" viewBox="0 0 100 100" aria-hidden="true">
            <path d={FACETS.Round.o} fill="#101114" />
            {FACETS.Round.f.map((f, i) => (
              <path key={i} d={f.d} fill={f.f} className={styles.facet} style={{ '--i': i }} />
            ))}
            <path d={FACETS.Round.o} fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="0.6" />
          </svg>
        </g>
        {SPARKS.map(([x, y], i) => (
          <path
            key={i}
            d={`M${x} ${y - 10} L${x + 2.2} ${y - 2.2} L${x + 10} ${y} L${x + 2.2} ${y + 2.2} L${x} ${y + 10} L${x - 2.2} ${y + 2.2} L${x - 10} ${y} L${x - 2.2} ${y - 2.2}Z`}
            className={styles.spark}
            style={{ '--i': i }}
          />
        ))}
      </svg>
      <figcaption className={styles.artCaption}>{c.illustration}</figcaption>
    </figure>
  );
}
