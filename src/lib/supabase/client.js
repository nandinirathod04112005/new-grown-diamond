/**
 * The single Supabase client for the whole application.
 *
 * Nothing else in the codebase may call `createClient`. Import `supabase` from
 * here, or call `getSupabase()` when you want the guarded accessor.
 *
 * When the environment is incomplete the module still loads and `supabase` is
 * null, so the app can render a diagnostic screen instead of white-screening.
 * Query modules should call `getSupabase()`, which throws a message naming the
 * exact problem.
 */

import { createClient } from '@supabase/supabase-js';

import { resolveSupabaseEnv, SETUP_INSTRUCTIONS } from './env.js';

const env = resolveSupabaseEnv();

/** Full diagnostic state, for the dev-facing configuration screen. */
export const supabaseEnvStatus = {
  ok: env.ok,
  problems: env.problems,
  instructions: SETUP_INSTRUCTIONS,
};

function logMisconfiguration() {
  const lines = [
    'Supabase is not configured, so no data will load.',
    '',
    ...env.problems.map((problem) => `  - ${problem}`),
    '',
    'To fix:',
    ...SETUP_INSTRUCTIONS.map((step, i) => `  ${i + 1}. ${step}`),
  ];
  console.error(`[NGD] ${lines.join('\n')}`);
}

if (!env.ok) {
  logMisconfiguration();
}

/**
 * The shared client, or null when the environment is incomplete.
 * Prefer `getSupabase()` in data code so failures are loud and specific.
 */
export const supabase = env.ok
  ? createClient(env.url, env.publishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        // Required for the password-reset and email-confirmation links,
        // which return the session in the URL fragment.
        detectSessionInUrl: true,
      },
    })
  : null;

/** True when the client exists and can be used. */
export function isSupabaseConfigured() {
  return supabase !== null;
}

/**
 * The client, or a thrown error explaining precisely what is missing.
 * Use this anywhere a null client would surface as a confusing runtime failure.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
export function getSupabase() {
  if (!supabase) {
    throw new Error(
      `Supabase is not configured: ${env.problems.join(' ')} ` +
        `Fix: ${SETUP_INSTRUCTIONS.join(' | ')}`
    );
  }
  return supabase;
}

/**
 * Public URL for a file in a public Storage bucket.
 * Returns '' for an empty path or an unconfigured client, so callers can fall
 * back to placeholder art without a try/catch at every call site.
 *
 * Buckets in use: 'diamond-images', 'jewellery-images', 'site-media'.
 *
 * @param {string} bucket
 * @param {string} path
 * @returns {string}
 */
export function storagePublicUrl(bucket, path) {
  if (!path || !supabase) return '';
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? '';
}
