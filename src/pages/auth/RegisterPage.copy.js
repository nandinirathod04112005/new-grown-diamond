/**
 * The registration page's own words, in the three languages (see
 * src/i18n/useCopy.js). Field labels, the account types and their blurbs, and
 * the email / password / confirm messages come from the site dictionaries
 * (`auth.*`, `validation.*`); this file holds what only this page says.
 *
 * `need` is "Enter your …" worded whole, one sentence per field, rather than
 * the dictionary's single "Enter your {field}." — in Gujarati "your" has to
 * agree with the field (તમારું નામ, તમારો ફોન નંબર, તમારો દેશ), which one
 * template cannot do. The rule that decides the message is still
 * validation.js's.
 *
 * `staffErrors` is keyed by the codes lib/supabase/registerAdmin.js answers
 * with; the English entries are that file's own sentences, word for word. A
 * code that is not listed shows the function's text as it came. The wrong
 * staff code itself is `validation.codeWrong` in the dictionaries.
 *
 * What is SENT to the desk when sign-up cannot finish (the enquiry subject and
 * message) is not here: the desk reads it, so it stays English in the page.
 */
export default {
  en: {
    staffErrors: {
      rate_limited: 'Too many wrong codes from this connection. Wait fifteen minutes and try again.',
      already_registered: 'This email is already registered. Sign in, or use Forgot password to recover your account.',
      invalid_request: 'Check the details: your name, a valid email, phone, country, and a password of at least 8 characters.',
      service_unavailable: 'Staff registration is not set up on this deployment. Ask the site owner to configure the register-admin function.',
      not_deployed: 'Staff registration is not set up on this deployment. Ask the site owner to configure the register-admin function.',
      registration_failed: 'The staff account could not be created. Please try again, or contact an administrator.',
      unknown: 'The staff account could not be created. Please try again, or contact an administrator.',
      network: 'Unable to connect. Check your internet connection and try again.',
      gateway: 'Staff registration is not set up correctly on this deployment: the site key was refused. Ask the site owner to deploy the register-admin function with JWT verification off.',
      unconfigured: 'The site is not connected to its database on this deployment.',
    },
    staffSignInFailed: 'Your staff account was created, but signing in did not complete. Go to Sign in and use the same email and password.',
    need: {
      fullName: 'Enter your full name.',
      phone: 'Enter your phone number.',
      country: 'Enter your country.',
    },
    notCreatedRetry: 'That account could not be created. Please try again.',
    notCreated: 'That account could not be created.',
    maybeRegistered: 'This email may already be registered. Try signing in or use Forgot password. No new confirmation email was verified.',
    noAccountReturned: 'The account service returned no account. Please try again.',
    created: {
      title: 'Account created successfully',
      adminIntro: 'You are signed in as an administrator. Opening the inventory desk…',
      adminStatus: 'Staff account created. You are signed in.',
      openDesk: 'Open the inventory desk',
      sessionIntro: 'You are signed in. Taking you to your account…',
      sessionStatus: 'Account created. You are signed in.',
    },
    blocked: {
      handedTitle: 'The desk has your request',
      title: 'We could not finish just now',
      handedIntro: 'Someone will set your account up and email you directly.',
      reference: 'Reference {ref}.',
      handedBody: 'We have your name and email. The desk will create your account and contact you — usually the same working day.',
      contactDesk: 'Contact the desk',
      none: 'No account was created.',
      noneBody: 'The confirmation email could not be sent, and we could not verify whether an account already exists for this address.',
      offer: 'We can pass your details to the desk instead — they will set the account up by hand and email you. Only your name and email are sent; your password is not, and never leaves this page.',
      handFailed: 'That could not be sent either. Please email the desk directly.',
      send: 'Send my details to the desk',
    },
    sending: 'Sending…',
    confirm: {
      sent: 'Confirmation email sent to {email}.',
      body: 'Open it to finish creating your account. You are not signed in until you do. Check your spam folder if it does not appear.',
      resend: 'Resend confirmation email',
      back: 'Back to sign in',
      resent: 'Confirmation email sent. Check your inbox and spam folder.',
      resendFailed: 'The confirmation email could not be sent.',
    },
    already: {
      title: 'You are already signed in',
      intro: 'This browser has an active account.',
      signOut: 'Sign out to create another',
    },
    unavailable: {
      title: 'Registration is unavailable.',
      body: 'The site is not connected to its database on this deployment.',
    },
    phone: 'Phone',
    country: 'Country',
    countryPlaceholder: 'India',
    submit: 'Create account',
    live: 'Creating your account',
    stop: '.',
  },

  hi: {
    staffErrors: {
      rate_limited: 'इस कनेक्शन से बहुत बार गलत कोड डाला गया है। पंद्रह मिनट रुककर फिर कोशिश करें।',
      already_registered: 'यह ईमेल पहले से रजिस्टर्ड है। साइन इन करें, या अपना खाता वापस पाने के लिए “पासवर्ड भूल गए?” का उपयोग करें।',
      invalid_request: 'विवरण जाँचें: आपका नाम, सही ईमेल, फ़ोन, देश, और कम से कम 8 अक्षरों का पासवर्ड।',
      service_unavailable: 'इस डिप्लॉयमेंट पर स्टाफ़ रजिस्ट्रेशन सेट नहीं है। साइट के मालिक से register-admin फ़ंक्शन कॉन्फ़िगर करने को कहें।',
      not_deployed: 'इस डिप्लॉयमेंट पर स्टाफ़ रजिस्ट्रेशन सेट नहीं है। साइट के मालिक से register-admin फ़ंक्शन कॉन्फ़िगर करने को कहें।',
      registration_failed: 'स्टाफ़ खाता नहीं बनाया जा सका। कृपया फिर से कोशिश करें, या किसी एडमिनिस्ट्रेटर से संपर्क करें।',
      unknown: 'स्टाफ़ खाता नहीं बनाया जा सका। कृपया फिर से कोशिश करें, या किसी एडमिनिस्ट्रेटर से संपर्क करें।',
      network: 'कनेक्ट नहीं हो सका। अपना इंटरनेट कनेक्शन जाँचें और फिर कोशिश करें।',
      gateway: 'इस डिप्लॉयमेंट पर स्टाफ़ रजिस्ट्रेशन सही तरह से सेट नहीं है: साइट की कुंजी अस्वीकार कर दी गई। साइट के मालिक से कहें कि register-admin फ़ंक्शन को JWT वेरिफ़िकेशन बंद करके डिप्लॉय करें।',
      unconfigured: 'यह साइट अभी अपने डेटाबेस से नहीं जुड़ी है।',
    },
    staffSignInFailed: 'आपका स्टाफ़ खाता बन गया है, लेकिन साइन इन पूरा नहीं हुआ। साइन इन पर जाएँ और वही ईमेल और पासवर्ड इस्तेमाल करें।',
    need: {
      fullName: 'अपना पूरा नाम लिखें।',
      phone: 'अपना फ़ोन नंबर लिखें।',
      country: 'अपना देश लिखें।',
    },
    notCreatedRetry: 'यह खाता नहीं बनाया जा सका। कृपया फिर से कोशिश करें।',
    notCreated: 'यह खाता नहीं बनाया जा सका।',
    maybeRegistered: 'हो सकता है यह ईमेल पहले से रजिस्टर्ड हो। साइन इन करके देखें या “पासवर्ड भूल गए?” का उपयोग करें। कोई नया पुष्टि ईमेल सत्यापित नहीं हुआ।',
    noAccountReturned: 'खाता सेवा से कोई खाता वापस नहीं मिला। कृपया फिर से कोशिश करें।',
    created: {
      title: 'खाता सफलतापूर्वक बन गया',
      adminIntro: 'आप एडमिनिस्ट्रेटर के रूप में साइन इन हैं। इन्वेंटरी डेस्क खुल रहा है…',
      adminStatus: 'स्टाफ़ खाता बन गया। आप साइन इन हैं।',
      openDesk: 'इन्वेंटरी डेस्क खोलें',
      sessionIntro: 'आप साइन इन हैं। आपको आपके खाते में ले जा रहे हैं…',
      sessionStatus: 'खाता बन गया। आप साइन इन हैं।',
    },
    blocked: {
      handedTitle: 'आपका अनुरोध डेस्क तक पहुँच गया है',
      title: 'हम अभी यह पूरा नहीं कर सके',
      handedIntro: 'कोई आपका खाता सेट करेगा और आपको सीधे ईमेल करेगा।',
      reference: 'रेफ़रेंस {ref}।',
      handedBody: 'हमारे पास आपका नाम और ईमेल है। डेस्क आपका खाता बनाएगा और आपसे संपर्क करेगा — आमतौर पर उसी कामकाजी दिन।',
      contactDesk: 'डेस्क से संपर्क करें',
      none: 'कोई खाता नहीं बनाया गया।',
      noneBody: 'पुष्टि ईमेल नहीं भेजा जा सका, और हम यह पुष्टि नहीं कर सके कि इस पते पर पहले से कोई खाता है या नहीं।',
      offer: 'इसके बजाय हम आपका विवरण डेस्क को भेज सकते हैं — वे खुद खाता सेट करके आपको ईमेल करेंगे। केवल आपका नाम और ईमेल भेजा जाता है; आपका पासवर्ड नहीं, और वह कभी इस पेज से बाहर नहीं जाता।',
      handFailed: 'यह भी नहीं भेजा जा सका। कृपया डेस्क को सीधे ईमेल करें।',
      send: 'मेरा विवरण डेस्क को भेजें',
    },
    sending: 'भेजा जा रहा है…',
    confirm: {
      sent: '{email} पर पुष्टि ईमेल भेज दिया गया है।',
      body: 'अपना खाता बनाना पूरा करने के लिए इसे खोलें। जब तक आप ऐसा नहीं करते, आप साइन इन नहीं होंगे। अगर ईमेल न दिखे तो अपना स्पैम फ़ोल्डर देखें।',
      resend: 'पुष्टि ईमेल दोबारा भेजें',
      back: 'साइन इन पर वापस जाएँ',
      resent: 'पुष्टि ईमेल भेज दिया गया है। अपना इनबॉक्स और स्पैम फ़ोल्डर देखें।',
      resendFailed: 'पुष्टि ईमेल नहीं भेजा जा सका।',
    },
    already: {
      title: 'आप पहले से साइन इन हैं',
      intro: 'इस ब्राउज़र में एक खाता सक्रिय है।',
      signOut: 'दूसरा खाता बनाने के लिए साइन आउट करें',
    },
    unavailable: {
      title: 'रजिस्ट्रेशन उपलब्ध नहीं है।',
      body: 'यह साइट अभी अपने डेटाबेस से नहीं जुड़ी है।',
    },
    phone: 'फ़ोन',
    country: 'देश',
    countryPlaceholder: 'भारत',
    submit: 'खाता बनाएँ',
    live: 'आपका खाता बनाया जा रहा है',
    stop: '।',
  },

  gu: {
    staffErrors: {
      rate_limited: 'આ કનેક્શન પરથી ઘણી વાર ખોટો કોડ નાખવામાં આવ્યો છે. પંદર મિનિટ રાહ જોઈને ફરી પ્રયાસ કરો.',
      already_registered: 'આ ઈમેલ પહેલેથી રજિસ્ટર્ડ છે. સાઇન ઇન કરો, અથવા તમારું ખાતું પાછું મેળવવા “પાસવર્ડ ભૂલી ગયા?” નો ઉપયોગ કરો.',
      invalid_request: 'વિગતો તપાસો: તમારું નામ, સાચું ઈમેલ, ફોન, દેશ અને ઓછામાં ઓછા 8 અક્ષરનો પાસવર્ડ.',
      service_unavailable: 'આ ડિપ્લોયમેન્ટ પર સ્ટાફ રજિસ્ટ્રેશન સેટ નથી. સાઇટના માલિકને register-admin ફંક્શન કૉન્ફિગર કરવા કહો.',
      not_deployed: 'આ ડિપ્લોયમેન્ટ પર સ્ટાફ રજિસ્ટ્રેશન સેટ નથી. સાઇટના માલિકને register-admin ફંક્શન કૉન્ફિગર કરવા કહો.',
      registration_failed: 'સ્ટાફ ખાતું બનાવી શકાયું નથી. કૃપા કરીને ફરી પ્રયાસ કરો, અથવા કોઈ એડમિનિસ્ટ્રેટરનો સંપર્ક કરો.',
      unknown: 'સ્ટાફ ખાતું બનાવી શકાયું નથી. કૃપા કરીને ફરી પ્રયાસ કરો, અથવા કોઈ એડમિનિસ્ટ્રેટરનો સંપર્ક કરો.',
      network: 'કનેક્ટ થઈ શકાયું નથી. તમારું ઇન્ટરનેટ કનેક્શન તપાસો અને ફરી પ્રયાસ કરો.',
      gateway: 'આ ડિપ્લોયમેન્ટ પર સ્ટાફ રજિસ્ટ્રેશન બરાબર સેટ નથી: સાઇટની કી નકારવામાં આવી. સાઇટના માલિકને કહો કે register-admin ફંક્શનને JWT વેરિફિકેશન બંધ રાખીને ડિપ્લોય કરે.',
      unconfigured: 'આ સાઇટ હાલમાં તેના ડેટાબેઝ સાથે જોડાયેલી નથી.',
    },
    staffSignInFailed: 'તમારું સ્ટાફ ખાતું બની ગયું છે, પણ સાઇન ઇન પૂર્ણ થયું નથી. સાઇન ઇન પર જાઓ અને એ જ ઈમેલ અને પાસવર્ડ વાપરો.',
    need: {
      fullName: 'તમારું પૂરું નામ લખો.',
      phone: 'તમારો ફોન નંબર લખો.',
      country: 'તમારો દેશ લખો.',
    },
    notCreatedRetry: 'આ ખાતું બનાવી શકાયું નથી. કૃપા કરીને ફરી પ્રયાસ કરો.',
    notCreated: 'આ ખાતું બનાવી શકાયું નથી.',
    maybeRegistered: 'કદાચ આ ઈમેલ પહેલેથી રજિસ્ટર્ડ છે. સાઇન ઇન કરી જુઓ અથવા “પાસવર્ડ ભૂલી ગયા?” નો ઉપયોગ કરો. કોઈ નવું પુષ્ટિ ઈમેલ ચકાસાયું નથી.',
    noAccountReturned: 'ખાતાની સેવાએ કોઈ ખાતું પરત કર્યું નથી. કૃપા કરીને ફરી પ્રયાસ કરો.',
    created: {
      title: 'ખાતું સફળતાપૂર્વક બની ગયું',
      adminIntro: 'તમે એડમિનિસ્ટ્રેટર તરીકે સાઇન ઇન છો. ઇન્વેન્ટરી ડેસ્ક ખૂલી રહ્યું છે…',
      adminStatus: 'સ્ટાફ ખાતું બની ગયું. તમે સાઇન ઇન છો.',
      openDesk: 'ઇન્વેન્ટરી ડેસ્ક ખોલો',
      sessionIntro: 'તમે સાઇન ઇન છો. તમને તમારા ખાતામાં લઈ જઈએ છીએ…',
      sessionStatus: 'ખાતું બની ગયું. તમે સાઇન ઇન છો.',
    },
    blocked: {
      handedTitle: 'તમારી વિનંતી ડેસ્ક પાસે પહોંચી ગઈ છે',
      title: 'અમે હમણાં આ પૂરું કરી શક્યા નથી',
      handedIntro: 'કોઈ તમારું ખાતું સેટ કરશે અને તમને સીધું ઈમેલ કરશે.',
      reference: 'રેફરન્સ {ref}.',
      handedBody: 'અમારી પાસે તમારું નામ અને ઈમેલ છે. ડેસ્ક તમારું ખાતું બનાવશે અને તમારો સંપર્ક કરશે — સામાન્ય રીતે એ જ કામકાજના દિવસે.',
      contactDesk: 'ડેસ્કનો સંપર્ક કરો',
      none: 'કોઈ ખાતું બન્યું નથી.',
      noneBody: 'પુષ્ટિ ઈમેલ મોકલી શકાયું નથી, અને આ સરનામા માટે પહેલેથી ખાતું છે કે નહીં તે અમે ચકાસી શક્યા નથી.',
      offer: 'તેના બદલે અમે તમારી વિગતો ડેસ્કને મોકલી શકીએ — તેઓ જાતે ખાતું સેટ કરીને તમને ઈમેલ કરશે. ફક્ત તમારું નામ અને ઈમેલ મોકલવામાં આવે છે; તમારો પાસવર્ડ નહીં, અને તે ક્યારેય આ પેજની બહાર જતો નથી.',
      handFailed: 'આ પણ મોકલી શકાયું નથી. કૃપા કરીને ડેસ્કને સીધું ઈમેલ કરો.',
      send: 'મારી વિગતો ડેસ્કને મોકલો',
    },
    sending: 'મોકલાઈ રહ્યું છે…',
    confirm: {
      sent: '{email} પર પુષ્ટિ ઈમેલ મોકલાઈ ગયું છે.',
      body: 'તમારું ખાતું બનાવવાનું પૂરું કરવા માટે તે ખોલો. તમે તેમ ન કરો ત્યાં સુધી તમે સાઇન ઇન નહીં થાઓ. જો ઈમેલ ન દેખાય તો તમારું સ્પામ ફોલ્ડર જુઓ.',
      resend: 'પુષ્ટિ ઈમેલ ફરી મોકલો',
      back: 'સાઇન ઇન પર પાછા જાઓ',
      resent: 'પુષ્ટિ ઈમેલ મોકલાઈ ગયું છે. તમારું ઇનબોક્સ અને સ્પામ ફોલ્ડર જુઓ.',
      resendFailed: 'પુષ્ટિ ઈમેલ મોકલી શકાયું નથી.',
    },
    already: {
      title: 'તમે પહેલેથી સાઇન ઇન છો',
      intro: 'આ બ્રાઉઝરમાં એક ખાતું સક્રિય છે.',
      signOut: 'બીજું ખાતું બનાવવા સાઇન આઉટ કરો',
    },
    unavailable: {
      title: 'રજિસ્ટ્રેશન ઉપલબ્ધ નથી.',
      body: 'આ સાઇટ હાલમાં તેના ડેટાબેઝ સાથે જોડાયેલી નથી.',
    },
    phone: 'ફોન',
    country: 'દેશ',
    countryPlaceholder: 'ભારત',
    submit: 'ખાતું બનાવો',
    live: 'તમારું ખાતું બની રહ્યું છે',
    stop: '.',
  },
};
