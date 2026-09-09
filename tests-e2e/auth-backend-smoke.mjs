import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:4182';
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  page.setDefaultTimeout(10000);
  const requests = [];
  let response = { status: 400, body: { code: 'invalid_credentials', message: 'Invalid login credentials' } };
  // Exercise the real SDK, but never create users or send email in this test.
  await page.route('https://*.supabase.co/**', async (route) => {
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
  await page.getByRole('alert').filter({ hasText: 'do not match' }).waitFor();
  assert.equal(requests.at(-1).body.email, 'customer@example.com');
  assert.equal(requests.at(-1).body.password, ' password123 ');
  console.log('Passed validation and invalid credentials.');

  response = { status: 429, body: { code: 'over_request_rate_limit', message: 'rate limited' } };
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('alert').filter({ hasText: 'Too many attempts' }).waitFor();

  response = { status: 400, body: { code: 'email_not_confirmed', message: 'Email not confirmed' } };
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Resend the email' }).waitFor();
  response = { status: 200, body: {} };
  await page.getByRole('button', { name: 'Resend the email' }).click();
  await page.getByText('Sent. It can take a minute to arrive.').waitFor();
  assert.equal(new URL(requests.at(-1).url).searchParams.get('redirect_to'), `${origin}/account`);
  await page.getByLabel('Email', { exact: true }).fill('different@example.com');
  assert.equal(await page.getByRole('button', { name: 'Resend the email' }).count(), 0);
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
  response = { status: 200, body: { id: '11111111-1111-4111-8111-111111111111', identities: [], email: 'customer@example.com' } };
  await page.getByRole('button', { name: 'Create account', exact: true }).click();
  await page.getByRole('heading', { name: 'Check your email' }).waitFor();
  const signup = requests.at(-1);
  assert.equal(signup.body.email, 'customer@example.com');
  assert.equal(signup.body.password, ' password123 ');
  assert.equal(signup.body.data.full_name, 'Test Customer');
  assert.equal(signup.body.data.role, undefined);
  assert.equal(new URL(signup.url).searchParams.get('redirect_to'), `${origin}/account`);
  console.log('Passed auth browser checks: validation, normalized payloads, credentials, rate limits, confirmation, resend, failed-request recovery, registration.');
} finally {
  await browser.close();
}
