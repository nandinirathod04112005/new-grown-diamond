/**
 * The CVD process section's own words, in the three languages (see
 * src/i18n/useCopy.js). The section is now one scroll-driven film (CvdFilm);
 * the twelve step plates and their texts (cvdSteps.js) are no longer shown.
 *
 * Process words (seed, plasma, growth, rough) are written the way a Surat CVD
 * technician says them, in the local script, following src/i18n/glossary.md.
 * CVD and New Grown Diamond are never translated, and neither are the step
 * numbers.
 *
 * `phases` are the four captions over the film, in scroll order; the timeline
 * picks one by the film's position, so every language keeps all four.
 * `plateText` is the visually hidden heading on each plate: {n}, {title},
 * {body} and {points} are filled in per step, with `pointJoin` between the
 * points — which is where the Hindi full stop (।) comes in.
 */
export default {
  en: {
    eyebrow: 'CVD production / The journey',
    title: 'From seed to certificate',
    lede: 'A laboratory-grown diamond is not assembled; it is grown, one atomic layer at a time, and then cut like any other rough. Scroll to follow the journey, from a polished seed to a finished stone.',
    intro: {
      eyebrow: 'The art of growing brilliance',
      /* Two lines, with a break between them. */
      title: ['An extraordinary journey.', 'One carbon atom at a time.'],
      scrollCue: 'Scroll to discover',
    },
    phases: [
      '01 / A perfect seed',
      '02 / Plasma activation',
      '03 / Layer by layer',
      '04 / The beginning of brilliance',
    ],
    plateText: 'Step {n}. {title}. {body} {points}.',
    pointJoin: '. ',
    note: 'Process imagery is illustrative of chemical vapour deposition and is not a record of a specific growth run.',
  },

  hi: {
    eyebrow: 'CVD उत्पादन / सफ़र',
    title: 'सीड से सर्टिफिकेट तक',
    lede: 'लैब-ग्रोन हीरा जोड़कर नहीं बनाया जाता; वह परमाणु की एक-एक परत करके ग्रो होता है, और फिर किसी भी दूसरे रफ की तरह कट किया जाता है। स्क्रॉल करके यह सफ़र देखिए — पॉलिश किए गए सीड से तैयार हीरे तक।',
    intro: {
      eyebrow: 'चमक उगाने की कला',
      title: ['एक असाधारण सफ़र।', 'एक-एक कार्बन परमाणु करके।'],
      scrollCue: 'जानने के लिए स्क्रॉल करें',
    },
    phases: [
      '01 / एकदम सही सीड',
      '02 / प्लाज़्मा एक्टिवेशन',
      '03 / परत-दर-परत',
      '04 / चमक की शुरुआत',
    ],
    plateText: 'चरण {n}। {title}। {body} {points}।',
    pointJoin: '। ',
    note: 'प्रक्रिया की तस्वीरें केमिकल वेपर डिपॉज़िशन को उदाहरण के रूप में दिखाती हैं; ये किसी खास ग्रोथ रन का रिकॉर्ड नहीं हैं।',
  },

  gu: {
    eyebrow: 'CVD ઉત્પાદન / સફર',
    title: 'સીડથી સર્ટિફિકેટ સુધી',
    lede: 'લેબ-ગ્રોન હીરો જોડીને બનાવાતો નથી; તે પરમાણુનું એક-એક સ્તર કરીને ગ્રો થાય છે, અને પછી બીજા કોઈ પણ રફની જેમ કટ થાય છે. સ્ક્રોલ કરીને આ સફર જુઓ — પોલિશ કરેલા સીડથી તૈયાર હીરા સુધી.',
    intro: {
      eyebrow: 'ચમક ઉગાડવાની કળા',
      title: ['એક અસાધારણ સફર.', 'એક-એક કાર્બન પરમાણુ કરીને.'],
      scrollCue: 'જાણવા માટે સ્ક્રોલ કરો',
    },
    phases: [
      '01 / એકદમ યોગ્ય સીડ',
      '02 / પ્લાઝ્મા એક્ટિવેશન',
      '03 / સ્તર દર સ્તર',
      '04 / ચમકની શરૂઆત',
    ],
    plateText: 'તબક્કો {n}. {title}. {body} {points}.',
    pointJoin: '. ',
    note: 'પ્રક્રિયાની તસવીરો કેમિકલ વેપર ડિપોઝિશનને ઉદાહરણ રૂપે દર્શાવે છે; તે કોઈ ચોક્કસ ગ્રોથ રનનો રેકોર્ડ નથી.',
  },
};
