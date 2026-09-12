import { useEffect, useState } from 'react';

import { supabase, isConfigured, authCallbackUrl } from '@/lib/supabase/client.js';
import { authErrorMessage } from './authErrors.js';
import AuthShell from './AuthShell.jsx';
import { useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './AuthCallbackPage.copy.js';
import styles from './Auth.module.css';

/**
 * Where a confirmation or recovery link lands.
 *
 * WHY THIS PAGE HAS TO EXIST. Supabase sends the visitor back to the site with
 * the outcome in the URL, and `detectSessionInUrl` in the client quietly
 * consumes it. Quietly is the problem: without a page that says what happened,
 * clicking "Confirm your email" dropped someone on the homepage with no
 * message at all. It had worked — and it looked exactly like it had not, which
 * is why the report was "the link isn't working".
 *
 * It also handles the case nothing else did: a link that has EXPIRED, or been
 * used twice. Supabase reports that in the URL fragment as an error rather
 * than a session, and with no page reading it, the visitor got a silent
 * no-op and no way forward.
 *
 * Both shapes are read, because which one arrives depends on the flow the
 * project is configured for and that can change in the dashboard without
 * anyone touching this code:
 *   implicit — #access_token=…&type=signup, or #error=…&error_description=…
 *   pkce     — ?code=…, exchanged for a session
 */
export default function AuthCallbackPage() {
  const { t, locale } = useLocale();
  const c = useCopy(COPY);
  /*
   * What is shown is worded at render, in the visitor's language: `reason`
   * names one of this page's own explanations, and `message` holds text that
   * came from the account service, shown as it came. The effect below runs
   * once — it consumes a one-time link — so it records the outcome and never
   * words it.
   */
  const [state, setState] = useState(() => isConfigured
    ? { status: 'working', kind: null, message: null }
    : { status: 'error', kind: null, message: null, reason: 'unconfigured' });

  useEffect(() => {
    if (!isConfigured) {
      return undefined;
    }

    let alive = true;

    (async () => {
      /* The error arrives in the fragment, which never reaches a server and is
         therefore the only place to look for it. */
      const callback = new URL(authCallbackUrl || window.location.href);
      const hash = new URLSearchParams(callback.hash.replace(/^#/, ''));
      const query = callback.searchParams;

      const errCode = hash.get('error_code') ?? query.get('error_code') ?? hash.get('error') ?? query.get('error');
      const errDesc = hash.get('error_description') ?? query.get('error_description');
      if (errCode || errDesc) {
        const expired = /expired|invalid/i.test(`${errCode} ${errDesc}`);
        if (!alive) return;
        setState({
          status: 'error',
          kind: expired ? 'expired' : 'failed',
          message: expired
            ? null
            : (errDesc ?? '').replace(/\+/g, ' ') || null,
          reason: expired ? 'expired' : 'unusable',
        });
        return;
      }

      // Wait for SDK initialization for either implicit tokens or a PKCE code.
      {
        // detectSessionInUrl owns the exchange. initialize() reuses its promise,
        // including when React StrictMode runs this effect twice.
        const { error } = await supabase.auth.initialize();
        if (!alive) return;
        if (error) {
          console.error('[NGD auth callback]', error);
          setState({ status: 'error', kind: 'failed', message: error.message });
          return;
        }
      }

      /*
       * Implicit: the client has already taken the tokens out of the fragment
       * by now. Ask it what it ended up with rather than parsing the URL a
       * second time — the client is the authority on whether a session exists.
       */
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!alive) return;

      const type = hash.get('type') ?? query.get('type');
      if (data?.session) {
        if (type === 'recovery') {
          /* A recovery link's only useful destination is the password form.
             Persisted session state is already ready after initialize(), so
             move there immediately instead of hiding the form behind a second
             button—especially confusing when the link opened on a phone or a
             different device. replace() also removes the spent token URL from
             browser history. */
          window.location.replace('/reset-password');
          return;
        }
        setState({
          status: 'ok',
          kind: 'confirmed',
          message: null,
        });
        /* The tokens are spent. Clearing them stops a shared or re-opened URL
           carrying credentials in the address bar and out of the browser's
           history. */
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      setState({
        status: 'error',
        kind: 'expired',
        message: null,
        reason: 'expired',
      });
    })().catch((error) => {
      if (alive) setState({ status: 'error', kind: 'failed', message: error.message || null, reason: 'check', error });
    });

    return () => { alive = false; };
  }, []);

  /* The service's own text where it sent some, otherwise this page's words.
     An error thrown while checking is classified exactly as it always was,
     with this page's sentence as the fallback. */
  const own = state.reason ? c.reasons[state.reason] : null;
  const message = state.reason === 'check'
    ? authErrorMessage(state.error, state.message || own, locale)
    : state.message || own;

  if (state.status === 'working') {
    return (
      <AuthShell eyebrow="New Grown Diamond" title={c.working.title} intro={c.working.intro}>
        <p className={styles.note} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          {c.working.status}
        </p>
      </AuthShell>
    );
  }

  if (state.status === 'ok' && state.kind === 'recovery') {
    return (
      <AuthShell
        eyebrow="New Grown Diamond"
        title={c.recovery.title}
        intro={c.recovery.intro}
      >
        <div className={styles.actions}>
          <a className={styles.submit} href="/reset-password">{c.recovery.choose}</a>
        </div>
      </AuthShell>
    );
  }

  if (state.status === 'ok') {
    return (
      <AuthShell
        eyebrow="New Grown Diamond"
        title={c.confirmed.title}
        intro={c.confirmed.intro}
      >
        <div className={styles.actions}>
          <a className={styles.submit} href="/account">{t('auth.goToAccount')}</a>
          <a className={styles.ghost} href="/diamonds">{t('auth.browseInventory')}</a>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="New Grown Diamond"
      title={state.kind === 'expired' ? c.failed.expiredTitle : c.failed.title}
      intro={message}
      aside={<>{c.failed.help} <a href="/contact">{c.failed.contact}</a>{c.stop}</>}
    >
      <p className={styles.note} data-tone="error" role="alert">
        {state.kind === 'expired'
          ? c.failed.expiredNote
          : c.failed.note}
      </p>
      <div className={styles.actions}>
        <a className={styles.submit} href="/login">{c.failed.signIn}</a>
        <a className={styles.ghost} href="/register">{t('nav.register')}</a>
      </div>
    </AuthShell>
  );
}
