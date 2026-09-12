/**
 * The reactor drawing's four labels, in the three languages (see
 * src/i18n/useCopy.js).
 *
 * The drawing is aria-hidden, but the labels are visible, so they follow the
 * section's language. They are process words, written the way a Surat CVD
 * technician says them. The English is set in capitals in the source;
 * Devanagari and Gujarati have no capitals, so the translations are simply the
 * words.
 */
export default {
  en: {
    seed: 'DIAMOND SEED',
    plasma: 'PLASMA FIELD',
    inlet: 'GAS INLET',
    vacuum: 'VACUUM',
  },

  hi: {
    seed: 'डायमंड सीड',
    plasma: 'प्लाज़्मा फ़ील्ड',
    inlet: 'गैस इनलेट',
    vacuum: 'वैक्यूम',
  },

  gu: {
    seed: 'ડાયમંડ સીડ',
    plasma: 'પ્લાઝ્મા ફીલ્ડ',
    inlet: 'ગેસ ઇનલેટ',
    vacuum: 'વેક્યૂમ',
  },
};
