/**
 * The stock finder's words, in the three languages (see src/i18n/useCopy.js).
 *
 * Group names that match a dictionary term (shape, colour, clarity, cut,
 * polish, symmetry, fluorescence, lab) are read from `terms`. Only LABELS live
 * here: the filter values — shape names, grade codes (D, VVS1, EX, VG, NON),
 * lab names, CVD/HPHT, "3X", "VG+" — are data, stay as they are and are
 * matched the same way in every language. "ct" beside a figure is kept as the
 * trade writes it.
 *
 * Counts come in `one` / `other` pairs, chosen exactly as the English chooses
 * them; a language whose noun does not change says the same thing twice.
 */
export default {
  en: {
    title: 'Find a stone',
    loadingStock: 'Loading stock',
    tally: { one: '{shown} of {total} stone', other: '{shown} of {total} stones' },
    filterCount: { one: '{n} filter', other: '{n} filters' },
    filters: 'Filters',
    clearAll: 'Clear all',
    applied: 'Applied filters',
    remove: 'Remove {label}',
    closeFilters: 'Close filters',
    chosen: '{count} chosen',
    any: 'Any',
    from: '{label} from',
    to: '{label} to',
    grades: '{label} grades',
    anyWeight: 'Any weight',
    caratValue: '{value} carat',
    placeholderFrom: 'From',
    placeholderTo: 'To',
    groups: {
      weight: 'Weight',
      laboratory: 'Laboratory',
      growth: 'Growth',
      stage: 'Stone stage',
    },
    weightBands: 'Weight bands',
    quick: {
      tripleEx: 'Excellent or better in cut, polish and symmetry',
      vgPlus: 'Very Good or better in cut, polish and symmetry',
      reset: 'Reset',
    },
    noReport: 'No report',
    /* The applied-filter chip for a stone with no lab report. */
    none: 'NONE',
    inStockOnly: 'In stock only',
    showStones: 'Show stones',
    show: { one: 'Show {n} stone', other: 'Show {n} stones' },
  },

  hi: {
    title: 'हीरा खोजें',
    loadingStock: 'स्टॉक लोड हो रहा है',
    tally: { one: '{total} हीरे में से {shown}', other: '{total} हीरों में से {shown}' },
    filterCount: { one: '{n} फ़िल्टर', other: '{n} फ़िल्टर' },
    filters: 'फ़िल्टर',
    clearAll: 'सभी हटाएँ',
    applied: 'लागू फ़िल्टर',
    remove: '{label} हटाएँ',
    closeFilters: 'फ़िल्टर बंद करें',
    chosen: '{count} चुने गए',
    any: 'कोई भी',
    from: '{label} से',
    to: '{label} तक',
    grades: '{label} ग्रेड',
    anyWeight: 'कोई भी वज़न',
    caratValue: '{value} कैरेट',
    placeholderFrom: 'से',
    placeholderTo: 'तक',
    groups: {
      weight: 'वज़न',
      laboratory: 'लैब',
      growth: 'ग्रोथ',
      stage: 'हीरे की स्थिति',
    },
    weightBands: 'वज़न की श्रेणियाँ',
    quick: {
      tripleEx: 'कट, पॉलिश और सिमेट्री में Excellent या उससे बेहतर',
      vgPlus: 'कट, पॉलिश और सिमेट्री में Very Good या उससे बेहतर',
      reset: 'रीसेट',
    },
    noReport: 'बिना रिपोर्ट',
    none: 'कोई नहीं',
    inStockOnly: 'केवल उपलब्ध',
    showStones: 'हीरे दिखाएँ',
    show: { one: '{n} हीरा दिखाएँ', other: '{n} हीरे दिखाएँ' },
  },

  gu: {
    title: 'હીરો શોધો',
    loadingStock: 'સ્ટોક લોડ થઈ રહ્યો છે',
    tally: { one: '{total} હીરામાંથી {shown}', other: '{total} હીરામાંથી {shown}' },
    filterCount: { one: '{n} ફિલ્ટર', other: '{n} ફિલ્ટર' },
    filters: 'ફિલ્ટર',
    clearAll: 'બધા હટાવો',
    applied: 'લાગુ કરેલા ફિલ્ટર',
    remove: '{label} હટાવો',
    closeFilters: 'ફિલ્ટર બંધ કરો',
    chosen: '{count} પસંદ કરેલા',
    any: 'કોઈ પણ',
    from: '{label}થી',
    to: '{label} સુધી',
    grades: '{label} ગ્રેડ',
    anyWeight: 'કોઈ પણ વજન',
    caratValue: '{value} કેરેટ',
    placeholderFrom: 'થી',
    placeholderTo: 'સુધી',
    groups: {
      weight: 'વજન',
      laboratory: 'લેબ',
      growth: 'ગ્રોથ',
      stage: 'હીરાની સ્થિતિ',
    },
    weightBands: 'વજનની શ્રેણીઓ',
    quick: {
      tripleEx: 'કટ, પોલિશ અને સિમેટ્રીમાં Excellent કે તેથી વધુ સારું',
      vgPlus: 'કટ, પોલિશ અને સિમેટ્રીમાં Very Good કે તેથી વધુ સારું',
      reset: 'રીસેટ',
    },
    noReport: 'રિપોર્ટ વગર',
    none: 'કોઈ નહીં',
    inStockOnly: 'ફક્ત ઉપલબ્ધ',
    showStones: 'હીરા બતાવો',
    show: { one: '{n} હીરો બતાવો', other: '{n} હીરા બતાવો' },
  },
};
