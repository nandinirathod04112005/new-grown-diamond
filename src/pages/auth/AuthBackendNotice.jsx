import { useEffect, useState } from 'react';

import { SUPABASE_KEY, SUPABASE_URL, isConfigured } from '@/lib/supabase/env.js';
import styles from './Auth.module.css';

/**
 * The live state of the auth backend, shown on the auth pages IN DEVELOPMENT.
 *
 * WHY THIS EXISTS. Sign-up on this project was failing with "Error sending
 * confirmation email", and the cause — email confirmation switched on while
 * the mail service cannot send — is a dashboard setting invisible from the
 * code. Every explanation of it lived in a chat window, far from the form
 * where the failure was being seen. This puts the fact on the form.
 *
 * It reads /auth/v1/settings, which is public and read-only, and reports the
 * one value that decides whether sign-up can work without mail. When the
 * setting is flipped in the dashboard, this notice changes on the next reload
 * — so it also confirms that the change took, without needing to register a
 * test account to find out.
 *
 * DEV ONLY, enforced at build time. `import.meta.env.DEV` is a compile-time
 * constant, so in a production bundle this component is dead code and is
 * removed entirely. A customer must never be told their supplier's Supabase
 * project is misconfigured.
 */
export default function AuthBackendNotice() {
  const [state, setState] = useState(null);

  useEffect(() => {
    if (!import.meta.env.DEV || !isConfigured) return undefined;
    let alive = true;
    fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
    })
      .then((r) => r.json())
      .then((cfg) => { if (alive) setState({ ok: true, confirmOn: cfg.mailer_autoconfirm === false, signupOn: cfg.disable_signup === false }); })
      .catch(() => { if (alive) setState({ ok: false }); });
    return () => { alive = false; };
  }, []);

  if (!import.meta.env.DEV || !state) return null;

  if (!state.ok) {
    return (
      <p className={styles.note} data-tone="error" role="status">
        <strong>DEV: could not read the auth settings.</strong>
        The Supabase URL or key in .env.local may be wrong.
      </p>
    );
  }

  if (!state.signupOn) {
    return (
      <p className={styles.note} data-tone="error" role="status">
        <strong>DEV: sign-up is disabled on this Supabase project.</strong>
        Authentication → Providers → Email → enable sign-ups.
      </p>
    );
  }

  /*
   * States only what was READ, and says where from. An earlier version
   * asserted "and this project's mail service is failing" — a diagnosis this
   * component had not made; it had only read a flag. Whether mail actually
   * sends is learned from a sign-up's own response, and RegisterPage reports
   * that when it happens. Nothing here sends an email to find out.
   */
  if (state.confirmOn) {
    return (
      <div className={styles.note} data-tone="error" role="status">
        <strong>DEV: Supabase reports "Confirm email" is ON for this project.</strong>
        Sign-up will need a working mail service; if it does not have one, the
        account is rolled back and nothing reaches the database. For local
        development it is expected to be OFF.
        <span className={styles.devSteps}>
          <b>node scripts/supabase-confirm-email.mjs off</b> (needs a personal access token), or
          Supabase Dashboard → <b>Authentication</b> → <b>Providers</b> → <b>Email</b> → <b>Confirm email</b> OFF → Save,
          then reload. Read from the public <code>/auth/v1/settings</code> endpoint.
        </span>
      </div>
    );
  }

  return (
    <p className={styles.note} data-tone="good" role="status">
      <strong>DEV: Supabase reports "Confirm email" is OFF.</strong>
      Sign-up returns a session and enters the app directly — no email involved.
    </p>
  );
}
