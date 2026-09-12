/**
 * The comparison's words and tables, in the three languages (see
 * src/i18n/useCopy.js).
 *
 * Trade terms follow src/i18n/glossary.md. Figures, formulae, units written as
 * symbols, grade codes (Type Ia, IIb…), CVD, HPHT and New Grown Diamond are
 * never translated.
 *
 * In the translated tables a `null` cell keeps the English cell — a figure or
 * a formula that reads the same in every language — so correcting a number
 * in English corrects it everywhere. `value` and `dp` in ENVIRONMENT are
 * numbers and always come from English.
 *
 * The study title in the source line is a publication's name and stays in
 * English in the component.
 */
export default {
  en: {
    head: {
      eyebrow: 'Side by side',
      title: 'Diamond properties',
      lede: 'Every optical and physical constant below is identical, because both materials are the same one. What differs is where the crystal formed, what the industry around it looks like, and what a laboratory can read in its growth structure.',
    },
    mined: 'Earth mined',
    grown: 'Lab grown',
    tables: {
      properties: { caption: 'Measured physical and optical properties', head: 'Property' },
      basic: { caption: 'Questions a buyer is commonly asked', head: 'Basic facts' },
      industry: { caption: 'Supply and trade conditions', head: 'Advantages for industry' },
      conflict: { caption: 'Provenance and labour', head: 'Conflict diamond' },
    },

    /*
     * Measured properties. These are the rows that are not up for argument: both
     * materials are carbon in the same cubic lattice, and every optical and
     * physical constant below follows from that.
     */
    properties: [
      ['Chemical composition', 'C', 'C'],
      ['Crystalline structure', 'Cubic', 'Cubic'],
      ['Refractive index', '2.42', '2.42'],
      ['Dispersion', '0.044', '0.044'],
      ['Hardness (Mohs)', '10', '10'],
      ['Density', '3.52 g/cm³', '3.52 g/cm³'],
      ['Thermal conductivity', 'Excellent', 'Excellent'],
      ['Unit of measurement', 'Carats', 'Carats'],
      /*
       * Corrected against the source table this page was built from, which read
       * "100% Type IIa" for laboratory-grown. That is not true of this company's
       * own output and contradicts the HPHT note further down the page: CVD growth
       * is typically Type IIa, while HPHT commonly produces nitrogen-bearing Type
       * Ib material. Claiming otherwise would be corrected by the first gemmologist
       * who read it.
       */
      ['Intrinsic purity', 'About 2% are Type IIa', 'CVD is typically Type IIa; HPHT is commonly Type Ib'],
      ['Blue fluorescence', 'Strong to none', 'Usually none to faint'],
      ['Phosphorescence', 'Rare', 'Sometimes, more often in HPHT'],
      ['Colour distribution', 'Even', 'Even'],
    ],

    /* What a buyer is actually asked across the counter. */
    basic: [
      ['Is it a diamond?', 'Yes', 'Yes'],
      ['Is it synthetic?', 'No', 'No'],
      ['Is it fake?', 'No', 'No'],
      ['Is it artificial?', 'No', 'No'],
      ['Is it certified by a laboratory?', 'Yes', 'Yes'],
      ['What is the life expectancy?', 'Forever', 'Forever'],
    ],

    /* Trade conditions rather than gemmology — supply, not stones. */
    industry: [
      ['Origin guaranteed', 'No', 'Yes'],
      ['Security of supply', 'No', 'Yes'],
      ['Security of future growth', 'No', 'Yes'],
      ['Security of employment', 'No', 'Yes'],
    ],

    conflict: [
      ['Is it a conflict diamond?', 'Possibly', 'No'],
      ['Engages bonded labour', 'Possibly', 'No'],
      ['Engages child labour', 'Possibly', 'No'],
    ],

    note: 'The property table states measured constants. The supply, provenance and environmental tables describe industry conditions rather than the stones themselves, and reflect New Grown Diamond’s own position on them.',
    environmentTitle: 'Environmental impact',

    /*
     * Environmental figures.
     *
     * Carried with their source ON THE PAGE, not stated as bare fact. These numbers
     * circulate widely through lab-grown marketing without attribution, and an
     * unsubstantiated environmental claim is a regulatory problem in several of the
     * markets this company sells into, not merely a credibility one. Naming the
     * study — and that it was commissioned by the laboratory-grown sector — lets a
     * reader weigh it, which is what a trade buyer will do anyway.
     */
    environment: [
      {
        metric: 'Land excavated',
        mined: { note: 'Thousands of acres of soil moved', value: 98, dp: 0, unit: 'square feet / carat' },
        grown: { note: 'No soil movement', value: 0.076, dp: 3, unit: 'square feet / carat' },
      },
      {
        metric: 'Carbon emissions',
        mined: { note: 'High air pollution', value: 2011, dp: 0, unit: 'ounces / carat' },
        grown: { note: 'Negligible air pollution', value: 0.001, dp: 3, unit: 'ounces / carat' },
      },
      {
        metric: 'Water usage',
        mined: { note: 'Gallons of water used', value: 127, dp: 0, unit: 'gallons / carat' },
        grown: { note: 'Lower by a factor of seven', value: 18, dp: 0, unit: 'gallons / carat' },
      },
      {
        metric: 'Lost time injury rate',
        mined: { note: 'High-risk work environment', value: 8, dp: 0, unit: 'days / 1,000 employees / year' },
        grown: { note: 'High employee safety standards', value: 0, dp: 0, unit: 'days / 100 employees / year' },
      },
    ],

    /* Either side of the study's title, which stays in English. */
    source: {
      before: 'Figures from ',
      after: ' (Frost & Sullivan, 2014), a study commissioned by the laboratory-grown diamond sector. Independent estimates vary, and energy use per carat depends heavily on the electricity supplying the reactor.',
    },

    natural: {
      title: 'The natural diamond',
      body: 'Natural diamonds formed over a billion years ago in the Earth’s mantle. They are divided into types by their impurities, and when a stone is graded for clarity only those impurities visible to a trained eye at 10× magnification are taken into account.',
    },
    naturalTypes: [
      {
        n: '1',
        title: 'Type Ia',
        body: 'Contains nitrogen, with the atoms grouped in clusters. This is by far the most plentiful kind of natural diamond, and its colour runs from near-colourless to light yellow.',
      },
      {
        n: '2',
        title: 'Type IIb',
        body: 'Carries no measurable nitrogen, and boron instead. Mostly colourless, though it can show light shades of brown or blue. The Hope Diamond is a Type IIb stone.',
      },
    ],

    grownSide: {
      title: 'Laboratory-grown diamonds',
      body: 'Laboratory-grown diamonds share the physical, chemical and optical properties of natural ones. Colourless material is generally Type II; yellow material is generally Type Ib. They are not imitations and not simulants — they are diamond.',
    },
    growthMethods: [
      {
        title: 'High-Pressure High-Temperature (HPHT)',
        body: 'Grows diamond in a press that recreates the pressure and temperature under which natural crystals form. The technique dates to 1955 and was industrial long before it was gemmological. HPHT crystals grow in a cubo-octahedral form, and often start brown or grey before an annealing step brings them to colourless.',
      },
      {
        title: 'Chemical Vapour Deposition (CVD)',
        body: 'Starts with a thin diamond seed in a chamber. A carbon-bearing gas is introduced and energised into a plasma; free carbon settles onto the seed and the crystal extends layer by layer. CVD crystals grow in a tabular form, which is one of the features a grading laboratory reads to identify them.',
      },
    ],
  },

  hi: {
    head: {
      eyebrow: 'आमने-सामने',
      title: 'हीरे के गुण',
      lede: 'नीचे दिया हर ऑप्टिकल और भौतिक स्थिरांक एक जैसा है, क्योंकि दोनों पदार्थ असल में एक ही हैं। फ़र्क इसमें है कि क्रिस्टल कहाँ बना, उसके आसपास का उद्योग कैसा है, और लैब उसकी ग्रोथ संरचना में क्या पढ़ सकती है।',
    },
    mined: 'खदान से निकला',
    grown: 'लैब-ग्रोन',
    tables: {
      properties: { caption: 'मापे गए भौतिक और ऑप्टिकल गुण', head: 'गुण' },
      basic: { caption: 'ख़रीदार से आमतौर पर पूछे जाने वाले सवाल', head: 'बुनियादी तथ्य' },
      industry: { caption: 'आपूर्ति और व्यापार की स्थितियाँ', head: 'उद्योग के लिए फ़ायदे' },
      conflict: { caption: 'स्रोत और श्रम', head: 'कॉन्फ्लिक्ट डायमंड' },
    },
    properties: [
      ['रासायनिक संघटन', null, null],
      ['क्रिस्टल संरचना', 'क्यूबिक', 'क्यूबिक'],
      ['अपवर्तनांक', null, null],
      ['डिस्पर्शन', null, null],
      ['कठोरता (मोह्स)', null, null],
      ['घनत्व', null, null],
      ['ऊष्मा चालकता', 'उत्कृष्ट', 'उत्कृष्ट'],
      ['माप की इकाई', 'कैरेट', 'कैरेट'],
      ['आंतरिक शुद्धता', 'लगभग 2% टाइप IIa होते हैं', 'CVD आमतौर पर टाइप IIa होता है; HPHT अक्सर टाइप Ib होता है'],
      ['नीला फ्लोरेसेंस', 'तेज़ से लेकर बिल्कुल नहीं', 'आमतौर पर बिल्कुल नहीं से हल्का'],
      ['फॉस्फोरेसेंस', 'दुर्लभ', 'कभी-कभी, HPHT में ज़्यादा'],
      ['रंग का वितरण', 'एकसमान', 'एकसमान'],
    ],
    basic: [
      ['क्या यह हीरा है?', 'हाँ', 'हाँ'],
      ['क्या यह सिंथेटिक है?', 'नहीं', 'नहीं'],
      ['क्या यह नकली है?', 'नहीं', 'नहीं'],
      ['क्या यह कृत्रिम है?', 'नहीं', 'नहीं'],
      ['क्या यह किसी लैब से सर्टिफाइड है?', 'हाँ', 'हाँ'],
      ['यह कितने समय तक चलता है?', 'हमेशा', 'हमेशा'],
    ],
    industry: [
      ['उत्पत्ति की गारंटी', 'नहीं', 'हाँ'],
      ['आपूर्ति की सुरक्षा', 'नहीं', 'हाँ'],
      ['भविष्य की वृद्धि की सुरक्षा', 'नहीं', 'हाँ'],
      ['रोज़गार की सुरक्षा', 'नहीं', 'हाँ'],
    ],
    conflict: [
      ['क्या यह कॉन्फ्लिक्ट डायमंड है?', 'संभव है', 'नहीं'],
      ['बंधुआ मज़दूरी का इस्तेमाल', 'संभव है', 'नहीं'],
      ['बाल मज़दूरी का इस्तेमाल', 'संभव है', 'नहीं'],
    ],
    note: 'गुणों वाली तालिका मापे गए स्थिरांक बताती है। आपूर्ति, स्रोत और पर्यावरण से जुड़ी तालिकाएँ हीरों के बजाय उद्योग की स्थितियों का वर्णन करती हैं, और उन पर New Grown Diamond के अपने दृष्टिकोण को दर्शाती हैं।',
    environmentTitle: 'पर्यावरण पर असर',
    environment: [
      {
        metric: 'खोदी गई ज़मीन',
        mined: { note: 'हज़ारों एकड़ मिट्टी हटाई गई', unit: 'वर्ग फ़ुट / कैरेट' },
        grown: { note: 'कोई मिट्टी नहीं हटाई जाती', unit: 'वर्ग फ़ुट / कैरेट' },
      },
      {
        metric: 'कार्बन उत्सर्जन',
        mined: { note: 'ज़्यादा वायु प्रदूषण', unit: 'औंस / कैरेट' },
        grown: { note: 'नगण्य वायु प्रदूषण', unit: 'औंस / कैरेट' },
      },
      {
        metric: 'पानी का उपयोग',
        mined: { note: 'गैलन पानी का इस्तेमाल', unit: 'गैलन / कैरेट' },
        grown: { note: 'सात गुना कम', unit: 'गैलन / कैरेट' },
      },
      {
        metric: 'चोट से काम छूटने की दर',
        mined: { note: 'उच्च जोखिम वाला कार्य-माहौल', unit: 'दिन / 1,000 कर्मचारी / वर्ष' },
        grown: { note: 'कर्मचारियों की सुरक्षा के ऊँचे मानक', unit: 'दिन / 100 कर्मचारी / वर्ष' },
      },
    ],
    source: {
      before: 'ये आंकड़े ',
      after: ' (Frost & Sullivan, 2014) अध्ययन से लिए गए हैं; यह अध्ययन लैब-ग्रोन हीरा क्षेत्र ने करवाया था। स्वतंत्र अनुमान अलग-अलग हैं, और प्रति कैरेट ऊर्जा की खपत काफ़ी हद तक रिएक्टर को मिलने वाली बिजली पर निर्भर करती है।',
    },
    natural: {
      title: 'प्राकृतिक हीरा',
      body: 'प्राकृतिक हीरे एक अरब साल से भी पहले पृथ्वी के मेंटल में बने थे। उनकी अशुद्धियों के आधार पर उन्हें अलग-अलग टाइप में बाँटा जाता है, और जब किसी हीरे की क्लैरिटी ग्रेड की जाती है, तो केवल वही अशुद्धियाँ गिनी जाती हैं जो प्रशिक्षित आँख को 10× मैग्निफ़िकेशन पर दिखती हैं।',
    },
    naturalTypes: [
      {
        title: 'टाइप Ia',
        body: 'इसमें नाइट्रोजन होता है, जिसके परमाणु समूहों में जुड़े रहते हैं। प्राकृतिक हीरों में यह प्रकार बाकी सबसे कहीं ज़्यादा पाया जाता है, और इसका रंग लगभग रंगहीन से हल्के पीले तक होता है।',
      },
      {
        title: 'टाइप IIb',
        body: 'इसमें मापने लायक नाइट्रोजन नहीं होता, उसकी जगह बोरॉन होता है। ज़्यादातर रंगहीन, हालाँकि इसमें भूरे या नीले रंग की हल्की झलक दिख सकती है। होप डायमंड एक टाइप IIb हीरा है।',
      },
    ],
    grownSide: {
      title: 'लैब-ग्रोन हीरे',
      body: 'लैब-ग्रोन हीरों में प्राकृतिक हीरों जैसे ही भौतिक, रासायनिक और ऑप्टिकल गुण होते हैं। रंगहीन मटीरियल आमतौर पर टाइप II होता है; पीला मटीरियल आमतौर पर टाइप Ib होता है। ये नकल नहीं हैं, सिम्युलेंट भी नहीं — ये हीरा ही हैं।',
    },
    growthMethods: [
      {
        title: 'हाई-प्रेशर हाई-टेम्परेचर (HPHT)',
        body: 'हीरे को एक प्रेस में उगाया जाता है, जो वही दबाव और तापमान दोबारा पैदा करता है जिसमें प्राकृतिक क्रिस्टल बनते हैं। यह तकनीक 1955 से चली आ रही है और रत्नों के लिए इस्तेमाल होने से बहुत पहले उद्योग में इस्तेमाल होती थी। HPHT क्रिस्टल क्यूबो-ऑक्टाहेड्रल रूप में उगते हैं, और अक्सर शुरुआत में भूरे या स्लेटी होते हैं, जिसके बाद एनीलिंग का चरण उन्हें रंगहीन बनाता है।',
      },
      {
        title: 'केमिकल वेपर डिपोज़िशन (CVD)',
        body: 'शुरुआत एक चैंबर में रखे हीरे के पतले सीड से होती है। कार्बन वाली गैस अंदर डाली जाती है और ऊर्जा देकर प्लाज़्मा में बदली जाती है; मुक्त कार्बन सीड पर जमता है और क्रिस्टल परत-दर-परत बढ़ता है। CVD क्रिस्टल टेबुलर (चपटे) रूप में उगते हैं, और यह उन विशेषताओं में से एक है जिन्हें पढ़कर ग्रेडिंग लैब उनकी पहचान करती है।',
      },
    ],
  },

  gu: {
    head: {
      eyebrow: 'સામસામે',
      title: 'હીરાના ગુણધર્મો',
      lede: 'નીચે આપેલો દરેક ઑપ્ટિકલ અને ભૌતિક અચળાંક એકસરખો છે, કારણ કે બંને પદાર્થ ખરેખર એક જ છે. ફરક એમાં છે કે ક્રિસ્ટલ ક્યાં બન્યો, તેની આસપાસનો ઉદ્યોગ કેવો છે, અને લેબ તેની ગ્રોથ રચનામાં શું વાંચી શકે છે.',
    },
    mined: 'ખાણમાંથી નીકળેલો',
    grown: 'લેબ-ગ્રોન',
    tables: {
      properties: { caption: 'માપેલા ભૌતિક અને ઑપ્ટિકલ ગુણધર્મો', head: 'ગુણધર્મ' },
      basic: { caption: 'ખરીદનારને સામાન્ય રીતે પૂછાતા પ્રશ્નો', head: 'મૂળભૂત હકીકતો' },
      industry: { caption: 'પુરવઠો અને વેપારની પરિસ્થિતિઓ', head: 'ઉદ્યોગ માટે ફાયદા' },
      conflict: { caption: 'સ્રોત અને શ્રમ', head: 'કૉન્ફ્લિક્ટ ડાયમંડ' },
    },
    properties: [
      ['રાસાયણિક બંધારણ', null, null],
      ['સ્ફટિક રચના', 'ક્યુબિક', 'ક્યુબિક'],
      ['વક્રીભવનાંક', null, null],
      ['ડિસ્પર્શન', null, null],
      ['કઠિનતા (મોહ્સ)', null, null],
      ['ઘનતા', null, null],
      ['ઉષ્માવાહકતા', 'ઉત્કૃષ્ટ', 'ઉત્કૃષ્ટ'],
      ['માપનો એકમ', 'કેરેટ', 'કેરેટ'],
      ['આંતરિક શુદ્ધતા', 'આશરે 2% ટાઇપ IIa હોય છે', 'CVD સામાન્ય રીતે ટાઇપ IIa હોય છે; HPHT મોટે ભાગે ટાઇપ Ib હોય છે'],
      ['વાદળી ફ્લોરેસન્સ', 'તીવ્રથી લઈને બિલકુલ નહીં', 'સામાન્ય રીતે બિલકુલ નહીંથી આછું'],
      ['ફૉસ્ફોરેસન્સ', 'દુર્લભ', 'ક્યારેક, HPHTમાં વધુ'],
      ['રંગનું વિતરણ', 'એકસરખું', 'એકસરખું'],
    ],
    basic: [
      ['શું તે હીરો છે?', 'હા', 'હા'],
      ['શું તે સિન્થેટિક છે?', 'ના', 'ના'],
      ['શું તે નકલી છે?', 'ના', 'ના'],
      ['શું તે કૃત્રિમ છે?', 'ના', 'ના'],
      ['શું તે કોઈ લેબ દ્વારા સર્ટિફાઇડ છે?', 'હા', 'હા'],
      ['તે કેટલો સમય ટકે છે?', 'કાયમ', 'કાયમ'],
    ],
    industry: [
      ['ઉત્પત્તિની ગેરંટી', 'ના', 'હા'],
      ['પુરવઠાની સુરક્ષા', 'ના', 'હા'],
      ['ભવિષ્યના વિકાસની સુરક્ષા', 'ના', 'હા'],
      ['રોજગારની સુરક્ષા', 'ના', 'હા'],
    ],
    conflict: [
      ['શું તે કૉન્ફ્લિક્ટ ડાયમંડ છે?', 'શક્ય છે', 'ના'],
      ['બંધુઆ મજૂરીનો ઉપયોગ', 'શક્ય છે', 'ના'],
      ['બાળ મજૂરીનો ઉપયોગ', 'શક્ય છે', 'ના'],
    ],
    note: 'ગુણધર્મોનું કોષ્ટક માપેલા અચળાંકો જણાવે છે. પુરવઠો, સ્રોત અને પર્યાવરણનાં કોષ્ટકો હીરા કરતાં ઉદ્યોગની પરિસ્થિતિઓનું વર્ણન કરે છે, અને તેના પર New Grown Diamondનો પોતાનો દૃષ્ટિકોણ રજૂ કરે છે.',
    environmentTitle: 'પર્યાવરણ પર અસર',
    environment: [
      {
        metric: 'ખોદાયેલી જમીન',
        mined: { note: 'હજારો એકર માટી ખસેડાઈ', unit: 'ચોરસ ફૂટ / કેરેટ' },
        grown: { note: 'કોઈ માટી ખસેડાતી નથી', unit: 'ચોરસ ફૂટ / કેરેટ' },
      },
      {
        metric: 'કાર્બન ઉત્સર્જન',
        mined: { note: 'વધુ વાયુ પ્રદૂષણ', unit: 'ઔંસ / કેરેટ' },
        grown: { note: 'નહિવત્ વાયુ પ્રદૂષણ', unit: 'ઔંસ / કેરેટ' },
      },
      {
        metric: 'પાણીનો વપરાશ',
        mined: { note: 'ગેલન પાણીનો વપરાશ', unit: 'ગેલન / કેરેટ' },
        grown: { note: 'સાત ગણો ઓછો', unit: 'ગેલન / કેરેટ' },
      },
      {
        metric: 'ઈજાને કારણે કામ છૂટવાનો દર',
        mined: { note: 'ઊંચા જોખમવાળું કાર્યસ્થળ', unit: 'દિવસ / 1,000 કર્મચારી / વર્ષ' },
        grown: { note: 'કર્મચારીઓની સલામતીનાં ઊંચાં ધોરણો', unit: 'દિવસ / 100 કર્મચારી / વર્ષ' },
      },
    ],
    source: {
      before: 'આ આંકડા ',
      after: ' (Frost & Sullivan, 2014) અભ્યાસમાંથી લેવાયા છે; આ અભ્યાસ લેબ-ગ્રોન હીરા ક્ષેત્રે કરાવ્યો હતો. સ્વતંત્ર અંદાજો જુદા જુદા છે, અને કેરેટ દીઠ ઊર્જાનો વપરાશ મોટા ભાગે રિએક્ટરને પૂરી પડાતી વીજળી પર આધાર રાખે છે.',
    },
    natural: {
      title: 'કુદરતી હીરો',
      body: 'કુદરતી હીરા એક અબજ વર્ષથી પણ વધુ પહેલાં પૃથ્વીના મેન્ટલમાં બન્યા હતા. તેમની અશુદ્ધિઓના આધારે તેમને જુદા જુદા ટાઇપમાં વહેંચવામાં આવે છે, અને જ્યારે કોઈ હીરાની ક્લેરિટી ગ્રેડ કરવામાં આવે છે, ત્યારે માત્ર એ જ અશુદ્ધિઓ ગણવામાં આવે છે જે તાલીમ પામેલી આંખને 10× મેગ્નિફિકેશન પર દેખાય છે.',
    },
    naturalTypes: [
      {
        title: 'ટાઇપ Ia',
        body: 'તેમાં નાઇટ્રોજન હોય છે, જેના પરમાણુઓ જૂથમાં ગોઠવાયેલા હોય છે. કુદરતી હીરામાં આ પ્રકાર બીજા બધા કરતાં ઘણો વધારે જોવા મળે છે, અને તેનો રંગ લગભગ રંગહીનથી આછા પીળા સુધીનો હોય છે.',
      },
      {
        title: 'ટાઇપ IIb',
        body: 'તેમાં માપી શકાય તેટલો નાઇટ્રોજન હોતો નથી, તેની જગ્યાએ બોરોન હોય છે. મોટે ભાગે રંગહીન, જોકે તેમાં કથ્થઈ કે વાદળી રંગની આછી ઝાંખી દેખાઈ શકે છે. હોપ ડાયમંડ ટાઇપ IIb હીરો છે.',
      },
    ],
    grownSide: {
      title: 'લેબ-ગ્રોન હીરા',
      body: 'લેબ-ગ્રોન હીરામાં કુદરતી હીરા જેવા જ ભૌતિક, રાસાયણિક અને ઑપ્ટિકલ ગુણધર્મો હોય છે. રંગહીન મટીરિયલ સામાન્ય રીતે ટાઇપ II હોય છે; પીળું મટીરિયલ સામાન્ય રીતે ટાઇપ Ib હોય છે. તે નકલ નથી અને સિમ્યુલન્ટ પણ નથી — તે હીરા જ છે.',
    },
    growthMethods: [
      {
        title: 'હાઇ-પ્રેશર હાઇ-ટેમ્પરેચર (HPHT)',
        body: 'હીરાને એવા પ્રેસમાં ગ્રો કરવામાં આવે છે જે કુદરતી ક્રિસ્ટલ જે દબાણ અને તાપમાનમાં બને છે તે ફરીથી ઊભાં કરે છે. આ ટેક્નિક 1955થી ચાલી આવે છે અને રત્નો માટે ઉપયોગમાં આવી તેના ઘણા પહેલાંથી ઉદ્યોગમાં વપરાતી હતી. HPHT ક્રિસ્ટલ ક્યુબો-ઑક્ટાહેડ્રલ સ્વરૂપમાં ગ્રો થાય છે, અને ઘણી વાર શરૂઆતમાં કથ્થઈ કે રાખોડી હોય છે, પછી એનીલિંગનો તબક્કો તેમને રંગહીન બનાવે છે.',
      },
      {
        title: 'કેમિકલ વેપર ડિપોઝિશન (CVD)',
        body: 'શરૂઆત ચેમ્બરમાં મૂકેલા હીરાના પાતળા સીડથી થાય છે. કાર્બનવાળો ગેસ અંદર દાખલ કરીને ઊર્જા આપી પ્લાઝ્મામાં ફેરવવામાં આવે છે; મુક્ત કાર્બન સીડ પર જમા થાય છે અને ક્રિસ્ટલ સ્તર-દર-સ્તર વધે છે. CVD ક્રિસ્ટલ ટેબ્યુલર (ચપટા) સ્વરૂપમાં ગ્રો થાય છે, અને ગ્રેડિંગ લેબ તેમને ઓળખવા માટે જે લક્ષણો વાંચે છે તેમાંનું આ એક છે.',
      },
    ],
  },
};
