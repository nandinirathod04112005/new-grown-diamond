import { createClient } from '@supabase/supabase-js';

import { SUPABASE_KEY, SUPABASE_URL, isConfigured } from './env.js';

/**
 * The ONE Supabase client in the codebase.
 *
 * `detectSessionInUrl` is required for the password-recovery link to land;
 * without it a reset email drops the visitor on a signed-out page.
 *
 * Null when the project is not configured, so every caller must handle its
 * absence — the storefront falls back to its built-in copy rather than
 * throwing on a missing environment variable.
 */
// Capture callback details before the SDK consumes and clears URL tokens.
export const authCallbackUrl = typeof window === 'undefined' ? null : window.location.href;

export const supabase = isConfigured
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        /* This is a browser-only SPA. Recovery links must also open on a
           different phone/computer from the one that requested them. PKCE
           stores its verifier on the requesting device and therefore cannot
           complete there; implicit recovery carries the one-time session in
           the emailed URL and is the supported cross-device browser flow. */
        flowType: 'implicit',
      },
    })
  : null;

export { isConfigured };
