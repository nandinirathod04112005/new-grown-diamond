import { useState } from 'react';

import { supabase, isConfigured } from '@/lib/supabase/client.js';
import { useAuth } from '@/hooks/useAuth.js';
import styles from './admin/Admin.module.css';

/**
 * Staff sign-in.
 *
 * Errors are deliberately not specific about whether the address exists —
 * distinguishing "no such account" from "wrong password" hands an attacker a
 * way to enumerate real staff addresses.
 */
export default function LoginPage() {
  const { status, isAdmin, signOut, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function onSubmit(event) {
    event.preventDefault();
    if (!isConfigured) return;
    setBusy(true);
    setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (err) {
      console.error('[NGD Login]', err);
      setError('That email and password do not match an account.');
      return;
    }
    window.location.assign('/admin/diamonds');
  }

  if (status === 'ready') {
    return (
      <main className={styles.authPage}>
        <div className={styles.authCard}>
          <h1>Signed in</h1>
          <p className={styles.muted}>{profile?.email || profile?.full_name || 'Your account'}</p>
          {isAdmin ? (
            <a className={styles.primary} href="/admin/diamonds">Go to the inventory admin</a>
          ) : (
            <p className={styles.muted}>This account is not an active administrator.</p>
          )}
          <button type="button" className={styles.ghost} onClick={signOut}>Sign out</button>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.authPage}>
      <form className={styles.authCard} onSubmit={onSubmit} noValidate>
        <h1>Staff sign in</h1>
        <p className={styles.muted}>Manage the diamond inventory.</p>

        {error && <p className={styles.error} role="alert">{error}</p>}

        <label className={styles.field}>
          <span>Email</span>
          <input
            type="email"
            value={email}
            autoComplete="email"
            required
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>

        <label className={styles.field}>
          <span>Password</span>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            required
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button className={styles.primary} type="submit" disabled={busy || !isConfigured}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>

        {!isConfigured && (
          <p className={styles.error}>Supabase is not configured, so sign-in is unavailable.</p>
        )}
      </form>
    </main>
  );
}
