/**
 * The reveal control's words, in the three languages (see
 * src/i18n/useCopy.js).
 *
 * `things` names what the field holds, keyed by the `revealLabel` a caller
 * passes ('password', or 'code' for the staff access code), so the button
 * says "Show code" rather than "Show password" over a secret that is not one.
 * `visible` is spoken, not shown: it is the live region's announcement.
 */
export default {
  en: {
    show: 'Show {thing}',
    hide: 'Hide {thing}',
    things: { password: 'password', code: 'code' },
    visible: '{label} is visible',
  },

  hi: {
    show: '{thing} दिखाएँ',
    hide: '{thing} छिपाएँ',
    things: { password: 'पासवर्ड', code: 'कोड' },
    visible: '{label}: दिख रहा है',
  },

  gu: {
    show: '{thing} બતાવો',
    hide: '{thing} છુપાવો',
    things: { password: 'પાસવર્ડ', code: 'કોડ' },
    visible: '{label}: દેખાય છે',
  },
};
