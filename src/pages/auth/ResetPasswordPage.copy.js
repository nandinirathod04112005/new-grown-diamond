/**
 * The choose-a-new-password page's own words, in the three languages (see
 * src/i18n/useCopy.js). The confirm label, the length hint and "the two
 * passwords do not match" come from the site dictionaries (`auth.*`,
 * `validation.*`).
 *
 * `tooShort` is this page's own sentence ("…for your password"), not the
 * sign-up form's; `{n}` is the minimum length from validation.js.
 */
export default {
  en: {
    eyebrow: 'Account recovery',
    tokenInvalid: 'This recovery link is invalid, has expired, or has already been used. Ask the desk for another.',
    tooShort: 'Use at least {n} characters for your password.',
    updateFailed: 'This recovery link is invalid or has expired. Request a new link and try again.',
    done: {
      title: 'Password updated',
      intro: 'Your new password is active.',
      continue: 'Continue to your account',
    },
    checking: {
      title: 'One moment',
      intro: 'Checking your recovery link.',
      status: 'Checking…',
    },
    invalid: {
      title: 'This link no longer works',
      intro: 'Recovery links can be used once, and they expire.',
      contact: 'Contact the desk',
    },
    another: 'Request another',
    title: 'Choose a new password',
    intro: 'The recovery link must still be active in this browser.',
    expired: 'Link expired?',
    stop: '.',
    unavailable: 'Password updates are unavailable because this deployment is not connected to Supabase.',
    newPassword: 'New password',
    updating: 'Updating…',
    update: 'Update password',
  },

  hi: {
    eyebrow: 'खाता रिकवरी',
    tokenInvalid: 'यह रिकवरी लिंक अमान्य है, इसकी समय-सीमा खत्म हो चुकी है, या इसका पहले ही उपयोग हो चुका है। डेस्क से नया लिंक माँगें।',
    tooShort: 'अपने पासवर्ड में कम से कम {n} अक्षर इस्तेमाल करें।',
    updateFailed: 'यह रिकवरी लिंक अमान्य है या इसकी समय-सीमा खत्म हो चुकी है। नया लिंक मँगवाकर फिर कोशिश करें।',
    done: {
      title: 'पासवर्ड अपडेट हो गया',
      intro: 'आपका नया पासवर्ड सक्रिय है।',
      continue: 'अपने खाते में आगे बढ़ें',
    },
    checking: {
      title: 'बस एक पल',
      intro: 'आपका रिकवरी लिंक जाँचा जा रहा है।',
      status: 'जाँच हो रही है…',
    },
    invalid: {
      title: 'यह लिंक अब काम नहीं करता',
      intro: 'रिकवरी लिंक केवल एक बार इस्तेमाल हो सकते हैं, और उनकी समय-सीमा खत्म हो जाती है।',
      contact: 'डेस्क से संपर्क करें',
    },
    another: 'नया लिंक माँगें',
    title: 'नया पासवर्ड चुनें',
    intro: 'रिकवरी लिंक इस ब्राउज़र में अभी भी सक्रिय होना चाहिए।',
    expired: 'लिंक की समय-सीमा खत्म हो गई?',
    stop: '।',
    unavailable: 'पासवर्ड अपडेट उपलब्ध नहीं है, क्योंकि यह साइट Supabase से नहीं जुड़ी है।',
    newPassword: 'नया पासवर्ड',
    updating: 'अपडेट हो रहा है…',
    update: 'पासवर्ड अपडेट करें',
  },

  gu: {
    eyebrow: 'ખાતાની રિકવરી',
    tokenInvalid: 'આ રિકવરી લિંક અમાન્ય છે, તેની મુદત પૂરી થઈ ગઈ છે, અથવા તેનો પહેલેથી ઉપયોગ થઈ ગયો છે. ડેસ્ક પાસે નવી લિંક માંગો.',
    tooShort: 'તમારા પાસવર્ડમાં ઓછામાં ઓછા {n} અક્ષર વાપરો.',
    updateFailed: 'આ રિકવરી લિંક અમાન્ય છે અથવા તેની મુદત પૂરી થઈ ગઈ છે. નવી લિંક મંગાવીને ફરી પ્રયાસ કરો.',
    done: {
      title: 'પાસવર્ડ અપડેટ થઈ ગયો',
      intro: 'તમારો નવો પાસવર્ડ સક્રિય છે.',
      continue: 'તમારા ખાતામાં આગળ વધો',
    },
    checking: {
      title: 'એક ક્ષણ',
      intro: 'તમારી રિકવરી લિંક તપાસી રહ્યા છીએ.',
      status: 'તપાસી રહ્યા છીએ…',
    },
    invalid: {
      title: 'આ લિંક હવે કામ કરતી નથી',
      intro: 'રિકવરી લિંક ફક્ત એક જ વાર વાપરી શકાય છે, અને તેની મુદત પૂરી થઈ જાય છે.',
      contact: 'ડેસ્કનો સંપર્ક કરો',
    },
    another: 'નવી લિંક માંગો',
    title: 'નવો પાસવર્ડ પસંદ કરો',
    intro: 'રિકવરી લિંક આ બ્રાઉઝરમાં હજી સક્રિય હોવી જોઈએ.',
    expired: 'લિંકની મુદત પૂરી થઈ ગઈ?',
    stop: '.',
    unavailable: 'પાસવર્ડ અપડેટ ઉપલબ્ધ નથી, કારણ કે આ સાઇટ Supabase સાથે જોડાયેલી નથી.',
    newPassword: 'નવો પાસવર્ડ',
    updating: 'અપડેટ થઈ રહ્યું છે…',
    update: 'પાસવર્ડ અપડેટ કરો',
  },
};
