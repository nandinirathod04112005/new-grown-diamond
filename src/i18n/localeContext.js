import { createContext, useContext } from 'react';

import { DEFAULT_LOCALE, LOCALES } from './locales.js';
import en from './dictionary/en.js';

/**
 * The context and the hooks that read it.
 *
 * Split out of LocaleProvider.jsx so that file exports a component and nothing
 * else. A module that exports a component alongside hooks breaks Fast Refresh,
 * which turns every edit during development into a full reload and loses
 * whatever was on screen — the same reason AdminFeedback was split.
 */
export const LocaleContext = createContext(null);

/**
 * Walks a dotted key. Returns undefined rather than throwing on a miss, so a
 * key that has not been translated yet degrades to the English one.
 */
export function lookup(dict, key) {
  return key.split('.').reduce((node, part) => (node == null ? undefined : node[part]), dict);
}

/** {name}-style placeholders. Values land as TEXT wherever React renders them. */
export function interpolate(str, vars) {
  if (!vars) return str;
  return String(str).replace(/{(\w+)}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

/**
 * Read the language.
 *
 * Falls back to a working English translator when used outside the provider,
 * so a component rendered in isolation — a test, an error boundary, a page
 * that has not been wrapped yet — renders English rather than crashing.
 */
export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (ctx) return ctx;
  return {
    locale: DEFAULT_LOCALE,
    meta: LOCALES[DEFAULT_LOCALE],
    t: (key, vars) => {
      const str = lookup(en, key);
      return str == null ? key : interpolate(str, vars);
    },
    has: (key) => lookup(en, key) != null,
    href: (p) => p,
    switchTo: () => '/',
  };
}

/** The common case: just the translator. */
export function useT() {
  return useLocale().t;
}
