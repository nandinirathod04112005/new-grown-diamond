import { useRef, useState } from 'react';

import { supabase, isConfigured } from '@/lib/supabase/client.js';
import { useAuth } from '@/hooks/useAuth.js';
import { authRedirectTo } from '@/lib/supabase/authRedirect.js';
import AuthShell from './AuthShell.jsx';
import PasswordField from './PasswordField.jsx';
import TextField from './TextField.jsx';
import { emailError, firstError, passwordError, toMap } from './validation.js';
import styles from './Auth.module.css';
import { authErrorMessage } from './authErrors.js';

/**
 * Sign in.
 *
 * The failure message is deliberately identical whether the address is unknown
 * or the password is wrong. Distinguishing the two turns this form into an
 * oracle that will confirm, one guess at a time, which of a list of email
 * addresses hold accounts here.
 *
 * Everyone lands on /account afterwards. The role is not known at the moment
 * the session arrives — the profile row has not been read yet — so guessing
 * "admin" here and bouncing a customer through the desk would be worse than
 * one extra click. The account page reads the profile and offers the desk
 * link when the person turns out to be an administrator; the admin route
 * re-checks the role itself, and RLS is what actually enforces it.
 */
export default function SignInPage() {
  const { status, isAdmin, profile, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [resent, setResent] = useState('');
  const [resendError, setResendError] = useState('');
  const [tried, setTried] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  /* Refs so the first bad field can be focused. Without this a keyboard or
     screen-reader user is told something is wrong and left at the submit
     button with no route back to the field that is wrong.

     Declared individually rather than gathered into one object: reading
     `refs.email` during render is indistinguishable, to a linter, from reading
     `.current`, and a rule that fires on correct code stops being useful. */
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

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
    if (!isConfigured || emailError(email) || resent === 'sending') return;
    setResent('sending');
    setResendError('');
    try {
      const { error: err } = await supabase.auth.resend({
        type: 'signup', email: email.trim(),
        /* Same destination as sign-up, so a resent link behaves identically —
           and lands somewhere that reports an expired one instead of dropping
           the visitor on a signed-out account page. */
        options: { emailRedirectTo: authRedirectTo() },
      });
      if (err) throw err;
      setResent('sent');
    } catch (err) {
      setResendError(authErrorMessage(err, err.message || 'The confirmation email could not be sent.'));
      setResent('failed');
    }
  }

  async function onSubmit(event) {
    event.preventDefault();
    setTried(true);
    if (!isConfigured || busy) return;
    setUnconfirmed(false);
    setResent('');

    /*
     * Validate BEFORE the network, not after it.
     *
     * The form carries noValidate, which switches off the browser's own
     * constraint checking along with its unstyleable bubbles — so `required`
     * on these inputs is a label for assistive technology and nothing else.
     * Until this existed, an empty form posted '' / '' to Supabase, which
     * answered invalid_credentials, which this page reported as "That email
     * and password do not match an account" — a message that is not merely
     * unhelpful but wrong, because nothing had been typed to not match.
     *
     * The existing password is checked for PRESENCE only. Applying the current
     * minimum length at the sign-in screen would lock out anyone whose account
     * predates it, and would do so with a message telling them their correct
     * password is too short.
     */
    const checks = [
      ['email', emailError(email)],
      ['password', passwordError(password, { existing: true })],
    ];
    const bad = firstError(checks);
    setFieldErrors(toMap(checks));
    if (bad) {
      setError('');
      setUnconfirmed(false);
      /* Built inside the handler, where touching a ref is legitimate. */
      ({ email: emailRef, password: passwordRef })[bad]?.current?.focus();
      return;
    }

    setBusy(true);
    setError('');
    setFieldErrors({});
    try {
      const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

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
        setError(authErrorMessage(err, err.code === 'invalid_credentials'
          ? 'That email and password do not match an account.'
          : 'Sign-in could not be completed. Please try again.'));
        return;
      }

      // The session is live but the profile row has not been read yet, so the
      // role is not known here. Sending everyone to /account and letting that
      // page offer the admin link avoids guessing wrong and bouncing an admin
      // through a page they did not want.
      window.location.assign(data.session ? '/account' : '/login');
    } catch (err) {
      setError(authErrorMessage(err, 'Sign-in could not be completed. Please try again.'));
    } finally {
      setBusy(false);
    }
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
            Open the confirmation link sent to
            {' '}{email}{' '}to finish setting up the account.
            <span className={styles.actions}>
              <button
                type="button"
                className={styles.ghost}
                onClick={resend}
                disabled={resent === 'sending'}
              >
                {resent === 'sending' ? 'Sending…' : 'Resend confirmation email'}
              </button>
            </span>
            {resent === 'sent' && <em role="status">Confirmation email sent. Check your inbox and spam folder.</em>}
            {resent === 'failed' && <em>{resendError}</em>}
          </div>
        )}

        <TextField
          label="Email"
          type="email"
          value={email}
          index={0}
          required
          autoComplete="email"
          placeholder="you@company.com"
          inputRef={emailRef}
          error={fieldErrors.email}
          /* Clearing on edit rather than re-validating on every keystroke: a
             message that appears while someone is still halfway through
             typing their address is noise, and it moves the layout under
             their cursor. */
          onChange={(e) => { setEmail(e.target.value); setUnconfirmed(false); setResent(''); setFieldErrors((f) => ({ ...f, email: null })); }}
        />

        <PasswordField
          label="Password"
          value={password}
          index={1}
          required
          autoComplete="current-password"
          inputRef={passwordRef}
          error={fieldErrors.password}
          onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: null })); }}
        />

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
