/**
 * The twelve stages of CVD production, transcribed from New Grown Diamond's
 * own process plates.
 *
 * The text lives HERE rather than only inside the artwork. Each plate carries
 * its heading and bullets rendered into the picture, which is right for a
 * slide and wrong for a web page: baked-in type cannot be selected, searched,
 * translated, read aloud, or resized, and at phone width it is far too small to
 * read at all. So the words are real HTML and the photograph is cropped to the
 * half that is actually a photograph — see `object-position` in the stylesheet.
 *
 * IN THREE LANGUAGES. `CVD_STEPS` is `{ en, hi, gu }`, read with useCopy (see
 * src/i18n/useCopy.js). English is the source and the only list that carries
 * the step number `n`, which is what matches a step to its plate; the Hindi
 * and Gujarati lists carry the words only, in the same order, and take their
 * numbers from English. Each must keep all twelve entries, and each entry its
 * three points, or that list falls back to English whole. Process words are
 * written the way a Surat CVD technician says them (src/i18n/glossary.md);
 * CVD, IGI, CH₄, H₂, temperatures and units are never translated.
 */
const en = [
  {
    n: 1,
    title: 'Prepare the substrate',
    body: 'A small diamond seed is cleaned and polished to provide a perfect surface for diamond growth.',
    points: ['High-purity diamond seed', 'Cleaned and polished surface', 'Ready for growth'],
    alt: 'A polished square diamond seed plate held in tweezers on a steel surface.',
  },
  {
    n: 2,
    title: 'Load into reactor',
    body: 'The cleaned seeds are placed on a molybdenum holder and loaded into a high-precision CVD reactor.',
    points: ['Seeds set on a molybdenum holder', 'Arranged for uniform growth', 'Loaded into a sealed chamber'],
    alt: 'Diamond seeds arranged on a circular molybdenum holder inside an open reactor chamber.',
  },
  {
    n: 3,
    title: 'Create vacuum',
    body: 'The reactor is sealed and evacuated to a high vacuum, removing air, moisture and contaminants. A clean, low-pressure environment is what makes high-quality growth possible.',
    points: ['Air and moisture removed', 'High vacuum, very low pressure', 'Clean environment for pure growth'],
    alt: 'A sealed CVD reactor beside a turbomolecular pump, its vacuum gauge reading 1.0 × 10⁻⁶ mbar.',
  },
  {
    n: 4,
    title: 'Introduce gases',
    body: 'High-purity methane and hydrogen are introduced into the sealed reactor in precise amounts under controlled conditions.',
    points: ['Ultra-high-purity CH₄ and H₂', 'Precise flow control', 'Controlled and safe process'],
    alt: 'Methane and hydrogen cylinders with regulators feeding gas lines into a CVD reactor.',
  },
  {
    n: 5,
    title: 'Plasma activation',
    body: 'Microwave energy creates a plasma, breaking methane molecules apart and releasing reactive carbon atoms that settle onto the seeds.',
    points: ['Microwave energy generates the plasma', 'Methane is broken into carbon atoms', 'Reactive carbon deposits on the seeds'],
    alt: 'A violet plasma glowing inside a CVD reactor above a holder of diamond seeds.',
  },
  {
    n: 6,
    title: 'Diamond growth',
    body: 'Under high temperature and controlled plasma, carbon deposits on the seeds layer by layer, growing into diamond crystals.',
    points: ['700–1,200°C', 'Low pressure, in the mbar range', 'Continuous growth to the thickness required'],
    alt: 'Diamond plates on a heated reactor stage, each carrying a visibly grown crystal layer.',
  },
  {
    n: 7,
    title: 'Cool and unload',
    body: 'After the growth cycle the reactor is cooled in a controlled manner, the chamber is opened, and the as-grown plates are unloaded for inspection.',
    points: ['Controlled cooling', 'Safe chamber opening', 'As-grown plates removed for inspection'],
    alt: 'Gloved hands lifting a holder of as-grown diamond plates from an opened reactor.',
  },
  {
    n: 8,
    title: 'Inspect as-grown plates',
    body: 'The plates are inspected for quality, growth uniformity and defects using optical and advanced scanning systems.',
    points: ['Visual inspection', 'Raman and photoluminescence mapping', 'Uniformity and thickness checked'],
    alt: 'A technician examining an as-grown diamond plate under a measuring microscope beside an inspection readout.',
  },
  {
    n: 9,
    title: 'Post-growth cleaning',
    body: 'Surface residues — graphite, amorphous carbon and other byproducts — are removed by chemical and ultrasonic cleaning.',
    points: ['Graphite and residues removed', 'Chemical and ultrasonic cleaning', 'Purity maintained for the next stage'],
    alt: 'A diamond plate lifted from an ultrasonic cleaning bath beside deionised water and cleaning solution.',
  },
  {
    n: 10,
    title: 'Laser graphite removal',
    body: 'A precision laser removes the graphite layer and separates the grown diamond from its substrate, ready for seed separation.',
    points: ['High-precision laser', 'Graphite and excess material removed', 'Clean separation without damaging the diamond'],
    alt: 'A laser cutting head removing the graphite layer from a grown diamond plate.',
  },
  {
    n: 11,
    title: 'Cutting and polishing',
    body: 'The rough is planned, cut and polished to bring out brilliance, symmetry and finish.',
    points: ['Precision planning and marking', 'Laser or saw cutting', 'Final quality check'],
    alt: 'A diamond being polished on a rotating scaife, its facets catching the light.',
  },
  {
    n: 12,
    title: 'Independent grading and certification',
    body: 'Each diamond is graded independently by laboratories such as IGI. Inventory is supported with certificates, videos and inspection data.',
    points: ['Graded by IGI and other trusted laboratories', 'Cut, colour, clarity and carat', 'Certificate, video and inspection data'],
    alt: 'A diamond under a grading microscope beside an IGI laboratory-grown grading report.',
  },
];

/* Same order as English; the comment on each entry is its step number. */
const hi = [
  // 01
  {
    title: 'सब्सट्रेट तैयार करना',
    body: 'एक छोटे डायमंड सीड को साफ़ और पॉलिश किया जाता है, ताकि हीरे की ग्रोथ के लिए एकदम सही सतह मिले।',
    points: ['उच्च शुद्धता वाला डायमंड सीड', 'साफ़ और पॉलिश की गई सतह', 'ग्रोथ के लिए तैयार'],
    alt: 'स्टील की सतह पर चिमटी से पकड़ी हुई, पॉलिश की गई चौकोर डायमंड सीड प्लेट।',
  },
  // 02
  {
    title: 'रिएक्टर में लोड करना',
    body: 'साफ़ किए गए सीड मॉलिब्डेनम होल्डर पर रखे जाते हैं और एक अत्यधिक सटीक CVD रिएक्टर में लोड किए जाते हैं।',
    points: ['मॉलिब्डेनम होल्डर पर रखे गए सीड', 'एकसमान ग्रोथ के लिए व्यवस्थित', 'सील किए गए चैंबर में लोड'],
    alt: 'खुले रिएक्टर चैंबर के अंदर गोल मॉलिब्डेनम होल्डर पर सजाए गए डायमंड सीड।',
  },
  // 03
  {
    title: 'वैक्यूम बनाना',
    body: 'रिएक्टर को सील करके उसमें हाई वैक्यूम बनाया जाता है, जिससे हवा, नमी और अशुद्धियाँ बाहर निकल जाती हैं। साफ़, कम दबाव वाला वातावरण ही उच्च गुणवत्ता वाली ग्रोथ को संभव बनाता है।',
    points: ['हवा और नमी हटाई गई', 'हाई वैक्यूम, बहुत कम दबाव', 'शुद्ध ग्रोथ के लिए साफ़ वातावरण'],
    alt: 'टर्बोमॉलिक्यूलर पंप के पास एक सील किया हुआ CVD रिएक्टर, जिसका वैक्यूम गेज 1.0 × 10⁻⁶ mbar दिखा रहा है।',
  },
  // 04
  {
    title: 'गैसें डालना',
    body: 'उच्च शुद्धता वाली मीथेन और हाइड्रोजन को नियंत्रित परिस्थितियों में, सटीक मात्रा में सील किए गए रिएक्टर में डाला जाता है।',
    points: ['अत्यंत उच्च शुद्धता वाली CH₄ और H₂', 'सटीक फ़्लो कंट्रोल', 'नियंत्रित और सुरक्षित प्रक्रिया'],
    alt: 'रेगुलेटर लगे मीथेन और हाइड्रोजन सिलेंडर, जिनकी गैस लाइनें CVD रिएक्टर तक जाती हैं।',
  },
  // 05
  {
    title: 'प्लाज़्मा एक्टिवेशन',
    body: 'माइक्रोवेव ऊर्जा एक प्लाज़्मा बनाती है, जो मीथेन के अणुओं को तोड़ देता है और सक्रिय कार्बन परमाणु छोड़ता है, जो सीड पर आकर जम जाते हैं।',
    points: ['माइक्रोवेव ऊर्जा से प्लाज़्मा बनता है', 'मीथेन टूटकर कार्बन परमाणुओं में बदलती है', 'सक्रिय कार्बन सीड पर जमा होता है'],
    alt: 'CVD रिएक्टर के अंदर डायमंड सीड के होल्डर के ऊपर चमकता बैंगनी प्लाज़्मा।',
  },
  // 06
  {
    title: 'हीरे की ग्रोथ',
    body: 'ऊँचे तापमान और नियंत्रित प्लाज़्मा में कार्बन परत-दर-परत सीड पर जमा होता है और डायमंड क्रिस्टल के रूप में बढ़ता है।',
    points: ['700–1,200°C', 'कम दबाव, mbar रेंज में', 'ज़रूरी मोटाई तक लगातार ग्रोथ'],
    alt: 'गर्म रिएक्टर स्टेज पर रखी डायमंड प्लेटें, जिनमें से हर एक पर ग्रो हुई क्रिस्टल परत साफ़ दिखाई देती है।',
  },
  // 07
  {
    title: 'ठंडा करके अनलोड करना',
    body: 'ग्रोथ साइकिल के बाद रिएक्टर को नियंत्रित तरीके से ठंडा किया जाता है, चैंबर खोला जाता है और एज़-ग्रोन प्लेटों को जाँच के लिए अनलोड किया जाता है।',
    points: ['नियंत्रित कूलिंग', 'चैंबर को सुरक्षित रूप से खोलना', 'जाँच के लिए एज़-ग्रोन प्लेटें निकालना'],
    alt: 'दस्ताने पहने हाथ, जो खुले रिएक्टर से एज़-ग्रोन डायमंड प्लेटों का होल्डर उठा रहे हैं।',
  },
  // 08
  {
    title: 'एज़-ग्रोन प्लेटों की जाँच',
    body: 'ऑप्टिकल और आधुनिक स्कैनिंग सिस्टम से प्लेटों की गुणवत्ता, ग्रोथ की एकरूपता और दोषों की जाँच की जाती है।',
    points: ['विज़ुअल जाँच', 'रमन और फ़ोटोल्यूमिनेसेंस मैपिंग', 'एकरूपता और मोटाई की जाँच'],
    alt: 'जाँच के रीडआउट के पास, मापने वाले माइक्रोस्कोप के नीचे एक एज़-ग्रोन डायमंड प्लेट को परखता तकनीशियन।',
  },
  // 09
  {
    title: 'ग्रोथ के बाद सफ़ाई',
    body: 'सतह पर बचे अवशेष — ग्रेफाइट, अमॉर्फस कार्बन और अन्य बाय-प्रोडक्ट — केमिकल और अल्ट्रासोनिक सफ़ाई से हटाए जाते हैं।',
    points: ['ग्रेफाइट और अवशेष हटाए गए', 'केमिकल और अल्ट्रासोनिक सफ़ाई', 'अगले चरण के लिए शुद्धता बरकरार'],
    alt: 'डीआयनाइज़्ड पानी और क्लीनिंग सॉल्यूशन के पास, अल्ट्रासोनिक क्लीनिंग बाथ से निकाली जा रही डायमंड प्लेट।',
  },
  // 10
  {
    title: 'लेज़र से ग्रेफाइट हटाना',
    body: 'एक सटीक लेज़र ग्रेफाइट की परत हटाता है और ग्रो हुए हीरे को उसके सब्सट्रेट से अलग करता है, जिससे वह सीड सेपरेशन के लिए तैयार हो जाता है।',
    points: ['अत्यधिक सटीक लेज़र', 'ग्रेफाइट और अतिरिक्त मटीरियल हटाया गया', 'हीरे को नुकसान पहुँचाए बिना साफ़ सेपरेशन'],
    alt: 'ग्रो हुई डायमंड प्लेट से ग्रेफाइट की परत हटाता लेज़र कटिंग हेड।',
  },
  // 11
  {
    title: 'कटिंग और पॉलिशिंग',
    body: 'रफ की प्लानिंग, कटिंग और पॉलिशिंग की जाती है, ताकि उसकी चमक, सिमेट्री और फ़िनिश निखरकर सामने आएँ।',
    points: ['सटीक प्लानिंग और मार्किंग', 'लेज़र या सॉ से कटिंग', 'अंतिम गुणवत्ता जाँच'],
    alt: 'घूमते स्काइफ़ पर पॉलिश होता हीरा, जिसके फ़ैसेट रोशनी में चमक रहे हैं।',
  },
  // 12
  {
    title: 'स्वतंत्र ग्रेडिंग और सर्टिफिकेशन',
    body: 'हर हीरे की ग्रेडिंग IGI जैसी लैब द्वारा स्वतंत्र रूप से की जाती है। स्टॉक के साथ सर्टिफिकेट, वीडियो और जाँच का डेटा उपलब्ध रहता है।',
    points: ['IGI और अन्य भरोसेमंद लैब द्वारा ग्रेडिंग', 'कट, कलर, क्लैरिटी और कैरेट', 'सर्टिफिकेट, वीडियो और जाँच का डेटा'],
    alt: 'ग्रेडिंग माइक्रोस्कोप के नीचे रखा हीरा, पास में IGI की लैब-ग्रोन ग्रेडिंग रिपोर्ट।',
  },
];

const gu = [
  // 01
  {
    title: 'સબસ્ટ્રેટ તૈયાર કરવું',
    body: 'એક નાના ડાયમંડ સીડને સાફ કરીને પોલિશ કરવામાં આવે છે, જેથી હીરાના ગ્રોથ માટે એકદમ યોગ્ય સપાટી મળે.',
    points: ['ઉચ્ચ શુદ્ધતાવાળું ડાયમંડ સીડ', 'સાફ અને પોલિશ કરેલી સપાટી', 'ગ્રોથ માટે તૈયાર'],
    alt: 'સ્ટીલની સપાટી પર ચીપિયાથી પકડેલી, પોલિશ કરેલી ચોરસ ડાયમંડ સીડ પ્લેટ.',
  },
  // 02
  {
    title: 'રિએક્ટરમાં લોડ કરવું',
    body: 'સાફ કરેલાં સીડને મોલિબ્ડેનમ હોલ્ડર પર મૂકીને અત્યંત ચોકસાઈવાળા CVD રિએક્ટરમાં લોડ કરવામાં આવે છે.',
    points: ['મોલિબ્ડેનમ હોલ્ડર પર મૂકેલાં સીડ', 'એકસરખા ગ્રોથ માટે ગોઠવેલાં', 'સીલ કરેલી ચેમ્બરમાં લોડ'],
    alt: 'ખુલ્લી રિએક્ટર ચેમ્બરની અંદર ગોળ મોલિબ્ડેનમ હોલ્ડર પર ગોઠવેલાં ડાયમંડ સીડ.',
  },
  // 03
  {
    title: 'વેક્યૂમ બનાવવું',
    body: 'રિએક્ટરને સીલ કરીને તેમાં હાઈ વેક્યૂમ બનાવવામાં આવે છે, જેથી હવા, ભેજ અને અશુદ્ધિઓ બહાર નીકળી જાય છે. સ્વચ્છ, ઓછા દબાણવાળું વાતાવરણ જ ઉચ્ચ ગુણવત્તાવાળો ગ્રોથ શક્ય બનાવે છે.',
    points: ['હવા અને ભેજ દૂર કરાયાં', 'હાઈ વેક્યૂમ, ખૂબ ઓછું દબાણ', 'શુદ્ધ ગ્રોથ માટે સ્વચ્છ વાતાવરણ'],
    alt: 'ટર્બોમોલેક્યુલર પંપ પાસે સીલ કરેલું CVD રિએક્ટર, જેનું વેક્યૂમ ગેજ 1.0 × 10⁻⁶ mbar બતાવે છે.',
  },
  // 04
  {
    title: 'ગેસ દાખલ કરવા',
    body: 'ઉચ્ચ શુદ્ધતાવાળા મિથેન અને હાઇડ્રોજનને નિયંત્રિત સ્થિતિમાં, ચોક્કસ માત્રામાં સીલ કરેલા રિએક્ટરમાં દાખલ કરવામાં આવે છે.',
    points: ['અત્યંત ઉચ્ચ શુદ્ધતાવાળા CH₄ અને H₂', 'ચોક્કસ ફ્લો કંટ્રોલ', 'નિયંત્રિત અને સુરક્ષિત પ્રક્રિયા'],
    alt: 'રેગ્યુલેટર લગાવેલા મિથેન અને હાઇડ્રોજન સિલિન્ડર, જેની ગેસ લાઇન CVD રિએક્ટર સુધી જાય છે.',
  },
  // 05
  {
    title: 'પ્લાઝ્મા એક્ટિવેશન',
    body: 'માઇક્રોવેવ ઊર્જા પ્લાઝ્મા બનાવે છે, જે મિથેનના અણુઓને તોડીને સક્રિય કાર્બન પરમાણુ છૂટા પાડે છે; આ પરમાણુ સીડ પર જમા થાય છે.',
    points: ['માઇક્રોવેવ ઊર્જાથી પ્લાઝ્મા બને છે', 'મિથેન તૂટીને કાર્બન પરમાણુમાં ફેરવાય છે', 'સક્રિય કાર્બન સીડ પર જમા થાય છે'],
    alt: 'CVD રિએક્ટરની અંદર ડાયમંડ સીડના હોલ્ડર ઉપર ઝળહળતો જાંબલી પ્લાઝ્મા.',
  },
  // 06
  {
    title: 'હીરાનો ગ્રોથ',
    body: 'ઊંચા તાપમાન અને નિયંત્રિત પ્લાઝ્મામાં કાર્બન સ્તર દર સ્તર સીડ પર જમા થાય છે અને ડાયમંડ ક્રિસ્ટલ રૂપે વધે છે.',
    points: ['700–1,200°C', 'ઓછું દબાણ, mbar રેન્જમાં', 'જરૂરી જાડાઈ સુધી સતત ગ્રોથ'],
    alt: 'ગરમ રિએક્ટર સ્ટેજ પર મૂકેલી ડાયમંડ પ્લેટ, જેમાંની દરેક પર ગ્રો થયેલું ક્રિસ્ટલ સ્તર સ્પષ્ટ દેખાય છે.',
  },
  // 07
  {
    title: 'ઠંડું કરીને અનલોડ કરવું',
    body: 'ગ્રોથ સાઇકલ પછી રિએક્ટરને નિયંત્રિત રીતે ઠંડું કરવામાં આવે છે, ચેમ્બર ખોલવામાં આવે છે અને એઝ-ગ્રોન પ્લેટને તપાસ માટે અનલોડ કરવામાં આવે છે.',
    points: ['નિયંત્રિત કૂલિંગ', 'ચેમ્બર સુરક્ષિત રીતે ખોલવી', 'તપાસ માટે એઝ-ગ્રોન પ્લેટ બહાર કાઢવી'],
    alt: 'મોજાં પહેરેલા હાથ ખુલ્લા રિએક્ટરમાંથી એઝ-ગ્રોન ડાયમંડ પ્લેટનું હોલ્ડર ઉપાડી રહ્યા છે.',
  },
  // 08
  {
    title: 'એઝ-ગ્રોન પ્લેટની તપાસ',
    body: 'ઓપ્ટિકલ અને આધુનિક સ્કેનિંગ સિસ્ટમ વડે પ્લેટની ગુણવત્તા, ગ્રોથની એકરૂપતા અને ખામીઓની તપાસ કરવામાં આવે છે.',
    points: ['વિઝ્યુઅલ તપાસ', 'રમન અને ફોટોલ્યુમિનેસન્સ મેપિંગ', 'એકરૂપતા અને જાડાઈની ચકાસણી'],
    alt: 'તપાસના રીડઆઉટ પાસે, માપન માઇક્રોસ્કોપ નીચે એઝ-ગ્રોન ડાયમંડ પ્લેટ તપાસતો ટેક્નિશિયન.',
  },
  // 09
  {
    title: 'ગ્રોથ પછીની સફાઈ',
    body: 'સપાટી પરના અવશેષો — ગ્રેફાઇટ, એમોર્ફસ કાર્બન અને અન્ય બાય-પ્રોડક્ટ — કેમિકલ અને અલ્ટ્રાસોનિક સફાઈથી દૂર કરવામાં આવે છે.',
    points: ['ગ્રેફાઇટ અને અવશેષો દૂર કરાયા', 'કેમિકલ અને અલ્ટ્રાસોનિક સફાઈ', 'આગલા તબક્કા માટે શુદ્ધતા જળવાઈ રહે છે'],
    alt: 'ડીઆયોનાઇઝ્ડ પાણી અને ક્લીનિંગ સોલ્યુશન પાસે, અલ્ટ્રાસોનિક ક્લીનિંગ બાથમાંથી બહાર કાઢવામાં આવતી ડાયમંડ પ્લેટ.',
  },
  // 10
  {
    title: 'લેસરથી ગ્રેફાઇટ દૂર કરવું',
    body: 'એક ચોકસાઈવાળું લેસર ગ્રેફાઇટનું સ્તર દૂર કરે છે અને ગ્રો થયેલા હીરાને તેના સબસ્ટ્રેટથી અલગ કરે છે, જેથી તે સીડ સેપરેશન માટે તૈયાર થાય છે.',
    points: ['અત્યંત ચોકસાઈવાળું લેસર', 'ગ્રેફાઇટ અને વધારાનું મટીરિયલ દૂર કરાયું', 'હીરાને નુકસાન કર્યા વગર સ્વચ્છ સેપરેશન'],
    alt: 'ગ્રો થયેલી ડાયમંડ પ્લેટ પરથી ગ્રેફાઇટનું સ્તર દૂર કરતું લેસર કટિંગ હેડ.',
  },
  // 11
  {
    title: 'કટિંગ અને પોલિશિંગ',
    body: 'રફનું પ્લાનિંગ, કટિંગ અને પોલિશિંગ કરવામાં આવે છે, જેથી તેની ચમક, સિમેટ્રી અને ફિનિશ નિખરી ઊઠે.',
    points: ['ચોકસાઈપૂર્વક પ્લાનિંગ અને માર્કિંગ', 'લેસર કટિંગ અથવા સોઇંગ', 'અંતિમ ગુણવત્તા ચકાસણી'],
    alt: 'ફરતી ઘંટી પર પોલિશ થતો હીરો, જેના પાસા પ્રકાશમાં ઝળકી રહ્યા છે.',
  },
  // 12
  {
    title: 'સ્વતંત્ર ગ્રેડિંગ અને સર્ટિફિકેશન',
    body: 'દરેક હીરાનું ગ્રેડિંગ IGI જેવી લેબ દ્વારા સ્વતંત્ર રીતે કરવામાં આવે છે. સ્ટોક સાથે સર્ટિફિકેટ, વીડિયો અને તપાસનો ડેટા ઉપલબ્ધ છે.',
    points: ['IGI અને અન્ય વિશ્વસનીય લેબ દ્વારા ગ્રેડિંગ', 'કટ, કલર, ક્લેરિટી અને કેરેટ', 'સર્ટિફિકેટ, વીડિયો અને તપાસનો ડેટા'],
    alt: 'ગ્રેડિંગ માઇક્રોસ્કોપ નીચે મૂકેલો હીરો, બાજુમાં IGIની લેબ-ગ્રોન ગ્રેડિંગ રિપોર્ટ.',
  },
];

export const CVD_STEPS = { en, hi, gu };
