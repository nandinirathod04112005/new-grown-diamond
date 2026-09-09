/**
 * हिन्दी — Hindi.
 *
 * Trade vocabulary follows src/i18n/glossary.md: where the Surat trade writes
 * the English word, the English word is kept and written in Devanagari.
 * "कैरेट", not "रत्ती". "सर्टिफिकेट", not "प्रमाणपत्र". Both alternatives are
 * correct Hindi and both would read as wrong to a buyer who says the English
 * word every day.
 *
 * Ordinary language — price, available, contact, sign in — is translated
 * properly, because there the English adds nothing.
 *
 * Rows marked "⚠ check" in the glossary are the ones to look at first.
 */
export default {
  terms: {
    diamond: 'हीरा',
    diamonds: 'हीरे',
    labGrown: 'लैब-ग्रोन',
    natural: 'प्राकृतिक',
    carat: 'कैरेट',
    cut: 'कट',
    colour: 'कलर',
    clarity: 'क्लैरिटी',
    polish: 'पॉलिश',
    symmetry: 'सिमेट्री',
    fluorescence: 'फ्लोरेसेंस',
    certificate: 'सर्टिफिकेट',
    report: 'ग्रेडिंग रिपोर्ट',
    lab: 'लैब',
    shape: 'शेप',
    stock: 'स्टॉक',
    stockNumber: 'स्टॉक नंबर',
    inStock: 'उपलब्ध',
    sold: 'बिक गया',
    onHold: 'होल्ड पर',
    price: 'कीमत',
    priceOnRequest: 'कीमत पूछताछ पर',
    enquiry: 'पूछताछ',
    jewellery: 'ज्वेलरी',
    customJewellery: 'कस्टम ज्वेलरी',
    metal: 'मेटल',
    growth: 'ग्रोथ मेथड',
  },

  nav: {
    diamonds: 'हीरे',
    jewellery: 'ज्वेलरी',
    ourStory: 'हमारी कहानी',
    education: 'जानकारी',
    blogs: 'ब्लॉग',
    contact: 'संपर्क',
    account: 'खाता',
    signIn: 'साइन इन',
    signOut: 'साइन आउट',
    register: 'खाता बनाएँ',
    admin: 'इन्वेंटरी डेस्क',
    menu: 'मेन्यू',
    close: 'बंद करें',
    language: 'भाषा',
    changeLanguage: 'भाषा बदलें',
    backToSite: 'वेबसाइट पर वापस',
  },

  common: {
    loading: 'लोड हो रहा है…',
    error: 'कुछ गड़बड़ हो गई।',
    retry: 'फिर से कोशिश करें',
    required: 'ज़रूरी',
    optional: 'वैकल्पिक',
    submit: 'भेजें',
    cancel: 'रद्द करें',
    save: 'सहेजें',
    search: 'खोजें',
    readMore: 'और पढ़ें',
    viewAll: 'सभी देखें',
    learnMore: 'और जानें',
    getInTouch: 'संपर्क करें',
    callTheDesk: 'या डेस्क पर कॉल करें',
    talkItThrough: 'या बात करके तय करें',
    enquireOnWhatsApp: 'WhatsApp पर पूछताछ करें',
    writtenEnquiry: 'लिखित पूछताछ भेजें',
    enquireAboutStone: 'इस हीरे के बारे में पूछें',
    requestInventory: 'मौजूदा स्टॉक मँगवाएँ',
    exploreDiamonds: 'हीरे देखें',
  },

  notice: {
    englishOnly: 'यह पेज फ़िलहाल केवल अंग्रेज़ी में उपलब्ध है।',
    englishOnlyBody:
      'बाकी वेबसाइट {language} में है। इस पेज का अनुवाद चल रहा है और जल्द ही उपलब्ध होगा।',
  },

  auth: {
    signInTitle: 'साइन इन',
    signInIntro: 'अपना खाता, सहेजी गई पूछताछ और ग्रेडिंग रिपोर्ट देखें।',
    registerTitle: 'खाता बनाएँ',
    registerIntro:
      'रिटेलर, ज्वेलर और ट्रेड पार्टनर के लिए। पूछताछ पर नज़र रखें और ग्रेडिंग रिपोर्ट मँगवाएँ।',
    email: 'ईमेल',
    password: 'पासवर्ड',
    confirmPassword: 'पासवर्ड दोहराएँ',
    fullName: 'पूरा नाम',
    yourName: 'आपका नाम',
    accountType: 'खाते का प्रकार',
    customer: 'ग्राहक',
    customerBlurb: 'स्टॉक देखें, पूछताछ भेजें, अपनी रिपोर्ट सहेजें।',
    administrator: 'एडमिनिस्ट्रेटर',
    administratorBlurb: 'केवल स्टाफ़ के लिए। एक्सेस कोड ज़रूरी है।',
    staffCode: 'स्टाफ़ एक्सेस कोड',
    staffCodeHint:
      'किसी मौजूदा एडमिनिस्ट्रेटर से पूछें। स्टाफ़ एक्सेस बाद में डेटाबेस में तय होता है — यह कोड सिर्फ़ अनुरोध खोलता है।',
    minChars: 'कम से कम {n} अक्षर।',
    showPassword: 'पासवर्ड दिखाएँ',
    hidePassword: 'पासवर्ड छिपाएँ',
    forgotPassword: 'पासवर्ड भूल गए?',
    noAccount: 'अभी खाता नहीं है?',
    createOne: 'बनाएँ',
    alreadyRegistered: 'पहले से रजिस्टर्ड हैं?',
    signingIn: 'साइन इन हो रहा है…',
    creating: 'बनाया जा रहा है…',
    checkEmail: 'अपना ईमेल देखें',
    checkEmailBody: 'आपका खाता अभी सक्रिय नहीं हुआ है।',
    goToAccount: 'अपने खाते में जाएँ',
    browseInventory: 'स्टॉक देखें',
  },

  validation: {
    emailRequired: 'अपना ईमेल पता लिखें।',
    emailInvalid: 'यह ईमेल पते जैसा नहीं लग रहा।',
    emailTooLong: 'यह ईमेल पता बहुत लंबा है।',
    passwordRequired: 'अपना पासवर्ड लिखें।',
    passwordShort: 'कम से कम {n} अक्षर इस्तेमाल करें।',
    confirmRequired: 'पासवर्ड दोबारा लिखें।',
    passwordsDiffer: 'दोनों पासवर्ड मेल नहीं खाते।',
    fieldRequired: 'अपना {field} लिखें।',
    codeRequired: 'स्टाफ़ एक्सेस कोड लिखें।',
    codeWrong: 'यह स्टाफ़ कोड सही नहीं है।',
    noMatch: 'यह ईमेल और पासवर्ड किसी खाते से मेल नहीं खाते।',
  },

  footer: {
    explore: 'देखें',
    company: 'कंपनी',
    diamondDesk: 'डायमंड डेस्क',
    inventory: 'हीरों का स्टॉक',
    shapeGuide: 'शेप गाइड',
    whyNgd: 'NGD क्यों',
    faq: 'सामान्य सवाल',
    rights: 'सटीकता से तैयार · प्रमाण के साथ प्रस्तुत',
    tagline: 'सूरत में बने CVD और HPHT लैब-ग्रोन हीरे, दुनिया भर के ग्राहकों के लिए।',
  },

  enquiryLine: {
    label: 'हीरे और कस्टम ज्वेलरी की पूछताछ',
  },
};
