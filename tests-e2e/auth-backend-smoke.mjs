import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:4182';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ reducedMotion: 'reduce' });
  page.setDefaultTimeout(10000);
  const requests = [];
  let response = { status: 400, body: { code: 'invalid_credentials', message: 'Invalid login credentials' } };
  // Exercise the real SDK, but never create users or send email in this test.
  await page.route('https://*.supabase.co/**', async (route) => {
    if (!route.request().url().includes('/auth/v1/')) {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
      return;
    }
    requests.push({ url: route.request().url(), body: route.request().postDataJSON() });
    await route.fulfill({ status: response.status, headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'X-Supabase-Api-Version' }, contentType: 'application/json', body: JSON.stringify(response.body) });
  });
  await page.goto(`${origin}/login`);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByText('Enter your email address.', { exact: true }).waitFor();
  assert.equal(requests.length, 0);
  await page.getByLabel('Email', { exact: true }).fill('  customer@example.com  ');
  await page.getByLabel('Password', { exact: true }).fill(' password123 ');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Email or password is incorrect' }).waitFor();
  assert.equal(requests.at(-1).body.email, 'customer@example.com');
  assert.equal(requests.at(-1).body.password, ' password123 ');
  console.log('Passed validation and invalid credentials.');

  response = { status: 429, body: { code: 'over_request_rate_limit', message: 'rate limited' } };
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Too many attempts' }).waitFor();

  response = { status: 400, body: { code: 'email_not_confirmed', message: 'Email not confirmed' } };
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Resend confirmation email' }).waitFor();
  response = { status: 200, body: {} };
  await page.getByRole('button', { name: 'Resend confirmation email' }).click();
  await page.getByText('Confirmation email sent. Check your inbox and spam folder.').waitFor();
  assert.equal(new URL(requests.at(-1).url).searchParams.get('redirect_to'), `${origin}/auth/callback`);
  await page.getByLabel('Email', { exact: true }).fill('different@example.com');
  assert.equal(await page.getByRole('button', { name: 'Resend confirmation email' }).count(), 0);
  console.log('Passed rate limits and confirmation resend.');

  // An unexpected rejected SDK call must release the button so users can retry.
  await page.evaluate(async () => {
    const { supabase } = await import('/src/lib/supabase/client.js');
    supabase.auth.signInWithPassword = async () => { throw new TypeError('Failed to fetch'); };
  });
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Unable to connect' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Sign in', exact: true }).isEnabled(), true);
  console.log('Passed login exception recovery.');

  await page.goto(`${origin}/register`);
  const before = requests.length;
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByText('Enter your full name.', { exact: true }).waitFor();
  assert.equal(requests.length, before);
  await page.getByLabel('Full name', { exact: true }).fill(' Test Customer ');
  await page.getByLabel('Email', { exact: true }).fill(' customer@example.com ');
  await page.getByLabel('Password', { exact: true }).fill(' password123 ');
  await page.getByLabel('Confirm password', { exact: true }).fill(' password123 ');
  response = { status: 500, body: { code: 'unexpected_failure', message: 'Database error saving new user' } };
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'temporarily unavailable' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Create account', exact: true }).isEnabled(), true);
  for (const [status, code, message, expected] of [
    [400, 'user_already_exists', 'User already registered', 'This email is already registered'],
    [400, 'email_address_not_authorized', 'Email address not authorized', 'Email address not authorized'],
    [429, 'over_email_send_rate_limit', 'Email rate limit exceeded', 'Email rate limit exceeded'],
    [500, 'unexpected_failure', 'Error sending confirmation email', 'could not be sent'],
  ]) {
    response = { status, body: { code, message } };
    await page.getByRole('button', { name: 'Create account', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: expected }).waitFor();
    const retry = page.getByRole('button', { name: 'Try again', exact: true });
    if (await retry.count()) await retry.click();
  }
  response = { status: 200, body: { id: '11111111-1111-4111-8111-111111111111', identities: [], email: 'customer@example.com' } };
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'may already be registered' }).waitFor();
  response = { status: 200, body: { id: '11111111-1111-4111-8111-111111111111', identities: [{ provider: 'email' }], email: 'customer@example.com' } };
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('heading', { name: 'Check your email' }).waitFor();
  const signup = requests.at(-1);
  assert.equal(signup.body.email, 'customer@example.com');
  assert.equal(signup.body.password, ' password123 ');
  assert.equal(signup.body.data.full_name, 'Test Customer');
  assert.equal(signup.body.data.role, undefined);
  assert.equal(new URL(signup.url).searchParams.get('redirect_to'), `${origin}/auth/callback`);
  response = { status: 500, body: { code: 'unexpected_failure', message: 'Error sending confirmation email' } };
  await page.getByRole('button', { name: 'Resend confirmation email' }).click();
  await page.getByRole('alert').filter({ hasText: 'could not be sent' }).waitFor();
  assert.equal(await page.getByRole('button', { name: 'Resend confirmation email' }).isEnabled(), true);
  response = { status: 200, body: {} };
  await page.getByRole('button', { name: 'Resend confirmation email' }).click();
  await page.getByText('Confirmation email sent. Check your inbox and spam folder.', { exact: true }).waitFor();
  assert.equal(new URL(requests.at(-1).url).searchParams.get('redirect_to'), `${origin}/auth/callback`);
  await page.goto(`${origin}/auth/callback#error=access_denied&error_code=otp_expired&error_description=Email+link+expired`);
  await page.getByRole('heading', { name: 'This link has expired' }).waitFor();
  console.log('Passed auth browser checks: validation, normalized payloads, credentials, rate limits, confirmation, resend, failed-request recovery, registration.');
} finally {
  await browser.close();
}
