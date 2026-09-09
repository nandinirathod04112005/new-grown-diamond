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
  if (code === 'over_email_send_rate_limit') {
    return 'We could not send the confirmation email — our mail service has hit its hourly limit. Please contact the desk and we will activate your account for you.';
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
