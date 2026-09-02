import { useState } from 'react';

import { supabase, isConfigured } from '@/lib/supabase/client.js';
import AuthShell from './AuthShell.jsx';
import styles from './Auth.module.css';

const MIN_PASSWORD = 8;

/**
 * Create an account.
 *
 * The name is passed as `options.data.full_name`, which Supabase stores on the
 * auth user's own metadata. That needs no table and no schema change — which
 * matters here, because this project is explicitly not allowed to alter the
 * database. If a trigger populates public.profiles from that metadata it will
 * pick the name up; if not, the profile page lets them set it directly.
 *
 * A project may or may not require email confirmation, and the two outcomes
 * look completely different to the person who just pressed the button. Both
 * are handled explicitly, and the message says which one happened. Telling
 * someone they are signed in when a confirmation email is sitting unopened is
 * how an account page becomes a support ticket.
 */
export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null); // 'session' | 'confirm'
  const [tried, setTried] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setTried(true);
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
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName.trim() } },
    });
    setBusy(false);

    if (err) {
      console.error('[NGD register]', err);
      // Supabase's own message is surfaced because it covers real, actionable
      // cases — a weak password, a malformed address, rate limiting. It is not
      // extended with any check of our own for whether the email exists.
      setError(err.message || 'That account could not be created.');
      return;
    }

    // A session means confirmation is off and they are already in. No session
    // means an email is on its way and nothing has happened yet.
    setDone(data.session ? 'session' : 'confirm');
  }

  if (done === 'session') {
    return (
      <AuthShell eyebrow="New Grown Diamond" title="Account created" intro="You are signed in.">
        <div className={styles.actions}>
          <a className={styles.submit} href="/account">Go to your account</a>
          <a className={styles.ghost} href="/diamonds">Browse the inventory</a>
        </div>
      </AuthShell>
    );
  }

  if (done === 'confirm') {
    return (
      <AuthShell
        eyebrow="New Grown Diamond"
        title="Check your email"
        intro="Your account is not active yet."
      >
        <p className={styles.note} data-tone="good">
          <strong>We have sent a confirmation link to {email}.</strong>
          Open it to finish creating your account. You are not signed in until
          you do.
        </p>
        <div className={styles.actions}>
          <a className={styles.ghost} href="/login">Back to sign in</a>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="New Grown Diamond"
      title="Create an account"
      intro="For retailers, jewellers and trade partners. Track enquiries and request grading reports."
      aside={<>Already registered? <a href="/login">Sign in</a>.</>}
    >
      <form className={styles.body} onSubmit={onSubmit} noValidate data-tried={tried ? '' : undefined}>
        {!isConfigured && (
          <p className={styles.note} data-tone="error" role="alert">
            <strong>Registration is unavailable.</strong>
            The site is not connected to its database on this deployment.
          </p>
        )}

        {error && <p className={styles.note} data-tone="error" role="alert">{error}</p>}

        <label className={styles.field2} style={{ '--i': 0 }}>
          <span className={styles.label}>Full name</span>
          <input
            className={styles.input}
            type="text"
            value={fullName}
            autoComplete="name"
            required
            placeholder="Your name"
            onChange={(e) => setFullName(e.target.value)}
          />
        </label>

        <label className={styles.field2} style={{ '--i': 1 }}>
          <span className={styles.label}>Email</span>
          <input
            className={styles.input}
            type="email"
            value={email}
            autoComplete="email"
            required
            placeholder="you@company.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className={styles.field2} style={{ '--i': 2 }}>
          <span className={styles.label}>Password</span>
          <input
            className={styles.input}
            type="password"
            value={password}
            autoComplete="new-password"
            required
            minLength={MIN_PASSWORD}
            onChange={(e) => setPassword(e.target.value)}
          />
          <span className={styles.hint}>At least {MIN_PASSWORD} characters.</span>
        </label>

        <label className={styles.field2} style={{ '--i': 3 }}>
          <span className={styles.label}>Confirm password</span>
          <input
            className={styles.input}
            type="password"
            value={confirm}
            autoComplete="new-password"
            required
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>

        <button className={styles.submit} type="submit" disabled={busy || !isConfigured}>
          {busy ? <><span className={styles.spinner} aria-hidden="true" />Creating…</> : 'Create account'}
        </button>

        <p className="u-visually-hidden" aria-live="polite">
          {busy ? 'Creating your account' : error || ''}
        </p>
      </form>
    </AuthShell>
  );
}
