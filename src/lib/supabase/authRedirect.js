/**
 * Where an emailed link should bring the visitor back to.
 *
 * WHY THIS IS PASSED EXPLICITLY. With no `emailRedirectTo`, Supabase builds
 * every confirmation and recovery link from the project's **Site URL** in the
 * dashboard. That value defaults to `http://localhost:3000`, and a project
 * that was set up and never revisited keeps it — so every link in every email
 * points at a machine that is not the customer's. The email arrives, the link
 * is clicked, and nothing happens. Naming the redirect here means the link
 * points at the site the person actually signed up on, whether that is the
 * production domain, a preview deployment, or a laptop.
 *
 * ONE DASHBOARD SETTING IS STILL REQUIRED, and it cannot be done from code:
 * the URL must appear in Authentication → URL Configuration → Redirect URLs.
 * Supabase refuses any redirect that is not on that allow-list and silently
 * falls back to Site URL — which is the same broken link again, with no error
 * to explain it. See SUPABASE-EMAIL-SETUP.md.
 */

/** The route that reads the outcome of a link and tells the visitor. */
export const AUTH_CALLBACK_PATH = '/auth/callback';

/**
 * Absolute, because Supabase requires it — and built from the CURRENT origin
 * rather than a compiled-in constant, so a preview build does not send people
 * to production and a local build does not send them to a laptop they are not
 * sitting at.
 */
export function authRedirectTo() {
  if (typeof window === 'undefined') return undefined;
  const origin = new URL(window.location.origin);
  if (!['http:', 'https:'].includes(origin.protocol)) {
    throw new Error('Email confirmation requires an HTTP or HTTPS website address.');
  }
  return new URL(AUTH_CALLBACK_PATH, origin).href;
}
