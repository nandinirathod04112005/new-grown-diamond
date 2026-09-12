import { useLocale, interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './GradeScale.copy.js';
import styles from './StoneViews.module.css';

/**
 * Where this stone sits on each grading scale.
 *
 * A grade on its own — "VS1", "G" — means nothing to most buyers. On the
 * scale, next to every other grade, it does. The scales are the standard GIA
 * and IGI ones; the only thing marked is the grade the record carries, and a
 * grade that is not on a scale (a fancy colour, say) simply leaves that scale
 * out rather than guessing a position for it.
 *
 * `name` picks the scale's title from the dictionary (`terms.colour`…) and its
 * band names from GradeScale.copy.js; `bands` is how many grades each band
 * spans, in the same order as those names.
 */

const COLOUR = {
  name: 'colour',
  steps: ['D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'],
  bands: [3, 4, 3],
};

const CLARITY = {
  name: 'clarity',
  steps: ['FL', 'IF', 'VVS1', 'VVS2', 'VS1', 'VS2', 'SI1', 'SI2', 'I1', 'I2', 'I3'],
  bands: [2, 2, 2, 2, 3],
};

const CUT = {
  name: 'cut',
  steps: ['Ideal', 'Excellent', 'Very Good', 'Good', 'Fair'],
  bands: null,
};

/* The trade writes grades several ways; each is read to one position. */
const CUT_ALIASES = {
  id: 'Ideal', ideal: 'Ideal', ex: 'Excellent', exc: 'Excellent', excellent: 'Excellent',
  vg: 'Very Good', 'very good': 'Very Good', gd: 'Good', g: 'Good', good: 'Good', f: 'Fair', fr: 'Fair', fair: 'Fair',
};

function norm(scale, value) {
  const v = String(value ?? '').trim();
  if (!v || v === '—') return null;
  if (scale === CUT) return CUT_ALIASES[v.toLowerCase()] ?? null;
  const up = v.toUpperCase().replace(/\s+/g, '');
  return scale.steps.includes(up) ? up : null;
}

function Scale({ scale, value, index }) {
  const { t } = useLocale();
  const c = useCopy(COPY);
  const at = norm(scale, value);
  if (!at) return null;
  const pos = scale.steps.indexOf(at);
  const title = t(`terms.${scale.name}`);
  const names = c.bands[scale.name] ?? [];
  return (
    <div className={styles.scale} style={{ '--i': index }}>
      <div className={styles.scaleHead}>
        <span>{title}</span>
        <b>{at}</b>
      </div>
      <ol className={styles.steps} aria-label={interpolate(c.scaleLabel, { title, grade: at })}>
        {scale.steps.map((s, i) => (
          <li key={s} data-on={i === pos ? '' : undefined} data-past={i < pos ? '' : undefined}>
            <span aria-hidden="true">{s}</span>
          </li>
        ))}
      </ol>
      {scale.bands && (
        <div className={styles.groups} aria-hidden="true">
          {scale.bands.map((span, i) => (
            <span key={i} style={{ flexGrow: span }}>{names[i]}</span>
          ))}
        </div>
      )}
    </div>
  );
}

/* `heading` and `className` come from the caller so the section matches the
   dialog around it; nothing renders at all when no grade is on a scale, so an
   empty heading can never appear. */
export default function GradeScale({ colour, clarity, cut, heading = null, className }) {
  const any = [norm(COLOUR, colour), norm(CLARITY, clarity), norm(CUT, cut)].some(Boolean);
  if (!any) return null;
  return (
    <section className={className}>
      {heading}
      <div className={styles.scales}>
        <Scale scale={COLOUR} value={colour} index={0} />
        <Scale scale={CLARITY} value={clarity} index={1} />
        <Scale scale={CUT} value={cut} index={2} />
      </div>
    </section>
  );
}
