import { useState } from 'react';

import { applyTheme, storedTheme } from '@/lib/theme.js';
import { interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './ThemeToggle.copy.js';
import styles from './ThemeToggle.module.css';

/**
 * The light / dark control.
 *
 * Dark is the authored default and light is an explicit visitor option. The
 * words for each mode are in ThemeToggle.copy.js.
 */
const ORDER = ['dark', 'light'];

export default function ThemeToggle() {
  const c = useCopy(COPY);
  const [choice, setChoice] = useState(() => storedTheme() ?? 'light');

  function cycle() {
    const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];
    applyTheme(next);
    setChoice(next);
  }

  const label = c.modes[String(choice)];

  return (
    <button
      type="button"
      className={styles.root}
      onClick={cycle}
      data-mode={choice}
      // The accessible name carries the current setting AND what pressing it
      // does, because the glyph alone cannot say "following your system".
      aria-label={interpolate(c.aria, { mode: label })}
      title={interpolate(c.title, { mode: label })}
    >
      <span className={styles.dial} aria-hidden="true">
        {/*
          Two glyphs that cross-fade and turn, rather than one shape masked by
          a disc painted in the page colour. The header blends with
          mix-blend-mode: difference, so nothing inside it can rely on matching
          the background — there is no single value that matches it.
        */}
        <svg viewBox="0 0 24 24" className={styles.icon} focusable="false">
          <g className={styles.sun}>
            <circle cx="12" cy="12" r="4.6" />
            {Array.from({ length: 8 }, (_, i) => {
              const a = (i / 8) * Math.PI * 2;
              return (
                <line
                  key={i}
                  x1={(12 + Math.cos(a) * 7.4).toFixed(2)}
                  y1={(12 + Math.sin(a) * 7.4).toFixed(2)}
                  x2={(12 + Math.cos(a) * 9.8).toFixed(2)}
                  y2={(12 + Math.sin(a) * 9.8).toFixed(2)}
                />
              );
            })}
          </g>
          <path
            className={styles.moon}
            d="M20 14.4A8.4 8.4 0 0 1 9.6 4a8.8 8.8 0 1 0 10.4 10.4Z"
          />
        </svg>
      </span>

      {/* The setting in words, for anyone who cannot read the glyph — and a
          dot marking that the machine, not the visitor, is in charge. */}
      <span className={styles.label}>
        {label}
      </span>
    </button>
  );
}
