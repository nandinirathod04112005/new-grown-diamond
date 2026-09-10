import { useEffect, useState } from 'react';

import { supabase, isConfigured } from '@/lib/supabase/client.js';
import AuthShell from './AuthShell.jsx';
import PasswordField from './PasswordField.jsx';
import styles from './Auth.module.css';

import { MIN_PASSWORD } from './validation.js';

/**
 * A recovery token carried in the address, rather than in a session Supabase
 * has already established.
 *
 * WHY THIS EXISTS. An emailed link arrives as tokens in the URL fragment,
 * which the client swallows on load, leaving a session behind — that is the
 * path this page was written for, and it still works untouched. But it depends
 * on the project's mailer, and when the mailer cannot send, there is no way
 * back into an account at all.
 *
 * `token_hash` is the same recovery token, handed over by another route: the
 * desk generates one (scripts/recovery-link.mjs) and sends the customer a link
 * to this page. Exchanging it here is `verifyOtp`, which is what Supabase's own
 * link does on arrival. It is single use, it expires, and it grants exactly
 * what an emailed link grants — no more.
 *
 * It also sidesteps the redirect allow-list entirely, because the address is
 * this site's own rather than one Supabase has to approve.
 */
function tokenFromUrl() {
  if (typeof window === 'undefined') return null;
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return query.get('token_hash') || hash.get('token_hash') || null;
}

/** Finishes a recovery link using the session Supabase detects in the URL. */
export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [tried, setTried] = useState(false);
  /* 'idle' when there is no token to exchange, which is the emailed-link path
     and the page's original behaviour. */
  const [exchange, setExchange] = useState(() => (tokenFromUrl() ? 'checking' : 'idle'));

  useEffect(() => {
    const token = tokenFromUrl();
    if (!token || !supabase) return undefined;
    let alive = true;

    (async () => {
      const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: token, type: 'recovery' });
      if (!alive) return;
      if (verifyError) {
        console.error('[NGD recovery token]', verifyError);
        setExchange('invalid');
        setError('This recovery link is invalid, has expired, or has already been used. Ask the desk for another.');
        return;
      }
      setExchange('ready');
      /* The token is spent. Clearing it keeps it out of the address bar, the
         browser's history, and anything the page is later shared into. */
      window.history.replaceState({}, '', window.location.pathname);
    })();

    return () => { alive = false; };
  }, []);

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

  if (exchange === 'checking') {
    return (
      <AuthShell eyebrow="Account recovery" title="One moment" intro="Checking your recovery link.">
        <p className={styles.note} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          Checking…
        </p>
      </AuthShell>
    );
  }

  /*
   * A refused token means there is no session, so the form below could only
   * fail — and a form that cannot succeed is worse than no form, because it
   * invites someone to type a password twice and then tells them it was
   * pointless. The routes to a working link go here instead.
   */
  if (exchange === 'invalid') {
    return (
      <AuthShell
        eyebrow="Account recovery"
        title="This link no longer works"
        intro="Recovery links can be used once, and they expire."
      >
        <p className={styles.note} data-tone="error" role="alert">{error}</p>
        <div className={styles.actions}>
          <a className={styles.submit} href="/forgot-password">Request another</a>
          <a className={styles.ghost} href="/contact">Contact the desk</a>
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
