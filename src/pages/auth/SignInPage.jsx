import { useRef, useState } from 'react';

import { supabase, isConfigured } from '@/lib/supabase/client.js';
import { useAuth } from '@/hooks/useAuth.js';
import { authRedirectTo } from '@/lib/supabase/authRedirect.js';
import AuthShell from './AuthShell.jsx';
import PasswordField from './PasswordField.jsx';
import TextField from './TextField.jsx';
import { emailError, firstError, normalizeEmail, passwordError, toMap } from './validation.js';
import styles from './Auth.module.css';
import { authErrorMessage } from './authErrors.js';
import { loginDestination } from '@/lib/supabase/loginDestination.js';
import { useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './SignInPage.copy.js';

/**
 * Sign in.
 *
 * The failure message is deliberately identical whether the address is unknown
 * or the password is wrong. Distinguishing the two turns this form into an
 * oracle that will confirm, one guess at a time, which of a list of email
 * addresses hold accounts here.
 *
 * Where they land afterwards depends on the profile row, read once the
 * session exists (lib/supabase/loginDestination.js): an active administrator
 * goes straight to the desk at /admin, everyone else to /account. That is
 * navigation only — the admin route re-checks the role, the desk asks for the
 * staff code, and RLS is what actually enforces it.
 */
export default function SignInPage() {
  const { status, isAdmin, profile, signOut } = useAuth();
  const { t, locale, href } = useLocale();
  const c = useCopy(COPY);
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
        type: 'signup', email: normalizeEmail(email),
        /* Same destination as sign-up, so a resent link behaves identically —
           and lands somewhere that reports an expired one instead of dropping
           the visitor on a signed-out account page. */
        options: { emailRedirectTo: authRedirectTo() },
      });
      if (err) throw err;
      setResent('sent');
    } catch (err) {
      setResendError(authErrorMessage(err, err.message || c.resendFailed, locale));
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
      ['email', emailError(email, t)],
      ['password', passwordError(password, { existing: true }, t)],
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
      /* Email normalised the same way sign-up normalised it; the password is
         passed through untouched — a leading or trailing space in a password
         is part of the password. */
      const { data, error: err } = await supabase.auth.signInWithPassword({ email: normalizeEmail(email), password });

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
          ? c.incorrect
          : c.failed, locale));
        return;
      }

      /* The account page in the visitor's own language; the admin area has
         only the one, English, address. */
      const destination = await loginDestination(supabase, data.session);
      window.location.assign(destination === '/account' ? href(destination) : destination);
    } catch (err) {
      setError(authErrorMessage(err, c.failed, locale));
    } finally {
      setBusy(false);
    }
  }

  if (status === 'ready') {
    return (
      <AuthShell
        eyebrow="New Grown Diamond"
        title={c.signedIn.title}
        intro={profile?.email || profile?.full_name || c.signedIn.intro}
        aside={<>{c.signedIn.notYou} <a href="/register">{c.signedIn.createDifferent}</a>{c.stop}</>}
      >
        <div className={styles.actions}>
          <a className={styles.submit} href="/account">{t('auth.goToAccount')}</a>
          {isAdmin ? (
            <a className={styles.ghost} href="/admin/diamonds">{t('nav.admin')}</a>
          ) : null}
          <button type="button" className={styles.ghost} onClick={signOut}>{t('nav.signOut')}</button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="New Grown Diamond"
      title={t('auth.signInTitle')}
      intro={t('auth.signInIntro')}
      aside={<>{t('auth.noAccount')} <a href="/register">{t('auth.createOne')}</a>{c.stop}</>}
    >
      <form className={styles.body} onSubmit={onSubmit} noValidate data-tried={tried ? '' : undefined}>
        {!isConfigured && (
          <p className={styles.note} data-tone="error" role="alert">
            <strong>{c.unavailable.title}</strong>
            {c.unavailable.body}
          </p>
        )}

        {error && (
          <p className={styles.note} data-tone="error" role="alert">{error}</p>
        )}

        {unconfirmed && (
          <div className={styles.note} role="alert">
            <strong>{c.unconfirmed.title}</strong>
            {c.unconfirmed.before}
            {' '}{email}{' '}{c.unconfirmed.after}
            <span className={styles.actions}>
              <button
                type="button"
                className={styles.ghost}
                onClick={resend}
                disabled={resent === 'sending'}
              >
                {resent === 'sending' ? c.sending : c.resend}
              </button>
            </span>
            {resent === 'sent' && <em role="status">{c.resent}</em>}
            {resent === 'failed' && <em>{resendError}</em>}
          </div>
        )}

        <TextField
          label={t('auth.email')}
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
          label={t('auth.password')}
          value={password}
          index={1}
          required
          autoComplete="current-password"
          inputRef={passwordRef}
          error={fieldErrors.password}
          onChange={(e) => { setPassword(e.target.value); setFieldErrors((f) => ({ ...f, password: null })); }}
        />

        <button className={styles.submit} type="submit" disabled={busy || !isConfigured}>
          {busy ? <><span className={styles.spinner} aria-hidden="true" />{t('auth.signingIn')}</> : t('auth.signInTitle')}
        </button>

        <a className={styles.recovery} href="/forgot-password">{t('auth.forgotPassword')}</a>

        {/* Announced without stealing focus from the field being corrected. */}
        <p className="u-visually-hidden" aria-live="polite">
          {busy ? c.live : error || ''}
        </p>
      </form>
    </AuthShell>
  );
}
