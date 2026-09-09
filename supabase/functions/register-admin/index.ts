// @ts-nocheck — Deno Edge Function: URL imports and the Deno global are
// resolved by the Deno runtime; plain TypeScript editors without the Deno
// extension would report false errors here. No effect on deployment.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

/*
 * Staff registration — the ONLY path that creates an account with
 * profiles.role = 'admin'. The staff code checked here is therefore the whole
 * grant, and the two things that protect it are the secret itself (set from
 * a prompt, never written down; see README.md) and the guess limiter below.
 *
 * THE LIMITER IS PER CALLER, NOT PER CALLER-AND-EMAIL. An earlier version
 * keyed the counter on `${ip}:${email}`. The email is whatever the caller
 * types and is never verified, so every invented address was a fresh
 * five-guess budget: twenty wrong codes from one machine, twenty different
 * emails, and never a 429. A correct code also deleted the caller's row,
 * which reset the budget for the next run from the same address. Neither
 * survives here: the key is the address alone, and nothing clears it.
 *
 * IT FAILS CLOSED. If the attempts table cannot be read or written, the
 * request is refused (503). "Could not check the limit" must never become
 * "no limit".
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const WINDOW_MS = 15 * 60 * 1000;
const MAX_WRONG = 5;

const response = (status: number, code: string) => new Response(
  JSON.stringify({ ok: status < 300, code }),
  { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
);

const digest = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
};

const safeEqual = async (left: string, right: string) => {
  const [a, b] = await Promise.all([digest(left), digest(right)]);
  let mismatch = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i += 1) {
    mismatch |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return mismatch === 0;
};

/*
 * The caller's address as the gateway saw it.
 *
 * A client can send its own x-forwarded-for; proxies APPEND the real address
 * after whatever arrived, so the LAST hop is the one the gateway vouches for
 * and the first hop is whatever the client chose. The earlier version took
 * the first, which let a caller pick their own limiter key. A gateway-set
 * single-address header is preferred when present.
 */
const callerAddress = (request: Request) => {
  const direct = request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip');
  if (direct) return direct.trim();
  const hops = (request.headers.get('x-forwarded-for') || '').split(',').map((s) => s.trim()).filter(Boolean);
  return hops.length ? hops[hops.length - 1] : 'unknown';
};

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response(405, 'method_not_allowed');

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const signupCode = Deno.env.get('ADMIN_SIGNUP_CODE');
  if (!url || !serviceKey || !signupCode) return response(503, 'service_unavailable');

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return response(400, 'invalid_request');
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const enteredCode = typeof body.admin_code === 'string' ? body.admin_code : '';
  const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const country = typeof body.country === 'string' ? body.country.trim() : '';
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || fullName.length < 2 || !phone || !country) {
    return response(400, 'invalid_request');
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const attemptKey = await digest(`caller:${callerAddress(request)}`);
  const now = Date.now();

  const { data: attempt, error: attemptError } = await admin.from('admin_signup_attempts')
    .select('attempt_count, window_started_at, blocked_until').eq('attempt_key', attemptKey).maybeSingle();
  if (attemptError) return response(503, 'service_unavailable');

  if (attempt?.blocked_until && new Date(attempt.blocked_until).getTime() > now) {
    return response(429, 'rate_limited');
  }

  if (!(await safeEqual(enteredCode, signupCode))) {
    const startedAt = attempt?.window_started_at ? new Date(attempt.window_started_at).getTime() : 0;
    const inWindow = startedAt > now - WINDOW_MS;
    const count = inWindow ? Number(attempt.attempt_count) + 1 : 1;
    const { error: recordError } = await admin.from('admin_signup_attempts').upsert({
      attempt_key: attemptKey,
      attempt_count: count,
      window_started_at: inWindow ? attempt.window_started_at : new Date(now).toISOString(),
      blocked_until: count >= MAX_WRONG ? new Date(now + WINDOW_MS).toISOString() : null,
      updated_at: new Date(now).toISOString(),
    });
    if (recordError) return response(503, 'service_unavailable');
    return response(count >= MAX_WRONG ? 429 : 403, count >= MAX_WRONG ? 'rate_limited' : 'invalid_admin_code');
  }

  const metadata = {
    full_name: fullName,
    company_name: typeof body.company_name === 'string' ? body.company_name.trim() || null : null,
    phone,
    country,
  };
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: metadata,
  });
  if (createError || !created?.user) {
    /*
     * By the error's CODE, not its status. GoTrue answers 422 both for an
     * address that already exists and for a password the project's policy
     * refuses; reporting the second as "already registered" sent a new
     * staff member off to recover an account they do not have.
     */
    const code = createError?.code ?? '';
    const message = createError?.message ?? '';
    if (code === 'email_exists' || code === 'user_already_exists' || /already (been )?registered|already exists/i.test(message)) {
      return response(409, 'already_registered');
    }
    if (code === 'weak_password') return response(400, 'invalid_request');
    return response(500, 'registration_failed');
  }

  const { error: profileError } = await admin.from('profiles').upsert({
    id: created.user.id,
    email,
    ...metadata,
    role: 'admin',
    account_status: 'active',
  }, { onConflict: 'id' });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return response(500, 'registration_failed');
  }
  return response(201, 'admin_registered');
});
