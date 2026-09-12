/**
 * The words of the page an emailed link lands on, in the three languages (see
 * src/i18n/useCopy.js). "Go to your account", "Browse the inventory" and
 * "Create an account" come from the site dictionaries.
 *
 * `reasons` are this page's own explanations, keyed by the outcome the page
 * records (`check` is the fallback when checking the link threw). Text that
 * arrives from the account service itself — an error description in the link
 * — is shown as it came and is not here.
 *
 * Note that /auth/callback carries no language prefix — Supabase builds the
 * link from one fixed address — so in practice this page is reached in
 * English. The translations are here for a visitor who opens it under /hi or
 * /gu.
 */
export default {
  en: {
    reasons: {
      unconfigured: 'This deployment is not connected to its account service.',
      expired: 'That link has expired or has already been used.',
      unusable: 'That link could not be used.',
      check: 'Unable to check this link. Please try again.',
    },
    working: {
      title: 'One moment',
      intro: 'Checking your link.',
      status: 'Confirming…',
    },
    recovery: {
      title: 'Set a new password',
      intro: 'Your link has been accepted.',
      choose: 'Choose a new password',
    },
    confirmed: {
      title: 'Email confirmed',
      intro: 'Your account is active and you are signed in.',
    },
    failed: {
      expiredTitle: 'This link has expired',
      title: 'That link did not work',
      help: 'Need help?',
      contact: 'Contact the desk',
      expiredNote: 'Confirmation links are single-use and time-limited. Sign in to have a new one sent.',
      note: 'Please try signing in; if the problem continues, contact the desk.',
      signIn: 'Go to sign in',
    },
    stop: '.',
  },

  hi: {
    reasons: {
      unconfigured: 'यह साइट अपनी खाता सेवा से नहीं जुड़ी है।',
      expired: 'इस लिंक की समय-सीमा खत्म हो चुकी है या इसका पहले ही उपयोग हो चुका है।',
      unusable: 'यह लिंक इस्तेमाल नहीं किया जा सका।',
      check: 'इस लिंक की जाँच नहीं हो सकी। कृपया फिर से कोशिश करें।',
    },
    working: {
      title: 'बस एक पल',
      intro: 'आपका लिंक जाँचा जा रहा है।',
      status: 'पुष्टि हो रही है…',
    },
    recovery: {
      title: 'नया पासवर्ड सेट करें',
      intro: 'आपका लिंक स्वीकार कर लिया गया है।',
      choose: 'नया पासवर्ड चुनें',
    },
    confirmed: {
      title: 'ईमेल की पुष्टि हो गई',
      intro: 'आपका खाता सक्रिय है और आप साइन इन हैं।',
    },
    failed: {
      expiredTitle: 'इस लिंक की समय-सीमा खत्म हो गई है',
      title: 'यह लिंक काम नहीं कर पाया',
      help: 'मदद चाहिए?',
      contact: 'डेस्क से संपर्क करें',
      expiredNote: 'पुष्टि लिंक केवल एक बार और सीमित समय के लिए काम करते हैं। नया लिंक मँगवाने के लिए साइन इन करें।',
      note: 'कृपया साइन इन करके देखें; अगर समस्या बनी रहे, तो डेस्क से संपर्क करें।',
      signIn: 'साइन इन पर जाएँ',
    },
    stop: '।',
  },

  gu: {
    reasons: {
      unconfigured: 'આ સાઇટ તેની ખાતા સેવા સાથે જોડાયેલી નથી.',
      expired: 'આ લિંકની મુદત પૂરી થઈ ગઈ છે અથવા તેનો પહેલેથી ઉપયોગ થઈ ગયો છે.',
      unusable: 'આ લિંક વાપરી શકાઈ નથી.',
      check: 'આ લિંક તપાસી શકાઈ નથી. કૃપા કરીને ફરી પ્રયાસ કરો.',
    },
    working: {
      title: 'એક ક્ષણ',
      intro: 'તમારી લિંક તપાસી રહ્યા છીએ.',
      status: 'પુષ્ટિ થઈ રહી છે…',
    },
    recovery: {
      title: 'નવો પાસવર્ડ સેટ કરો',
      intro: 'તમારી લિંક સ્વીકારવામાં આવી છે.',
      choose: 'નવો પાસવર્ડ પસંદ કરો',
    },
    confirmed: {
      title: 'ઈમેલની પુષ્ટિ થઈ ગઈ',
      intro: 'તમારું ખાતું સક્રિય છે અને તમે સાઇન ઇન છો.',
    },
    failed: {
      expiredTitle: 'આ લિંકની મુદત પૂરી થઈ ગઈ છે',
      title: 'આ લિંક કામ ન કરી',
      help: 'મદદ જોઈએ છે?',
      contact: 'ડેસ્કનો સંપર્ક કરો',
      expiredNote: 'પુષ્ટિ લિંક ફક્ત એક જ વાર અને મર્યાદિત સમય માટે ચાલે છે. નવી લિંક મંગાવવા સાઇન ઇન કરો.',
      note: 'કૃપા કરીને સાઇન ઇન કરી જુઓ; જો સમસ્યા ચાલુ રહે, તો ડેસ્કનો સંપર્ક કરો.',
      signIn: 'સાઇન ઇન પર જાઓ',
    },
    stop: '.',
  },
};
