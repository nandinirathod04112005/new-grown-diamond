/**
 * The words /account shows in every state that is not the customer
 * dashboard, in the three languages (see src/i18n/useCopy.js). "Account",
 * "Sign in", "Sign out", "Create an account" and "Inventory desk" come from
 * the site dictionaries.
 *
 * In `inactive.status`, `{status}` is the account status exactly as the
 * database holds it; it is never translated. `notFound` is shown in its place
 * when there is no profile row at all.
 */
export default {
  en: {
    loading: {
      title: 'Loading',
      intro: 'Checking your session.',
      note: 'One moment…',
    },
    anon: {
      title: 'You are not signed in',
      intro: 'Sign in to see your account, or create one if you are new.',
    },
    error: {
      title: 'Something went wrong',
      intro: 'Your profile could not be loaded.',
      note: 'The session is valid but the protected profile could not be read.',
    },
    staff: {
      eyebrow: 'Staff account',
      title: 'Welcome back',
      orders: 'Looking for your own orders?',
      note: 'This is a staff account. The customer workspace does not apply to it; the inventory desk is where your work is.',
      openDesk: 'Open the inventory desk',
    },
    inactive: {
      eyebrow: 'Account access',
      title: 'Customer workspace unavailable',
      intro: 'This dashboard is available only to active customer accounts.',
      help: 'Need help with access?',
      status: 'Account status: {status}. No customer records have been loaded.',
      notFound: 'profile not found',
    },
    contact: 'Contact the desk',
    stop: '.',
  },

  hi: {
    loading: {
      title: 'लोड हो रहा है',
      intro: 'आपका सेशन जाँचा जा रहा है।',
      note: 'बस एक पल…',
    },
    anon: {
      title: 'आप साइन इन नहीं हैं',
      intro: 'अपना खाता देखने के लिए साइन इन करें, या अगर आप नए हैं तो खाता बनाएँ।',
    },
    error: {
      title: 'कुछ गड़बड़ हो गई',
      intro: 'आपकी प्रोफ़ाइल लोड नहीं हो सकी।',
      note: 'सेशन मान्य है, लेकिन सुरक्षित प्रोफ़ाइल पढ़ी नहीं जा सकी।',
    },
    staff: {
      eyebrow: 'स्टाफ़ खाता',
      title: 'फिर से स्वागत है',
      orders: 'अपने खुद के ऑर्डर ढूँढ रहे हैं?',
      note: 'यह एक स्टाफ़ खाता है। ग्राहक वर्कस्पेस इस पर लागू नहीं होता; आपका काम इन्वेंटरी डेस्क पर है।',
      openDesk: 'इन्वेंटरी डेस्क खोलें',
    },
    inactive: {
      eyebrow: 'खाता एक्सेस',
      title: 'ग्राहक वर्कस्पेस उपलब्ध नहीं है',
      intro: 'यह डैशबोर्ड केवल सक्रिय ग्राहक खातों के लिए उपलब्ध है।',
      help: 'एक्सेस में मदद चाहिए?',
      status: 'खाते की स्थिति: {status}। कोई ग्राहक रिकॉर्ड लोड नहीं किया गया है।',
      notFound: 'प्रोफ़ाइल नहीं मिली',
    },
    contact: 'डेस्क से संपर्क करें',
    stop: '।',
  },

  gu: {
    loading: {
      title: 'લોડ થઈ રહ્યું છે',
      intro: 'તમારું સેશન તપાસી રહ્યા છીએ.',
      note: 'એક ક્ષણ…',
    },
    anon: {
      title: 'તમે સાઇન ઇન નથી',
      intro: 'તમારું ખાતું જોવા સાઇન ઇન કરો, અથવા જો તમે નવા હો તો ખાતું બનાવો.',
    },
    error: {
      title: 'કંઈક ખોટું થયું',
      intro: 'તમારી પ્રોફાઇલ લોડ થઈ શકી નથી.',
      note: 'સેશન માન્ય છે, પણ સુરક્ષિત પ્રોફાઇલ વાંચી શકાઈ નથી.',
    },
    staff: {
      eyebrow: 'સ્ટાફ ખાતું',
      title: 'ફરી સ્વાગત છે',
      orders: 'તમારા પોતાના ઓર્ડર શોધો છો?',
      note: 'આ સ્ટાફ ખાતું છે. ગ્રાહક વર્કસ્પેસ તેને લાગુ પડતું નથી; તમારું કામ ઇન્વેન્ટરી ડેસ્ક પર છે.',
      openDesk: 'ઇન્વેન્ટરી ડેસ્ક ખોલો',
    },
    inactive: {
      eyebrow: 'ખાતાનો એક્સેસ',
      title: 'ગ્રાહક વર્કસ્પેસ ઉપલબ્ધ નથી',
      intro: 'આ ડેશબોર્ડ ફક્ત સક્રિય ગ્રાહક ખાતાં માટે ઉપલબ્ધ છે.',
      help: 'એક્સેસ માટે મદદ જોઈએ છે?',
      status: 'ખાતાની સ્થિતિ: {status}. કોઈ ગ્રાહક રેકોર્ડ લોડ કરવામાં આવ્યા નથી.',
      notFound: 'પ્રોફાઇલ મળી નથી',
    },
    contact: 'ડેસ્કનો સંપર્ક કરો',
    stop: '.',
  },
};
