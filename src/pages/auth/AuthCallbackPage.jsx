import { useEffect, useState } from 'react';

import { supabase, isConfigured, authCallbackUrl } from '@/lib/supabase/client.js';
import { authErrorMessage } from './authErrors.js';
import AuthShell from './AuthShell.jsx';
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
  const [state, setState] = useState(() => isConfigured
    ? { status: 'working', kind: null, message: null }
    : { status: 'error', kind: null, message: 'This deployment is not connected to its account service.' });

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
            ? 'That link has expired or has already been used.'
            : (errDesc ?? '').replace(/\+/g, ' ') || 'That link could not be used.',
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
        setState({
          status: 'ok',
          kind: type === 'recovery' ? 'recovery' : 'confirmed',
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
        message: 'That link has expired or has already been used.',
      });
    })().catch((error) => {
      if (alive) setState({ status: 'error', kind: 'failed', message: authErrorMessage(error, error.message || 'Unable to check this link. Please try again.') });
    });

    return () => { alive = false; };
  }, []);

  if (state.status === 'working') {
    return (
      <AuthShell eyebrow="New Grown Diamond" title="One moment" intro="Checking your link.">
        <p className={styles.note} role="status">
          <span className={styles.spinner} aria-hidden="true" />
          Confirming…
        </p>
      </AuthShell>
    );
  }

  if (state.status === 'ok' && state.kind === 'recovery') {
    return (
      <AuthShell
        eyebrow="New Grown Diamond"
        title="Set a new password"
        intro="Your link has been accepted."
      >
        <div className={styles.actions}>
          <a className={styles.submit} href="/reset-password">Choose a new password</a>
        </div>
      </AuthShell>
    );
  }

  if (state.status === 'ok') {
    return (
      <AuthShell
        eyebrow="New Grown Diamond"
        title="Email confirmed"
        intro="Your account is active and you are signed in."
      >
        <div className={styles.actions}>
          <a className={styles.submit} href="/account">Go to your account</a>
          <a className={styles.ghost} href="/diamonds">Browse the inventory</a>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="New Grown Diamond"
      title={state.kind === 'expired' ? 'This link has expired' : 'That link did not work'}
      intro={state.message}
      aside={<>Need help? <a href="/contact">Contact the desk</a>.</>}
    >
      <p className={styles.note} data-tone="error" role="alert">
        {state.kind === 'expired'
          ? 'Confirmation links are single-use and time-limited. Sign in to have a new one sent.'
          : 'Please try signing in; if the problem continues, contact the desk.'}
      </p>
      <div className={styles.actions}>
        <a className={styles.submit} href="/login">Go to sign in</a>
        <a className={styles.ghost} href="/register">Create an account</a>
      </div>
    </AuthShell>
  );
}
