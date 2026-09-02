import { useState } from 'react';

import { supabase, isConfigured } from '@/lib/supabase/client.js';
import { useAuth } from '@/hooks/useAuth.js';
import AuthShell from './AuthShell.jsx';
import styles from './Auth.module.css';

/**
 * Sign in.
 *
 * The failure message is deliberately identical whether the address is unknown
 * or the password is wrong. Distinguishing the two turns this form into an
 * oracle that will confirm, one guess at a time, which of a list of email
 * addresses hold accounts here.
 *
 * Where someone lands afterwards depends on what they are: an active
 * administrator goes to the inventory desk, everyone else to their own
 * account. The redirect is a convenience only — the admin route re-checks the
 * role itself, and RLS in the database is what actually enforces it.
 */
export default function SignInPage() {
  const { status, isAdmin, profile, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resent, setResent] = useState('');
  const [tried, setTried] = useState(false);

  /*
   * This project has email confirmation switched on, so an account exists in a
   * real third state: created, correct password, and still not usable. Folding
   * that into "those details do not match" is the single most misleading thing
   * this form could say — it sends someone to reset a password that was never
   * wrong, and they never find the unopened email that is actually blocking
   * them. Supabase names the case, so it is passed straight through.
   *
   * This is not the enumeration risk the generic message guards against: the
   * visitor has already proved the password, so it tells an attacker nothing
   * they could not learn by trying it.
   */
  async function resend() {
    if (!isConfigured || !email) return;
    setResent('sending');
    const { error: err } = await supabase.auth.resend({ type: 'signup', email });
    setResent(err ? 'failed' : 'sent');
    if (err) console.error('[NGD resend]', err);
  }

  async function onSubmit(event) {
    event.preventDefault();
    setTried(true);
    if (!isConfigured) return;

    setBusy(true);
    setError('');
    const { data, error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);

    if (err) {
      // Logged for us, generic for them — except the one case that is not a
      // credentials problem at all.
      console.error('[NGD sign-in]', err);
      if (err.code === 'email_not_confirmed' || /email not confirmed/i.test(err.message ?? '')) {
        setUnconfirmed(true);
        setError('');
        return;
      }
      setUnconfirmed(false);
      setError('That email and password do not match an account.');
      return;
    }

    // The session is live but the profile row has not been read yet, so the
    // role is not known here. Sending everyone to /account and letting that
    // page offer the admin link avoids guessing wrong and bouncing an admin
    // through a page they did not want.
    window.location.assign(data.session ? '/account' : '/login');
  }

  if (status === 'ready') {
    return (
      <AuthShell
        eyebrow="New Grown Diamond"
        title="You are signed in"
        intro={profile?.email || profile?.full_name || 'Your account is active.'}
        aside={<>Not you? <a href="/register">Create a different account</a>.</>}
      >
        <div className={styles.actions}>
          <a className={styles.submit} href="/account">Go to your account</a>
          {isAdmin ? (
            <a className={styles.ghost} href="/admin/diamonds">Inventory desk</a>
          ) : null}
          <button type="button" className={styles.ghost} onClick={signOut}>Sign out</button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="New Grown Diamond"
      title="Sign in"
      intro="Access your account, saved enquiries and grading reports."
      aside={<>No account yet? <a href="/register">Create one</a>.</>}
    >
      <form className={styles.body} onSubmit={onSubmit} noValidate data-tried={tried ? '' : undefined}>
        {!isConfigured && (
          <p className={styles.note} data-tone="error" role="alert">
            <strong>Sign-in is unavailable.</strong>
            The site is not connected to its database on this deployment.
          </p>
        )}

        {error && (
          <p className={styles.note} data-tone="error" role="alert">{error}</p>
        )}

        {unconfirmed && (
          <div className={styles.note} role="alert">
            <strong>Your email address has not been confirmed yet.</strong>
            Your password is correct — open the confirmation link we sent to
            {' '}{email}{' '}to finish setting up the account.
            <span className={styles.actions}>
              <button
                type="button"
                className={styles.ghost}
                onClick={resend}
                disabled={resent === 'sending'}
              >
                {resent === 'sending' ? 'Sending…' : 'Resend the email'}
              </button>
            </span>
            {resent === 'sent' && <em>Sent. It can take a minute to arrive.</em>}
            {resent === 'failed' && <em>That could not be sent right now. Please contact the desk.</em>}
          </div>
        )}

        <label className={styles.field2} style={{ '--i': 0 }}>
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

        <label className={styles.field2} style={{ '--i': 1 }}>
          <span className={styles.label}>Password</span>
          <input
            className={styles.input}
            type="password"
            value={password}
            autoComplete="current-password"
            required
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button className={styles.submit} type="submit" disabled={busy || !isConfigured}>
          {busy ? <><span className={styles.spinner} aria-hidden="true" />Signing in…</> : 'Sign in'}
        </button>

        <a className={styles.recovery} href="/forgot-password">Forgot your password?</a>

        {/* Announced without stealing focus from the field being corrected. */}
        <p className="u-visually-hidden" aria-live="polite">
          {busy ? 'Signing in' : error || ''}
        </p>
      </form>
    </AuthShell>
  );
}
