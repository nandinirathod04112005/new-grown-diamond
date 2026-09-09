/**
 * Form validation for the account pages.
 *
 * WHY THIS FILE EXISTS. Every auth form here sets `noValidate`, which switches
 * off the browser's own constraint UI — deliberately, because the native
 * bubbles are unstyleable and appear in the wrong place on a dark card. But
 * `noValidate` also switches off `required`. Forgot-password, reset-password
 * and profile all compensated by calling `reportValidity()`; sign-in and
 * register did not, so on those two pages `required` was decorative and an
 * empty form went straight to the network.
 *
 * The visible symptom was the worst kind: submitting a blank sign-in form
 * posted '' / '' to Supabase, which answered `invalid_credentials`, which the
 * page reported as "That email and password do not match an account." A
 * message that is not merely unhelpful but actively wrong — nothing was typed,
 * so nothing failed to match.
 *
 * So validation is done HERE, in JavaScript, and the result is rendered next
 * to the field it belongs to.
 */

/**
 * Email, checked for the shape that can possibly be delivered to.
 *
 * Deliberately permissive. Email addresses are far stranger than most regexes
 * allow — plus-addressing, apostrophes, long new TLDs, non-ASCII domains — and
 * a strict pattern rejects real addresses belonging to real customers, which
 * is a much worse failure than accepting one that later bounces. This asks
 * only: is there something, an @, something, a dot, and something after it,
 * with no spaces. Anything past that is the mail server's job.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MIN_PASSWORD = 8;

/** Trimmed, because a trailing space in an email field is a typo, not intent. */
export function emailError(value) {
  const v = String(value ?? '').trim();
  if (!v) return 'Enter your email address.';
  if (!EMAIL.test(v)) return 'That does not look like an email address.';
  if (v.length > 254) return 'That email address is too long.';
  return null;
}

/**
 * Password presence and length.
 *
 * NOT trimmed. A password may legitimately begin or end with a space, and
 * silently stripping it would let someone set a password they can then never
 * type back in.
 */
export function passwordError(value, { min = MIN_PASSWORD, existing = false } = {}) {
  const v = String(value ?? '');
  if (!v) return 'Enter your password.';
  /* An existing password is checked for presence only. Applying today's length
     rule to an account created under an older one would lock that person out
     of their own account at the login screen, with a message telling them
     their correct password is too short. */
  if (!existing && v.length < min) return `Use at least ${min} characters.`;
  return null;
}

export function confirmError(password, confirm) {
  if (!confirm) return 'Repeat your password.';
  if (password !== confirm) return 'The two passwords do not match.';
  return null;
}

export function requiredError(value, label) {
  return String(value ?? '').trim() ? null : `Enter your ${label}.`;
}

/**
 * The first field with a problem, in the order they appear on screen.
 *
 * Focus has to go to the FIRST one rather than any one, or someone correcting
 * a form is bounced up and down it. `fields` is an ordered array of
 * [name, error] pairs; the caller keeps the order matching the markup.
 */
export function firstError(fields) {
  const hit = fields.find(([, err]) => err);
  return hit ? hit[0] : null;
}

/** Collapses the ordered pairs into the object the form renders from. */
export function toMap(fields) {
  return Object.fromEntries(fields.filter(([, err]) => err));
}
