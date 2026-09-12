/**
 * The line drawings' words, in the three languages (see src/i18n/useCopy.js).
 *
 * Table, depth and proportions are said the way the trade says them, in the
 * local script (glossary: trade words transliterated). Every number printed on
 * a drawing, and its "mm" / "%", comes from the stone's record unchanged.
 */
export default {
  en: {
    top: {
      aria: 'Face-up drawing of a {shape} cut',
      ariaLength: ', length {value}',
      ariaWidth: ', width {value}',
      length: 'Length',
      lengthValue: 'Length: {value}',
      width: 'Width',
      widthValue: 'Width: {value}',
      measured: 'Measured length and width from the grading record.',
      unmeasured: 'Measurements are not recorded for this stone.',
    },
    side: {
      aria: 'Side profile',
      ariaTable: ', table {value}',
      ariaDepth: ', depth {value}',
      table: 'Table',
      tableValue: 'Table: {value}',
      depth: 'Depth',
      drawn: 'Profile drawn to this stone’s recorded table and depth.',
      outside: 'The recorded proportions are outside the usual range, so the profile is drawn to standard proportions.',
      unrecorded: 'Proportions are not recorded for this stone; drawn to standard proportions.',
    },
  },

  hi: {
    top: {
      aria: '{shape} कट का फ़ेस-अप चित्र',
      ariaLength: ', लंबाई {value}',
      ariaWidth: ', चौड़ाई {value}',
      length: 'लंबाई',
      lengthValue: 'लंबाई: {value}',
      width: 'चौड़ाई',
      widthValue: 'चौड़ाई: {value}',
      measured: 'ग्रेडिंग रिकॉर्ड से ली गई मापी हुई लंबाई और चौड़ाई।',
      unmeasured: 'इस हीरे का माप दर्ज नहीं है।',
    },
    side: {
      aria: 'साइड प्रोफ़ाइल',
      ariaTable: ', टेबल {value}',
      ariaDepth: ', डेप्थ {value}',
      table: 'टेबल',
      tableValue: 'टेबल: {value}',
      depth: 'डेप्थ',
      drawn: 'प्रोफ़ाइल इस हीरे के दर्ज टेबल और डेप्थ के अनुसार बनाई गई है।',
      outside: 'दर्ज प्रपोर्शन सामान्य सीमा से बाहर हैं, इसलिए प्रोफ़ाइल स्टैंडर्ड प्रपोर्शन के अनुसार बनाई गई है।',
      unrecorded: 'इस हीरे के प्रपोर्शन दर्ज नहीं हैं; स्टैंडर्ड प्रपोर्शन के अनुसार बनाया गया है।',
    },
  },

  gu: {
    top: {
      aria: '{shape} કટનું ફેસ-અપ ચિત્ર',
      ariaLength: ', લંબાઈ {value}',
      ariaWidth: ', પહોળાઈ {value}',
      length: 'લંબાઈ',
      lengthValue: 'લંબાઈ: {value}',
      width: 'પહોળાઈ',
      widthValue: 'પહોળાઈ: {value}',
      measured: 'ગ્રેડિંગ રેકોર્ડમાંથી લીધેલી માપેલી લંબાઈ અને પહોળાઈ.',
      unmeasured: 'આ હીરાનું માપ નોંધાયેલું નથી.',
    },
    side: {
      aria: 'સાઇડ પ્રોફાઇલ',
      ariaTable: ', ટેબલ {value}',
      ariaDepth: ', ડેપ્થ {value}',
      table: 'ટેબલ',
      tableValue: 'ટેબલ: {value}',
      depth: 'ડેપ્થ',
      drawn: 'પ્રોફાઇલ આ હીરાના નોંધાયેલા ટેબલ અને ડેપ્થ મુજબ દોરવામાં આવી છે.',
      outside: 'નોંધાયેલાં પ્રપોર્શન સામાન્ય રેન્જની બહાર છે, તેથી પ્રોફાઇલ સ્ટાન્ડર્ડ પ્રપોર્શન મુજબ દોરવામાં આવી છે.',
      unrecorded: 'આ હીરાનાં પ્રપોર્શન નોંધાયેલાં નથી; સ્ટાન્ડર્ડ પ્રપોર્શન મુજબ દોરવામાં આવ્યું છે.',
    },
  },
};
