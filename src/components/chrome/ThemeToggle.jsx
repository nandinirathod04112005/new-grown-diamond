import { useState } from 'react';

import { applyTheme, storedTheme } from '@/lib/theme.js';
import styles from './ThemeToggle.module.css';

/**
 * The light / dark control.
 *
 * Dark is the authored default and light is an explicit visitor option.
 */
const ORDER = ['dark', 'light'];
const LABEL = { light: 'Light', dark: 'Dark' };

export default function ThemeToggle() {
  const [choice, setChoice] = useState(() => storedTheme() ?? 'dark');

  function cycle() {
    const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];
    applyTheme(next);
    setChoice(next);
  }

  const label = LABEL[String(choice)];

  return (
    <button
      type="button"
      className={styles.root}
      onClick={cycle}
      data-mode={choice}
      // The accessible name carries the current setting AND what pressing it
      // does, because the glyph alone cannot say "following your system".
      aria-label={`Theme: ${label}. Change theme.`}
      title={`Theme: ${label}`}
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
