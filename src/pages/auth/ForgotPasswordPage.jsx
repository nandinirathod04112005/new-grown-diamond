import { useState } from 'react';

import { supabase, isConfigured } from '@/lib/supabase/client.js';
import AuthShell from './AuthShell.jsx';
import styles from './Auth.module.css';

/** Starts Supabase's email recovery flow without revealing account existence. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [tried, setTried] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setTried(true);
    if (!event.currentTarget.checkValidity()) {
      event.currentTarget.reportValidity();
      return;
    }
    if (!isConfigured) return;

    setBusy(true);
    setError('');
    const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);

    if (recoveryError) {
      console.error('[NGD password recovery]', recoveryError);
      setError('Recovery could not be started. Please wait a moment and try again.');
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <AuthShell
        eyebrow="Account recovery"
        title="Check your email"
        intro="If an account matches that address, Supabase has sent its recovery link."
      >
        <p className={styles.note} data-tone="good" role="status">
          For privacy, this page does not confirm whether an account exists.
          Open the email link to choose a new password.
        </p>
        <div className={styles.actions}>
          <a className={styles.ghost} href="/login">Back to sign in</a>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Reset your password"
      intro="Enter the address used for your account."
      aside={<>Remembered it? <a href="/login">Return to sign in</a>.</>}
    >
      <form className={styles.body} onSubmit={onSubmit} noValidate data-tried={tried ? '' : undefined}>
        {!isConfigured && (
          <p className={styles.note} data-tone="error" role="alert">
            Recovery is unavailable because this deployment is not connected to Supabase.
          </p>
        )}
        {error && <p className={styles.note} data-tone="error" role="alert">{error}</p>}
        <label className={styles.field2} style={{ '--i': 0 }}>
          <span className={styles.label}>Email</span>
          <input
            className={styles.input}
            type="email"
            value={email}
            autoComplete="email"
            placeholder="you@company.com"
            required
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <button className={styles.submit} type="submit" disabled={busy || !isConfigured}>
          {busy ? <><span className={styles.spinner} aria-hidden="true" />Preparing link…</> : 'Send recovery link'}
        </button>
      </form>
    </AuthShell>
  );
}
