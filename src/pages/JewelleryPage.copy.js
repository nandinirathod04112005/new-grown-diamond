/**
 * The jewellery page's words, in the three languages (see src/i18n/useCopy.js).
 *
 * Trade terms follow src/i18n/glossary.md: jewellery, setting, shape, carat
 * and certificate are written as the trade says them, in the local script.
 * "Mount" and "loose" are trade words too (माउंट / માઉન્ટ, लूज़ / લૂઝ).
 *
 * A step's `no` is its number and its key, and is the same in every language.
 */
export default {
  en: {
    hero: {
      eyebrow: 'Custom jewellery / Made around the stone',
      title: 'The diamond leads. The setting follows.',
      intro: 'Every mount is built around its stone, never the reverse — the setting is drawn to the diamond that has already been chosen.',
      action: 'Begin a custom enquiry',
    },
    process: 'The custom process',
    steps: [
      { no: '01', title: 'Select', text: 'Choose a shape, carat range and quality target.' },
      { no: '02', title: 'Inspect', text: 'Review available stones, videos and certificates.' },
      { no: '03', title: 'Design', text: 'Develop the setting around the selected diamond.' },
      { no: '04', title: 'Make', text: 'Approve the direction and move into production.' },
    ],
    close: {
      alt: 'A real New Grown Diamond round brilliant photographed loose against black',
      eyebrow: 'Loose stone first',
      title: 'Start with what can be verified.',
      text: 'Our team can help identify a diamond, provide inspection material and discuss a custom setting for it.',
      explore: 'Explore diamond programmes',
    },
  },

  hi: {
    hero: {
      eyebrow: 'कस्टम ज्वेलरी / हीरे के हिसाब से तैयार',
      title: 'पहले हीरा। फिर सेटिंग।',
      intro: 'हर माउंट अपने हीरे के इर्द-गिर्द बनाया जाता है, कभी उल्टा नहीं — सेटिंग उसी हीरे के अनुसार डिज़ाइन की जाती है, जो पहले ही चुना जा चुका है।',
      action: 'कस्टम पूछताछ शुरू करें',
    },
    process: 'कस्टम प्रक्रिया',
    steps: [
      { title: 'चुनें', text: 'शेप, कैरेट रेंज और गुणवत्ता का लक्ष्य चुनें।' },
      { title: 'जाँचें', text: 'उपलब्ध हीरे, वीडियो और सर्टिफिकेट देखें।' },
      { title: 'डिज़ाइन करें', text: 'चुने गए हीरे के अनुसार सेटिंग तैयार करें।' },
      { title: 'बनाएँ', text: 'दिशा को मंज़ूरी दें और प्रोडक्शन शुरू करें।' },
    ],
    close: {
      alt: 'काली पृष्ठभूमि पर लूज़ रखे New Grown Diamond के असली राउंड ब्रिलियंट हीरे की तस्वीर',
      eyebrow: 'पहले लूज़ हीरा',
      title: 'शुरुआत उससे करें, जिसकी जाँच की जा सके।',
      text: 'हमारी टीम हीरा चुनने में मदद कर सकती है, जाँच की सामग्री दे सकती है और उसके लिए कस्टम सेटिंग पर बात कर सकती है।',
      explore: 'हीरों के प्रोग्राम देखें',
    },
  },

  gu: {
    hero: {
      eyebrow: 'કસ્ટમ જ્વેલરી / હીરા મુજબ તૈયાર',
      title: 'પહેલાં હીરો. પછી સેટિંગ.',
      intro: 'દરેક માઉન્ટ તેના હીરાની આસપાસ બનાવવામાં આવે છે, ક્યારેય ઊલટું નહીં — સેટિંગ એ જ હીરા મુજબ ડિઝાઇન કરવામાં આવે છે, જે પહેલેથી પસંદ થઈ ગયો છે.',
      action: 'કસ્ટમ પૂછપરછ શરૂ કરો',
    },
    process: 'કસ્ટમ પ્રક્રિયા',
    steps: [
      { title: 'પસંદ કરો', text: 'શેપ, કેરેટ રેન્જ અને ગુણવત્તાનું લક્ષ્ય પસંદ કરો.' },
      { title: 'તપાસો', text: 'ઉપલબ્ધ હીરા, વીડિયો અને સર્ટિફિકેટ જુઓ.' },
      { title: 'ડિઝાઇન કરો', text: 'પસંદ કરેલા હીરા મુજબ સેટિંગ તૈયાર કરો.' },
      { title: 'બનાવો', text: 'દિશાને મંજૂરી આપો અને પ્રોડક્શન શરૂ કરો.' },
    ],
    close: {
      alt: 'કાળી પૃષ્ઠભૂમિ પર લૂઝ મૂકેલા New Grown Diamond ના અસલી રાઉન્ડ બ્રિલિયન્ટ હીરાનો ફોટો',
      eyebrow: 'પહેલાં લૂઝ હીરો',
      title: 'શરૂઆત એનાથી કરો, જેની ચકાસણી થઈ શકે.',
      text: 'અમારી ટીમ હીરો પસંદ કરવામાં મદદ કરી શકે છે, તપાસ માટેની સામગ્રી આપી શકે છે અને તેના માટે કસ્ટમ સેટિંગ વિશે ચર્ચા કરી શકે છે.',
      explore: 'હીરાના પ્રોગ્રામ જુઓ',
    },
  },
};
