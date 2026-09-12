/**
 * ગુજરાતી — Gujarati.
 *
 * The language of the trade this company is actually in. Surat's diamond
 * market runs in Gujarati, which makes this the version most likely to be read
 * by someone standing in front of the goods — and the one most worth getting
 * right.
 *
 * Trade vocabulary follows src/i18n/glossary.md: "કેરેટ" not a Sanskritised
 * equivalent, "સર્ટિફિકેટ" not "પ્રમાણપત્ર". Both alternatives are correct
 * Gujarati; neither is what a Varachha broker says out loud.
 *
 * Ordinary language is translated properly. Rows marked "⚠ check" in the
 * glossary are the ones to look at first.
 */
export default {
  terms: {
    diamond: 'હીરા',
    diamonds: 'હીરા',
    labGrown: 'લેબ-ગ્રોન',
    natural: 'કુદરતી',
    carat: 'કેરેટ',
    cut: 'કટ',
    colour: 'કલર',
    clarity: 'ક્લેરિટી',
    polish: 'પોલિશ',
    symmetry: 'સિમેટ્રી',
    fluorescence: 'ફ્લોરેસન્સ',
    certificate: 'સર્ટિફિકેટ',
    report: 'ગ્રેડિંગ રિપોર્ટ',
    lab: 'લેબ',
    shape: 'શેપ',
    stock: 'સ્ટોક',
    stockNumber: 'સ્ટોક નંબર',
    inStock: 'ઉપલબ્ધ',
    sold: 'વેચાયેલ',
    onHold: 'હોલ્ડ પર',
    price: 'કિંમત',
    priceOnRequest: 'કિંમત પૂછપરછ પર',
    enquiry: 'પૂછપરછ',
    jewellery: 'જ્વેલરી',
    customJewellery: 'કસ્ટમ જ્વેલરી',
    metal: 'મેટલ',
    growth: 'ગ્રોથ મેથડ',
  },

  nav: {
    diamonds: 'હીરા',
    jewellery: 'જ્વેલરી',
    ourStory: 'અમારી વાત',
    education: 'માહિતી',
    blogs: 'બ્લોગ',
    contact: 'સંપર્ક',
    account: 'ખાતું',
    login: 'લૉગ ઇન',
    logout: 'લૉગ આઉટ',
    signIn: 'સાઇન ઇન',
    signOut: 'સાઇન આઉટ',
    register: 'ખાતું બનાવો',
    admin: 'ઇન્વેન્ટરી ડેસ્ક',
    menu: 'મેનુ',
    close: 'બંધ કરો',
    language: 'ભાષા',
    changeLanguage: 'ભાષા બદલો',
    backToSite: 'વેબસાઇટ પર પાછા',
    primary: 'મુખ્ય',
    openMenu: 'મેનુ ખોલો',
    closeMenu: 'મેનુ બંધ કરો',
    siteMenu: 'સાઇટ મેનુ',
    cart: 'કાર્ટ',
    wishlist: 'વિશલિસ્ટ',
    wishlistSaved: 'વિશલિસ્ટ, {count} સાચવેલા',
    subPages: '{label}નાં પેજ',
  },

  educationTopics: {
    'price-and-size': 'હીરાની કિંમત અને સાઇઝ',
    'cvd-vs-natural': 'CVD અને કુદરતી હીરાની સરખામણી',
    'why-lab-grown': 'લેબ-ગ્રોન હીરો શા માટે પસંદ કરવો?',
    shapes: 'શેપ',
    faq: 'સામાન્ય પ્રશ્નો',
  },

  continueNext: {
    continue: 'આગળ વધો',
    journal: 'જર્નલ',
  },

  common: {
    loading: 'લોડ થઈ રહ્યું છે…',
    error: 'કંઈક ખોટું થયું.',
    retry: 'ફરી પ્રયાસ કરો',
    required: 'જરૂરી',
    optional: 'વૈકલ્પિક',
    submit: 'મોકલો',
    cancel: 'રદ કરો',
    save: 'સાચવો',
    search: 'શોધો',
    readMore: 'વધુ વાંચો',
    viewAll: 'બધું જુઓ',
    learnMore: 'વધુ જાણો',
    getInTouch: 'સંપર્ક કરો',
    callTheDesk: 'અથવા ડેસ્ક પર કૉલ કરો',
    talkItThrough: 'અથવા વાત કરીને નક્કી કરો',
    enquireOnWhatsApp: 'WhatsApp પર પૂછપરછ કરો',
    writtenEnquiry: 'લેખિત પૂછપરછ મોકલો',
    enquireAboutStone: 'આ હીરા વિશે પૂછો',
    requestInventory: 'હાલનો સ્ટોક મંગાવો',
    exploreDiamonds: 'હીરા જુઓ',
  },

  notice: {
    englishOnly: 'આ પેજ હાલ પૂરતું ફક્ત અંગ્રેજીમાં ઉપલબ્ધ છે.',
    englishOnlyBody:
      'બાકીની વેબસાઇટ {language}માં છે. આ પેજનું ભાષાંતર ચાલુ છે અને ટૂંક સમયમાં આવશે.',
  },

  auth: {
    signInTitle: 'સાઇન ઇન',
    signInIntro: 'તમારું ખાતું, સાચવેલી પૂછપરછ અને ગ્રેડિંગ રિપોર્ટ જુઓ.',
    registerTitle: 'ખાતું બનાવો',
    registerIntro:
      'રિટેલર, જ્વેલર અને ટ્રેડ પાર્ટનર માટે. પૂછપરછ પર નજર રાખો અને ગ્રેડિંગ રિપોર્ટ મંગાવો.',
    email: 'ઈમેલ',
    password: 'પાસવર્ડ',
    confirmPassword: 'પાસવર્ડ ફરી લખો',
    fullName: 'પૂરું નામ',
    yourName: 'તમારું નામ',
    accountType: 'ખાતાનો પ્રકાર',
    customer: 'ગ્રાહક',
    customerBlurb: 'સ્ટોક જુઓ, પૂછપરછ મોકલો, તમારી રિપોર્ટ સાચવો.',
    administrator: 'એડમિનિસ્ટ્રેટર',
    administratorBlurb: 'ફક્ત સ્ટાફ માટે. એક્સેસ કોડ જરૂરી છે.',
    staffCode: 'સ્ટાફ એક્સેસ કોડ',
    staffCodeHint:
      'કોઈ હાલના એડમિનિસ્ટ્રેટરને પૂછો. સ્ટાફ એકાઉન્ટ બને તે પહેલાં કોડની ચકાસણી સર્વર પર થાય છે.',
    minChars: 'ઓછામાં ઓછા {n} અક્ષર.',
    showPassword: 'પાસવર્ડ બતાવો',
    hidePassword: 'પાસવર્ડ છુપાવો',
    forgotPassword: 'પાસવર્ડ ભૂલી ગયા?',
    noAccount: 'હજી ખાતું નથી?',
    createOne: 'બનાવો',
    alreadyRegistered: 'પહેલેથી રજિસ્ટર્ડ છો?',
    signingIn: 'સાઇન ઇન થઈ રહ્યું છે…',
    creating: 'બની રહ્યું છે…',
    checkEmail: 'તમારું ઈમેલ જુઓ',
    checkEmailBody: 'તમારું ખાતું હજી સક્રિય થયું નથી.',
    goToAccount: 'તમારા ખાતામાં જાઓ',
    browseInventory: 'સ્ટોક જુઓ',
  },

  validation: {
    emailRequired: 'તમારું ઈમેલ સરનામું લખો.',
    emailInvalid: 'આ ઈમેલ સરનામા જેવું લાગતું નથી.',
    emailTooLong: 'આ ઈમેલ સરનામું બહુ લાંબું છે.',
    passwordRequired: 'તમારો પાસવર્ડ લખો.',
    passwordShort: 'ઓછામાં ઓછા {n} અક્ષર વાપરો.',
    confirmRequired: 'પાસવર્ડ ફરીથી લખો.',
    passwordsDiffer: 'બંને પાસવર્ડ મળતા નથી.',
    fieldRequired: 'તમારું {field} લખો.',
    codeRequired: 'સ્ટાફ એક્સેસ કોડ લખો.',
    codeWrong: 'આ સ્ટાફ કોડ સાચો નથી.',
    noMatch: 'આ ઈમેલ અને પાસવર્ડ કોઈ ખાતા સાથે મળતા નથી.',
  },

  footer: {
    explore: 'જુઓ',
    company: 'કંપની',
    diamondDesk: 'ડાયમંડ ડેસ્ક',
    inventory: 'હીરાનો સ્ટોક',
    shapeGuide: 'શેપ ગાઇડ',
    whyNgd: 'NGD શા માટે',
    faq: 'સામાન્ય પ્રશ્નો',
    privacy: 'ગોપનીયતા નીતિ',
    terms: 'નિયમો અને શરતો',
    follow: 'અમને ફૉલો કરો',
    journal: 'જર્નલ',
    feedback: 'ગ્રાહક પ્રતિસાદ',
    rights: 'ચોકસાઈથી તૈયાર · પુરાવા સાથે રજૂ',
    tagline: 'સુરતમાં બનેલા CVD અને HPHT લેબ-ગ્રોન હીરા, દુનિયાભરના ગ્રાહકો માટે.',
  },

  enquiryLine: {
    label: 'હીરા અને કસ્ટમ જ્વેલરીની પૂછપરછ',
  },
};
