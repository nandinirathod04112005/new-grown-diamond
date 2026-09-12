/**
 * English — the source of truth.
 *
 * Every key that exists anywhere must exist here, because this is what the
 * other languages fall back to. A key missing from hi.js renders the English
 * string; a key missing from HERE renders the key itself, which is why the
 * provider logs that case as an error rather than a warning.
 *
 * SCOPE. These dictionaries hold the site chrome (header, menu, footer), the
 * trade terms and the shared form and auth wording. Each page's own text lives
 * beside the page in a `<Name>.copy.js` file ({ en, hi, gu }, read with
 * src/i18n/useCopy.js), and the editorial pages' text in
 * src/pages/siteContent.i18n.js, so a page's paragraphs load only with that
 * page. Every public page is translated except the privacy policy and terms,
 * whose legal text stays in English with a notice in Hindi and Gujarati.
 */
export default {
  terms: {
    diamond: 'Diamond',
    diamonds: 'Diamonds',
    labGrown: 'Lab-grown',
    natural: 'Natural',
    carat: 'Carat',
    cut: 'Cut',
    colour: 'Colour',
    clarity: 'Clarity',
    polish: 'Polish',
    symmetry: 'Symmetry',
    fluorescence: 'Fluorescence',
    certificate: 'Certificate',
    report: 'Grading report',
    lab: 'Lab',
    shape: 'Shape',
    stock: 'Stock',
    stockNumber: 'Stock number',
    inStock: 'In stock',
    sold: 'Sold',
    onHold: 'On hold',
    price: 'Price',
    priceOnRequest: 'Price on request',
    enquiry: 'Enquiry',
    jewellery: 'Jewellery',
    customJewellery: 'Custom jewellery',
    metal: 'Metal',
    growth: 'Growth method',
  },

  nav: {
    diamonds: 'Diamonds',
    jewellery: 'Jewellery',
    ourStory: 'Our story',
    education: 'Education',
    blogs: 'Blogs',
    contact: 'Contact',
    account: 'Account',
    login: 'Login',
    logout: 'Logout',
    signIn: 'Sign in',
    signOut: 'Sign out',
    register: 'Create an account',
    admin: 'Inventory desk',
    menu: 'Menu',
    close: 'Close',
    language: 'Language',
    changeLanguage: 'Change language',
    backToSite: 'Back to the site',
    primary: 'Primary',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    siteMenu: 'Site menu',
    cart: 'Cart',
    wishlist: 'Wishlist',
    wishlistSaved: 'Wishlist, {count} saved',
    /* The chevron beside a nav item that opens its list of pages. */
    subPages: '{label} pages',
  },

  /*
   * The Education submenu (EDUCATION_TOPICS in pages/siteContent.js), keyed by
   * each page's route without its leading slash. Here rather than in the page
   * copy because the header is on every page and must not pull the editorial
   * translations into the main bundle to name five links.
   */
  educationTopics: {
    'price-and-size': 'Diamond price and size',
    'cvd-vs-natural': 'Comparison between CVD & natural diamond',
    'why-lab-grown': 'Why choose a lab-grown diamond?',
    shapes: 'Shapes',
    faq: 'FAQ',
  },

  /* The "Continue →" pill at the foot of a page (chrome/ContinueNext.jsx).
     Its destinations reuse the nav labels; only these two are its own. */
  continueNext: {
    continue: 'Continue',
    journal: 'The journal',
  },

  common: {
    loading: 'Loading…',
    error: 'Something went wrong.',
    retry: 'Try again',
    required: 'Required',
    optional: 'Optional',
    submit: 'Submit',
    cancel: 'Cancel',
    save: 'Save',
    search: 'Search',
    readMore: 'Read more',
    viewAll: 'View all',
    learnMore: 'Learn more',
    getInTouch: 'Get in touch',
    callTheDesk: 'Or call the desk',
    talkItThrough: 'Or talk it through',
    enquireOnWhatsApp: 'Enquire on WhatsApp',
    writtenEnquiry: 'Send a written enquiry',
    enquireAboutStone: 'Enquire about this stone',
    requestInventory: 'Request current inventory',
    exploreDiamonds: 'Explore diamonds',
  },

  /* Shown at the top of a page whose body copy is still English. */
  notice: {
    englishOnly: 'This page is available in English only for now.',
    englishOnlyBody:
      'The rest of the site is in {language}. We are translating this page and it will follow.',
  },

  auth: {
    signInTitle: 'Sign in',
    signInIntro: 'Access your account, saved enquiries and grading reports.',
    registerTitle: 'Create an account',
    registerIntro:
      'For retailers, jewellers and trade partners. Track enquiries and request grading reports.',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm password',
    fullName: 'Full name',
    yourName: 'Your name',
    accountType: 'Account type',
    customer: 'Customer',
    customerBlurb: 'Browse stock, send enquiries, keep your reports.',
    administrator: 'Administrator',
    administratorBlurb: 'Staff only. Needs the staff access code.',
    staffCode: 'Staff access code',
    staffCodeHint:
      'Ask an existing administrator. The code is checked on the server before a staff account is created.',
    minChars: 'At least {n} characters.',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    forgotPassword: 'Forgot your password?',
    noAccount: 'No account yet?',
    createOne: 'Create one',
    alreadyRegistered: 'Already registered?',
    signingIn: 'Signing in…',
    creating: 'Creating…',
    checkEmail: 'Check your email',
    checkEmailBody: 'Your account is not active yet.',
    goToAccount: 'Go to your account',
    browseInventory: 'Browse the inventory',
  },

  validation: {
    emailRequired: 'Enter your email address.',
    emailInvalid: 'That does not look like an email address.',
    emailTooLong: 'That email address is too long.',
    passwordRequired: 'Enter your password.',
    passwordShort: 'Use at least {n} characters.',
    confirmRequired: 'Repeat your password.',
    passwordsDiffer: 'The two passwords do not match.',
    fieldRequired: 'Enter your {field}.',
    codeRequired: 'Enter the staff access code.',
    codeWrong: 'That staff code is not correct.',
    noMatch: 'That email and password do not match an account.',
  },

  footer: {
    explore: 'Explore',
    company: 'Company',
    diamondDesk: 'Diamond desk',
    inventory: 'Diamond inventory',
    shapeGuide: 'Shape guide',
    whyNgd: 'Why NGD',
    faq: 'FAQ',
    privacy: 'Privacy policy',
    terms: 'Terms & conditions',
    follow: 'Follow us',
    journal: 'Journal',
    feedback: 'Client feedback',
    rights: 'Grown with precision · Presented with proof',
    tagline: 'CVD and HPHT laboratory-grown diamonds manufactured in Surat for clients worldwide.',
  },

  enquiryLine: {
    label: 'Diamond and custom jewellery enquiries',
  },
};
