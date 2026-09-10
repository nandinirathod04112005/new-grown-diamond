/**
 * Where the operator scripts look for a privileged credential.
 *
 * The environment first, because a value passed for one command is the one
 * that leaves the least behind. Then `.env.local`, because asking someone to
 * construct an environment variable on Windows, in whichever shell they happen
 * to be in, is a real barrier — and the file is already where this project's
 * credentials live.
 *
 * PUTTING A SECRET IN .env.local IS SAFE HERE, AND ONLY BECAUSE OF TWO THINGS,
 * both checked rather than assumed:
 *
 *   1. `.gitignore` covers `.env.*`, so the file is never committed.
 *   2. vite.config.js sets envPrefix to ['VITE_', 'NEXT_PUBLIC_']. Vite copies
 *      ONLY those prefixes into the browser bundle. A name without one is
 *      invisible to the front end and cannot be served to a visitor.
 *
 * So the rule is unchanged and worth restating: never name a privileged key
 * with a VITE_ or NEXT_PUBLIC_ prefix. `SUPABASE_SERVICE_ROLE_KEY` is fine;
 * `VITE_SUPABASE_SERVICE_ROLE_KEY` would publish it to the world.
 */
import { readFileSync } from 'node:fs';

export function envFile(root = new URL('../.env.local', import.meta.url)) {
  try {
    return Object.fromEntries(
      readFileSync(root, 'utf8')
        .split(/\r?\n/)
        .filter((line) => line.trim() && !line.trim().startsWith('#') && line.includes('='))
        .map((line) => {
          const at = line.indexOf('=');
          return [line.slice(0, at).trim(), line.slice(at + 1).trim()];
        }),
    );
  } catch {
    return {};
  }
}

/**
 * @returns {{ value: string, source: 'environment' | '.env.local' | null }}
 */
export function readSecret(name) {
  const fromEnv = (process.env[name] || '').trim();
  if (fromEnv) return { value: fromEnv, source: 'environment' };

  const fromFile = (envFile()[name] || '').trim();
  if (fromFile) return { value: fromFile, source: '.env.local' };

  return { value: '', source: null };
}

/** The project reference, which is the first label of the project's hostname. */
export function projectRef() {
  const url = envFile().VITE_SUPABASE_URL || envFile().NEXT_PUBLIC_SUPABASE_URL || '';
  try {
    return new URL(url).hostname.split('.')[0];
  } catch {
    return '';
  }
}
