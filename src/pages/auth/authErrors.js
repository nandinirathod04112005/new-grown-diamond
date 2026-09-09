export function authErrorMessage(error, fallback) {
  if (error?.status === 429 || /rate_limit|over_.*limit/.test(error?.code ?? '')) {
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
