/**
 * The staff access code.
 *
 * READ THIS BEFORE TRUSTING IT.
 *
 * This code ships inside the JavaScript bundle. Anyone who opens the site can
 * read it — no tooling, no skill, just view-source. It is therefore a GATE and
 * never a GRANT:
 *
 *   - It WITHHOLDS the admin interface from someone who does not have it.
 *   - It CONFERS nothing on someone who does.
 *
 * Being an administrator here means one thing only: a row in public.profiles
 * with role = 'admin' and account_status = 'active', which is protected by
 * row-level security in the database. Typing the code into the sign-up form
 * does not write that row, and typing it into the gate does not create it.
 * Someone who knows the code but has no such row still sees nothing, because
 * every admin query is refused at the database, not at the screen.
 *
 * What it is genuinely good for: it stops the desk being opened by accident on
 * a shared machine, and it keeps the admin sign-up path out of casual reach.
 * What it is not: a second factor. If this needs to be a real one, the check
 * has to move to the server — an Edge Function that validates a secret the
 * browser never sees, or Supabase MFA — and this file should be deleted when
 * that lands.
 *
 * The value is read from the environment so it can be rotated without a code
 * change, but note that VITE_ prefixed variables are also compiled into the
 * bundle. Changing it changes the code, not its visibility.
 */
export const ADMIN_CODE = String(import.meta.env?.VITE_ADMIN_CODE ?? '123456');

const UNLOCK_KEY = 'ngd-admin-unlocked';

/** Constant-ish comparison; trimmed because a pasted code often carries space. */
export function isAdminCode(input) {
  return String(input ?? '').trim() === ADMIN_CODE;
}

/**
 * Remembered for the browser SESSION, not beyond it.
 *
 * sessionStorage rather than localStorage on purpose: the desk should be shut
 * again when the tab closes. A staff member on a showroom machine who walks
 * away has not left the admin area permanently unlocked behind them.
 */
export function unlockAdmin() {
  try {
    sessionStorage.setItem(UNLOCK_KEY, '1');
  } catch {
    // Private mode and blocked site data both throw. The gate simply asks
    // again on the next admin page, which is the safe direction to fail.
  }
}

export function isAdminUnlocked() {
  try {
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export function lockAdmin() {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
  } catch {
    // Nothing was stored, so nothing is left unlocked.
  }
}
