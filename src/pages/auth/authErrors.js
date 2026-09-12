import { pickCopy } from '@/i18n/useCopy.js';
import COPY from './authErrors.copy.js';

/**
 * Did this sign-up fail because Supabase could not send the confirmation mail?
 *
 * It arrives in two different shapes, and they are NOT interchangeable:
 *
 *   429 over_email_send_rate_limit  — the hourly cap; try later and it works
 *   500 unexpected_failure          — "Error sending confirmation email";
 *                                     the mail service is broken, and later
 *                                     will not help
 *
 * Both matter here for the same reason: when the email cannot be sent,
 * Supabase ROLLS THE WHOLE SIGN-UP BACK. No auth user, no profile row, nothing
 * in the database — which is exactly what "the registration details never
 * arrive" looks like from the outside. The account was never created, so there
 * was nothing to arrive.
 *
 * Matching only the rate limit missed the 500 entirely, and the 500 is the one
 * that does not fix itself.
 */
export function isEmailDeliveryFailure(error) {
  const code = error?.code ?? error?.error_code ?? '';
  const msg = String(error?.msg ?? error?.message ?? '');
  if (code === 'over_email_send_rate_limit') return true;
  /* Supabase reports the mailer's own failure as a generic unexpected_failure,
     so the message is the only thing that distinguishes it from an unrelated
     server error — and sending someone to the desk for an unrelated one would
     be a confusing detour. */
  return /error sending|sending .*email|confirmation email|smtp/i.test(msg);
}

/**
 * The sentence for an auth error, in the visitor's language.
 *
 * `locale` only chooses the WORDS (authErrors.copy.js); which sentence an
 * error gets is decided below and is the same in every language. Called
 * without one it answers in English, exactly as it always has. `fallback` is
 * the caller's, already in the right language — or the service's own text,
 * which is passed through as it came.
 */
export function authErrorMessage(error, fallback, locale = 'en') {
  const say = pickCopy(COPY, locale);
  /*
   * The MAILER's limit, not the visitor's.
   *
   * `over_email_send_rate_limit` means the PROJECT cannot send more mail this
   * hour — Supabase's built-in service allows only a handful and is documented
   * as being for testing. Reporting that as "too many attempts" blames the
   * person filling in the form for a server-side cap they cannot influence,
   * and sends them away to retry something that will fail again. Separated out
   * so the message can be honest and offer the route that still works.
   */
  const code = error?.code ?? error?.error_code ?? '';
  const message = error?.message ?? error?.msg ?? '';
  /*
   * One short sentence, and deliberately no more.
   *
   * Supabase returns this same code whether the address is unknown or the
   * password is wrong, and the message must not narrow it either way — doing
   * so turns the sign-in form into an oracle that confirms, one guess at a
   * time, which addresses hold accounts. An earlier wording added "if signup
   * failed, complete registration first", which both hinted at the answer and
   * sent a person with a mistyped password off to register again.
   */
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return say.invalidCredentials;
  }
  if (['user_already_exists', 'email_exists'].includes(code) || /already registered/i.test(message)) {
    return say.alreadyRegistered;
  }
  if (code === 'email_address_not_authorized' || /email address not authorized/i.test(message)) {
    return say.notAuthorized;
  }
  /*
   * Setting a new password, and the three ways it is actually refused.
   *
   * All three were reaching the reset screen as one generic "could not update
   * your password", which is the least useful thing that could be said about
   * any of them: the first is a typo the person can fix in two seconds, the
   * second needs a different password, and the third needs a whole new email.
   * `same_password` is not hypothetical — it is in this project's auth log
   * three times over, and each of those is someone being told nothing while
   * retyping the password they already have.
   */
  if (code === 'same_password' || /should be different from the old password/i.test(message)) {
    return say.samePassword;
  }
  if (code === 'weak_password' || /password.*(too weak|is too short|at least \d+ characters)/i.test(message)) {
    return say.weakPassword;
  }
  /* No session left to change a password with: the recovery link has expired,
     or it was opened a second time and spent the first. */
  if (['session_not_found', 'session_expired'].includes(code)
    || /auth session missing|session (from session_id claim in jwt )?does not exist/i.test(message)) {
    return say.recoveryExpired;
  }
  /*
   * Plain words only. An earlier version said "SMTP/email delivery failed
   * (HTTP 500). Supabase could not send the email" — a sentence for the
   * developer, shown to the customer. The status code and vendor are already
   * in the console (every caller logs the raw error before mapping it), so
   * nothing is lost by leaving them out here.
   */
  if (/smtp|error sending (confirmation|recovery|email)|failed to send.*email/i.test(message)) {
    return say.sendFailed;
  }
  if (code === 'over_email_send_rate_limit') {
    return say.mailRateLimit;
  }
  if (error?.status === 429 || /rate_limit|over_.*limit/.test(code)) {
    return say.tooMany;
  }
  if (error?.status >= 500) {
    return say.unavailable;
  }
  if (error?.name === 'AuthRetryableFetchError' || error instanceof TypeError) {
    return say.offline;
  }
  return fallback;
}
