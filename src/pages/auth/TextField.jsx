import { useId } from 'react';

import styles from './Auth.module.css';

/**
 * A labelled text input that can report a problem with itself.
 *
 * The error is wired to the input with `aria-describedby` and `aria-invalid`,
 * not merely rendered near it. Colour and position alone say nothing to a
 * screen reader, and "the red one" is not a description anyone can act on —
 * the association is what makes the message reachable from the field it
 * belongs to.
 *
 * `role="alert"` is on the message rather than on a page-level banner so it is
 * announced when it appears, and so a form with three problems announces
 * three, in the order they occur.
 */
export default function TextField({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  placeholder,
  inputMode,
  required = false,
  maxLength,
  error,
  hint,
  index = 0,
  inputRef,
}) {
  const id = useId();
  const errId = `${id}-err`;
  const hintId = `${id}-hint`;

  return (
    <div className={styles.field2} style={{ '--i': index }}>
      <label className={styles.pwLabel} htmlFor={id}>
        <span className={styles.label}>{label}</span>
      </label>
      <input
        id={id}
        ref={inputRef}
        className={styles.input}
        type={type}
        value={value}
        autoComplete={autoComplete}
        placeholder={placeholder}
        inputMode={inputMode}
        maxLength={maxLength}
        /* `required` is kept as a real attribute even though the form carries
           noValidate: it is what assistive technology reads to announce the
           field as required. The enforcement is in JS; this is the label. */
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={[error ? errId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
        onChange={onChange}
      />
      {hint ? <span id={hintId} className={styles.hint}>{hint}</span> : null}
      {error ? <span id={errId} className={styles.fieldError} role="alert">{error}</span> : null}
    </div>
  );
}
