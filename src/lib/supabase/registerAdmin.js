import { supabase } from './client.js';

/**
 * Staff registration goes through the `register-admin` Edge Function, not
 * through supabase.auth.signUp().
 *
 * WHY. Being an administrator here means exactly one thing: a public.profiles
 * row with role = 'admin' and account_status = 'active'. That row is behind
 * row-level security, so the browser cannot write it — something with more
 * authority has to, and it has to check the staff code first. The function
 * does both. It compares the code against a secret held only in its own
 * environment (ADMIN_SIGNUP_CODE), creates the auth user with the service
 * role — already confirmed, so no email is involved — and writes the profiles
 * row with role = 'admin'. Five wrong codes from one address block it for
 * fifteen minutes. Source: supabase/functions/register-admin.
 *
 * The staff code that ships in this bundle (lib/adminCode.js) is NOT what is
 * checked here. That one only opens the desk in a browser that already holds
 * an admin session; this one is the server's, and it is in no file the
 * browser can read. They can be set to the same value; they are still two
 * different checks in two different places.
 *
 * An earlier version put staff sign-ups through signUp() and wrote a note to
 * the enquiries queue. Every staff account came out a customer and stayed one,
 * because nothing ever acted on the note.
 */
export const REGISTER_ADMIN_FUNCTION = 'register-admin';

/** What the function answers with, and what the form says for each. */
const MESSAGES = {
  invalid_admin_code: 'That staff code is not correct.',
  rate_limited: 'Too many wrong codes from this connection. Wait fifteen minutes and try again.',
  already_registered: 'This email is already registered. Sign in, or use Forgot password to recover your account.',
  invalid_request: 'Check the details: your name, a valid email, phone, country, and a password of at least 8 characters.',
  service_unavailable: 'Staff registration is not set up on this deployment. Ask the site owner to configure the register-admin function.',
  registration_failed: 'The staff account could not be created. Please try again, or contact an administrator.',
};

export class RegisterAdminError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'RegisterAdminError';
    this.code = code;
  }
}

/**
 * Resolves once the account exists as a confirmed administrator. Rejects with
 * a RegisterAdminError whose `code` names the reason, so the form can put the
 * one that belongs on a field (the code) on that field.
 */
export async function registerAdmin({ email, password, fullName, phone, country, code }) {
  if (!supabase) throw new RegisterAdminError('unconfigured', 'The site is not connected to its database on this deployment.');

  const { error } = await supabase.functions.invoke(REGISTER_ADMIN_FUNCTION, {
    body: {
      email,
      password,
      full_name: fullName,
      phone,
      country,
      admin_code: code,
    },
  });
  if (!error) return;

  /*
   * A non-2xx answer arrives as a FunctionsHttpError carrying the Response in
   * `context`; the function's own JSON body names the reason. A function that
   * is not deployed at all answers 404 with no such body, and a network
   * failure never produces a Response.
   */
  let reason = '';
  let status = 0;
  if (error.context && typeof error.context.json === 'function') {
    status = error.context.status ?? 0;
    try {
      reason = (await error.context.json())?.code ?? '';
    } catch {
      reason = '';
    }
  }
  if (reason in MESSAGES) throw new RegisterAdminError(reason, MESSAGES[reason]);
  if (error.name === 'FunctionsFetchError') {
    throw new RegisterAdminError('network', 'Unable to connect. Check your internet connection and try again.');
  }
  if (status === 404) throw new RegisterAdminError('not_deployed', MESSAGES.service_unavailable);
  throw new RegisterAdminError('unknown', MESSAGES.registration_failed);
}
