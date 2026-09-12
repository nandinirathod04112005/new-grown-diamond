/**
 * The words on the account pages' photograph panel, in the three languages
 * (see src/i18n/useCopy.js). What the panel promises, and why each line is
 * true, is explained in AuthShell.jsx; a translation says the same three
 * things and no more.
 *
 * Trade words follow src/i18n/glossary.md. The four cities in the panel's
 * foot are names and are never translated, so they are not here.
 */
export default {
  en: {
    panel: {
      eyebrow: 'Trade desk',
      title: 'The stones you asked about, in one place.',
      points: [
        'Enquiries with a reference you can quote to the desk',
        'Quotes, holds and inspections you have requested',
        'Grading reports and inspection media, on request',
      ],
    },
    about: 'About your account',
  },

  hi: {
    panel: {
      eyebrow: 'ट्रेड डेस्क',
      title: 'जिन हीरों के बारे में आपने पूछा, वे सब एक जगह।',
      points: [
        'पूछताछ, ऐसे रेफ़रेंस नंबर के साथ जो आप डेस्क को बता सकते हैं',
        'आपके माँगे गए कोटेशन, होल्ड और जाँच',
        'ग्रेडिंग रिपोर्ट और जाँच से जुड़ा मीडिया, अनुरोध पर',
      ],
    },
    about: 'आपके खाते के बारे में',
  },

  gu: {
    panel: {
      eyebrow: 'ટ્રેડ ડેસ્ક',
      title: 'તમે જે હીરા વિશે પૂછ્યું, તે બધા એક જ જગ્યાએ.',
      points: [
        'પૂછપરછ, એવા રેફરન્સ નંબર સાથે જે તમે ડેસ્કને જણાવી શકો',
        'તમે માંગેલા ક્વોટેશન, હોલ્ડ અને તપાસ',
        'ગ્રેડિંગ રિપોર્ટ અને તપાસ સંબંધિત મીડિયા, વિનંતી પર',
      ],
    },
    about: 'તમારા ખાતા વિશે',
  },
};
