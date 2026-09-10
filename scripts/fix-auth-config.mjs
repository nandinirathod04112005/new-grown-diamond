/**
 * Read and repair the project's auth configuration from the command line.
 *
 * WHAT THIS IS FOR. Two settings break emailed links, and neither of them
 * lives in the database, so neither can be reached with the keys the site
 * uses: the **Site URL** every link falls back to, and the **allow-list** of
 * addresses a link is permitted to return to. They live in the project's auth
 * configuration, which only Supabase's Management API can change.
 *
 *   node scripts/fix-auth-config.mjs                      show what is set now
 *   node scripts/fix-auth-config.mjs --site https://…     preview a change
 *   node scripts/fix-auth-config.mjs --site https://… --apply       write it
 *
 * Nothing is written without --apply. Without it the script prints exactly
 * what it would change, old value beside new.
 *
 * THE TOKEN. This needs a Supabase **personal access token**, which is not any
 * of the project's API keys. Create one at
 * https://supabase.com/dashboard/account/tokens and pass it for one command:
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/fix-auth-config.mjs
 *
 * It is taken from the environment, or failing that from .env.local — which
 * is git-ignored, and which Vite never copies into the browser bundle because
 * the name carries no VITE_ or NEXT_PUBLIC_ prefix. It is never written and
 * never printed. Revoke it on that page when it is no longer needed.
 *
 * FLAGS
 *   --site <url>          set the Site URL
 *   --add <url>           add one address to the redirect allow-list (repeatable)
 *   --remove <url>        remove one address from the allow-list (repeatable)
 *   --smtp-host <host>    e.g. smtp.gmail.com
 *   --smtp-port <port>    e.g. 587
 *   --smtp-user <user>    the SMTP username
 *   --smtp-sender <email> the address mail is sent as
 *   --smtp-name <name>    the sender's display name
 *   --smtp-pass-env <VAR> name of an environment variable holding the SMTP
 *                         password, so the password itself is never typed on
 *                         a command line that shells record in history
 *   --apply               actually write the change
 */
import process from 'node:process';

import { projectRef, readSecret } from './_secret.mjs';

const { value: TOKEN, source: TOKEN_SOURCE } = readSecret('SUPABASE_ACCESS_TOKEN');
const args = process.argv.slice(2);
const APPLY = args.includes('--apply');

function flag(name) {
  const at = args.indexOf(name);
  return at !== -1 && args[at + 1] && !args[at + 1].startsWith('--') ? args[at + 1] : null;
}
function flagAll(name) {
  const out = [];
  args.forEach((a, i) => {
    if (a === name && args[i + 1] && !args[i + 1].startsWith('--')) out.push(args[i + 1].replace(/\/+$/, ''));
  });
  return out;
}
function die(message) {
  console.error(`\n${message}\n`);
  process.exit(1);
}

/* The project reference is the first label of the project URL. */
const ref = projectRef();
if (!ref) die('VITE_SUPABASE_URL could not be read from .env.local, so the project reference is unknown.');

if (!TOKEN) {
  die(
    'SUPABASE_ACCESS_TOKEN is not set.\n\n'
    + 'This needs a personal access token, which is NOT the publishable key and NOT the\n'
    + 'service role key. Create one here:\n\n'
    + '  https://supabase.com/dashboard/account/tokens\n\n'
    + 'Then run, for this one command only:\n\n'
    + `  SUPABASE_ACCESS_TOKEN=sbp_... node scripts/fix-auth-config.mjs\n\n`
    + 'Revoke it on that page when you are done.',
  );
}
if (TOKEN.startsWith('sb_publishable') || TOKEN.startsWith('sb_secret') || TOKEN.startsWith('eyJ')) {
  die('That is a project API key, not a personal access token. Tokens begin with "sbp_" and come from https://supabase.com/dashboard/account/tokens');
}

const API = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const auth = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

console.log(`Project ${ref}   (access token read from ${TOKEN_SOURCE})\n`);

const current = await (async () => {
  const res = await fetch(API, { headers: auth });
  if (res.status === 401 || res.status === 403) {
    die(`The token was refused (HTTP ${res.status}). Check it is a personal access token and that this account can administer project ${ref}.`);
  }
  if (!res.ok) die(`The configuration could not be read: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  return res.json();
})();

const allowList = String(current.uri_allow_list || '').split(',').map((s) => s.trim()).filter(Boolean);

console.log('Now set:');
console.log(`  Site URL            ${current.site_url || '(empty)'}`);
console.log(`  Redirect allow-list ${allowList.length ? allowList.join('\n                      ') : '(empty)'}`);
console.log(`  Custom SMTP         ${current.smtp_host ? `${current.smtp_host}:${current.smtp_port} as ${current.smtp_admin_email || current.smtp_user || '?'}` : 'NOT CONFIGURED — the built-in service is in use, which reaches only your own Supabase team'}`);
console.log(`  Confirm email       ${current.mailer_autoconfirm ? 'OFF (accounts work immediately)' : 'ON (a new account must click a link)'}`);

/* ------------------------------------------------------------ the change */

const patch = {};
const site = flag('--site');
if (site) patch.site_url = site.replace(/\/+$/, '');

const add = flagAll('--add');
const remove = flagAll('--remove');
if (add.length || remove.length) {
  const next = allowList.filter((u) => !remove.includes(u));
  for (const u of add) if (!next.includes(u)) next.push(u);
  patch.uri_allow_list = next.join(',');
}

const smtp = {
  smtp_host: flag('--smtp-host'),
  smtp_port: flag('--smtp-port'),
  smtp_user: flag('--smtp-user'),
  smtp_admin_email: flag('--smtp-sender'),
  smtp_sender_name: flag('--smtp-name'),
};
for (const [k, v] of Object.entries(smtp)) if (v) patch[k] = v;

const passEnv = flag('--smtp-pass-env');
if (passEnv) {
  const value = process.env[passEnv];
  if (!value) die(`--smtp-pass-env names ${passEnv}, but that environment variable is empty.`);
  patch.smtp_pass = value;
}

if (!Object.keys(patch).length) {
  console.log('\nNothing to change. Pass --site, --add, --remove or the --smtp-* flags to make a change.');
  console.log('Suggested, based on what breaks links today:');
  console.log('  node scripts/fix-auth-config.mjs \\');
  console.log('    --site https://newgrowndiamond.com \\');
  console.log('    --add https://newgrowndiamond.com/auth/callback \\');
  console.log('    --add https://www.newgrowndiamond.com/auth/callback \\');
  console.log('    --add http://localhost:5173/auth/callback \\');
  console.log('    --apply');
  process.exit(0);
}

console.log('\nWould change:');
for (const [key, value] of Object.entries(patch)) {
  const shown = key === 'smtp_pass' ? '(hidden)' : value;
  const before = key === 'smtp_pass' ? '(hidden)' : (current[key] ?? '(empty)');
  console.log(`  ${key}\n      from  ${before}\n      to    ${shown}`);
}

if (!APPLY) {
  console.log('\nNothing was written. Add --apply to make these changes.');
  process.exit(0);
}

const res = await fetch(API, { method: 'PATCH', headers: auth, body: JSON.stringify(patch) });
const body = await res.text();
if (!res.ok) die(`The change was refused: HTTP ${res.status} ${body.slice(0, 400)}`);

console.log('\nApplied. Confirm it end to end with:\n');
console.log('  npm run check:backend -- --origin https://newgrowndiamond.com');
if (patch.smtp_pass) console.log('  npm run check:backend -- --recovery you@example.com');
