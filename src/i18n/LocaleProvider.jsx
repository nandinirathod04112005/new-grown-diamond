import { useEffect, useMemo } from 'react';

import { DEFAULT_LOCALE, LOCALES, localePath } from './locales.js';
import en from './dictionary/en.js';
import { LocaleContext, interpolate, lookup } from './localeContext.js';
import hi from './dictionary/hi.js';
import gu from './dictionary/gu.js';

const DICTIONARIES = { en, hi, gu };


/* Where the visitor's choice is remembered. Only used to decide where a link
   from outside should land, never to override a URL they actually opened. */
export const LOCALE_KEY = 'ngd-locale';


/**
 * The language everything reads from.
 *
 * The locale comes from the URL, not from storage. A page at /gu/diamonds is
 * Gujarati for everyone who opens it — including a search engine, and
 * including someone opening a link a Gujarati speaker sent them. Storage only
 * records the last choice so the switcher can offer it; it never overrides
 * what the address says.
 */
export function LocaleProvider({ locale = DEFAULT_LOCALE, path = '/', children }) {
  const value = useMemo(() => {
    const meta = LOCALES[locale] ?? LOCALES[DEFAULT_LOCALE];
    const dict = DICTIONARIES[meta.code] ?? en;

    /**
     * Translate.
     *
     * Falls back to English on a miss rather than rendering the key. A raw
     * `nav.diamonds` on a live page is worse than the English word: the
     * English is still a real sentence someone can act on, and a good part of
     * this audience reads it. In development the miss is logged, so a gap is
     * found before it ships rather than by a customer.
     */
    const t = (key, vars) => {
      let str = lookup(dict, key);
      if (str == null) {
        str = lookup(en, key);
        if (import.meta.env.DEV && meta.code !== 'en') {
          console.warn(`[i18n] missing ${meta.code}: ${key}`);
        }
      }
      if (str == null) {
        if (import.meta.env.DEV) console.error(`[i18n] key not in any dictionary: ${key}`);
        return key;
      }
      /* One implementation of placeholder filling, shared with the
         outside-the-provider fallback in localeContext.js. */
      return interpolate(str, vars);
    };

    return {
      locale: meta.code,
      meta,
      t,
      /* Whether a key genuinely exists in this language — used to decide
         whether to show the "this page is in English" notice. */
      has: (key) => lookup(dict, key) != null,
      /* Build a URL in the current language. Every internal link goes through
         this, so a Gujarati visitor clicking through the site stays in
         Gujarati rather than falling back to English on the second click. */
      href: (p) => localePath(p, meta.code),
      /* The same route in a different language, for the switcher. */
      switchTo: (code) => localePath(path, code),
    };
  }, [locale, path]);

  /*
   * The document's own language.
   *
   * This is not decoration. It tells a screen reader which voice to use — an
   * English synthesiser reading Gujarati produces sound, not speech — and it
   * tells the browser which hyphenation and font fallbacks apply. `dir` is set
   * alongside; all three of these languages are left-to-right, so it is always
   * ltr today, but it is read from the locale rather than hardcoded so a
   * right-to-left language later needs no change here.
   */
  useEffect(() => {
    const root = document.documentElement;
    root.lang = value.meta.htmlLang;
    root.dir = value.meta.dir;
    /* Drives the script-specific font stack in CSS. */
    root.dataset.script = value.meta.script;
  }, [value.meta]);

  /* Remember the choice for a later visit that arrives with no prefix. */
  useEffect(() => {
    try { localStorage.setItem(LOCALE_KEY, value.locale); } catch { /* private mode */ }
  }, [value.locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

