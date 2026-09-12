import { useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './PasswordField.copy.js';
import styles from './Auth.module.css';

/**
 * A password field you can look at.
 *
 * Every password box on this site goes through here, so the behaviour is one
 * implementation rather than six near-copies that drift.
 *
 * THE TOGGLE IS type="button". Inside a form, a <button> with no type defaults
 * to submit — so an unmarked reveal control submits the sign-in form the first
 * time anyone taps it. That is the classic version of this bug and the reason
 * this note is here.
 *
 * IT IS NOT INSIDE THE <label>. A control nested in a label inherits the
 * label's click behaviour, which moves focus to the input and, in some
 * browsers, fires the toggle twice from one press. The label wraps the text
 * and the input; the button is a sibling positioned over the field.
 *
 * WHAT IT ANNOUNCES. The button's accessible name says what pressing it will
 * DO ("Show password"), and `aria-pressed` carries the current state — the two
 * together are what let a screen-reader user know whether their password is
 * currently on screen, which is the one thing that actually matters here.
 * A polite live region says so out loud on change, because the visual cue —
 * the characters appearing — is not available to everyone.
 *
 * IT DEFAULTS TO HIDDEN, ALWAYS. Revealed state is deliberately not
 * remembered between fields, pages or sessions: someone typing a password on a
 * shared machine should never find it already legible because of a choice they
 * made yesterday.
 */
export default function PasswordField({
  label,
  value,
  onChange,
  hint,
  error,
  autoComplete = 'current-password',
  required = false,
  minLength,
  placeholder,
  inputMode,
  index = 0,
  inputRef,
  /* Some fields are secrets that are not passwords — the staff access code is
     one. It gets the same reveal, and its own wording. */
  revealLabel = 'password',
}) {
  const [shown, setShown] = useState(false);
  const id = useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;
  const c = useCopy(COPY);
  const thing = c.things[revealLabel] ?? revealLabel;
  const toggleLabel = interpolate(shown ? c.hide : c.show, { thing });

  return (
    <div className={styles.field2} style={{ '--i': index }}>
      <label className={styles.pwLabel} htmlFor={id}>
        <span className={styles.label}>{label}</span>
      </label>

      <div className={styles.pwWrap}>
        <input
          id={id}
          ref={inputRef}
          className={`${styles.input} ${styles.pwInput}`}
          type={shown ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          placeholder={placeholder}
          inputMode={inputMode}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={[error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
          /* A revealed password must not be offered to a spell-checker or a
             capitalising keyboard — both would send it somewhere or corrupt
             it the moment it becomes a text input. */
          spellCheck="false"
          autoCapitalize="off"
          autoCorrect="off"
          onChange={onChange}
        />
        <button
          type="button"
          className={styles.pwToggle}
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown}
          aria-controls={id}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          {shown ? <EyeOff size={16} strokeWidth={1.6} /> : <Eye size={16} strokeWidth={1.6} />}
        </button>
      </div>

      {hint ? <span id={hintId} className={styles.hint}>{hint}</span> : null}
      {error ? <span id={errId} className={styles.fieldError} role="alert">{error}</span> : null}

      {/* Spoken on change, for anyone who cannot see the characters appear. */}
      <span className="u-visually-hidden" aria-live="polite">
        {shown ? interpolate(c.visible, { label }) : ''}
      </span>
    </div>
  );
}
