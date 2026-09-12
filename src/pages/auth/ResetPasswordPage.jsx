import { useEffect, useState } from 'react';

import { supabase, isConfigured } from '@/lib/supabase/client.js';
import { authErrorMessage } from './authErrors.js';
import AuthShell from './AuthShell.jsx';
import PasswordField from './PasswordField.jsx';
import styles from './Auth.module.css';

import { MIN_PASSWORD } from './validation.js';
import { interpolate, useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './ResetPasswordPage.copy.js';

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
  const { t, locale } = useLocale();
  const c = useCopy(COPY);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [tried, setTried] = useState(false);
  /* Always check the recovery session before exposing a form that calls
     updateUser. On another device the SDK may still be consuming the tokens
     from the emailed URL; rendering immediately made that valid link look
     broken when the form won the race against session initialization. */
  const [exchange, setExchange] = useState(() => (isConfigured ? 'checking' : 'ready'));

  useEffect(() => {
    const token = tokenFromUrl();
    if (!supabase) return undefined;
    let alive = true;

    (async () => {
      if (token) {
        const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash: token, type: 'recovery' });
        if (!alive) return;
        if (verifyError) {
          console.error('[NGD recovery token]', verifyError);
          setExchange('invalid');
          return;
        }
        setExchange('ready');
        /* The token is spent. Clearing it keeps it out of the address bar, the
           browser's history, and anything the page is later shared into. */
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      /* For the normal emailed-link path, detectSessionInUrl consumes the
         fragment asynchronously. initialize() is idempotent and also safe
         under React StrictMode, so wait for it rather than racing updateUser. */
      const { error: initError } = await supabase.auth.initialize();
      if (!alive) return;
      if (initError) {
        console.error('[NGD recovery session]', initError);
        setExchange('invalid');
        return;
      }

      const { data, error: sessionError } = await supabase.auth.getSession();
      if (!alive) return;
      if (sessionError || !data?.session) {
        if (sessionError) console.error('[NGD recovery session]', sessionError);
        setExchange('invalid');
        return;
      }

      setExchange('ready');
      if (window.location.hash) window.history.replaceState({}, '', window.location.pathname);
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
      setError(interpolate(c.tooShort, { n: MIN_PASSWORD }));
      return;
    }
    if (password !== confirm) {
      setError(t('validation.passwordsDiffer'));
      return;
    }

    setBusy(true);
    setError('');
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      console.error('[NGD password update]', updateError);
      /*
       * The reason, not just the fact.
       *
       * Every refusal used to come out as the same sentence, so the commonest
       * one by far — "that is already your password" — told the person nothing
       * and left them retyping the password they already had. authErrorMessage
       * is the same classifier the callback screen uses; `c.updateFailed`
       * remains the fallback for anything it does not recognise.
       */
      setError(authErrorMessage(updateError, c.updateFailed, locale));
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <AuthShell eyebrow={c.eyebrow} title={c.done.title} intro={c.done.intro}>
        <div className={styles.actions}>
          <a className={styles.submit} href="/account">{c.done.continue}</a>
        </div>
      </AuthShell>
    );
  }

  if (exchange === 'checking') {
    return (
      <AuthShell eyebrow={c.eyebrow} title={c.checking.title} intro={c.checking.intro}>
        <p className={styles.note} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          {c.checking.status}
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
        eyebrow={c.eyebrow}
        title={c.invalid.title}
        intro={c.invalid.intro}
      >
        <p className={styles.note} data-tone="error" role="alert">{c.tokenInvalid}</p>
        <div className={styles.actions}>
          <a className={styles.submit} href="/forgot-password">{c.another}</a>
          <a className={styles.ghost} href="/contact">{c.invalid.contact}</a>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={c.eyebrow}
      title={c.title}
      intro={c.intro}
      aside={<>{c.expired} <a href="/forgot-password">{c.another}</a>{c.stop}</>}
    >
      <form className={styles.body} onSubmit={onSubmit} noValidate data-tried={tried ? '' : undefined}>
        {!isConfigured && (
          <p className={styles.note} data-tone="error" role="alert">
            {c.unavailable}
          </p>
        )}
        {error && <p className={styles.note} data-tone="error" role="alert">{error}</p>}
        <PasswordField
          label={c.newPassword}
          value={password}
          index={0}
          required
          minLength={MIN_PASSWORD}
          autoComplete="new-password"
          hint={t('auth.minChars', { n: MIN_PASSWORD })}
          onChange={(event) => setPassword(event.target.value)}
        />
        <PasswordField
          label={t('auth.confirmPassword')}
          value={confirm}
          index={1}
          required
          autoComplete="new-password"
          onChange={(event) => setConfirm(event.target.value)}
        />
        <button className={styles.submit} type="submit" disabled={busy || !isConfigured}>
          {busy ? <><span className={styles.spinner} aria-hidden="true" />{c.updating}</> : c.update}
        </button>
      </form>
    </AuthShell>
  );
}
