#!/usr/bin/env node
/**
 * Turn Supabase's "Confirm email" requirement off (or back on) from the
 * command line — the one setting standing between this site and a working
 * sign-up.
 *
 *   node scripts/supabase-confirm-email.mjs off     # sign-up works immediately
 *   node scripts/supabase-confirm-email.mjs on      # restore confirmation mail
 *   node scripts/supabase-confirm-email.mjs status  # just read it
 *
 * WHY THIS EXISTS. Sign-up on this project fails with "Error sending
 * confirmation email" and Supabase rolls the whole account back, so nothing
 * ever reaches the database. The fix is a dashboard toggle, and the dashboard
 * proved hard to navigate to. This does the same thing through Supabase's
 * Management API, and then reads the setting back so the result is proven
 * rather than assumed.
 *
 * IT NEEDS ONE THING THE SITE DOES NOT HAVE: a Personal Access Token. The
 * site's publishable key can READ auth settings but cannot change them — that
 * is by design, and it is why the code could never fix this on its own. Make
 * one here (20 seconds, any name):
 *
 *     https://supabase.com/dashboard/account/tokens
 *
 * then run:
 *
 *     set SUPABASE_ACCESS_TOKEN=sbp_...      (Windows cmd)
 *     $env:SUPABASE_ACCESS_TOKEN="sbp_..."   (PowerShell)
 *     export SUPABASE_ACCESS_TOKEN=sbp_...   (bash)
 *     node scripts/supabase-confirm-email.mjs off
 *
 * The token is read from the environment and never written to disk, never
 * printed, and never sent anywhere but api.supabase.com.
 *
 * WHAT TURNING IT OFF MEANS. Anyone can then register with any address without
 * proving they own it. For a site where an account views stock and sends
 * enquiries, that is an acceptable trade for a sign-up that actually works —
 * but it is a trade, and `on` restores it once real SMTP is configured
 * (see SUPABASE-EMAIL-SETUP.md).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const mode = (process.argv[2] || 'status').toLowerCase();
if (!['off', 'on', 'status'].includes(mode)) {
  console.error(`Usage: node scripts/supabase-confirm-email.mjs off|on|status`);
  process.exit(2);
}

/* The project ref comes from the same .env.local the site uses, so there is
   no second place for it to be wrong. */
const here = dirname(fileURLToPath(import.meta.url));
let ref = '';
try {
  const env = readFileSync(join(here, '..', '.env.local'), 'utf8');
  const url = env.match(/^VITE_SUPABASE_URL\s*=\s*"?([^"\r\n]+)"?/m)?.[1] ?? '';
  ref = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? '';
} catch { /* reported below */ }
if (!ref) {
  console.error('Could not read the project ref from .env.local (VITE_SUPABASE_URL).');
  process.exit(2);
}

const token = (process.env.SUPABASE_ACCESS_TOKEN || '').trim();
if (!token) {
  console.error(`
No SUPABASE_ACCESS_TOKEN in the environment.

  1. Create one:  https://supabase.com/dashboard/account/tokens
  2. Then, in this terminal:
       PowerShell:  $env:SUPABASE_ACCESS_TOKEN="sbp_..."
       cmd:         set SUPABASE_ACCESS_TOKEN=sbp_...
       bash:        export SUPABASE_ACCESS_TOKEN=sbp_...
  3. Run this command again.

The token is never saved or printed by this script.`);
  process.exit(1);
}
if (!token.startsWith('sbp_')) {
  console.error('That does not look like a Personal Access Token (they start with sbp_). The site\'s publishable key cannot change settings.');
  process.exit(1);
}

const API = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

async function read() {
  const r = await fetch(API, { headers });
  if (!r.ok) throw new Error(`GET ${r.status}: ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

function report(cfg) {
  const confirmOn = cfg.mailer_autoconfirm === false;
  console.log(`project ${ref}`);
  console.log(`  Confirm email : ${confirmOn ? 'ON  (sign-up needs a working mail service)' : 'OFF (sign-up works immediately, no mail)'}`);
  console.log(`  Sign-ups      : ${cfg.disable_signup ? 'DISABLED' : 'enabled'}`);
  if (cfg.smtp_host !== undefined) console.log(`  Custom SMTP   : ${cfg.smtp_host ? `on (${cfg.smtp_host})` : 'off (Supabase built-in mailer)'}`);
}

try {
  const before = await read();
  if (mode === 'status') { report(before); process.exit(0); }

  const want = mode === 'off'; // off => autoconfirm true
  if ((before.mailer_autoconfirm === true) === want) {
    console.log(`Already ${mode === 'off' ? 'OFF' : 'ON'} — nothing to change.`);
    report(before);
    process.exit(0);
  }

  const r = await fetch(API, { method: 'PATCH', headers, body: JSON.stringify({ mailer_autoconfirm: want }) });
  if (!r.ok) throw new Error(`PATCH ${r.status}: ${(await r.text()).slice(0, 300)}`);

  /* Read it back. A 200 on the PATCH says the request was accepted; the
     GET says what the project actually believes now, which is the thing
     that matters. */
  const after = await read();
  const done = (after.mailer_autoconfirm === true) === want;
  console.log(done ? `\nDone. Confirm email is now ${mode === 'off' ? 'OFF' : 'ON'}.` : '\nThe change did not take — the project still reports the old value.');
  report(after);
  if (done && mode === 'off') console.log('\nReload the site and register — the account will be created and signed in immediately, with no email involved.');
  process.exit(done ? 0 : 1);
} catch (err) {
  console.error(`\nFailed: ${err.message}`);
  if (/401|403/.test(err.message)) console.error('The token was rejected. Make sure it belongs to an account that owns or administers this project.');
  process.exit(1);
}
