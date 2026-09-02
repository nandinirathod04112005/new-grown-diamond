/**
 * Credentials come from .env.local and nowhere else.
 *
 * Only the PUBLISHABLE key may ever appear here. Anything prefixed VITE_ is
 * compiled into the browser bundle by definition, so a service_role or
 * sb_secret_ key placed in this file would be published to every visitor.
 * Row Level Security in the database is what protects the data; this key only
 * identifies the project.
 */
/*
 * Either spelling is accepted. Supabase's own dashboard hands out
 * NEXT_PUBLIC_ names, so those get pasted into .env.local constantly — and
 * with only the VITE_ names read, the result was a site with no credentials
 * and nothing on screen explaining why. VITE_ still wins when both are set.
 *
 * Both prefixes are public by definition. The rule that matters is unchanged:
 * only the PUBLISHABLE key may appear here, whatever it is called.
 */
const pick = (...names) => {
  for (const name of names) {
    const v = (import.meta.env[name] ?? '').trim();
    if (v) return v;
  }
  return '';
};

const url = pick('VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL');
const key = pick(
  'VITE_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
);

export const SUPABASE_URL = url;
export const SUPABASE_KEY = key;

export const isConfigured =
  url.startsWith('https://') && !url.includes('YOUR_') && key.length > 20 && !key.includes('YOUR_');

if (!isConfigured && import.meta.env.DEV) {
  // Names the exact problem, because "not configured" with no detail is what
  // turns a five-second fix into an afternoon.
  console.warn(
    `[NGD] Supabase is not configured.
  URL : ${url ? 'ok' : 'MISSING'}
  KEY : ${key ? `ok (${key.length} chars)` : 'MISSING'}

  Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to .env.local
  (NEXT_PUBLIC_ names are accepted too), then RESTART the dev server —
  env files are read once at startup, not per request.`,
  );

}
