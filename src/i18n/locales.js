/**
 * The three languages, and how they are addressed.
 *
 * URL STRATEGY: path prefix. English lives at `/diamonds`, Hindi at
 * `/hi/diamonds`, Gujarati at `/gu/diamonds`. English carries no prefix
 * because it is the default and because moving every existing URL would
 * discard the search history the site already has.
 *
 * Prefixes rather than a query string or a cookie because these pages are
 * meant to be FOUND. A language that lives behind a preference cookie is
 * invisible to a search engine: one URL can only be indexed as one language,
 * so the Gujarati copy would bring no Gujarati traffic and could not be shared
 * as a link that opens in Gujarati. Prefixes give each language its own
 * address, its own canonical, and a place for hreflang to point.
 */

export const LOCALES = {
  en: {
    code: 'en',
    /* The prefix segment. English is intentionally empty. */
    prefix: '',
    /* What goes in <html lang>. */
    htmlLang: 'en',
    /* hreflang. `en` rather than `en-IN`: the English site is written for
       trade buyers worldwide, not for English speakers in India specifically. */
    hreflang: 'en',
    label: 'English',
    /* The name in its OWN language, which is what belongs in a language
       switcher — someone looking for Gujarati is looking for "ગુજરાતી", not
       for the word "Gujarati" written in English. */
    endonym: 'English',
    script: 'latin',
    dir: 'ltr',
  },
  hi: {
    code: 'hi',
    prefix: 'hi',
    htmlLang: 'hi',
    hreflang: 'hi-IN',
    label: 'Hindi',
    endonym: 'हिन्दी',
    script: 'devanagari',
    dir: 'ltr',
  },
  gu: {
    code: 'gu',
    prefix: 'gu',
    htmlLang: 'gu',
    hreflang: 'gu-IN',
    label: 'Gujarati',
    endonym: 'ગુજરાતી',
    script: 'gujarati',
    dir: 'ltr',
  },
};

export const DEFAULT_LOCALE = 'en';
export const LOCALE_CODES = Object.keys(LOCALES);
/* Prefixes that actually appear in a path — English's empty one excluded. */
export const PREFIXES = LOCALE_CODES.map((c) => LOCALES[c].prefix).filter(Boolean);

/**
 * Split a path into its locale and the route underneath.
 *
 * `/gu/diamonds` -> { locale: 'gu', path: '/diamonds' }
 * `/diamonds`    -> { locale: 'en', path: '/diamonds' }
 * `/gu`          -> { locale: 'gu', path: '/' }
 *
 * Everything downstream — the router, the SEO lookup, the page components —
 * then works in terms of the UNPREFIXED path, so adding a fourth language
 * later touches this file and nothing else.
 */
export function splitLocale(pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/';
  const [, first, ...rest] = clean.split('/');
  if (PREFIXES.includes(first)) {
    return { locale: first, path: `/${rest.join('/')}`.replace(/\/+$/, '') || '/' };
  }
  return { locale: DEFAULT_LOCALE, path: clean };
}

/** The inverse: an unprefixed route plus a locale becomes a real URL. */
export function localePath(path, locale) {
  const prefix = LOCALES[locale]?.prefix;
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (!prefix) return clean;
  return clean === '/' ? `/${prefix}` : `/${prefix}${clean}`;
}

/**
 * The visitor's likely language, used ONLY to offer a switch — never to
 * redirect.
 *
 * Automatic redirection on Accept-Language is a well-known way to trap
 * someone: a Gujarati speaker who deliberately opened the English page gets
 * thrown back to Gujarati, every time, with no way to say otherwise. The
 * choice stays theirs; this only decides which option to suggest first.
 */
export function preferredLocale(stored, navigatorLanguages = []) {
  if (stored && LOCALE_CODES.includes(stored)) return stored;
  for (const tag of navigatorLanguages) {
    const base = String(tag).toLowerCase().split('-')[0];
    if (LOCALE_CODES.includes(base)) return base;
  }
  return DEFAULT_LOCALE;
}
