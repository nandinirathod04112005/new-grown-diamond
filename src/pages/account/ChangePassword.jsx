import { useState } from 'react';

import { supabase, isConfigured } from '@/lib/supabase/client.js';
import { authErrorMessage } from '@/pages/auth/authErrors.js';
import { MIN_PASSWORD } from '@/pages/auth/validation.js';
import PasswordField from '@/pages/auth/PasswordField.jsx';
import { interpolate, useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './ChangePassword.copy.js';
import styles from './ChangePassword.module.css';

/**
 * Change your password while signed in.
 *
 * WHY THIS EXISTS. The account page used to offer one route to a new password:
 * a link to /forgot-password, which signs you out of nothing, sends an email,
 * and asks you to come back through a one-time link. For somebody already
 * signed in and looking at their own account, that is a round trip through an
 * inbox to do something the session in front of them already authorises.
 *
 * It is also the route that kept failing. An emailed link carries an address
 * decided when the mail was sent, and it has to survive the journey to whatever
 * device opens it — a temporary review tunnel that has since been torn down, a
 * laptop-only `localhost`, a redirect the account service declines and silently
 * replaces. None of that applies here: the password changes over the session
 * that is already open, on the device in front of you, with nothing in between.
 *
 * The emailed flow stays exactly as it was, because it is the only way back in
 * for somebody who genuinely cannot sign in. This is for everybody else.
 *
 * `updateUser` is the same call the recovery screen makes, and its refusals are
 * read through the same classifier — so "that is already your password" reads
 * the same here as it does there, rather than as a generic failure.
 */
export default function ChangePassword() {
  const { t, locale } = useLocale();
  const c = useCopy(COPY);
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
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
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updateError) {
      console.error('[NGD change password]', updateError);
      setError(authErrorMessage(updateError, c.failed, locale));
      return;
    }
    /* Cleared rather than left in the fields: the new password should not sit
       in the page behind a "saved" message. */
    setPassword('');
    setConfirm('');
    setDone(true);
  }

  if (done) {
    return (
      <div className={styles.root}>
        <p className={styles.ok} role="status">{c.done}</p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className={styles.root}>
        <button type="button" className={styles.toggle} onClick={() => setOpen(true)}>
          {c.open}
        </button>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      {/* `data-motion="off"` because the global reveal animates panels as they
          appear, and a form that slides while it is being filled in moves the
          field out from under the pointer. */}
      <form className={styles.form} onSubmit={onSubmit} noValidate data-motion="off">
        <p className={styles.lead}>{c.lead}</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
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
        <div className={styles.actions}>
          <button className={styles.save} type="submit" disabled={busy || !isConfigured}>
            {busy ? c.saving : c.save}
          </button>
          <button
            type="button"
            className={styles.cancel}
            onClick={() => { setOpen(false); setPassword(''); setConfirm(''); setError(''); }}
          >
            {c.cancel}
          </button>
        </div>
      </form>
    </div>
  );
}
