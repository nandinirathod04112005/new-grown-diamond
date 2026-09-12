/**
 * The journal index's words, in the three languages (see src/i18n/useCopy.js).
 *
 * The page's introduction is the old site's own and lives with the archive
 * articles (src/content/journalPosts.copy.js). Article titles and text come
 * from there too, or from the Control Centre as written. New Grown Diamond is
 * never translated.
 *
 * `none.hint` suggests words to search for; in each language they are words
 * the translated articles actually contain.
 */
export default {
  en: {
    eyebrow: 'New Grown Diamond · Journal',
    title: 'The journal',
    search: 'Search the journal',
    clear: 'Clear the search',
    count: {
      one: '{n} article',
      many: '{n} articles',
      matchOne: '{n} article matches “{q}”',
      matchMany: '{n} articles match “{q}”',
    },
    results: 'Search results',
    none: {
      title: 'No articles match “{q}”',
      hint: 'Try a shorter word — “CVD”, “colour”, “buying” — or browse every article.',
      all: 'Show all articles',
    },
    latest: 'Latest',
    readArticle: 'Read the article',
    rows: {
      eyebrow: 'From the journal',
      title: 'More to read',
    },
    readLabel: 'Read “{title}”',
    read: 'Read article',
    more: {
      eyebrow: 'Keep reading',
      title: 'From the archive',
      label: 'More articles',
    },
    recent: 'Recently posted',
    minRead: '{n} min read',
    voices: {
      eyebrow: 'Client feedback',
      title: 'In their words',
      note: 'Read something useful here, or bought from us? Tell us how it went — reviewed feedback is published on this website.',
      share: 'Share your feedback',
      all: 'Read all feedback',
      write: 'Write for the journal',
    },
    editorFailed: 'Newer posts could not be loaded just now. The articles above are all available.',
  },

  hi: {
    eyebrow: 'New Grown Diamond · जर्नल',
    title: 'जर्नल',
    search: 'जर्नल में खोजें',
    clear: 'खोज साफ़ करें',
    count: {
      one: '{n} लेख',
      many: '{n} लेख',
      matchOne: '“{q}” से {n} लेख मेल खाता है',
      matchMany: '“{q}” से {n} लेख मेल खाते हैं',
    },
    results: 'खोज के नतीजे',
    none: {
      title: '“{q}” से कोई लेख मेल नहीं खाता',
      hint: 'कोई छोटा शब्द आज़माएँ — “CVD”, “कलर”, “खरीद” — या सभी लेख देखें।',
      all: 'सभी लेख दिखाएँ',
    },
    latest: 'नवीनतम',
    readArticle: 'लेख पढ़ें',
    rows: {
      eyebrow: 'जर्नल से',
      title: 'पढ़ने के लिए और लेख',
    },
    readLabel: '“{title}” पढ़ें',
    read: 'लेख पढ़ें',
    more: {
      eyebrow: 'पढ़ते रहें',
      title: 'संग्रह से',
      label: 'और लेख',
    },
    recent: 'हाल में प्रकाशित',
    minRead: 'पढ़ने में {n} मिनट',
    voices: {
      eyebrow: 'ग्राहक प्रतिक्रिया',
      title: 'उनके अपने शब्दों में',
      note: 'यहाँ कुछ उपयोगी पढ़ा, या हमसे खरीदारी की? हमें बताइए कि अनुभव कैसा रहा — समीक्षा के बाद प्रतिक्रिया इस वेबसाइट पर प्रकाशित की जाती है।',
      share: 'अपनी प्रतिक्रिया दें',
      all: 'सभी प्रतिक्रियाएँ पढ़ें',
      write: 'जर्नल के लिए लिखें',
    },
    editorFailed: 'नई पोस्ट अभी लोड नहीं हो सकीं। ऊपर दिए गए सभी लेख उपलब्ध हैं।',
  },

  gu: {
    eyebrow: 'New Grown Diamond · જર્નલ',
    title: 'જર્નલ',
    search: 'જર્નલમાં શોધો',
    clear: 'શોધ સાફ કરો',
    count: {
      one: '{n} લેખ',
      many: '{n} લેખ',
      matchOne: '“{q}” સાથે {n} લેખ મેળ ખાય છે',
      matchMany: '“{q}” સાથે {n} લેખ મેળ ખાય છે',
    },
    results: 'શોધનાં પરિણામો',
    none: {
      title: '“{q}” સાથે કોઈ લેખ મેળ ખાતો નથી',
      hint: 'ટૂંકો શબ્દ અજમાવો — “CVD”, “કલર”, “ખરીદ” — અથવા બધા લેખ જુઓ.',
      all: 'બધા લેખ બતાવો',
    },
    latest: 'નવીનતમ',
    readArticle: 'લેખ વાંચો',
    rows: {
      eyebrow: 'જર્નલમાંથી',
      title: 'વાંચવા માટે વધુ',
    },
    readLabel: '“{title}” વાંચો',
    read: 'લેખ વાંચો',
    more: {
      eyebrow: 'વાંચતા રહો',
      title: 'સંગ્રહમાંથી',
      label: 'વધુ લેખ',
    },
    recent: 'તાજેતરમાં પ્રકાશિત',
    minRead: 'વાંચવામાં {n} મિનિટ',
    voices: {
      eyebrow: 'ગ્રાહક પ્રતિસાદ',
      title: 'તેમના જ શબ્દોમાં',
      note: 'અહીં કંઈક ઉપયોગી વાંચ્યું, અથવા અમારી પાસેથી ખરીદી કરી? અનુભવ કેવો રહ્યો તે અમને જણાવો — સમીક્ષા પછી પ્રતિસાદ આ વેબસાઇટ પર પ્રકાશિત થાય છે.',
      share: 'તમારો પ્રતિસાદ આપો',
      all: 'બધા પ્રતિસાદ વાંચો',
      write: 'જર્નલ માટે લખો',
    },
    editorFailed: 'નવી પોસ્ટ હમણાં લોડ થઈ શકી નથી. ઉપરના બધા લેખ ઉપલબ્ધ છે.',
  },
};
