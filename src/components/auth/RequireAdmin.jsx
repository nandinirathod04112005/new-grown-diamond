import { useAuth } from '@/hooks/useAuth.js';
import styles from './RequireAdmin.module.css';

/**
 * Renders its children only for an active admin.
 *
 * Fails closed, and shows a real loading state rather than a blank screen
 * while the profile resolves — a guarded page that flashes empty reads as
 * broken even when it is behaving correctly.
 */
export default function RequireAdmin({ children }) {
  const { status, isAdmin, profile } = useAuth();

  if (status === 'loading') {
    return (
      <main className={styles.gate} role="status">
        <span className={styles.spinner} aria-hidden="true" />
        <p>Checking your access…</p>
      </main>
    );
  }

  if (status === 'anon') {
    return (
      <main className={styles.gate}>
        <h1>Sign in required</h1>
        <p>This area is for New Grown Diamond staff.</p>
        <a className={styles.action} href="/login">Go to sign in</a>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className={styles.gate}>
        <h1>No access</h1>
        <p>
          {profile
            ? 'This account is not an active administrator.'
            : 'We could not load your account details. Please contact support.'}
        </p>
        <a className={styles.action} href="/">Back to the site</a>
      </main>
    );
  }

  return children;
}
