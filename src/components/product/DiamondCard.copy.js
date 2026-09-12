/**
 * The stone card's words, in the three languages (see src/i18n/useCopy.js).
 *
 * Grade labels (colour, clarity, cut, lab) and the enquiry links come from the
 * dictionary's `terms` and `common`. Grades, lab names, stock and report
 * numbers, "ct" and "WhatsApp" are never translated.
 *
 * `availability` is keyed by the value stored on the stone ('In Stock'…),
 * which stays English everywhere it is matched; only what is shown changes. A
 * value not listed here is shown as stored.
 */
export default {
  en: {
    /* Non-breaking spaces, so the number never wraps away from its label. */
    report: 'Report\u00a0#\u00a0{report}',
    alt: '{ct} carat {shape} diamond, {colour} {clarity}',
    noShot: 'Photograph on request',
    featured: 'Featured',
    availability: {
      'In Stock': 'In Stock',
      'On Request': 'On Request',
      Reserved: 'Reserved',
      Sold: 'Sold',
    },
    open: 'View full details of the {ct} carat {shape} diamond, {stock}',
    inspect: 'View full details',
    finish: { polish: 'Polish', sym: 'Sym', fluor: 'Fluor' },
    details: 'Details',
    added: 'Added to selection ✓',
    add: 'Add to selection +',
    unsave: 'Remove {stock} from wishlist',
    save: 'Save {stock} to wishlist',
    savedTitle: 'Saved to wishlist',
    saveTitle: 'Save to wishlist',
  },

  hi: {
    report: 'रिपोर्ट\u00a0#\u00a0{report}',
    alt: '{ct} कैरेट {shape} हीरा, {colour} {clarity}',
    noShot: 'फ़ोटो पूछताछ पर',
    featured: 'विशेष',
    availability: {
      'In Stock': 'उपलब्ध',
      'On Request': 'पूछताछ पर',
      Reserved: 'रिज़र्व',
      Sold: 'बिक गया',
    },
    open: '{ct} कैरेट {shape} हीरे की पूरी जानकारी देखें, {stock}',
    inspect: 'पूरी जानकारी देखें',
    finish: { polish: 'पॉलिश', sym: 'सिमेट्री', fluor: 'फ्लोरेसेंस' },
    details: 'विवरण',
    added: 'चयन में जोड़ा गया ✓',
    add: 'चयन में जोड़ें +',
    unsave: 'विशलिस्ट से {stock} हटाएँ',
    save: 'विशलिस्ट में {stock} सहेजें',
    savedTitle: 'विशलिस्ट में सहेजा गया',
    saveTitle: 'विशलिस्ट में सहेजें',
  },

  gu: {
    report: 'રિપોર્ટ\u00a0#\u00a0{report}',
    alt: '{ct} કેરેટ {shape} હીરો, {colour} {clarity}',
    noShot: 'ફોટો પૂછપરછ પર',
    featured: 'વિશેષ',
    availability: {
      'In Stock': 'ઉપલબ્ધ',
      'On Request': 'પૂછપરછ પર',
      Reserved: 'રિઝર્વ',
      Sold: 'વેચાયેલ',
    },
    open: '{ct} કેરેટ {shape} હીરાની પૂરી વિગતો જુઓ, {stock}',
    inspect: 'પૂરી વિગતો જુઓ',
    finish: { polish: 'પોલિશ', sym: 'સિમેટ્રી', fluor: 'ફ્લોરેસન્સ' },
    details: 'વિગતો',
    added: 'પસંદગીમાં ઉમેર્યું ✓',
    add: 'પસંદગીમાં ઉમેરો +',
    unsave: 'વિશલિસ્ટમાંથી {stock} હટાવો',
    save: 'વિશલિસ્ટમાં {stock} સાચવો',
    savedTitle: 'વિશલિસ્ટમાં સાચવ્યું',
    saveTitle: 'વિશલિસ્ટમાં સાચવો',
  },
};
