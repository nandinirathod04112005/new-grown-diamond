/**
 * Set a password for one account, without email.
 *
 * WHY THIS EXISTS. Password recovery goes through the project's mailer, and
 * while that mailer is failing there is no self-service way back into an
 * account. This is the desk's manual route in the meantime: an operator sets a
 * password, tells the person, and they change it once they are in. It is not a
 * replacement for working recovery — see SUPABASE-EMAIL-SETUP.md for that.
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/set-password.mjs someone@example.com
 *
 * THE KEY. This needs the service role key, which can read and write every row
 * in the database and bypass every policy. Three rules, enforced below where
 * they can be:
 *
 *   1. It is taken from the environment, or failing that from .env.local. It
 *      is never written and never printed, and goes nowhere except the
 *      project's own API.
 *   2. Its NAME must never carry a VITE_ or NEXT_PUBLIC_ prefix. Those two
 *      prefixes are what Vite copies into the browser bundle, so a key named
 *      that way would be served to every visitor. SUPABASE_SERVICE_ROLE_KEY
 *      is invisible to the front end, and .env.local is git-ignored.
 *   3. Run this from a terminal you control. In most shells, a command that
 *      begins with a space is kept out of the history file.
 *
 * If the key has ever been pasted somewhere it should not be, rotate it in the
 * dashboard under Project Settings, API. That takes a minute and invalidates
 * the old one.
 */
import { createInterface } from 'node:readline';
import process from 'node:process';

import { envFile, readSecret } from './_secret.mjs';

const email = process.argv[2];
const { value: KEY, source: KEY_SOURCE } = readSecret('SUPABASE_SERVICE_ROLE_KEY');

function die(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  die('Usage: SUPABASE_SERVICE_ROLE_KEY=... node scripts/set-password.mjs someone@example.com');
}

if (!KEY) {
  die(
    'SUPABASE_SERVICE_ROLE_KEY is not set.\n'
    + 'Find it in the Supabase dashboard under Project Settings, API, as the\n'
    + 'service_role key. Pass it for this one command only:\n\n'
    + `  SUPABASE_SERVICE_ROLE_KEY=... node scripts/set-password.mjs ${email}`,
  );
}

/*
 * Refuse the publishable key rather than failing later with a 401 that reads
 * like the account is missing. The two keys are easy to confuse and only one
 * of them can do this.
 */
if (KEY.startsWith('sb_publishable') || /"role"\s*:\s*"anon"/.test(Buffer.from(KEY.split('.')[1] ?? '', 'base64').toString('utf8'))) {
  die('That is the publishable key, not the service role key. The publishable key cannot change a password, by design.');
}

const env = envFile();
const URL_ = env.VITE_SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';
if (!URL_) die('VITE_SUPABASE_URL could not be read from .env.local.');
console.log(`Service role key read from ${KEY_SOURCE}.`);

const admin = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

async function ask(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  const answer = await new Promise((resolve) => {
    process.stdout.write(question);
    rl._writeToOutput = () => {};
    rl.question('', (value) => { process.stdout.write('\n'); resolve(value); });
  });
  rl.close();
  return answer;
}

/* The admin list is paged and filtering is per-page, so walk until found. */
console.log(`Looking for ${email}…`);
let user = null;
for (let page = 1; page <= 20 && !user; page += 1) {
  const res = await fetch(`${URL_}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: admin });
  if (!res.ok) die(`The account list could not be read: HTTP ${res.status}. ${res.status === 401 ? 'The key was refused.' : ''}`);
  const body = await res.json();
  const users = body.users ?? [];
  if (!users.length) break;
  user = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase()) || null;
}

if (!user) die(`No account exists for ${email}. Nothing was changed.`);

console.log(`Found: ${user.email}  id ${user.id}  created ${new Date(user.created_at).toLocaleDateString()}`);
console.log(`Email confirmed: ${user.email_confirmed_at ? 'yes' : 'no'}`);

const password = await ask('New password (hidden, at least 8 characters): ');
if (password.length < 8) die('Too short. Nothing was changed.');
const again = await ask('Type it again: ');
if (password !== again) die('The two did not match. Nothing was changed.');

const res = await fetch(`${URL_}/auth/v1/admin/users/${user.id}`, {
  method: 'PUT',
  headers: admin,
  body: JSON.stringify({ password }),
});

if (!res.ok) {
  const body = await res.text();
  die(`The password was not changed: HTTP ${res.status} ${body.slice(0, 200)}`);
}

console.log(`\nDone. ${user.email} can sign in with the new password now.`);
console.log('Tell them out of band, and ask them to change it from their account page once they are in.');
