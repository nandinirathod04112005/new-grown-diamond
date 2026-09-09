import { useState } from 'react';

import { supabase, isConfigured } from '@/lib/supabase/client.js';
import AuthShell from './AuthShell.jsx';
import PasswordField from './PasswordField.jsx';
import styles from './Auth.module.css';

import { MIN_PASSWORD } from './validation.js';

/** Finishes a recovery link using the session Supabase detects in the URL. */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
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
    if (password.length < MIN_PASSWORD) {
      setError(`Use at least ${MIN_PASSWORD} characters for your password.`);
      return;
    }
    if (password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }

    setBusy(true);
    setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      console.error('[NGD password update]', updateError);
      setError('This recovery link is invalid or has expired. Request a new link and try again.');
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <AuthShell eyebrow="Account recovery" title="Password updated" intro="Your new password is active.">
        <div className={styles.actions}>
          <a className={styles.submit} href="/account">Continue to your account</a>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Account recovery"
      title="Choose a new password"
      intro="The recovery link must still be active in this browser."
      aside={<>Link expired? <a href="/forgot-password">Request another</a>.</>}
    >
      <form className={styles.body} onSubmit={onSubmit} noValidate data-tried={tried ? '' : undefined}>
        {!isConfigured && (
          <p className={styles.note} data-tone="error" role="alert">
            Password updates are unavailable because this deployment is not connected to Supabase.
          </p>
        )}
        {error && <p className={styles.note} data-tone="error" role="alert">{error}</p>}
        <PasswordField
          label="New password"
          value={password}
          index={0}
          required
          minLength={MIN_PASSWORD}
          autoComplete="new-password"
          hint={`At least ${MIN_PASSWORD} characters.`}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordField
          label="Confirm password"
          value={confirm}
          index={1}
          required
          autoComplete="new-password"
          onChange={(event) => setConfirm(event.target.value)}
        />
        <button className={styles.submit} type="submit" disabled={busy || !isConfigured}>
          {busy ? <><span className={styles.spinner} aria-hidden="true" />Updating…</> : 'Update password'}
        </button>
      </form>
    </AuthShell>
  );
}
