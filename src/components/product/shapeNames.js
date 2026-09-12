import { shapeCode } from './stoneFilter.js';

/**
 * A shape's name as it is SHOWN in Hindi and Gujarati.
 *
 * Shape names are trade names (src/i18n/glossary.md, row 17): the Surat trade
 * says "round", "oval", "princess" whatever language the rest of the sentence
 * is in, so they are written in the local script rather than translated.
 *
 * The shape VALUE is data — it is what the filters match, what the admin form
 * stores and what the WhatsApp message carries — and nothing here changes it.
 * This only decides the label. English shows the value exactly as stored, and
 * a shape these tables do not know is shown as stored in every language.
 *
 * Pure: the caller passes the locale (from useLocale), so it works anywhere.
 */
const NAMES = {
  hi: {
    Round: 'राउंड',
    Pear: 'पेयर',
    Princess: 'प्रिंसेस',
    Cushion: 'कुशन',
    Radiant: 'रेडियंट',
    Emerald: 'एमरल्ड',
    Asscher: 'एशर',
    Oval: 'ओवल',
    Marquise: 'मार्कीज़',
    Heart: 'हार्ट',
  },
  gu: {
    Round: 'રાઉન્ડ',
    Pear: 'પેર',
    Princess: 'પ્રિન્સેસ',
    Cushion: 'કુશન',
    Radiant: 'રેડિયન્ટ',
    Emerald: 'એમરલ્ડ',
    Asscher: 'એશર',
    Oval: 'ઓવલ',
    Marquise: 'માર્કીઝ',
    Heart: 'હાર્ટ',
  },
};

export function shapeName(value, locale) {
  const names = NAMES[locale];
  const code = shapeCode(value);
  return names && Object.hasOwn(names, code) ? names[code] : value;
}
