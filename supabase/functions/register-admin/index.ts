import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const attempts = new Map<string, { count: number; resetAt: number }>()
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function sameSecret(left: string, right: string) {
  const encoder = new TextEncoder()
  const a = encoder.encode(left)
  const b = encoder.encode(right)
  let difference = a.length ^ b.length
  const length = Math.max(a.length, b.length)
  for (let index = 0; index < length; index += 1) {
    difference |= (a[index] || 0) ^ (b[index] || 0)
  }
  return difference === 0
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' })

  const signupCode = Deno.env.get('ADMIN_SIGNUP_CODE')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!signupCode || !supabaseUrl || !serviceRoleKey) {
    console.error('register-admin is missing required server secrets')
    return json(503, { error: 'Registration is temporarily unavailable.' })
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  const now = Date.now()
  const current = attempts.get(ip)
  if (current && current.resetAt > now && current.count >= MAX_ATTEMPTS) {
    return json(429, { error: 'Too many attempts. Please try again later.' })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json(400, { error: 'Invalid request.' })
  }

  const adminCode = typeof body.adminCode === 'string' ? body.adminCode : ''
  if (!sameSecret(adminCode, signupCode)) {
    attempts.set(ip, {
      count: current && current.resetAt > now ? current.count + 1 : 1,
      resetAt: current && current.resetAt > now ? current.resetAt : now + ATTEMPT_WINDOW_MS,
    })
    return json(401, { error: 'Invalid Admin Code.' })
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const profile = body.profile && typeof body.profile === 'object'
    ? body.profile as Record<string, unknown>
    : {}
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 ||
      typeof profile.full_name !== 'string' || profile.full_name.trim().length < 2 ||
      typeof profile.phone !== 'string' || profile.phone.trim().length < 7 ||
      typeof profile.country !== 'string' || !profile.country) {
    return json(400, { error: 'Invalid registration details.' })
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: profile.full_name.trim(),
      company_name: typeof profile.company_name === 'string' ? profile.company_name.trim() || null : null,
      phone: profile.phone.trim(),
      country: profile.country,
    },
  })
  if (created.error || !created.data.user) {
    console.error('Admin auth creation failed:', created.error?.message)
    return json(created.error?.status === 422 ? 409 : 500, {
      error: created.error?.status === 422 ? 'Account already exists.' : 'Registration failed.',
    })
  }

  const userId = created.data.user.id
  const updated = await admin.from('profiles').upsert({
    id: userId,
    email,
    full_name: profile.full_name.trim(),
    company_name: typeof profile.company_name === 'string' ? profile.company_name.trim() || null : null,
    phone: profile.phone.trim(),
    country: profile.country,
    role: 'admin',
    account_status: 'active',
  }, { onConflict: 'id' })

  if (updated.error) {
    console.error('Admin profile update failed:', updated.error.message)
    await admin.auth.admin.deleteUser(userId)
    return json(500, { error: 'Registration failed.' })
  }

  attempts.delete(ip)
  return json(201, { success: true })
})
