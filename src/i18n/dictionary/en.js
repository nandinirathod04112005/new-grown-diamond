/**
 * English — the source of truth.
 *
 * Every key that exists anywhere must exist here, because this is what the
 * other languages fall back to. A key missing from hi.js renders the English
 * string; a key missing from HERE renders the key itself, which is why the
 * provider logs that case as an error rather than a warning.
 *
 * SCOPE. Site chrome, the forms, the auth pages and the key commercial pages
 * are translated. The long editorial pages — education, the CVD-vs-natural
 * comparison, the price and size guides — are deliberately not, and carry a
 * visible notice in Hindi and Gujarati saying so. Half-translating a
 * 2,000-word technical article is worse than not starting it: a reader gets
 * two paragraphs in their language and then hits a wall with no warning.
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
    signIn: 'Sign in',
    signOut: 'Sign out',
    register: 'Create an account',
    admin: 'Inventory desk',
    menu: 'Menu',
    close: 'Close',
    language: 'Language',
    changeLanguage: 'Change language',
    backToSite: 'Back to the site',
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
    rights: 'Grown with precision · Presented with proof',
    tagline: 'CVD and HPHT laboratory-grown diamonds manufactured in Surat for clients worldwide.',
  },

  enquiryLine: {
    label: 'Diamond and custom jewellery enquiries',
  },
};
