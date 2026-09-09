import { useEffect, useRef, useState } from 'react';
import { CircleCheck, CircleX, TriangleAlert, X } from 'lucide-react';

import styles from './AdminFeedback.module.css';

/**
 * The console's feedback surfaces.
 *
 * Components only — the hooks that drive them live in
 * hooks/useAdminFeedback.js, so this module stays Fast-Refresh clean.
 */

export function Toasts({ toasts, dismiss }) {
  if (!toasts.length) return null;
  return (
    /*
     * A live region, so a screen reader hears the outcome of an action that
     * gave no other feedback. `polite` rather than `assertive`: a save
     * confirmation should not interrupt whatever is being read.
     */
    <div className={styles.toasts} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={styles.toast} data-tone={t.tone}>
          {t.tone === 'error'
            ? <CircleX size={15} aria-hidden="true" />
            : <CircleCheck size={15} aria-hidden="true" />}
          <p>{t.text}</p>
          <button type="button" onClick={() => dismiss(t.id)} aria-label="Dismiss">
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

/**
 * The panel, mounted only while the dialog is open.
 *
 * That is what lets the typed confirmation start empty every time without an
 * effect resetting it: the component is genuinely new on each open, so
 * useState's initial value is the reset. Clearing it in an effect instead
 * would render one frame carrying the previous answer — on a dialog whose
 * whole job is to stop a reflex, that frame is exactly the wrong thing to
 * show.
 */
function ConfirmPanel({ title, body, confirmText, confirmLabel, tone, busy, onConfirm, onCancel }) {
  const [typed, setTyped] = useState('');
  const panel = useRef(null);
  const opener = useRef(null);

  useEffect(() => {
    opener.current = document.activeElement;
    const t = setTimeout(() => panel.current?.querySelector('input,button')?.focus(), 30);
    return () => {
      clearTimeout(t);
      // Focus goes back where it came from, or a keyboard user is dropped at
      // the top of the document with no idea what just happened.
      if (opener.current instanceof HTMLElement) opener.current.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && !busy) onCancel?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [busy, onCancel]);

  const ready = !confirmText || typed.trim() === confirmText;

  return (
    <div className={styles.backdrop}>
      <button
        type="button"
        className={styles.backdropHit}
        aria-label="Cancel"
        onClick={() => !busy && onCancel?.()}
      />
      <div className={styles.dialog} ref={panel} role="alertdialog" aria-modal="true" aria-label={title}>
        <p className={styles.dialogTag} data-tone={tone}>
          <TriangleAlert size={13} aria-hidden="true" /> {tone === 'danger' ? 'This changes live data' : 'Confirm'}
        </p>
        <h2>{title}</h2>
        <div className={styles.dialogBody}>{body}</div>

        {confirmText && (
          <label className={styles.confirmField}>
            <span>Type <code>{confirmText}</code> to continue</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck="false" />
          </label>
        )}

        <div className={styles.dialogActions}>
          <button type="button" className={styles.ghost} onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className={styles.danger} onClick={onConfirm} disabled={!ready || busy}>
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * A destructive action, gated on typing the thing's own name.
 *
 * `confirmText` is what has to be typed. Requiring the identifier rather than
 * a yes/no is the difference between a decision and a reflex: everyone clicks
 * "OK", and nobody types the stock number of the wrong stone.
 */
export function ConfirmDialog({ open, ...rest }) {
  if (!open) return null;
  return <ConfirmPanel tone="danger" confirmLabel="Confirm" {...rest} />;
}
