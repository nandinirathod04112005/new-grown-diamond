import { useMemo } from 'react';

import { useLocale } from './localeContext.js';

/**
 * A page's own words, in the visitor's language.
 *
 * Page copy lives beside the page that shows it, in a `<Name>.copy.js` file
 * exporting `{ en, hi, gu }`, rather than in the site-wide dictionaries. Those
 * load on every page for every visitor; a page's paragraphs in three languages
 * are only wanted on that page, and in its own chunk they cost nothing
 * anywhere else.
 *
 * English is the source. A translation only has to carry the strings: any key
 * it leaves out, and any value that is not text (a number, a link, an icon
 * name), is taken from English, so an untranslated sentence reads in English
 * rather than disappearing. A translated list must have the same length as the
 * English one to be used, item by item; a list of any other length falls back
 * to English whole, because a list that has been re-ordered or cut down in one
 * language would pair the wrong words with the English list's other values.
 */
export function useCopy(copy) {
  const { locale } = useLocale();
  return useMemo(() => pickCopy(copy, locale), [copy, locale]);
}

/** The same, outside React (a module-level table, a test). */
export function pickCopy(copy, locale) {
  if (!copy?.en) return copy;
  if (locale === 'en' || !copy[locale]) return copy.en;
  return fill(copy.en, copy[locale]);
}

function fill(base, over) {
  if (over == null) return base;
  if (Array.isArray(base)) {
    return Array.isArray(over) && over.length === base.length ? base.map((item, i) => fill(item, over[i])) : base;
  }
  if (base && typeof base === 'object') {
    const out = {};
    for (const key of Object.keys(base)) out[key] = fill(base[key], over[key]);
    return out;
  }
  return typeof over === typeof base ? over : base;
}
