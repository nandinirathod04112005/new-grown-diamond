/**
 * The words authErrors.js answers with, in the three languages (see
 * src/i18n/useCopy.js — read here through `pickCopy`, because authErrors.js is
 * a plain module and not a component).
 *
 * Only the wording is here. Which message a given error gets — the
 * classification — stays in authErrors.js and does not depend on the
 * language. "Forgot password" names the link on the sign-in page, so it is
 * quoted as that link reads in each language.
 */
export default {
  en: {
    samePassword: 'That is already your password. Please choose a different one.',
    weakPassword: 'That password is too easy to guess. Try a longer one, or add numbers and symbols.',
    recoveryExpired: 'This recovery link has expired or has already been used. Please request a new one.',
    invalidCredentials: 'Email or password is incorrect.',
    alreadyRegistered: 'This email is already registered. Sign in, or use Forgot password to recover your account.',
    notAuthorized: 'Email address not authorized: the email service cannot send to this address. Contact support to configure email delivery.',
    sendFailed: 'The email could not be sent right now. Please try again later, or contact the desk.',
    mailRateLimit: 'Email rate limit exceeded. The email service cannot send another link yet. Please wait before trying again.',
    tooMany: 'Too many attempts. Please wait a few minutes and try again.',
    unavailable: 'The account service is temporarily unavailable. Please try again shortly.',
    offline: 'Unable to connect. Check your internet connection and try again.',
  },

  hi: {
    samePassword: 'यह तो पहले से ही आपका पासवर्ड है। कृपया कोई दूसरा चुनें।',
    weakPassword: 'यह पासवर्ड बहुत आसानी से अंदाज़ा लगाया जा सकता है। थोड़ा लंबा रखें, या उसमें अंक और चिह्न जोड़ें।',
    recoveryExpired: 'यह रिकवरी लिंक समाप्त हो चुका है या पहले ही इस्तेमाल हो चुका है। कृपया नया लिंक मँगवाएँ।',
    invalidCredentials: 'ईमेल या पासवर्ड गलत है।',
    alreadyRegistered: 'यह ईमेल पहले से रजिस्टर्ड है। साइन इन करें, या अपना खाता वापस पाने के लिए “पासवर्ड भूल गए?” का उपयोग करें।',
    notAuthorized: 'ईमेल पता अधिकृत नहीं है: ईमेल सेवा इस पते पर मेल नहीं भेज सकती। ईमेल डिलीवरी सेट करवाने के लिए सपोर्ट से संपर्क करें।',
    sendFailed: 'ईमेल अभी नहीं भेजा जा सका। कृपया बाद में फिर कोशिश करें, या डेस्क से संपर्क करें।',
    mailRateLimit: 'ईमेल भेजने की सीमा पूरी हो गई है। ईमेल सेवा अभी एक और लिंक नहीं भेज सकती। दोबारा कोशिश करने से पहले कृपया कुछ देर रुकें।',
    tooMany: 'बहुत ज़्यादा कोशिशें हो चुकी हैं। कृपया कुछ मिनट रुककर फिर कोशिश करें।',
    unavailable: 'खाता सेवा अभी कुछ समय के लिए उपलब्ध नहीं है। कृपया थोड़ी देर में फिर कोशिश करें।',
    offline: 'कनेक्ट नहीं हो सका। अपना इंटरनेट कनेक्शन जाँचें और फिर कोशिश करें।',
  },

  gu: {
    samePassword: 'આ તો પહેલેથી જ તમારો પાસવર્ડ છે. કૃપા કરીને બીજો પસંદ કરો.',
    weakPassword: 'આ પાસવર્ડનું અનુમાન લગાવવું બહુ સહેલું છે. થોડો લાંબો રાખો, અથવા તેમાં અંક અને ચિહ્ન ઉમેરો.',
    recoveryExpired: 'આ રિકવરી લિંક સમાપ્ત થઈ ગઈ છે અથવા પહેલેથી વપરાઈ ગઈ છે. કૃપા કરીને નવી લિંક મંગાવો.',
    invalidCredentials: 'ઈમેલ અથવા પાસવર્ડ ખોટો છે.',
    alreadyRegistered: 'આ ઈમેલ પહેલેથી રજિસ્ટર્ડ છે. સાઇન ઇન કરો, અથવા તમારું ખાતું પાછું મેળવવા “પાસવર્ડ ભૂલી ગયા?” નો ઉપયોગ કરો.',
    notAuthorized: 'ઈમેલ સરનામું અધિકૃત નથી: ઈમેલ સેવા આ સરનામે મેલ મોકલી શકતી નથી. ઈમેલ ડિલિવરી સેટ કરાવવા સપોર્ટનો સંપર્ક કરો.',
    sendFailed: 'ઈમેલ અત્યારે મોકલી શકાયું નથી. કૃપા કરીને પછીથી ફરી પ્રયાસ કરો, અથવા ડેસ્કનો સંપર્ક કરો.',
    mailRateLimit: 'ઈમેલ મોકલવાની મર્યાદા પૂરી થઈ ગઈ છે. ઈમેલ સેવા હજી બીજી લિંક મોકલી શકતી નથી. ફરી પ્રયાસ કરતા પહેલાં થોડી રાહ જુઓ.',
    tooMany: 'ઘણા બધા પ્રયાસ થઈ ગયા છે. કૃપા કરીને થોડી મિનિટ રાહ જોઈને ફરી પ્રયાસ કરો.',
    unavailable: 'ખાતાની સેવા હાલમાં થોડા સમય માટે ઉપલબ્ધ નથી. કૃપા કરીને થોડી વારમાં ફરી પ્રયાસ કરો.',
    offline: 'કનેક્ટ થઈ શકાયું નથી. તમારું ઇન્ટરનેટ કનેક્શન તપાસો અને ફરી પ્રયાસ કરો.',
  },
};
