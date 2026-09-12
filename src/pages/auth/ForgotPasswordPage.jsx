import { useState } from 'react';

import { supabase, isConfigured } from '@/lib/supabase/client.js';
import { authRedirectTo } from '@/lib/supabase/authRedirect.js';
import { ENQUIRY_DESK } from '@/pages/siteContent.js';
import { deskUrl } from '@/lib/whatsapp.js';
import AuthShell from './AuthShell.jsx';
import { authErrorMessage } from './authErrors.js';
import { interpolate, useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './ForgotPasswordPage.copy.js';
import styles from './Auth.module.css';

/** Starts Supabase's email recovery flow without revealing account existence. */
/*
 * Where the emailed link will come back to, when that is NOT where the visitor
 * is standing.
 *
 * A recovery mail is only as good as the address inside it, and that address
 * is decided by the build — not by the tab. Reviewing over a temporary tunnel,
 * the two can drift apart without a word: a tab left open from a tunnel that
 * has since been torn down keeps working, keeps taking email addresses, and
 * keeps sending links to a hostname that no longer resolves. It cost hours,
 * because nothing anywhere said which address the mail was pointing at.
 *
 * Null when they agree, which is every normal visit and every production one —
 * so this says nothing at all unless there is genuinely something to say.
 */
function returnHostMismatch() {
  if (typeof window === 'undefined') return null;
  try {
    const target = new URL(authRedirectTo());
    return target.origin === window.location.origin ? null : target.host;
  } catch {
    return null;
  }
}

export default function ForgotPasswordPage() {
  const { t, locale } = useLocale();
  const otherHost = returnHostMismatch();
  const c = useCopy(COPY);
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
    try {
      /*
       * The SAME return address as every other emailed link, and that is the
       * point.
       *
       * This used to send people to /reset-password directly. Supabase refuses
       * any redirect that is not on the project's allow-list and silently
       * falls back to Site URL instead — so a second path meant a second entry
       * somebody had to remember to add, and forgetting it produced a link
       * that opened the wrong place with nothing anywhere to explain why. One
       * return address for confirmations and recoveries alike is one thing to
       * get right rather than two.
       *
       * /auth/callback hands over to /reset-password with the session already
       * established, and it is the only screen that can tell an expired link
       * from one that has already been used.
       */
      const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(
  email.trim().toLowerCase(),
  { redirectTo: authRedirectTo() }
);
      if (recoveryError) throw recoveryError;
      setDone(true);
    }  catch (recoveryError) {
  console.error('Password recovery failed:', {
    message: recoveryError?.message,
    status: recoveryError?.status,
    code: recoveryError?.code,
  });

  if (recoveryError?.status === 429) {
    setError(c.errors.tooMany);
  } else if (recoveryError?.status >= 500) {
    setError(c.errors.service);
  } else {
    setError(
      authErrorMessage(
        recoveryError,
        c.errors.failed,
        locale
      )
    );
  }
} finally {
      /*
       * Always, and on the failure path especially.
       *
       * Without this the button stays disabled reading "Preparing link…"
       * after an error, so the one screen whose whole job is to let someone
       * try again is the one screen they cannot try again on. Success
       * replaces the form, so it only shows there for an instant.
       */
      setBusy(false);
    }
  }

  if (done) {
    return (
      <AuthShell
        eyebrow={c.eyebrow}
        title={t('auth.checkEmail')}
        intro={c.done.intro}
      >
        <p className={styles.note} data-tone="good" role="status">
          {c.done.note}
        </p>
        <div className={styles.actions}>
          <a className={styles.ghost} href="/login">{c.done.back}</a>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow={c.eyebrow}
      title={c.title}
      intro={c.intro}
      aside={<>{c.remembered} <a href="/login">{c.returnLink}</a>{c.stop}</>}
    >
      <form className={styles.body} onSubmit={onSubmit} noValidate data-tried={tried ? '' : undefined}>
        {!isConfigured && (
          <p className={styles.note} data-tone="error" role="alert">
            {c.unavailable}
          </p>
        )}
        {otherHost && (
          <p className={styles.note} role="status">
            {interpolate(c.returnsTo, { host: otherHost })}
          </p>
        )}
        {error && (
          <p className={styles.note} data-tone="error" role="alert">
            {error}
            {/*
              A dead end is the one thing this screen must not be.
              When the mail itself fails there is nothing the person can do
              differently, and "try again later" on its own asks them to keep
              retrying something that will keep failing. The desk can put them
              back into their account by hand, so the way to reach it belongs
              right here rather than a page away.
            */}
            {' '}
            <span className={styles.noteAside}>
              {c.desk.lead}{' '}
              <a href={`tel:${ENQUIRY_DESK.tel}`}>{ENQUIRY_DESK.phone}</a>
              {', '}
              <a href={deskUrl()} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              {c.desk.or}
              <a href="/contact">{c.desk.form}</a>{c.stop}
            </span>
          </p>
        )}
        <label className={styles.field2} style={{ '--i': 0 }}>
          <span className={styles.label}>{t('auth.email')}</span>
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
          {busy ? <><span className={styles.spinner} aria-hidden="true" />{c.preparing}</> : c.send}
        </button>
      </form>
    </AuthShell>
  );
}
