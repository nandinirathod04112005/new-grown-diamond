import { useId, useState } from 'react';

import { useLocale, interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import { FACETS } from './facets.js';
import { shapeName } from './shapeNames.js';
import { carat as fmtCarat } from './stoneFormat.js';
import { estimatedSize, facetBox, shapeKey } from './stoneGeometry.js';
import COPY from './StoneSize.copy.js';
import styles from './StoneViews.module.css';

/*
 * The drawing's scale: 2.6 units to the millimetre. The finger is drawn 17 mm
 * across, an average ring finger, so a stone of any recorded size sits on it
 * at its true proportion. The slider runs the way a buyer thinks about size —
 * in carats — and the stone grows by the cube root of the weight, which is how
 * a real stone grows.
 */
const U = 2.6;
const FINGER_MM = 17;
const MIN_CT = 0.2;
const MAX_CT = 5;

/**
 * Size on a finger.
 *
 * A line drawing, to scale, rather than a photograph of a hand: it can show
 * this exact stone at its measured size, and any other weight for comparison,
 * without pretending to be a picture of the stone on someone.
 *
 * At the stone's own weight it uses the MEASURED length and width when the
 * record has them. At any other weight — or when the record has none — the
 * size is estimated from the weight and the caption says "about".
 */
export default function StoneSize({ shape, carat, measured }) {
  const key = shapeKey(shape) ?? 'Round';
  const own = Math.min(MAX_CT, Math.max(MIN_CT, Number(carat) || 1));
  const [ct, setCt] = useState(own);
  const id = useId();
  const { locale } = useLocale();
  const c = useCopy(COPY);

  const isOwn = Math.abs(ct - own) < 0.005;
  const useMeasured = isOwn && measured?.length && measured?.width && Math.abs(own - Number(carat)) < 0.005;
  const size = useMeasured ? measured : estimatedSize(key, ct);

  const b = facetBox(key);
  const sx = (size.width * U) / b.w;
  const sy = (size.length * U) / b.h;
  const cx = 50;
  const cy = 80;
  const tx = cx - ((b.minX + b.maxX) / 2) * sx;
  const ty = cy - ((b.minY + b.maxY) / 2) * sy;
  const half = (FINGER_MM * U) / 2;
  const fl = cx - half;
  const fr = cx + half;

  const across = size.width === size.length
    ? interpolate(c.across, { size: size.width.toFixed(1) })
    : interpolate(c.acrossLong, { length: size.length.toFixed(1), width: size.width.toFixed(1) });

  return (
    <figure className={styles.size}>
      <svg viewBox="0 0 100 130" role="img" aria-label={interpolate(c.aria, { ct: fmtCarat(ct), shape: shapeName(key.toLowerCase(), locale), across })}>
        {/* The finger: a soft tip, the nail, two creases at the knuckle. */}
        <path
          className={styles.finger}
          d={`M${fl} 130 L${fl} 30 C${fl} 4 ${fr} 4 ${fr} 30 L${fr} 130`}
        />
        <path className={styles.nail} d={`M${cx - 13} 30 C${cx - 13} 12 ${cx + 13} 12 ${cx + 13} 30 L${cx + 12} 40 C${cx + 4} 43 ${cx - 4} 43 ${cx - 12} 40 Z`} />
        <path className={styles.crease} d={`M${fl + 8} 56 Q${cx} 60 ${fr - 8} 56`} />
        <path className={styles.crease} d={`M${fl + 10} 61 Q${cx} 64.5 ${fr - 10} 61`} />
        <path className={styles.crease} d={`M${fl + 6} 108 Q${cx} 112 ${fr - 6} 108`} />

        {/* The band, curving round the finger. */}
        <path className={styles.band} d={`M${fl - 0.5} ${cy - 2} Q${cx} ${cy + 4} ${fr + 0.5} ${cy - 2} L${fr + 0.5} ${cy + 4} Q${cx} ${cy + 10} ${fl - 0.5} ${cy + 4} Z`} />

        {/* The stone, at scale, with four prongs. */}
        <g className={styles.sizeStone} transform={`translate(${tx} ${ty}) scale(${sx} ${sy})`}>
          <path d={FACETS[key].o} className={styles.sizeGirdle} />
          {FACETS[key].f.map((f, i) => (
            <path key={i} d={f.d} fill={f.f} />
          ))}
        </g>
        {[[0, -1], [1, 0], [0, 1], [-1, 0]].map(([px, py]) => (
          <circle
            key={`${px}${py}`}
            className={styles.prong}
            cx={cx + px * (size.width * U) / 2 * 0.92}
            cy={cy + py * (size.length * U) / 2 * 0.92}
            r={1.1}
          />
        ))}
      </svg>

      <div className={styles.sizeControls}>
        <p className={styles.sizeRead} aria-live="polite">
          <b>{fmtCarat(ct)} ct</b>
          <span>{interpolate(useMeasured ? c.measured : c.about, { across })}</span>
        </p>
        <label className={styles.slider} htmlFor={id}>
          <span className={styles.vh}>{c.slider}</span>
          <span aria-hidden="true">{MIN_CT} ct</span>
          <input
            id={id}
            type="range"
            min={MIN_CT}
            max={MAX_CT}
            step={0.01}
            value={ct}
            onChange={(e) => setCt(Number(e.target.value))}
            style={{ '--p': `${((ct - MIN_CT) / (MAX_CT - MIN_CT)) * 100}%` }}
          />
          <span aria-hidden="true">{MAX_CT} ct</span>
        </label>
        {!isOwn && (
          <button type="button" className={styles.resetSize} onClick={() => setCt(own)}>
            {interpolate(c.back, { ct: fmtCarat(own) })}
          </button>
        )}
      </div>
      <figcaption>{c.caption}</figcaption>
    </figure>
  );
}
