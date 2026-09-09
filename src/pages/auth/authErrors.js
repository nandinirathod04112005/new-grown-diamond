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

export function authErrorMessage(error, fallback) {
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
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(message)) {
    return 'Invalid login credentials. That email and password do not match an account. If signup failed, complete registration first.';
  }
  if (['user_already_exists', 'email_exists'].includes(code) || /already registered/i.test(message)) {
    return 'This email is already registered. Sign in, or use Forgot password to recover your account.';
  }
  if (code === 'email_address_not_authorized' || /email address not authorized/i.test(message)) {
    return 'Email address not authorized: the email service cannot send to this address. Contact support to configure email delivery.';
  }
  if (/smtp|error sending (confirmation|recovery|email)|failed to send.*email/i.test(message)) {
    return `SMTP/email delivery failed${error?.status ? ` (HTTP ${error.status})` : ''}. Supabase could not send the email. Please contact support to check the server email configuration.`;
  }
  if (code === 'over_email_send_rate_limit') {
    return 'Email rate limit exceeded. The email service cannot send another link yet. Please wait before trying again.';
  }
  if (error?.status === 429 || /rate_limit|over_.*limit/.test(code)) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (error?.status >= 500) {
    return 'The account service is temporarily unavailable. Please try again shortly.';
  }
  if (error?.name === 'AuthRetryableFetchError' || error instanceof TypeError) {
    return 'Unable to connect. Check your internet connection and try again.';
  }
  return fallback;
}
