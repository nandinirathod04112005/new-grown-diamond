/**
 * The article page's words, in the three languages (see src/i18n/useCopy.js).
 *
 * The article itself comes from the archive (translated in
 * src/content/journalPosts.copy.js) or from the Control Centre, shown as
 * written. `notice` is keyed by the page's load status; `fallback` covers any
 * other status.
 */
export default {
  en: {
    journal: 'Journal',
    loading: 'Loading the article',
    notice: {
      error: {
        title: 'This article could not be loaded',
        body: 'Something went wrong fetching it. Please try again shortly.',
      },
      notfound: {
        title: 'This article is not in the journal',
        body: 'The address may have changed, or the piece may not be published yet.',
      },
      fallback: {
        title: 'This article is not in the journal',
        body: 'The address may have changed.',
      },
    },
    all: 'All articles',
    desk: 'Talk to the desk',
    breadcrumb: 'Breadcrumb',
    article: 'Article',
    share: 'Share this article',
    empty: 'This article has no text yet.',
    pager: {
      label: 'Next and previous articles',
      newer: 'Newer',
      older: 'Older',
    },
    feedback: {
      eyebrow: 'Your view',
      title: 'Was this article useful?',
      note: 'Tell us what helped and what was missing. Reviewed feedback is published below the article.',
      none: 'No published feedback on this article yet.',
    },
    related: {
      eyebrow: 'Keep reading',
      title: 'More from the journal',
    },
  },

  hi: {
    journal: 'जर्नल',
    loading: 'लेख लोड हो रहा है',
    notice: {
      error: {
        title: 'यह लेख लोड नहीं हो सका',
        body: 'इसे लाते समय कुछ गड़बड़ हो गई। कृपया थोड़ी देर में फिर कोशिश करें।',
      },
      notfound: {
        title: 'यह लेख जर्नल में नहीं है',
        body: 'हो सकता है इसका लिंक बदल गया हो, या यह लेख अभी प्रकाशित न हुआ हो।',
      },
      fallback: {
        title: 'यह लेख जर्नल में नहीं है',
        body: 'हो सकता है इसका लिंक बदल गया हो।',
      },
    },
    all: 'सभी लेख',
    desk: 'डेस्क से बात करें',
    breadcrumb: 'आप यहाँ हैं',
    article: 'लेख',
    share: 'यह लेख शेयर करें',
    empty: 'इस लेख में अभी कोई टेक्स्ट नहीं है।',
    pager: {
      label: 'अगला और पिछला लेख',
      newer: 'नया',
      older: 'पुराना',
    },
    feedback: {
      eyebrow: 'आपकी राय',
      title: 'क्या यह लेख उपयोगी था?',
      note: 'बताइए कि किस बात से मदद मिली और क्या कमी रह गई। समीक्षा के बाद प्रतिक्रिया लेख के नीचे प्रकाशित की जाती है।',
      none: 'इस लेख पर अभी कोई प्रतिक्रिया प्रकाशित नहीं हुई है।',
    },
    related: {
      eyebrow: 'पढ़ते रहें',
      title: 'जर्नल से और लेख',
    },
  },

  gu: {
    journal: 'જર્નલ',
    loading: 'લેખ લોડ થઈ રહ્યો છે',
    notice: {
      error: {
        title: 'આ લેખ લોડ થઈ શક્યો નથી',
        body: 'તેને લાવતી વખતે કંઈક ખોટું થયું. કૃપા કરીને થોડી વાર પછી ફરી પ્રયાસ કરો.',
      },
      notfound: {
        title: 'આ લેખ જર્નલમાં નથી',
        body: 'કદાચ તેની લિંક બદલાઈ ગઈ હોય, અથવા આ લેખ હજી પ્રકાશિત ન થયો હોય.',
      },
      fallback: {
        title: 'આ લેખ જર્નલમાં નથી',
        body: 'કદાચ તેની લિંક બદલાઈ ગઈ હોય.',
      },
    },
    all: 'બધા લેખ',
    desk: 'ડેસ્ક સાથે વાત કરો',
    breadcrumb: 'તમે અહીં છો',
    article: 'લેખ',
    share: 'આ લેખ શેર કરો',
    empty: 'આ લેખમાં હજી કોઈ લખાણ નથી.',
    pager: {
      label: 'આગલો અને પાછલો લેખ',
      newer: 'નવો',
      older: 'જૂનો',
    },
    feedback: {
      eyebrow: 'તમારો અભિપ્રાય',
      title: 'શું આ લેખ ઉપયોગી હતો?',
      note: 'અમને જણાવો કે શેનાથી મદદ મળી અને શું ખૂટતું હતું. સમીક્ષા પછી પ્રતિસાદ લેખની નીચે પ્રકાશિત થાય છે.',
      none: 'આ લેખ પર હજી કોઈ પ્રતિસાદ પ્રકાશિત થયો નથી.',
    },
    related: {
      eyebrow: 'વાંચતા રહો',
      title: 'જર્નલમાંથી વધુ',
    },
  },
};
