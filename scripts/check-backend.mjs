/**
 * Backend health check.
 *
 * Answers one question in plain language: which parts of the Supabase backend
 * work right now, and for a given account, which parts refuse it and why.
 *
 * Run it when something in the admin console "does not work". The console
 * shows the database's own message, but only after a save is attempted; this
 * reports the same ground truth up front, including the two values that decide
 * whether the desk opens at all — profiles.role and profiles.account_status.
 *
 *   node scripts/check-backend.mjs                  anonymous checks only
 *   node scripts/check-backend.mjs --sign-in        also signs in and reports the account
 *   node scripts/check-backend.mjs --sign-in --write   adds a no-op write probe
 *
 * Credentials come from NGD_EMAIL / NGD_PASSWORD, or are asked for on the
 * terminal with the password hidden. They are never written to disk, never
 * printed, and the session is signed out again at the end.
 *
 * SAFETY. Everything here is a read except the optional --write probe, which
 * writes a column back its own current value so the row's content cannot
 * change. Nothing is created and nothing is deleted.
 */
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import process from 'node:process';

const ROOT = new URL('..', import.meta.url);
const args = new Set(process.argv.slice(2));
const WANT_SIGN_IN = args.has('--sign-in');
const WANT_WRITE = args.has('--write');

const PASS = 'PASS';
const FAIL = 'FAIL';
const WARN = 'WARN';
const results = [];

function say(state, label, detail) {
  results.push({ state, label, detail });
  const tag = state === PASS ? '  ok  ' : state === WARN ? ' warn ' : ' FAIL ';
  console.log(`[${tag}] ${label}${detail ? '\n           ' + String(detail).replace(/\n/g, '\n           ') : ''}`);
}

function heading(text) {
  console.log('\n' + text);
  console.log('-'.repeat(text.length));
}

/* ---------------------------------------------------------------- config */

heading('Configuration');

let env = {};
try {
  env = Object.fromEntries(
    readFileSync(new URL('.env.local', ROOT), 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.trim() && !line.trim().startsWith('#') && line.includes('='))
      .map((line) => {
        const at = line.indexOf('=');
        return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
      }),
  );
} catch {
  say(FAIL, '.env.local could not be read', 'Create it next to package.json with VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.');
}

const URL_ = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

if (!URL_ || !KEY) {
  say(FAIL, 'Supabase is not configured', 'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY must both be set. Without them the site runs on its built-in copy and every backend action is inert.');
  process.exit(1);
}
say(PASS, 'Project URL', URL_);
say(
  KEY.startsWith('sb_secret') || KEY.includes('service_role') ? FAIL : PASS,
  'Publishable key',
  KEY.startsWith('sb_secret') || KEY.includes('service_role')
    ? 'This looks like a SERVICE ROLE key. It must never be in a frontend env file. Replace it with the publishable key and rotate the leaked one.'
    : KEY.slice(0, 12) + '… (' + KEY.length + ' chars)',
);

const headers = { apikey: KEY, Authorization: 'Bearer ' + KEY };

async function get(path, extra = {}) {
  try {
    const res = await fetch(URL_ + path, { headers: { ...headers, ...extra }, signal: AbortSignal.timeout(20000) });
    const text = await res.text();
    let body = text;
    try { body = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, body, text };
  } catch (error) {
    return { status: 0, body: null, text: String(error) };
  }
}

/* ------------------------------------------------------------ anonymous */

heading('Reachability (no account needed)');

const health = await get('/auth/v1/health');
say(health.status === 200 ? PASS : FAIL, 'Auth service', health.status === 200 ? `GoTrue ${health.body?.version || ''}`.trim() : `HTTP ${health.status}. The project may be paused — open the Supabase dashboard and resume it.`);

const settings = await get('/auth/v1/settings');
if (settings.status === 200) {
  const s = settings.body || {};
  say(PASS, 'Sign-up settings', `email confirmation ${s.mailer_autoconfirm === true ? 'OFF (accounts are usable immediately)' : 'ON (a new account must click an email link before it can sign in)'}; signups ${s.disable_signup ? 'DISABLED' : 'enabled'}`);
} else {
  say(WARN, 'Sign-up settings', `HTTP ${settings.status}`);
}

heading('Tables the site reads');

/*
 * An anonymous read that comes back empty means one of two different things,
 * and saying "empty" for both would be a lie half the time: a table the public
 * is meant to see is genuinely empty, while a table row-level security hides
 * returns the same empty list to a visitor with no right to it. Each table
 * therefore declares which it is, and only the public ones can be "empty".
 */
const TABLES = [
  { name: 'diamonds', publicRead: true, note: 'the stock the inventory page lists' },
  { name: 'blogs', publicRead: true, note: 'the journal' },
  { name: 'jewellery', publicRead: false, note: 'admin console only; the jewellery page is written copy, not stock' },
  { name: 'enquiries', publicRead: false, note: 'write-only for visitors, readable by staff' },
  { name: 'profiles', publicRead: false, note: 'each account sees only its own row' },
  { name: 'site_content', publicRead: false, note: 'admin content store' },
  { name: 'media', publicRead: false, note: 'admin media index' },
];

for (const { name, publicRead, note } of TABLES) {
  const res = await get(`/rest/v1/${name}?select=id&limit=1`);
  if (res.status === 404) {
    say(FAIL, name, `does not exist. ${res.body?.hint || res.body?.message || ''}`);
  } else if (res.status === 401 || res.status === 403) {
    say(publicRead ? FAIL : PASS, name, `refused to an anonymous reader (${res.body?.message || res.status}). ${publicRead ? 'This table is meant to be public, so the storefront page will be empty.' : 'Expected: ' + note + '.'}`);
  } else if (res.status === 0) {
    say(FAIL, name, 'network failure: ' + res.text.slice(0, 120));
  } else {
    const rows = Array.isArray(res.body) ? res.body.length : 0;
    if (publicRead) {
      say(rows ? PASS : WARN, name, rows ? 'readable, has rows' : 'readable, but no rows are visible to a visitor — the page it feeds will look empty');
    } else {
      say(PASS, name, `exists; no rows visible anonymously, which is expected (${note})`);
    }
  }
}

heading('What a visitor actually sees');

/*
 * The counts that decide whether a page looks alive, using the same filters
 * the storefront queries use: queries/diamonds.js lists active, un-archived
 * stock; queries/blogs.js lists published posts.
 */
async function countOf(label, path, remedy) {
  const res = await get(path, { Prefer: 'count=exact', Range: '0-0' });
  const range = res.status === 0 ? null : null;
  if (res.status >= 400) {
    say(FAIL, label, `HTTP ${res.status} ${res.body?.message || ''}`);
    return;
  }
  const rows = Array.isArray(res.body) ? res.body.length : 0;
  say(rows ? PASS : WARN, label, rows ? 'at least one is visible' : 'nothing is visible. ' + remedy + (range || ''));
}

await countOf(
  'Stones on /diamonds',
  '/rest/v1/diamonds?select=id&active=eq.true&archived_at=is.null&limit=1',
  'A stone shows only when active is true and archived_at is empty. Stones saved with "active" off stay hidden.',
);
await countOf(
  'Posts on /blogs',
  '/rest/v1/blogs?select=slug&published=eq.true&limit=1',
  'A post shows only when published is true. Drafts stay hidden.',
);

heading('Database functions and Edge Functions');

// GET never executes a volatile function: 405 means it exists, 404 means the
// signature is not there.
const rpc = await get('/rest/v1/rpc/customer_update_own_profile?new_full_name=x&new_company_name=y&new_phone=z&new_country=w');
say(
  rpc.status === 404 ? FAIL : PASS,
  'customer_update_own_profile',
  rpc.status === 404
    ? 'missing. Customers cannot save their profile until this function exists.'
    : rpc.status === 401
      ? 'present and correctly refuses an anonymous caller ("' + (rpc.body?.message || '') + '")'
      : 'present (HTTP ' + rpc.status + ')',
);

const fn = await get('/functions/v1/register-admin');
if (fn.status === 404) {
  say(FAIL, 'register-admin function', 'not deployed. Administrator sign-up will fail. Deploy it with: supabase functions deploy register-admin');
} else if (fn.status === 405) {
  // Deployed. A POST with an empty body reaches no database code, so it is a
  // safe way to learn whether its secrets are set.
  try {
    const probe = await fetch(URL_ + '/functions/v1/register-admin', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: '{}',
      signal: AbortSignal.timeout(20000),
    });
    const code = (await probe.json().catch(() => ({})))?.code;
    if (probe.status === 503) {
      say(FAIL, 'register-admin secrets', 'ADMIN_SIGNUP_CODE or the service role key is not set on the function. Administrator sign-up returns "temporarily unavailable" until it is. Set it with: supabase secrets set ADMIN_SIGNUP_CODE');
    } else {
      say(PASS, 'register-admin function', `deployed and configured (rejected an empty request with ${code || probe.status}, as it should)`);
    }
  } catch (error) {
    say(WARN, 'register-admin function', 'deployed, but the secret probe failed: ' + String(error).slice(0, 120));
  }
} else {
  say(WARN, 'register-admin function', 'unexpected HTTP ' + fn.status);
}

/* ---------------------------------------------------------- email links */

heading('Email links: where they would land');

/*
 * "No link arrives" and "the link goes nowhere" are different faults that look
 * identical to the person waiting for the email, and only one of them is
 * visible from here — so this section is careful to say which is which.
 *
 * GoTrue decides a link's destination before it checks the token. Verifying a
 * deliberately invalid token therefore reveals that decision without creating
 * anything, sending anything, or consuming a real link: with no redirect it
 * answers with the project's Site URL, and with one it answers with that URL
 * if it is on the allow-list and falls back to Site URL if it is not.
 */
async function landsAt(target) {
  const url = `${URL_}/auth/v1/verify?token=invalid-probe-token&type=recovery${target ? `&redirect_to=${encodeURIComponent(target)}` : ''}`;
  try {
    const res = await fetch(url, { redirect: 'manual', headers: { apikey: KEY }, signal: AbortSignal.timeout(20000) });
    const location = res.headers.get('location');
    return location ? location.split('#')[0] : null;
  } catch {
    return null;
  }
}

const siteUrl = await landsAt(null);
if (!siteUrl) {
  say(WARN, 'Site URL', 'could not be read from the project.');
} else if (/^https?:\/\/localhost(:\d+)?/.test(siteUrl) || siteUrl.startsWith('http://127.0.0.1')) {
  say(FAIL, 'Site URL', `${siteUrl}\nThis is the Supabase default. Every emailed link that has nowhere else to go points at this address, which is a machine the customer is not sitting at: the mail arrives, the link is clicked, and nothing happens. Set it in Dashboard > Authentication > URL Configuration > Site URL.`);
} else {
  say(PASS, 'Site URL', siteUrl);
}

/*
 * The app sends its own return address (authRedirect.js), always
 * <origin>/auth/callback. Any origin the site is opened on therefore needs
 * that one path allow-listed. Pass --origin https://example.com to test the
 * address you are actually deploying to.
 */
const extraOrigins = [];
for (let i = 0; i < process.argv.length; i += 1) {
  if (process.argv[i] === '--origin' && process.argv[i + 1]) extraOrigins.push(process.argv[i + 1].replace(/\/+$/, ''));
}
const origins = ['http://localhost:5173', 'http://localhost:4173', ...extraOrigins];

for (const origin of origins) {
  const target = `${origin}/auth/callback`;
  const landing = await landsAt(target);
  const allowed = landing && landing.startsWith(origin);
  say(
    allowed ? PASS : FAIL,
    `redirect allowed: ${target}`,
    allowed
      ? 'on the allow-list'
      : `NOT on the allow-list. A link opened from ${origin} would be sent to ${landing || 'Site URL'} instead. Add it in Dashboard > Authentication > URL Configuration > Redirect URLs.`,
  );
}

say(
  WARN,
  'Whether the email is delivered at all',
  'cannot be checked from here without sending a real message. If links never arrive, the usual cause is the built-in email service, which sends only a few messages an hour and only to addresses on the Supabase project. Connect your own SMTP: see SUPABASE-EMAIL-SETUP.md. To test delivery for one address, add --recovery you@example.com .',
);

const recoveryFlag = process.argv.indexOf('--recovery');
if (recoveryFlag !== -1 && process.argv[recoveryFlag + 1]) {
  const address = process.argv[recoveryFlag + 1];
  heading(`Sending one real recovery email to ${address}`);
  try {
    const res = await fetch(`${URL_}/auth/v1/recover`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: address, gotrue_meta_security: {} }),
    });
    const body = await res.text();
    if (res.ok) {
      say(PASS, 'Recovery request accepted', 'The API accepted it (HTTP 200). Supabase answers 200 whether or not an account exists, so this proves the request was not refused — not that mail was delivered. Check the inbox, and the spam folder.');
    } else {
      const parsed = (() => { try { return JSON.parse(body); } catch { return {}; } })();
      say(FAIL, 'Recovery request refused', `HTTP ${res.status} ${parsed.error_code || parsed.code || ''}: ${parsed.msg || parsed.message || body.slice(0, 200)}${
        /rate/i.test(body) ? '\nThat is the mail service cap, not anything the site did. Connecting your own SMTP raises it: see SUPABASE-EMAIL-SETUP.md.' : ''
      }`);
    }
  } catch (error) {
    say(FAIL, 'Recovery request failed', String(error).slice(0, 200));
  }
}

/* -------------------------------------------------------------- account */

async function ask(question, hidden) {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (!hidden) {
    const answer = await new Promise((resolve) => rl.question(question, resolve));
    rl.close();
    return answer.trim();
  }
  // Hidden input: mute the echo while the password is typed.
  const answer = await new Promise((resolve) => {
    process.stdout.write(question);
    rl._writeToOutput = () => {};
    rl.question('', (value) => {
      process.stdout.write('\n');
      resolve(value);
    });
  });
  rl.close();
  return answer;
}

if (WANT_SIGN_IN) {
  heading('Your account');

  const email = process.env.NGD_EMAIL || (await ask('Email: ', false));
  const password = process.env.NGD_PASSWORD || (await ask('Password (hidden): ', true));

  const signIn = await fetch(URL_ + '/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const session = await signIn.json().catch(() => ({}));

  if (!signIn.ok || !session.access_token) {
    say(FAIL, 'Sign in', `${session.error_code || session.error || signIn.status}: ${session.msg || session.error_description || 'refused'}${
      session.error_code === 'email_not_confirmed'
        ? '\nThis account exists but has never confirmed its email. Either open the confirmation link, or turn email confirmation off in Supabase > Authentication > Sign In / Providers.'
        : ''
    }`);
  } else {
    const authed = { apikey: KEY, Authorization: 'Bearer ' + session.access_token };
    const user = session.user || {};
    say(PASS, 'Sign in', `${user.email} (id ${user.id})`);
    say(user.email_confirmed_at ? PASS : WARN, 'Email confirmed', user.email_confirmed_at || 'not confirmed');

    const profileRes = await fetch(
      URL_ + `/rest/v1/profiles?select=id,role,account_status,full_name,email&id=eq.${user.id}`,
      { headers: authed },
    );
    const profile = (await profileRes.json().catch(() => []))[0];

    if (!profileRes.ok) {
      say(FAIL, 'Profile row', `HTTP ${profileRes.status}. The account cannot read its own profiles row, so the site cannot tell whether it is staff. Check the SELECT policy on public.profiles.`);
    } else if (!profile) {
      say(FAIL, 'Profile row', 'none. This account has no row in public.profiles, so it is neither customer nor admin and the admin console will refuse it. The row is normally created by the sign-up trigger (supabase/migrations/0003_profiles_on_signup.sql).');
    } else {
      say(PASS, 'Profile row', `role=${profile.role} account_status=${profile.account_status}`);
      const gateOpens = profile.role === 'admin' && profile.account_status === 'active';
      say(
        gateOpens ? PASS : FAIL,
        'Admin console access',
        gateOpens
          ? 'this account is an active administrator, so /admin will open'
          : `refused. /admin needs role='admin' AND account_status='active'; this account has role='${profile.role}' and account_status='${profile.account_status}'.`,
      );
    }

    heading('What this account can read');
    for (const table of ['diamonds', 'jewellery', 'blogs', 'enquiries', 'profiles']) {
      const res = await fetch(URL_ + `/rest/v1/${table}?select=id&limit=1`, { headers: authed });
      const body = await res.json().catch(() => null);
      say(res.ok ? PASS : FAIL, `read ${table}`, res.ok ? `${Array.isArray(body) ? body.length : 0} row(s) visible` : `${res.status} ${body?.message || ''}`);
    }

    if (WANT_WRITE) {
      heading('Write probe (writes a value back over itself, so no data changes)');
      const pick = await fetch(URL_ + '/rest/v1/diamonds?select=id,active&limit=1', { headers: authed });
      const rows = await pick.json().catch(() => []);
      const row = Array.isArray(rows) ? rows[0] : null;
      if (!row) {
        say(WARN, 'write diamonds', 'no row visible to write against.');
      } else {
        const res = await fetch(URL_ + `/rest/v1/diamonds?id=eq.${row.id}`, {
          method: 'PATCH',
          headers: { ...authed, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          body: JSON.stringify({ active: row.active }),
        });
        const body = await res.text();
        say(
          res.ok ? PASS : FAIL,
          'write diamonds',
          res.ok
            ? 'allowed. Saving a stone from the admin console will work for this account.'
            : `refused: ${res.status} ${body.slice(0, 220)}\nThis is the database refusing the write, not the site. Check the UPDATE policy on public.diamonds.`,
        );
      }
    } else {
      console.log('\n(Add --write to test whether this account may actually save a stone.)');
    }

    await fetch(URL_ + '/auth/v1/logout', { method: 'POST', headers: authed }).catch(() => {});
  }
}

/* -------------------------------------------------------------- summary */

heading('Summary');
const failed = results.filter((r) => r.state === FAIL);
const warned = results.filter((r) => r.state === WARN);
console.log(`${results.filter((r) => r.state === PASS).length} passed, ${warned.length} warnings, ${failed.length} failures`);
if (failed.length) {
  console.log('\nBroken:');
  for (const f of failed) console.log('  - ' + f.label);
}
if (!WANT_SIGN_IN) {
  console.log('\nThese were the checks that need no account. Run with --sign-in to find out what your own\nadmin account is allowed to do, which is where "the backend does not work" usually lives.');
}
process.exit(failed.length ? 1 : 0);
