import { useLocale, interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import { FACETS } from './facets.js';
import { shapeName } from './shapeNames.js';
import { percent } from './stoneFormat.js';
import { DEPTH_RANGE, TABLE_RANGE, facetBox, inRange, shapeKey } from './stoneGeometry.js';
import COPY from './StoneDiagrams.copy.js';
import styles from './StoneViews.module.css';

/**
 * Line drawings of the stone, dimensioned from its own record.
 *
 * Drawn the way a grading report draws them: a face-up plan with the length
 * and width, and a side profile with the table and the total depth. The facet
 * pattern is the standard one for the shape — the drawing is a schematic of
 * the cut, not a scan of this stone — but every number printed on it is the
 * stone's own. Where the record has no measurement, the line is drawn and the
 * number is simply left off.
 */

const mm = (n) => (Number.isFinite(n) ? `${n.toFixed(2)} mm` : null);

/* A dimension line with end ticks, in the drawing's own units. */
function Dim({ x1, y1, x2, y2, tick = 2.6 }) {
  const vertical = x1 === x2;
  return (
    <g className={styles.dim}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      {vertical ? (
        <>
          <line x1={x1 - tick} y1={y1} x2={x1 + tick} y2={y1} />
          <line x1={x2 - tick} y1={y2} x2={x2 + tick} y2={y2} />
        </>
      ) : (
        <>
          <line x1={x1} y1={y1 - tick} x2={x1} y2={y1 + tick} />
          <line x1={x2} y1={y2 - tick} x2={x2} y2={y2 + tick} />
        </>
      )}
    </g>
  );
}

/** Face-up plan: the facet pattern, with length down the side and width across the foot. */
export function TopView({ shape, length, width }) {
  const { locale } = useLocale();
  const c = useCopy(COPY).top;
  const key = shapeKey(shape);
  if (!key) return null;
  const b = facetBox(key);
  const lx = b.minX - 10;
  const wy = b.maxY + 10;
  const cx = (b.minX + b.maxX) / 2;
  const cy = (b.minY + b.maxY) / 2;
  const L = mm(length);
  const W = mm(width);

  return (
    <figure className={styles.diagram}>
      <svg
        viewBox={`${b.minX - 22} ${b.minY - 8} ${b.w + 30} ${b.h + 30}`}
        role="img"
        aria-label={`${interpolate(c.aria, { shape: shapeName(key.toLowerCase(), locale) })}${L ? interpolate(c.ariaLength, { value: L }) : ''}${W ? interpolate(c.ariaWidth, { value: W }) : ''}`}
      >
        <g className={styles.facetLines}>
          {FACETS[key].f.map((f, i) => (
            <path key={i} d={f.d} style={{ '--i': i }} />
          ))}
        </g>
        <path className={styles.outline} d={FACETS[key].o} />

        <Dim x1={lx} y1={b.minY} x2={lx} y2={b.maxY} />
        <text className={styles.dimText} x={lx - 3.2} y={cy} transform={`rotate(-90 ${lx - 3.2} ${cy})`} textAnchor="middle">
          {L ? interpolate(c.lengthValue, { value: L }) : c.length}
        </text>

        <Dim x1={b.minX} y1={wy} x2={b.maxX} y2={wy} />
        <text className={styles.dimText} x={cx} y={wy + 7.5} textAnchor="middle">
          {W ? interpolate(c.widthValue, { value: W }) : c.width}
        </text>
      </svg>
      <figcaption>
        {L && W ? c.measured : c.unmeasured}
      </figcaption>
    </figure>
  );
}

/**
 * Side profile, proportioned from the record.
 *
 * Only the table and the total depth are recorded, so the crown is drawn at
 * the standard 34.5° crown angle and the rest of the depth is given to the
 * girdle and the pavilion — which is how a stone with those two numbers is
 * actually shaped. A step cut (emerald) gets stepped rows and a keel instead
 * of converging mains.
 *
 * Numbers a real stone cannot have — the table is outside 40–80%, or the depth
 * is outside 45–85% — cannot be drawn honestly. The profile falls back to
 * standard proportions and the caption says so, while the labels still show
 * exactly what the record says.
 */
export function SideView({ shape, table, depth }) {
  const c = useCopy(COPY).side;
  const key = shapeKey(shape) ?? 'Round';
  const t = Number(table);
  const d = Number(depth);
  const drawable = inRange(t, TABLE_RANGE) && inRange(d, DEPTH_RANGE);
  const T = drawable ? t : 57;
  const D = drawable ? d : 61.5;

  const girdle = 2.6;
  let crown = ((100 - T) / 2) * Math.tan((34.5 * Math.PI) / 180);
  if (D - crown - girdle < 30) crown = Math.max(8, D - girdle - 30);
  const gTop = crown;
  const gBot = crown + girdle;
  const tl = (100 - T) / 2;
  const tr = tl + T;
  const step = key === 'Emerald';

  /* x on the crown edge between the table (y=0) and the girdle (y=gTop). */
  const crownX = (side, y) => (side < 0 ? tl - (tl * y) / gTop : tr + ((100 - tr) * y) / gTop);
  /* x on the pavilion edge between the girdle and the culet or keel. */
  const keel = step ? 10 : 0;
  const pavX = (side, y) => {
    const f = (y - gBot) / (D - gBot);
    return side < 0 ? f * (50 - keel) : 100 - f * (50 - keel);
  };

  const outline = step
    ? `M${tl} 0 L${tr} 0 L100 ${gTop} L100 ${gBot} L${50 + keel} ${D} L${50 - keel} ${D} L0 ${gBot} L0 ${gTop} Z`
    : `M${tl} 0 L${tr} 0 L100 ${gTop} L100 ${gBot} L50 ${D} L0 ${gBot} L0 ${gTop} Z`;

  const lines = [];
  if (step) {
    /* Stepped rows: one break across the crown, three down the pavilion. */
    for (const f of [0.5]) {
      const y = gTop * f;
      lines.push(`M${crownX(-1, y)} ${y} L${crownX(1, y)} ${y}`);
    }
    for (const f of [0.3, 0.58, 0.82]) {
      const y = gBot + (D - gBot) * f;
      lines.push(`M${pavX(-1, y)} ${y} L${pavX(1, y)} ${y}`);
    }
  } else {
    /* Crown: bezel lines from the table edge to the girdle, and the star and
       upper-girdle zigzag across them. */
    const n = 8;
    const topPts = Array.from({ length: n + 1 }, (_, i) => tl + (T * i) / n);
    const girdlePts = Array.from({ length: n + 1 }, (_, i) => (100 * i) / n);
    for (let i = 0; i <= n; i += 2) lines.push(`M${topPts[i]} 0 L${girdlePts[i]} ${gTop}`);
    for (let i = 1; i < n; i += 2) {
      const mid = gTop * 0.5;
      const x = topPts[i] + (girdlePts[i] - topPts[i]) * 0.5;
      lines.push(`M${girdlePts[i - 1]} ${gTop} L${x} ${mid} L${girdlePts[i + 1]} ${gTop}`);
      lines.push(`M${topPts[i - 1]} 0 L${x} ${mid} L${topPts[i + 1]} 0`);
    }
    /* Pavilion: the mains converging on the culet, and the lower-girdle
       facets that stop part of the way down. */
    for (let i = 1; i < n; i += 1) lines.push(`M${girdlePts[i]} ${gBot} L50 ${D}`);
    for (let i = 1; i < n; i += 2) {
      const x = girdlePts[i];
      lines.push(`M${girdlePts[i - 1]} ${gBot} L${x + (50 - x) * 0.62} ${gBot + (D - gBot) * 0.62} L${girdlePts[i + 1]} ${gBot}`);
    }
  }

  const tableLabel = Number.isFinite(t) && t > 0 ? interpolate(c.tableValue, { value: percent(t) }) : c.table;
  const depthLabel = Number.isFinite(d) && d > 0 ? percent(d) : null;

  return (
    <figure className={styles.diagram}>
      <svg
        viewBox={`-8 -18 ${142} ${D + 30}`}
        role="img"
        aria-label={`${c.aria}${Number.isFinite(t) ? interpolate(c.ariaTable, { value: percent(t) }) : ''}${depthLabel ? interpolate(c.ariaDepth, { value: depthLabel }) : ''}`}
      >
        <g className={styles.facetLines}>
          {lines.map((l, i) => <path key={i} d={l} style={{ '--i': i }} />)}
          <path d={`M0 ${gTop} L100 ${gTop} M0 ${gBot} L100 ${gBot}`} />
        </g>
        <path className={styles.outline} d={outline} />

        <Dim x1={tl} y1={-8} x2={tr} y2={-8} />
        <text className={styles.dimText} x={50} y={-12} textAnchor="middle">{tableLabel}</text>

        <Dim x1={110} y1={0} x2={110} y2={D} />
        <text className={styles.dimText} x={114} y={D / 2 - 2}>{c.depth}</text>
        {depthLabel && <text className={styles.dimText} x={114} y={D / 2 + 4.5}>{depthLabel}</text>}
      </svg>
      <figcaption>
        {drawable
          ? c.drawn
          : Number.isFinite(t) || Number.isFinite(d)
            ? c.outside
            : c.unrecorded}
      </figcaption>
    </figure>
  );
}
