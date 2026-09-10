/**
 * Make one password-recovery link for a customer, without sending any email.
 *
 * WHY. Recovery normally goes out through the project's mailer. When that
 * mailer cannot send, an account is unreachable and nothing on the site can
 * help. This asks Supabase for the same recovery token the email would have
 * carried, and prints a link to this site's own reset page. The desk sends it
 * however it already talks to that customer — WhatsApp, a call, a reply to
 * their enquiry.
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... node scripts/recovery-link.mjs someone@example.com
 *   ... --origin https://newgrowndiamond.com
 *
 * WHAT THE LINK IS. Exactly what the email would have contained: one recovery
 * token, single use, which expires. Whoever opens it can set that account's
 * password, so send it to the customer and nobody else, and only after you are
 * satisfied they are who they say. It grants no more than the emailed link
 * grants — but it also grants no less, so treat it the same way.
 *
 * It does not depend on the Site URL or the redirect allow-list, because the
 * address it points at is this site's own rather than one Supabase has to
 * approve. That is deliberate: those two settings are exactly what is broken
 * on a project nobody has configured yet.
 *
 * THE KEY. The service role key can read and write every row and bypasses
 * every policy. It is read from the environment only: never from .env.local,
 * never written, never printed. Pass it on this one command line, and rotate
 * it under Project Settings, API if it has ever gone somewhere it should not.
 */
import { readFileSync } from 'node:fs';
import process from 'node:process';

const email = process.argv[2];
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const originFlag = process.argv.indexOf('--origin');
const ORIGIN = (originFlag !== -1 && process.argv[originFlag + 1] ? process.argv[originFlag + 1] : 'http://localhost:5173').replace(/\/+$/, '');

function die(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  die('Usage: SUPABASE_SERVICE_ROLE_KEY=... node scripts/recovery-link.mjs someone@example.com [--origin https://your-site]');
}
if (!KEY) {
  die(
    'SUPABASE_SERVICE_ROLE_KEY is not set.\n'
    + 'It is in the dashboard under Project Settings, API, as the service_role key.\n\n'
    + `  SUPABASE_SERVICE_ROLE_KEY=... node scripts/recovery-link.mjs ${email}`,
  );
}
if (KEY.startsWith('sb_publishable') || /"role"\s*:\s*"anon"/.test(Buffer.from(KEY.split('.')[1] ?? '', 'base64').toString('utf8'))) {
  die('That is the publishable key. Generating a recovery token needs the service role key.');
}

let URL_ = '';
try {
  URL_ = Object.fromEntries(
    readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
      .split(/\r?\n/).filter((l) => l.includes('='))
      .map((l) => { const at = l.indexOf('='); return [l.slice(0, at).trim(), l.slice(at + 1).trim()]; }),
  ).VITE_SUPABASE_URL;
} catch { /* handled below */ }
if (!URL_) die('VITE_SUPABASE_URL could not be read from .env.local.');

const res = await fetch(`${URL_}/auth/v1/admin/generate_link`, {
  method: 'POST',
  headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ type: 'recovery', email }),
});

const body = await res.text();
if (!res.ok) {
  const parsed = (() => { try { return JSON.parse(body); } catch { return {}; } })();
  const reason = parsed.msg || parsed.message || body.slice(0, 200);
  die(
    `No link was made: HTTP ${res.status} ${reason}\n${
      res.status === 404 || /not found/i.test(reason) ? `There is no account for ${email}.` : ''
    }${res.status === 401 ? 'The key was refused. Check it is the service role key.' : ''}`,
  );
}

const data = JSON.parse(body);
const token = data.hashed_token;
if (!token) die(`Supabase answered without a token. Raw reply: ${body.slice(0, 300)}`);

console.log(`\nRecovery link for ${email}\n`);
console.log(`  ${ORIGIN}/reset-password?token_hash=${token}\n`);
console.log('Single use, and it expires. Send it only to that customer, over a channel you');
console.log('already use with them. Opening it lets whoever has it set the account password,');
console.log('which is exactly what the emailed link would have done.');
if (ORIGIN.includes('localhost')) {
  console.log('\nNote: this link points at localhost, so it only works on this machine.');
  console.log('Pass --origin https://your-site to make one a customer can open.');
}
