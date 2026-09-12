import { PROPORTIONS, RATIO, SHAPE_GRID } from './sizeData.js';

/**
 * The size guide's words, in the three languages (see src/i18n/useCopy.js).
 *
 * The figures stay in sizeData.js. The two charts that are nothing but figures
 * (round and melee sizes) are not repeated here at all; the proportion and
 * ratio rows are, because their labels and "or" need translating. In those
 * rows a `null` cell keeps the English cell, so a pure figure corrected in
 * sizeData.js is corrected in every language; a cell mixing figures and words
 * repeats the figures and must be corrected here too.
 *
 * Shape names are trade names, transliterated per glossary row 17. The English
 * name stays the key: it is also what ShapeGlyph draws from.
 *
 * Cut grades (Excellent, Very good, Good) are said in English by the trade and
 * are transliterated; "ct" and "mm" are units and stay as they are.
 */
export default {
  en: {
    head: {
      eyebrow: 'Carat to millimetre',
      title: 'Diamond sizes in millimetres',
      lede: 'Carat is a weight, not a width. These are the sizes a well-cut stone tends to produce, the shapes we cut, and the proportions that decide whether a given weight spreads across the finger or hides below the girdle.',
    },
    shapesTitle: 'The shapes we cut',
    shapes: Object.fromEntries(SHAPE_GRID.map((shape) => [shape, shape])),
    round: {
      caption: 'Brilliant round cut — 0.21 to 5.20 ct',
      head: ['Carat weight (ct)', 'Diameter (mm)'],
    },
    melee: {
      caption: 'Round melee — 0.005 to 0.20 ct, with sieve sizes',
      head: ['Carat weight (ct)', 'Size (mm)', 'Stones per carat', 'Sieve size'],
    },
    proportionsTable: {
      caption: 'Ideal table and depth, brilliant round cut',
      head: ['Proportion', 'Excellent', 'Very good', 'Good'],
    },
    ratioTable: {
      caption: 'Ideal length to width ratio',
      head: ['Measure', 'Excellent / very good', 'Good'],
    },
    proportions: PROPORTIONS,
    ratio: RATIO,
    caveat: 'Sizes are approximate and follow cut proportions rather than weight alone — a deeper stone of the same carat measures smaller across the top. Exact measurements for any individual stone are recorded on its grading report.',
    /* Around the two links, in reading order. */
    quote: {
      before: 'Per-carat rates are not published here because they move. For a current figure on a specific shape, weight and quality, or for a size not listed above, ',
      desk: 'tell the desk what you need',
      or: ' or ',
      stock: 'search live stock',
      after: '.',
    },
  },

  hi: {
    head: {
      eyebrow: 'कैरेट से मिलीमीटर',
      title: 'मिलीमीटर में हीरों के साइज़',
      lede: 'कैरेट वज़न है, चौड़ाई नहीं। ये वे साइज़ हैं जो अच्छी तरह कटा हीरा आमतौर पर देता है, वे शेप जो हम काटते हैं, और वे अनुपात जो तय करते हैं कि कोई वज़न उंगली पर फैला दिखेगा या गर्डल के नीचे छिप जाएगा।',
    },
    shapesTitle: 'जो शेप हम काटते हैं',
    shapes: {
      Round: 'राउंड',
      Princess: 'प्रिंसेस',
      Cushion: 'कुशन',
      'Rec Cushion': 'रेक कुशन',
      Oval: 'ओवल',
      Pear: 'पियर',
      Emerald: 'एमरल्ड',
      Asscher: 'एशर',
      Radiant: 'रेडिएंट',
      'Rec Radiant': 'रेक रेडिएंट',
      Heart: 'हार्ट',
      Marquise: 'मार्क्विज़',
      Baguette: 'बैगेट',
      'Tap Baguette': 'टैप बैगेट',
      Carre: 'कैरे',
      Trapezoid: 'ट्रैपेज़ॉइड',
      'Half Moon': 'हाफ़ मून',
      Bullet: 'बुलेट',
      'Tapered Bullet': 'टेपर्ड बुलेट',
      Shield: 'शील्ड',
      Trilliant: 'ट्रिलियंट',
      Calf: 'काफ़',
      Hexagon: 'हेक्सागन',
    },
    round: {
      caption: 'ब्रिलियंट राउंड कट — 0.21 से 5.20 ct',
      head: ['कैरेट वज़न (ct)', 'व्यास (mm)'],
    },
    melee: {
      caption: 'राउंड मेली — 0.005 से 0.20 ct, सीव साइज़ के साथ',
      head: ['कैरेट वज़न (ct)', 'साइज़ (mm)', 'प्रति कैरेट नग', 'सीव साइज़'],
    },
    proportionsTable: {
      caption: 'आदर्श टेबल और डेप्थ, ब्रिलियंट राउंड कट',
      head: ['अनुपात', 'एक्सीलेंट', 'वेरी गुड', 'गुड'],
    },
    ratioTable: {
      caption: 'लंबाई और चौड़ाई का आदर्श अनुपात',
      head: ['माप', 'एक्सीलेंट / वेरी गुड', 'गुड'],
    },
    proportions: [
      ['टेबल %', null, '52 – 53% या 58 – 60%', '51% या 61 – 64%'],
      ['डेप्थ %', null, '58 – 58.9% या 62.4 – 63.5%', '57.5 – 57.9% या 63.6 – 64.1%'],
      ['क्राउन एंगल', null, '32.1 – 33.9° या 35 – 35.9°', '30.1 – 32° या 36 – 37.9°'],
      ['पैवेलियन डेप्थ %', null, '42 – 42.7% या 43.3 – 43.9%', '41 – 41.9% या 44 – 45.5%'],
      ['गर्डल', 'पतले से थोड़ा मोटा', 'बहुत पतले से थोड़ा मोटा', 'बहुत पतले से मोटा'],
      ['क्यूलेट', 'नहीं', 'बहुत छोटा', 'छोटा'],
    ],
    ratio: [
      ['लंबाई और चौड़ाई', null, null],
    ],
    caveat: 'साइज़ अनुमानित हैं और केवल वज़न पर नहीं, बल्कि कट के अनुपात पर भी निर्भर करते हैं — उसी कैरेट का ज़्यादा गहरा हीरा ऊपर से कम चौड़ा मापता है। किसी भी हीरे का सटीक माप उसकी ग्रेडिंग रिपोर्ट पर दर्ज होता है।',
    quote: {
      before: 'प्रति कैरेट रेट यहाँ प्रकाशित नहीं किए जाते, क्योंकि वे बदलते रहते हैं। किसी खास शेप, वज़न और क्वालिटी का मौजूदा रेट जानने के लिए, या ऊपर न दिए गए किसी साइज़ के लिए, ',
      desk: 'डेस्क को बताएँ कि आपको क्या चाहिए',
      or: ' या ',
      stock: 'लाइव स्टॉक में खोजें',
      after: '।',
    },
  },

  gu: {
    head: {
      eyebrow: 'કેરેટથી મિલીમીટર',
      title: 'મિલીમીટરમાં હીરાની સાઇઝ',
      lede: 'કેરેટ વજન છે, પહોળાઈ નહીં. આ એ સાઇઝ છે જે સારી રીતે કપાયેલો હીરો સામાન્ય રીતે આપે છે, એ શેપ જે અમે કાપીએ છીએ, અને એ પ્રમાણ જે નક્કી કરે છે કે આપેલું વજન આંગળી પર ફેલાયેલું દેખાશે કે ગર્ડલની નીચે છુપાઈ જશે.',
    },
    shapesTitle: 'અમે કાપીએ છીએ એ શેપ',
    shapes: {
      Round: 'રાઉન્ડ',
      Princess: 'પ્રિન્સેસ',
      Cushion: 'કુશન',
      'Rec Cushion': 'રેક કુશન',
      Oval: 'ઓવલ',
      Pear: 'પિયર',
      Emerald: 'એમરલ્ડ',
      Asscher: 'એશર',
      Radiant: 'રેડિયન્ટ',
      'Rec Radiant': 'રેક રેડિયન્ટ',
      Heart: 'હાર્ટ',
      Marquise: 'માર્કીઝ',
      Baguette: 'બેગેટ',
      'Tap Baguette': 'ટેપ બેગેટ',
      Carre: 'કેરે',
      Trapezoid: 'ટ્રેપેઝોઇડ',
      'Half Moon': 'હાફ મૂન',
      Bullet: 'બુલેટ',
      'Tapered Bullet': 'ટેપર્ડ બુલેટ',
      Shield: 'શીલ્ડ',
      Trilliant: 'ટ્રિલિયન્ટ',
      Calf: 'કાફ',
      Hexagon: 'હેક્સાગોન',
    },
    round: {
      caption: 'બ્રિલિયન્ટ રાઉન્ડ કટ — 0.21થી 5.20 ct',
      head: ['કેરેટ વજન (ct)', 'વ્યાસ (mm)'],
    },
    melee: {
      caption: 'રાઉન્ડ મેલી — 0.005થી 0.20 ct, સીવ સાઇઝ સાથે',
      head: ['કેરેટ વજન (ct)', 'સાઇઝ (mm)', 'કેરેટ દીઠ નંગ', 'સીવ સાઇઝ'],
    },
    proportionsTable: {
      caption: 'આદર્શ ટેબલ અને ડેપ્થ, બ્રિલિયન્ટ રાઉન્ડ કટ',
      head: ['પ્રમાણ', 'એક્સેલન્ટ', 'વેરી ગુડ', 'ગુડ'],
    },
    ratioTable: {
      caption: 'લંબાઈ અને પહોળાઈનું આદર્શ પ્રમાણ',
      head: ['માપ', 'એક્સેલન્ટ / વેરી ગુડ', 'ગુડ'],
    },
    proportions: [
      ['ટેબલ %', null, '52 – 53% અથવા 58 – 60%', '51% અથવા 61 – 64%'],
      ['ડેપ્થ %', null, '58 – 58.9% અથવા 62.4 – 63.5%', '57.5 – 57.9% અથવા 63.6 – 64.1%'],
      ['ક્રાઉન એંગલ', null, '32.1 – 33.9° અથવા 35 – 35.9°', '30.1 – 32° અથવા 36 – 37.9°'],
      ['પેવેલિયન ડેપ્થ %', null, '42 – 42.7% અથવા 43.3 – 43.9%', '41 – 41.9% અથવા 44 – 45.5%'],
      ['ગર્ડલ', 'પાતળાથી સહેજ જાડા', 'ખૂબ પાતળાથી સહેજ જાડા', 'ખૂબ પાતળાથી જાડા'],
      ['ક્યુલેટ', 'નહીં', 'ખૂબ નાનું', 'નાનું'],
    ],
    ratio: [
      ['લંબાઈ અને પહોળાઈ', null, null],
    ],
    caveat: 'સાઇઝ અંદાજિત છે અને ફક્ત વજન પર નહીં, પણ કટના પ્રમાણ પર આધાર રાખે છે — એ જ કેરેટનો વધુ ઊંડો હીરો ઉપરથી ઓછો પહોળો મપાય છે. કોઈ પણ હીરાનાં ચોક્કસ માપ તેના ગ્રેડિંગ રિપોર્ટ પર નોંધાયેલાં હોય છે.',
    quote: {
      before: 'કેરેટ દીઠ રેટ અહીં પ્રકાશિત કરવામાં આવતા નથી, કારણ કે તે બદલાતા રહે છે. કોઈ ચોક્કસ શેપ, વજન અને ક્વૉલિટીનો હાલનો રેટ જાણવા માટે, અથવા ઉપર ન આપેલી કોઈ સાઇઝ માટે, ',
      desk: 'ડેસ્કને જણાવો કે તમને શું જોઈએ છે',
      or: ' અથવા ',
      stock: 'લાઇવ સ્ટોકમાં શોધો',
      after: '.',
    },
  },
};
