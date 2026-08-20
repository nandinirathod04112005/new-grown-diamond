// @ts-nocheck — Deno Edge Function: URL imports and the Deno global are
// resolved by the Deno runtime; plain TypeScript editors without the Deno
// extension would report false errors here. No effect on deployment.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const attemptKey = await digest(`${forwarded}:${email}`);
  const now = Date.now();
  const windowStart = new Date(now - 15 * 60 * 1000).toISOString();
  const { data: attempt } = await admin.from('admin_signup_attempts')
    .select('attempt_count, window_started_at, blocked_until').eq('attempt_key', attemptKey).maybeSingle();

  if (attempt?.blocked_until && new Date(attempt.blocked_until).getTime() > now) {
    return response(429, 'rate_limited');
  }

  if (!(await safeEqual(enteredCode, signupCode))) {
    const inWindow = attempt?.window_started_at && attempt.window_started_at >= windowStart;
    const count = inWindow ? Number(attempt.attempt_count) + 1 : 1;
    await admin.from('admin_signup_attempts').upsert({
      attempt_key: attemptKey,
      attempt_count: count,
      window_started_at: inWindow ? attempt.window_started_at : new Date(now).toISOString(),
      blocked_until: count >= 5 ? new Date(now + 15 * 60 * 1000).toISOString() : null,
      updated_at: new Date(now).toISOString(),
    });
    return response(count >= 5 ? 429 : 403, count >= 5 ? 'rate_limited' : 'invalid_admin_code');
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
  if (createError || !created.user) {
    return response(createError?.status === 422 ? 409 : 500,
      createError?.status === 422 ? 'already_registered' : 'registration_failed');
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
  await admin.from('admin_signup_attempts').delete().eq('attempt_key', attemptKey);
  return response(201, 'admin_registered');
});
