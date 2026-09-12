/**
 * The sign-in page's own words, in the three languages (see
 * src/i18n/useCopy.js). Labels, the title and the links that are the same on
 * every account page come from the site dictionaries (`auth.*`); this file
 * holds only what this page says and nothing else does.
 *
 * `unconfirmed.before` and `.after` sit either side of the address the
 * visitor typed, which is shown exactly as typed. `stop` is the full stop
 * after a link that ends a sentence — "।" in Hindi.
 */
export default {
  en: {
    signedIn: {
      title: 'You are signed in',
      intro: 'Your account is active.',
      notYou: 'Not you?',
      createDifferent: 'Create a different account',
    },
    stop: '.',
    unavailable: {
      title: 'Sign-in is unavailable.',
      body: 'The site is not connected to its database on this deployment.',
    },
    unconfirmed: {
      title: 'Your email address has not been confirmed yet.',
      before: 'Open the confirmation link sent to',
      after: 'to finish setting up the account.',
    },
    sending: 'Sending…',
    resend: 'Resend confirmation email',
    resent: 'Confirmation email sent. Check your inbox and spam folder.',
    resendFailed: 'The confirmation email could not be sent.',
    incorrect: 'Email or password is incorrect.',
    failed: 'Sign-in could not be completed. Please try again.',
    live: 'Signing in',
  },

  hi: {
    signedIn: {
      title: 'आप साइन इन हो चुके हैं',
      intro: 'आपका खाता सक्रिय है।',
      notYou: 'यह आप नहीं हैं?',
      createDifferent: 'दूसरा खाता बनाएँ',
    },
    stop: '।',
    unavailable: {
      title: 'साइन इन उपलब्ध नहीं है।',
      body: 'यह साइट अभी अपने डेटाबेस से नहीं जुड़ी है।',
    },
    unconfirmed: {
      title: 'आपके ईमेल पते की अभी पुष्टि नहीं हुई है।',
      before: 'खाता सेट करना पूरा करने के लिए',
      after: 'पर भेजा गया पुष्टि लिंक खोलें।',
    },
    sending: 'भेजा जा रहा है…',
    resend: 'पुष्टि ईमेल दोबारा भेजें',
    resent: 'पुष्टि ईमेल भेज दिया गया है। अपना इनबॉक्स और स्पैम फ़ोल्डर देखें।',
    resendFailed: 'पुष्टि ईमेल नहीं भेजा जा सका।',
    incorrect: 'ईमेल या पासवर्ड गलत है।',
    failed: 'साइन इन पूरा नहीं हो सका। कृपया फिर से कोशिश करें।',
    live: 'साइन इन हो रहा है',
  },

  gu: {
    signedIn: {
      title: 'તમે સાઇન ઇન થઈ ગયા છો',
      intro: 'તમારું ખાતું સક્રિય છે.',
      notYou: 'આ તમે નથી?',
      createDifferent: 'બીજું ખાતું બનાવો',
    },
    stop: '.',
    unavailable: {
      title: 'સાઇન ઇન ઉપલબ્ધ નથી.',
      body: 'આ સાઇટ હાલમાં તેના ડેટાબેઝ સાથે જોડાયેલી નથી.',
    },
    unconfirmed: {
      title: 'તમારા ઈમેલ સરનામાની હજી પુષ્ટિ થઈ નથી.',
      before: 'ખાતું સેટ કરવાનું પૂરું કરવા માટે',
      after: 'પર મોકલેલી પુષ્ટિ લિંક ખોલો.',
    },
    sending: 'મોકલાઈ રહ્યું છે…',
    resend: 'પુષ્ટિ ઈમેલ ફરી મોકલો',
    resent: 'પુષ્ટિ ઈમેલ મોકલાઈ ગયું છે. તમારું ઇનબોક્સ અને સ્પામ ફોલ્ડર જુઓ.',
    resendFailed: 'પુષ્ટિ ઈમેલ મોકલી શકાયું નથી.',
    incorrect: 'ઈમેલ અથવા પાસવર્ડ ખોટો છે.',
    failed: 'સાઇન ઇન પૂર્ણ થઈ શક્યું નથી. કૃપા કરીને ફરી પ્રયાસ કરો.',
    live: 'સાઇન ઇન થઈ રહ્યું છે',
  },
};
