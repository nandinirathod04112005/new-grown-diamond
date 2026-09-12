/**
 * The legal layout's own chrome, in the three languages (see
 * src/i18n/useCopy.js) — and nothing else.
 *
 * THE LEGAL TEXT IS NOT HERE AND IS NOT TRANSLATED. The Privacy Policy and the
 * Terms stay in English in every language, because no Hindi or Gujarati
 * version has been reviewed by a lawyer. What a Hindi or Gujarati visitor
 * sees is this frame in their language, the text in English, and the
 * dictionary's `notice.englishOnly` line saying so near the top. The section
 * headings in the contents list belong to the text and stay English with it.
 *
 * `anchor` is the accessible name of the "#" link beside each heading;
 * `{heading}` is the heading itself, as written.
 */
export default {
  en: {
    eyebrow: 'Legal',
    updated: 'Last updated:',
    toc: 'On this page',
    anchor: 'Link to {heading}',
    thisSection: 'this section',
  },

  hi: {
    eyebrow: 'कानूनी',
    updated: 'अंतिम अपडेट:',
    toc: 'इस पेज पर',
    anchor: '{heading} का लिंक',
    thisSection: 'इस सेक्शन',
  },

  gu: {
    eyebrow: 'કાનૂની',
    updated: 'છેલ્લું અપડેટ:',
    toc: 'આ પેજ પર',
    anchor: '{heading} ની લિંક',
    thisSection: 'આ વિભાગ',
  },
};
