/**
 * The password-recovery page's own words, in the three languages (see
 * src/i18n/useCopy.js). "Check your email" and the Email label come from the
 * site dictionaries (`auth.*`).
 *
 * `desk` is the sentence that follows an error: `lead`, then the desk's phone
 * number and WhatsApp (never translated), `or`, then the link to the enquiry
 * form, then `stop`. `or` carries its own spaces.
 */
export default {
  en: {
    returnsTo: 'This preview sends recovery links back to {host}. Open the link there — it will not work from this address.',
    eyebrow: 'Account recovery',
    errors: {
      tooMany: 'Too many recovery requests. Please wait a few minutes and try again.',
      service: 'The recovery email service is temporarily unavailable. Please contact the desk.',
      failed: 'Recovery could not be started. Please try again.',
    },
    done: {
      intro: 'If an account matches that address, you should receive a recovery email.',
      note: 'For privacy, this page does not confirm whether an account exists. Open the email link to choose a new password.',
      back: 'Back to sign in',
    },
    title: 'Reset your password',
    intro: 'Enter the address used for your account.',
    remembered: 'Remembered it?',
    returnLink: 'Return to sign in',
    stop: '.',
    unavailable: 'Recovery is unavailable because this deployment is not connected to Supabase.',
    desk: {
      lead: 'The desk can restore access directly:',
      or: ' or ',
      form: 'the enquiry form',
    },
    preparing: 'Preparing link…',
    send: 'Send recovery link',
  },

  hi: {
    returnsTo: 'यह प्रीव्यू रिकवरी लिंक {host} पर भेजता है। लिंक वहीं खोलें — इस पते से वह काम नहीं करेगा।',
    eyebrow: 'खाता रिकवरी',
    errors: {
      tooMany: 'रिकवरी के बहुत ज़्यादा अनुरोध हो चुके हैं। कृपया कुछ मिनट रुककर फिर कोशिश करें।',
      service: 'रिकवरी ईमेल सेवा अभी कुछ समय के लिए उपलब्ध नहीं है। कृपया डेस्क से संपर्क करें।',
      failed: 'रिकवरी शुरू नहीं हो सकी। कृपया फिर से कोशिश करें।',
    },
    done: {
      intro: 'अगर इस पते से कोई खाता जुड़ा है, तो आपको रिकवरी ईमेल मिलना चाहिए।',
      note: 'गोपनीयता के लिए, यह पेज नहीं बताता कि कोई खाता मौजूद है या नहीं। नया पासवर्ड चुनने के लिए ईमेल में दिया गया लिंक खोलें।',
      back: 'साइन इन पर वापस जाएँ',
    },
    title: 'अपना पासवर्ड रीसेट करें',
    intro: 'अपने खाते में इस्तेमाल किया गया ईमेल पता लिखें।',
    remembered: 'याद आ गया?',
    returnLink: 'साइन इन पर लौटें',
    stop: '।',
    unavailable: 'रिकवरी उपलब्ध नहीं है, क्योंकि यह साइट Supabase से नहीं जुड़ी है।',
    desk: {
      lead: 'डेस्क सीधे आपका एक्सेस वापस दिला सकता है:',
      or: ' या ',
      form: 'पूछताछ फ़ॉर्म',
    },
    preparing: 'लिंक तैयार हो रहा है…',
    send: 'रिकवरी लिंक भेजें',
  },

  gu: {
    returnsTo: 'આ પ્રીવ્યૂ રિકવરી લિંક {host} પર મોકલે છે. લિંક ત્યાં જ ખોલો — આ સરનામેથી તે કામ કરશે નહીં.',
    eyebrow: 'ખાતાની રિકવરી',
    errors: {
      tooMany: 'રિકવરીની ઘણી બધી વિનંતીઓ થઈ ગઈ છે. કૃપા કરીને થોડી મિનિટ રાહ જોઈને ફરી પ્રયાસ કરો.',
      service: 'રિકવરી ઈમેલ સેવા હાલમાં થોડા સમય માટે ઉપલબ્ધ નથી. કૃપા કરીને ડેસ્કનો સંપર્ક કરો.',
      failed: 'રિકવરી શરૂ થઈ શકી નથી. કૃપા કરીને ફરી પ્રયાસ કરો.',
    },
    done: {
      intro: 'જો આ સરનામા સાથે કોઈ ખાતું જોડાયેલું હશે, તો તમને રિકવરી ઈમેલ મળવું જોઈએ.',
      note: 'ગોપનીયતા માટે, આ પેજ ખાતું છે કે નહીં તેની પુષ્ટિ કરતું નથી. નવો પાસવર્ડ પસંદ કરવા ઈમેલમાંની લિંક ખોલો.',
      back: 'સાઇન ઇન પર પાછા જાઓ',
    },
    title: 'તમારો પાસવર્ડ રીસેટ કરો',
    intro: 'તમારા ખાતા માટે વાપરેલું ઈમેલ સરનામું લખો.',
    remembered: 'યાદ આવી ગયું?',
    returnLink: 'સાઇન ઇન પર પાછા ફરો',
    stop: '.',
    unavailable: 'રિકવરી ઉપલબ્ધ નથી, કારણ કે આ સાઇટ Supabase સાથે જોડાયેલી નથી.',
    desk: {
      lead: 'ડેસ્ક સીધું તમારું એક્સેસ પાછું આપી શકે છે:',
      or: ' અથવા ',
      form: 'પૂછપરછ ફોર્મ',
    },
    preparing: 'લિંક તૈયાર થઈ રહી છે…',
    send: 'રિકવરી લિંક મોકલો',
  },
};
