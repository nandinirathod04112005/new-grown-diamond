import { Star } from 'lucide-react';

import { interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './Feedback.copy.js';
import styles from './Feedback.module.css';

/* The words for one to five stars ('Poor' … 'Excellent') are `stars.words`
   in Feedback.copy.js, index 0 left empty so a rating indexes them directly. */

/** A rating shown as five stars, read out as "4 out of 5". */
export function StarsDisplay({ value, size = 15 }) {
  const c = useCopy(COPY);
  const n = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return (
    <span className={styles.stars} role="img" aria-label={interpolate(c.stars.shown, { n })}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={1.4}
          aria-hidden="true"
          data-on={i <= n ? '' : undefined}
          fill={i <= n ? 'currentColor' : 'none'}
        />
      ))}
    </span>
  );
}

/**
 * A rating picker built on five radio buttons, so the keyboard, the screen
 * reader and the form all get the behaviour radios already have. The stars
 * are the labels; hovering one lights the run up to it.
 */
export function StarsInput({ value, onChange, name = 'rating', invalid }) {
  const c = useCopy(COPY);
  const words = c.stars.words;
  return (
    <fieldset className={styles.starsInput} aria-invalid={invalid ? 'true' : undefined}>
      <legend>{c.stars.legend}</legend>
      <div className={styles.starRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <label key={i} className={styles.starPick} data-on={i <= value ? '' : undefined}>
            <input
              type="radio"
              name={name}
              value={i}
              checked={value === i}
              onChange={() => onChange(i)}
            />
            <Star size={26} strokeWidth={1.3} aria-hidden="true" fill={i <= value ? 'currentColor' : 'none'} />
            <span className={styles.vh}>{interpolate(i === 1 ? c.stars.one : c.stars.many, { n: i, word: words[i] })}</span>
          </label>
        ))}
        <span className={styles.starWord} aria-hidden="true">{value ? words[value] : c.stars.choose}</span>
      </div>
    </fieldset>
  );
}
