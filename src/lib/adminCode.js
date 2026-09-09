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
 * row-level security in the database. Typing this code into the gate does not
 * create that row. Someone who knows the code but has no such row still sees
 * nothing, because every admin query is refused at the database, not at the
 * screen.
 *
 * THE SIGN-UP FORM DOES NOT USE THIS VALUE. What is typed there goes to the
 * `register-admin` Edge Function, which checks it against its own secret
 * (ADMIN_SIGNUP_CODE, set on the server and in no file the browser can read)
 * and writes the profiles row itself. The two may be set to the same digits;
 * they are still two checks in two places, and only the server's one grants.
 *
 * What this one is genuinely good for: it stops the desk being opened by
 * accident on a shared machine. What it is not: a second factor. If it needs
 * to be a real one, that means Supabase MFA, and this file goes.
 *
 * The value is read from the environment so it can be rotated without a code
 * change, but note that VITE_ prefixed variables are also compiled into the
 * bundle. Changing it changes the code, not its visibility.
 */
/*
 * Falls back to the default when the variable is MISSING OR EMPTY, not only
 * when it is missing. `??` treats '' as a real value, and a deployment that
 * declared VITE_ADMIN_CODE= with nothing after it would have made the gate
 * open on a blank submit — the one input every visitor tries first.
 */
const fromEnv = String(import.meta.env?.VITE_ADMIN_CODE ?? '').trim();
export const ADMIN_CODE = fromEnv || '123456';

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
