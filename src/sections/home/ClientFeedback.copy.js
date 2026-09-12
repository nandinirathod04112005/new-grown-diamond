/**
 * The homepage feedback strip's own words, in the three languages (see
 * src/i18n/useCopy.js). The cards inside it belong to FeedbackWall and carry
 * their own; the clients' feedback itself is shown as they wrote it.
 *
 * `reviews`: `{count}` is the number of published reviews; `one` is used for
 * exactly one, `other` for any other number.
 */
export default {
  en: {
    eyebrow: 'CLIENT FEEDBACK',
    title: 'In their',
    accent: 'words.',
    reviews: { one: '{count} published review', other: '{count} published reviews' },
    rail: 'Client feedback',
    readAll: 'Read all feedback',
    share: 'Share yours',
  },

  hi: {
    eyebrow: 'ग्राहक प्रतिक्रिया',
    title: 'उनके',
    accent: 'शब्दों में।',
    reviews: { one: '{count} प्रकाशित समीक्षा', other: '{count} प्रकाशित समीक्षाएँ' },
    rail: 'ग्राहक प्रतिक्रिया',
    readAll: 'सारी प्रतिक्रियाएँ पढ़ें',
    share: 'अपनी प्रतिक्रिया दें',
  },

  gu: {
    eyebrow: 'ગ્રાહક પ્રતિસાદ',
    title: 'એમના',
    accent: 'શબ્દોમાં.',
    reviews: { one: '{count} પ્રકાશિત સમીક્ષા', other: '{count} પ્રકાશિત સમીક્ષાઓ' },
    rail: 'ગ્રાહક પ્રતિસાદ',
    readAll: 'બધા પ્રતિસાદ વાંચો',
    share: 'તમારો પ્રતિસાદ આપો',
  },
};
