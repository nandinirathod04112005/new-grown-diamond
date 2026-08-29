/**
 * Environment resolution for the Supabase connection.
 *
 * Vite only exposes variables prefixed `VITE_` to client code, and it inlines
 * them into the shipped bundle at build time. Everything read here is therefore
 * public by definition -- which is correct for the project URL and the
 * publishable key, because Row Level Security is what actually protects the
 * data. A service-role or `sb_secret_` key must never be read from here.
 *
 * Nothing in this module throws. A misconfigured environment produces a
 * described problem that the app can render, rather than a blank page and an
 * opaque `supabaseUrl is required` deep inside the Supabase SDK.
 */

const URL_VAR = 'VITE_SUPABASE_URL';
const KEY_VAR = 'VITE_SUPABASE_PUBLISHABLE_KEY';

/** Prefixes that mean the key is server-only and must never reach a browser. */
const SECRET_KEY_PREFIXES = ['sb_secret_', 'service_role'];

function read(name) {
  const value = import.meta.env[name];
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * A variable was supplied under a framework prefix Vite ignores. This is the
 * single most common setup mistake when moving from Next.js, and it fails
 * silently, so name it explicitly.
 */
function wrongPrefixHint(viteName) {
  const suffix = viteName.replace(/^VITE_/, '');
  const candidates = [`NEXT_PUBLIC_${suffix}`, `REACT_APP_${suffix}`, suffix];
  const found = candidates.find((name) => read(name));
  return found
    ? `Found "${found}" instead. Vite only exposes variables prefixed VITE_, so rename it to "${viteName}".`
    : '';
}

function describeUrl(value) {
  if (!value) {
    const hint = wrongPrefixHint(URL_VAR);
    return `${URL_VAR} is missing.${hint ? ` ${hint}` : ''}`;
  }
  if (!value.startsWith('https://')) {
    return `${URL_VAR} must start with https:// (received "${value}").`;
  }
  if (value.includes('your-project-ref')) {
    return `${URL_VAR} still holds the placeholder from .env.example.`;
  }
  return '';
}

function describeKey(value) {
  if (!value) {
    const hint = wrongPrefixHint(KEY_VAR);
    return `${KEY_VAR} is missing.${hint ? ` ${hint}` : ''}`;
  }
  if (value.includes('your_publishable_key')) {
    return `${KEY_VAR} still holds the placeholder from .env.example.`;
  }
  if (SECRET_KEY_PREFIXES.some((prefix) => value.startsWith(prefix))) {
    return (
      `${KEY_VAR} looks like a SERVER-ONLY key. Vite publishes every VITE_ ` +
      'variable to every visitor. Use the publishable key (sb_publishable_...) instead.'
    );
  }
  if (value.length < 20) {
    return `${KEY_VAR} is too short to be a valid key.`;
  }
  return '';
}

/**
 * Resolve and validate the Supabase environment.
 *
 * @returns {{ok: boolean, url: string, publishableKey: string, problems: string[]}}
 */
export function resolveSupabaseEnv() {
  const url = read(URL_VAR);
  const publishableKey = read(KEY_VAR);
  const problems = [describeUrl(url), describeKey(publishableKey)].filter(Boolean);

  return { ok: problems.length === 0, url, publishableKey, problems };
}

/** Copy-pasteable instructions shown alongside whatever went wrong. */
export const SETUP_INSTRUCTIONS = [
  'Copy .env.example to .env.local:  cp .env.example .env.local',
  `Fill in ${URL_VAR} and ${KEY_VAR} from the Supabase dashboard`,
  'Restart the dev server -- Vite reads env files only at startup',
];

export const ENV_VAR_NAMES = { URL_VAR, KEY_VAR };
