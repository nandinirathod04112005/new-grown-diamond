/**
 * The wishlist page's words, in the three languages (see
 * src/i18n/useCopy.js). "Price on request" and "Explore diamonds" come from
 * the site dictionaries.
 *
 * Stock numbers, carats, shapes, grades and a stone's availability badge are
 * the inventory's own values and are never translated. `title.lead` +
 * `title.em` make the heading.
 */
export default {
  en: {
    eyebrow: 'Saved stones / {n}',
    title: { lead: 'Your ', em: 'wishlist.' },
    intro: 'Stones you have kept aside to compare. Move them to your selection when you want the desk to confirm availability and price.',
    empty: {
      title: 'Nothing saved yet.',
      body: 'Tap the heart on any stone in the inventory to keep it here.',
    },
    status: {
      checking: 'Checking current availability…',
      done: 'Availability checked against live stock just now.',
      failed: 'Live availability could not be checked. Showing stones as saved.',
      off: 'Showing stones as saved.',
    },
    addAll: 'Add {n} to selection',
    allIn: 'All in your selection',
    clear: 'Clear wishlist',
    view: 'View full details of the {carat} carat {shape} diamond, {stock}',
    gone: 'No longer listed',
    inSelection: 'In your selection ✓',
    add: 'Add to selection',
    removeLabel: 'Remove {stock} from wishlist',
    note: 'Saved on this device. Clearing your browser data clears this list.',
    back: 'Continue browsing',
  },

  hi: {
    eyebrow: 'सहेजे गए हीरे / {n}',
    title: { lead: 'आपकी ', em: 'विशलिस्ट।' },
    intro: 'तुलना के लिए अलग रखे गए हीरे। जब आप चाहें कि डेस्क उपलब्धता और कीमत की पुष्टि करे, तब इन्हें अपने चयन में डालें।',
    empty: {
      title: 'अभी कुछ सहेजा नहीं गया है।',
      body: 'किसी भी हीरे को यहाँ रखने के लिए, स्टॉक में उस पर बने दिल के निशान पर टैप करें।',
    },
    status: {
      checking: 'मौजूदा उपलब्धता जाँची जा रही है…',
      done: 'उपलब्धता अभी-अभी लाइव स्टॉक से जाँची गई।',
      failed: 'लाइव उपलब्धता जाँची नहीं जा सकी। हीरे उसी रूप में दिखाए जा रहे हैं, जैसे सहेजे गए थे।',
      off: 'हीरे उसी रूप में दिखाए जा रहे हैं, जैसे सहेजे गए थे।',
    },
    addAll: 'चयन में {n} जोड़ें',
    allIn: 'सभी आपके चयन में हैं',
    clear: 'विशलिस्ट खाली करें',
    view: '{carat} कैरेट {shape} हीरे का पूरा विवरण देखें, {stock}',
    gone: 'अब सूची में नहीं',
    inSelection: 'आपके चयन में ✓',
    add: 'चयन में जोड़ें',
    removeLabel: '{stock} को विशलिस्ट से हटाएँ',
    note: 'इसी डिवाइस पर सहेजा गया। ब्राउज़र डेटा साफ़ करने से यह सूची भी साफ़ हो जाएगी।',
    back: 'देखना जारी रखें',
  },

  gu: {
    eyebrow: 'સાચવેલા હીરા / {n}',
    title: { lead: 'તમારી ', em: 'વિશલિસ્ટ.' },
    intro: 'સરખામણી માટે અલગ રાખેલા હીરા. ડેસ્ક ઉપલબ્ધતા અને કિંમતની પુષ્ટિ કરે એવું તમે ઇચ્છો ત્યારે તેમને તમારી પસંદગીમાં ઉમેરો.',
    empty: {
      title: 'હજી કંઈ સાચવ્યું નથી.',
      body: 'કોઈપણ હીરાને અહીં રાખવા માટે, સ્ટોકમાં તેના પરના હાર્ટ પર ટૅપ કરો.',
    },
    status: {
      checking: 'હાલની ઉપલબ્ધતા તપાસી રહ્યા છીએ…',
      done: 'ઉપલબ્ધતા હમણાં જ લાઇવ સ્ટોક સાથે તપાસી.',
      failed: 'લાઇવ ઉપલબ્ધતા તપાસી શકાઈ નથી. હીરા જે રીતે સાચવ્યા હતા તે રીતે બતાવી રહ્યા છીએ.',
      off: 'હીરા જે રીતે સાચવ્યા હતા તે રીતે બતાવી રહ્યા છીએ.',
    },
    addAll: 'પસંદગીમાં {n} ઉમેરો',
    allIn: 'બધા તમારી પસંદગીમાં છે',
    clear: 'વિશલિસ્ટ ખાલી કરો',
    view: '{carat} કેરેટ {shape} હીરાની પૂરી વિગતો જુઓ, {stock}',
    gone: 'હવે લિસ્ટમાં નથી',
    inSelection: 'તમારી પસંદગીમાં ✓',
    add: 'પસંદગીમાં ઉમેરો',
    removeLabel: '{stock} ને વિશલિસ્ટમાંથી દૂર કરો',
    note: 'આ ડિવાઇસ પર સાચવેલું. બ્રાઉઝર ડેટા સાફ કરવાથી આ યાદી પણ સાફ થઈ જશે.',
    back: 'જોવાનું ચાલુ રાખો',
  },
};
