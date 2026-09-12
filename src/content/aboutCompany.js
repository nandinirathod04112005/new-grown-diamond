/**
 * Our Story — the company's own words, as the owner supplied them
 * (September 2026).
 *
 * Edited only for grammar and spelling, never for meaning:
 *   "We, at New Grown Diamond, has grown" → "we at New Grown Diamond have grown";
 *   "one of the leading manufacturer, wholesaler and supplier" → plurals;
 *   "Started with natural-mined diamond, We ventured and transformed into" →
 *     "Starting with natural mined diamonds, we ventured into";
 *   "various varieties of diamonds shapes" → "a variety of diamond shapes";
 *   "We are capable to tie up with clients for customized programs" →
 *     "We can also tie up with clients on customised programmes";
 *   "Our Misson" → "Our Mission"; "all around" → "all-round";
 *   capitals mid-sentence (We, Lab-grown) set in sentence case.
 *
 * Every claim below is the owner's own statement about the business.
 *
 * In three languages, read with useCopy / pickCopy (src/i18n/useCopy.js).
 * `en` is the owner's text, as edited above. `hi` and `gu` translate it
 * faithfully: nothing added, nothing dropped, the same voice. Trade words follow
 * src/i18n/glossary.md (कैरेट / કેરેટ, कलर / કલર, सर्टिफिकेट / સર્ટિફિકેટ…);
 * shape names are trade names, written in the local script (glossary row 17).
 * New Grown Diamond, CVD, HPHT, Type IIA, B2B, colour grades, figures and
 * place names are never translated.
 */

export default {
  en: {
    /* The opening paragraph (formerly ABOUT_INTRO). pages/siteContent.js
       carries the same words as the /about intro. */
    intro:
      'Built on the legacy of integrity and honesty, New Grown Diamond is synonymous with excellence and innovation in diamond manufacturing, catering customers worldwide with the finest qualitative lab-grown diamonds and simultaneously elevating the norms of paramount business values.',

    whoWeAre: [
      'Established four decades ago, we at New Grown Diamond have grown to be one of the most respected and trusted diamond manufacturers, with state-of-the-art diamond production facilities in Surat (India) and clientele spread across the globe. Starting with natural mined diamonds, we ventured into the manufacturing of polished lab-grown diamonds in 2012, keeping pace with consumer and industry trends.',
      'Currently, we are one of the leading manufacturers, wholesalers and suppliers of CVD & HPHT lab-grown diamonds, and hold the immense capacity to deliver all sizes of Type IIA, conflict-free and ethically manufactured, certified and non-certified CVD & HPHT lab-grown diamonds to B2B clienteles, retailers and jewellery traders globally — assuring them genuine diamonds at the best and affordable price, with consistency in quality as well as quantity.',
    ],

    /* The qualities the second paragraph names, set as tags. */
    qualities: ['Type IIA', 'Conflict-free', 'Ethically manufactured', 'Certified & non-certified', 'CVD & HPHT'],

    rangeText:
      'We offer a variety of diamond shapes, such as Brilliant Round, Cushion, Heart, Marquise, Pear, Princess, Radiant, Square Radiant, Emerald and Oval. The colour ranges from D to J, in sizes starting from 0.30 to 6.00 carats. We can also tie up with clients on customised programmes for specific ventures.',

    /* The ten shapes, named as the owner names them. `facets` is the key in
       components/product/facets.js; `stretch` draws a rectangular radiant from
       the square one. Neither is text, so the translations below carry only
       `name` and take the drawing from here. */
    shapes: [
      { name: 'Brilliant Round', facets: 'Round' },
      { name: 'Cushion', facets: 'Cushion' },
      { name: 'Heart', facets: 'Heart' },
      { name: 'Marquise', facets: 'Marquise' },
      { name: 'Pear', facets: 'Pear' },
      { name: 'Princess', facets: 'Princess' },
      { name: 'Radiant', facets: 'Radiant', stretch: 0.8 },
      { name: 'Square Radiant', facets: 'Radiant' },
      { name: 'Emerald', facets: 'Emerald' },
      { name: 'Oval', facets: 'Oval' },
    ],

    mission: [
      'With over 40 years of experience with mined diamonds, our team transitioned to lab grown in 2012 after seeing the amazing industry potential and ethical benefits of lab grown diamonds.',
      'It is our commitment to provide the highest quality lab grown diamonds by staying up to date on the latest technologies and innovations. By spreading awareness and education about these genuine diamonds, we hope to provide an all-round superior alternative to mined diamonds and become the predominant leader in the wholesale of lab grown diamonds.',
    ],

    /* Each pillar quotes the mission's own words — in every language, the
       words of that language's mission, so a quote can be found in the
       paragraph above it. */
    pillars: [
      { title: 'Highest quality', quote: 'the highest quality lab grown diamonds' },
      { title: 'Latest technology', quote: 'staying up to date on the latest technologies and innovations' },
      { title: 'Awareness & education', quote: 'spreading awareness and education about these genuine diamonds' },
      { title: 'Wholesale leadership', quote: 'the predominant leader in the wholesale of lab grown diamonds' },
    ],
  },

  hi: {
    intro:
      'सत्यनिष्ठा और ईमानदारी की विरासत पर आधारित New Grown Diamond, हीरा निर्माण में उत्कृष्टता और नवाचार का पर्याय है, जो दुनिया भर के ग्राहकों को बेहतरीन गुणवत्ता वाले लैब-ग्रोन हीरे उपलब्ध कराता है और साथ ही सर्वोपरि व्यावसायिक मूल्यों के मानकों को ऊँचा उठाता है।',

    whoWeAre: [
      'चार दशक पहले स्थापित, New Grown Diamond में हम सबसे सम्मानित और भरोसेमंद हीरा निर्माताओं में से एक बन चुके हैं — Surat (भारत) में अत्याधुनिक हीरा उत्पादन सुविधाओं और दुनिया भर में फैले ग्राहकों के साथ। खदान से निकले प्राकृतिक हीरों से शुरुआत करने के बाद, उपभोक्ताओं और उद्योग के रुझानों के साथ तालमेल रखते हुए, हमने 2012 में पॉलिश्ड लैब-ग्रोन हीरों के निर्माण में कदम रखा।',
      'वर्तमान में हम CVD और HPHT लैब-ग्रोन हीरों के अग्रणी निर्माताओं, थोक विक्रेताओं और आपूर्तिकर्ताओं में से एक हैं। हमारे पास दुनिया भर के B2B ग्राहकों, रिटेलरों और ज्वेलरी व्यापारियों तक हर साइज़ के Type IIA, कॉन्फ्लिक्ट-फ्री और नैतिक रूप से निर्मित, सर्टिफाइड और नॉन-सर्टिफाइड CVD और HPHT लैब-ग्रोन हीरे पहुँचाने की विशाल क्षमता है — और हम उन्हें सबसे अच्छी और किफ़ायती कीमत पर असली हीरों का भरोसा देते हैं, गुणवत्ता के साथ-साथ मात्रा में भी निरंतरता के साथ।',
    ],

    qualities: ['Type IIA', 'कॉन्फ्लिक्ट-फ्री', 'नैतिक रूप से निर्मित', 'सर्टिफाइड और नॉन-सर्टिफाइड', 'CVD और HPHT'],

    rangeText:
      'हम हीरों के कई शेप उपलब्ध कराते हैं, जैसे ब्रिलियंट राउंड, कुशन, हार्ट, मार्कीज़, पियर, प्रिंसेस, रेडिएंट, स्क्वेयर रेडिएंट, एमरल्ड और ओवल। कलर D से J तक है, और साइज़ 0.30 से 6.00 कैरेट तक। विशेष प्रोजेक्ट के लिए हम ग्राहकों के साथ कस्टमाइज़्ड प्रोग्राम पर टाई-अप भी कर सकते हैं।',

    shapes: [
      { name: 'ब्रिलियंट राउंड' },
      { name: 'कुशन' },
      { name: 'हार्ट' },
      { name: 'मार्कीज़' },
      { name: 'पियर' },
      { name: 'प्रिंसेस' },
      { name: 'रेडिएंट' },
      { name: 'स्क्वेयर रेडिएंट' },
      { name: 'एमरल्ड' },
      { name: 'ओवल' },
    ],

    mission: [
      'खदान से निकले हीरों में 40 से अधिक वर्षों के अनुभव के साथ, लैब-ग्रोन हीरों की अद्भुत औद्योगिक संभावनाओं और उनके नैतिक लाभों को देखकर हमारी टीम ने 2012 में लैब-ग्रोन की ओर रुख किया।',
      'नवीनतम तकनीकों और नवाचारों से अपडेट रहकर सर्वोच्च गुणवत्ता वाले लैब-ग्रोन हीरे उपलब्ध कराना हमारी प्रतिबद्धता है। इन असली हीरों के बारे में जागरूकता और जानकारी फैलाकर, हम खदान से निकले हीरों का हर तरह से बेहतर विकल्प देने और लैब-ग्रोन हीरों के थोक व्यापार में सबसे अग्रणी बनने की आशा रखते हैं।',
    ],

    pillars: [
      { title: 'सर्वोच्च गुणवत्ता', quote: 'सर्वोच्च गुणवत्ता वाले लैब-ग्रोन हीरे' },
      { title: 'नवीनतम तकनीक', quote: 'नवीनतम तकनीकों और नवाचारों से अपडेट रहकर' },
      { title: 'जागरूकता और जानकारी', quote: 'इन असली हीरों के बारे में जागरूकता और जानकारी फैलाकर' },
      { title: 'थोक व्यापार में नेतृत्व', quote: 'लैब-ग्रोन हीरों के थोक व्यापार में सबसे अग्रणी' },
    ],
  },

  gu: {
    intro:
      'સત્યનિષ્ઠા અને પ્રામાણિકતાના વારસા પર આધારિત New Grown Diamond હીરા ઉત્પાદનમાં શ્રેષ્ઠતા અને નવીનતાનો પર્યાય છે, જે દુનિયાભરના ગ્રાહકોને ઉત્તમ ગુણવત્તાના લેબ-ગ્રોન હીરા પૂરા પાડે છે અને સાથે સાથે સર્વોપરી વ્યાવસાયિક મૂલ્યોનાં ધોરણોને ઊંચાં લઈ જાય છે.',

    whoWeAre: [
      'ચાર દાયકા પહેલાં સ્થપાયેલ New Grown Diamond ખાતે અમે સૌથી પ્રતિષ્ઠિત અને ભરોસાપાત્ર હીરા ઉત્પાદકોમાંના એક બન્યા છીએ — Surat (ભારત) માં અત્યાધુનિક હીરા ઉત્પાદન સુવિધાઓ અને દુનિયાભરમાં ફેલાયેલા ગ્રાહકો સાથે. ખાણમાંથી નીકળતા કુદરતી હીરાથી શરૂઆત કર્યા બાદ, ઉપભોક્તાઓ અને ઉદ્યોગના વલણો સાથે તાલ મિલાવીને, અમે 2012માં પૉલિશ્ડ લેબ-ગ્રોન હીરાના ઉત્પાદનમાં પ્રવેશ કર્યો.',
      'હાલમાં અમે CVD અને HPHT લેબ-ગ્રોન હીરાના અગ્રણી ઉત્પાદકો, જથ્થાબંધ વેપારીઓ અને સપ્લાયરોમાંના એક છીએ. દુનિયાભરના B2B ગ્રાહકો, રિટેલરો અને જ્વેલરી વેપારીઓ સુધી દરેક સાઇઝના Type IIA, કોન્ફ્લિક્ટ-ફ્રી અને નૈતિક રીતે ઉત્પાદિત, સર્ટિફાઇડ અને નોન-સર્ટિફાઇડ CVD અને HPHT લેબ-ગ્રોન હીરા પહોંચાડવાની અમારી પાસે વિશાળ ક્ષમતા છે — અને અમે તેમને શ્રેષ્ઠ અને પોસાય તેવી કિંમતે અસલી હીરાની ખાતરી આપીએ છીએ, ગુણવત્તા તેમજ જથ્થા બંનેમાં સાતત્ય સાથે.',
    ],

    qualities: ['Type IIA', 'કોન્ફ્લિક્ટ-ફ્રી', 'નૈતિક રીતે ઉત્પાદિત', 'સર્ટિફાઇડ અને નોન-સર્ટિફાઇડ', 'CVD અને HPHT'],

    rangeText:
      'અમે હીરાના વિવિધ શેપ ઉપલબ્ધ કરાવીએ છીએ, જેમ કે બ્રિલિયન્ટ રાઉન્ડ, કુશન, હાર્ટ, માર્કીઝ, પિયર, પ્રિન્સેસ, રેડિયન્ટ, સ્ક્વેર રેડિયન્ટ, એમરલ્ડ અને ઓવલ. કલર D થી J સુધી છે, અને સાઇઝ 0.30 થી 6.00 કેરેટ સુધી. વિશેષ પ્રોજેક્ટ માટે અમે ગ્રાહકો સાથે કસ્ટમાઇઝ્ડ પ્રોગ્રામ પર ટાઇ-અપ પણ કરી શકીએ છીએ.',

    shapes: [
      { name: 'બ્રિલિયન્ટ રાઉન્ડ' },
      { name: 'કુશન' },
      { name: 'હાર્ટ' },
      { name: 'માર્કીઝ' },
      { name: 'પિયર' },
      { name: 'પ્રિન્સેસ' },
      { name: 'રેડિયન્ટ' },
      { name: 'સ્ક્વેર રેડિયન્ટ' },
      { name: 'એમરલ્ડ' },
      { name: 'ઓવલ' },
    ],

    mission: [
      'ખાણમાંથી નીકળતા હીરાના 40થી વધુ વર્ષના અનુભવ સાથે, લેબ-ગ્રોન હીરાની અદ્ભુત ઔદ્યોગિક સંભાવનાઓ અને તેના નૈતિક લાભો જોઈને અમારી ટીમ 2012માં લેબ-ગ્રોન તરફ વળી.',
      'નવીનતમ તકનીકો અને નવીનતાઓ સાથે અપડેટ રહીને ઉચ્ચતમ ગુણવત્તાના લેબ-ગ્રોન હીરા પૂરા પાડવા એ અમારી પ્રતિબદ્ધતા છે. આ અસલી હીરા વિશે જાગૃતિ અને માહિતી ફેલાવીને, અમે ખાણમાંથી નીકળતા હીરાનો દરેક રીતે ચડિયાતો વિકલ્પ આપવાની અને લેબ-ગ્રોન હીરાના જથ્થાબંધ વેપારમાં સૌથી અગ્રણી બનવાની આશા રાખીએ છીએ.',
    ],

    pillars: [
      { title: 'ઉચ્ચતમ ગુણવત્તા', quote: 'ઉચ્ચતમ ગુણવત્તાના લેબ-ગ્રોન હીરા' },
      { title: 'નવીનતમ તકનીક', quote: 'નવીનતમ તકનીકો અને નવીનતાઓ સાથે અપડેટ રહીને' },
      { title: 'જાગૃતિ અને માહિતી', quote: 'આ અસલી હીરા વિશે જાગૃતિ અને માહિતી ફેલાવીને' },
      { title: 'જથ્થાબંધ વેપારમાં નેતૃત્વ', quote: 'લેબ-ગ્રોન હીરાના જથ્થાબંધ વેપારમાં સૌથી અગ્રણી' },
    ],
  },
};

/* Not text: the same in every language. */
export const COLOURS = ['D', 'E', 'F', 'G', 'H', 'I', 'J'];
export const CARATS = [0.3, 0.5, 1, 2, 3, 4, 5, 6];

/* Where the offices are (siteContent OFFICES), as longitude / latitude, for
   the reach illustration. Surat is the hub. City names stay in English in
   every language, and ReachArt places the Mumbai label by this name. */
export const PLACES = [
  { city: 'Surat', lon: 72.83, lat: 21.17, hub: true },
  { city: 'Mumbai', lon: 72.88, lat: 19.08 },
  { city: 'New York', lon: -73.98, lat: 40.76 },
  { city: 'Hong Kong', lon: 114.17, lat: 22.3 },
];
