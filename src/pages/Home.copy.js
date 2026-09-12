/**
 * The home page's words, in the three languages (see src/i18n/useCopy.js).
 *
 * Trade terms follow src/i18n/glossary.md: carat, cut, colour, clarity, shape,
 * certificate, facet and setting are written as the trade says them, in the
 * local script. Office cities, addresses, phone numbers and email addresses are
 * never translated; the country over each office is.
 *
 * A heading with an emphasised ending is split into its plain part and its
 * `accent` (the <em>); a heading set on two or three lines is split by line.
 */
export default {
  en: {
    hero: {
      eyebrow: 'LAB-GROWN. EXCEPTIONALLY CRAFTED.',
      title: { line1: 'A new origin.', line2: 'An everlasting', accent: 'brilliance.' },
      intro: 'Extraordinary diamonds, thoughtfully grown. Discover a world of possibility in every cut, every facet, every new beginning.',
      explore: 'Explore diamonds',
      story: 'Our story',
      note: { line1: 'Independently graded.', line2: 'Brilliance you can believe in.' },
      artTop: 'THE NEW STANDARD OF BRILLIANCE',
      imageAlt: 'A round brilliant lab-grown diamond in an ivory and sage studio setting',
      artIndex: '01 / THE ROUND BRILLIANT',
      artLine1: 'Exceptional by nature.',
      artLine2: 'Extraordinary by design.',
      shapesLink: 'Discover diamond shapes',
    },
    trust: {
      real: 'Real diamonds',
      certified: 'Independent certification',
      precision: 'Precision in every facet',
      locations: 'Four global locations',
    },
    shapes: {
      eyebrow: 'A SHAPE FOR EVERY STORY',
      title: 'Find your kind of',
      accent: 'brilliance.',
      link: 'Discover all shapes',
    },
    story: {
      imageAlt: 'Illustration of the journey from diamond seed to finished stone',
      caption: 'SEED TO STONE · ILLUSTRATION',
      eyebrow: 'REAL DIAMONDS. A DIFFERENT BEGINNING.',
      title: 'Remarkable by science.',
      accent: 'Beautiful by design.',
      p1: 'It begins with a seed. Through carefully controlled CVD and HPHT processes, carbon becomes something extraordinary: a real diamond, ready for a lifetime of meaning.',
      p2: 'From selecting the rough to the final polish, our focus is simple. Beautiful stones. Precise craftsmanship. Confidence in every choice.',
      link: 'Discover lab-grown diamonds',
    },
    jewellery: {
      eyebrow: 'CUSTOMISED JEWELLERY SERVICE',
      title: { line1: 'Some stories deserve', line2: 'their own', accent: 'setting.' },
      body: 'A meaningful detail. A one-of-a-kind moment. Let us help turn your chosen diamond into a piece that feels entirely yours.',
      explore: 'Explore custom jewellery',
      talk: 'Speak with our team',
      imageAlt: 'Diamond jewellery showcasing a custom setting',
    },
    faq: {
      eyebrow: 'A LITTLE CLARITY',
      title: 'Good questions.',
      accent: 'Brilliant answers.',
      link: 'Visit our knowledge centre',
    },
    /* [question, answer], in the order they are shown. */
    questions: [
      ['Are lab-grown diamonds real diamonds?', 'Yes. Lab-grown diamonds are crystallized carbon, with the same physical, chemical and optical properties as natural diamonds. The difference is their origin.'],
      ['Can I see a diamond’s grading report?', 'Our team can share the available independent grading report, specifications and videos for your selected stone. Contact us to arrange an inspection.'],
      ['Do you offer custom jewellery?', 'Yes. Share your preferred diamond shape, setting, metal and budget with our team. We will help you explore a piece made around your requirements.'],
      ['How do I request wholesale inventory?', 'Send your preferred shapes, carat range, colour, clarity and quantity to newgrowndiamonds@gmail.com, or call +91 99139 99794.'],
    ],
    locations: {
      eyebrow: 'ROOTED IN SURAT. CONNECTED TO THE WORLD.',
      title: 'Brilliance,',
      accent: 'without borders.',
      link: 'Let’s connect',
      countries: { india: 'INDIA', usa: 'USA', hongKong: 'HONG KONG' },
    },
  },

  hi: {
    hero: {
      eyebrow: 'लैब-ग्रोन। बेजोड़ कारीगरी से तैयार।',
      title: { line1: 'एक नया उद्गम।', line2: 'एक अमिट', accent: 'चमक।' },
      intro: 'असाधारण हीरे, सोच-समझकर उगाए गए। हर कट, हर फ़ैसेट, हर नई शुरुआत में संभावनाओं की एक दुनिया खोजिए।',
      explore: 'हीरे देखें',
      story: 'हमारी कहानी',
      note: { line1: 'स्वतंत्र रूप से ग्रेड किए गए।', line2: 'ऐसी चमक, जिस पर भरोसा कर सकें।' },
      artTop: 'चमक का नया मानक',
      imageAlt: 'हाथीदाँत जैसे सफ़ेद और हल्के हरे रंग के स्टूडियो में रखा एक राउंड ब्रिलियंट लैब-ग्रोन हीरा',
      artIndex: '01 / राउंड ब्रिलियंट',
      artLine1: 'स्वभाव से असाधारण।',
      artLine2: 'डिज़ाइन में बेमिसाल।',
      shapesLink: 'हीरों के शेप देखें',
    },
    trust: {
      real: 'असली हीरे',
      certified: 'स्वतंत्र सर्टिफिकेशन',
      precision: 'हर फ़ैसेट में सटीकता',
      locations: 'दुनिया भर में चार स्थान',
    },
    shapes: {
      eyebrow: 'हर कहानी के लिए एक शेप',
      title: 'चुनिए अपनी तरह की',
      accent: 'चमक।',
      link: 'सभी शेप देखें',
    },
    story: {
      imageAlt: 'डायमंड सीड से तैयार हीरे तक के सफ़र का चित्र',
      caption: 'सीड से हीरे तक · चित्रण',
      eyebrow: 'असली हीरे। एक अलग शुरुआत।',
      title: 'विज्ञान से अद्भुत।',
      accent: 'डिज़ाइन से ख़ूबसूरत।',
      p1: 'शुरुआत एक सीड से होती है। सावधानी से नियंत्रित CVD और HPHT प्रक्रियाओं के ज़रिए कार्बन कुछ असाधारण बन जाता है: एक असली हीरा, जो ज़िंदगी भर के मायनों के लिए तैयार है।',
      p2: 'रफ़ चुनने से लेकर आख़िरी पॉलिश तक, हमारा ध्यान एकदम साफ़ है। ख़ूबसूरत हीरे। सटीक कारीगरी। हर चुनाव में भरोसा।',
      link: 'लैब-ग्रोन हीरों के बारे में जानें',
    },
    jewellery: {
      eyebrow: 'कस्टम ज्वेलरी सेवा',
      title: { line1: 'कुछ कहानियों को चाहिए', line2: 'अपनी ख़ुद की', accent: 'सेटिंग।' },
      body: 'एक अर्थपूर्ण बारीकी। एक अनोखा पल। आइए, आपके चुने हुए हीरे को एक ऐसे पीस में बदलने में हम आपकी मदद करें, जो पूरी तरह आपका लगे।',
      explore: 'कस्टम ज्वेलरी देखें',
      talk: 'हमारी टीम से बात करें',
      imageAlt: 'कस्टम सेटिंग दिखाती डायमंड ज्वेलरी',
    },
    faq: {
      eyebrow: 'थोड़ी क्लैरिटी',
      title: 'अच्छे सवाल।',
      accent: 'ब्रिलियंट जवाब।',
      link: 'हमारे जानकारी केंद्र पर जाएँ',
    },
    questions: [
      ['क्या लैब-ग्रोन हीरे असली हीरे होते हैं?', 'हाँ। लैब-ग्रोन हीरे क्रिस्टलीकृत कार्बन हैं, जिनके भौतिक, रासायनिक और ऑप्टिकल गुण प्राकृतिक हीरों जैसे ही होते हैं। फ़र्क़ उनके उद्गम का है।'],
      ['क्या हीरे की ग्रेडिंग रिपोर्ट देखी जा सकती है?', 'हमारी टीम आपके चुने हुए हीरे की उपलब्ध स्वतंत्र ग्रेडिंग रिपोर्ट, स्पेसिफ़िकेशन और वीडियो साझा कर सकती है। जाँच की व्यवस्था के लिए हमसे संपर्क करें।'],
      ['क्या आप कस्टम ज्वेलरी बनाते हैं?', 'हाँ। अपनी पसंद का हीरे का शेप, सेटिंग, मेटल और बजट हमारी टीम को बताइए। आपकी ज़रूरतों के मुताबिक़ बने पीस के विकल्प तलाशने में हम आपकी मदद करेंगे।'],
      ['होलसेल स्टॉक कैसे मँगवाएँ?', 'अपनी पसंद के शेप, कैरेट रेंज, कलर, क्लैरिटी और मात्रा newgrowndiamonds@gmail.com पर भेजें, या +91 99139 99794 पर कॉल करें।'],
    ],
    locations: {
      eyebrow: 'जड़ें सूरत में। जुड़ाव पूरी दुनिया से।',
      title: 'चमक,',
      accent: 'सरहदों से परे।',
      link: 'आइए, जुड़ें',
      countries: { india: 'भारत', usa: 'अमेरिका', hongKong: 'हॉन्ग कॉन्ग' },
    },
  },

  gu: {
    hero: {
      eyebrow: 'લેબ-ગ્રોન. અજોડ કારીગરીથી તૈયાર.',
      title: { line1: 'એક નવો ઉદ્ગમ.', line2: 'એક શાશ્વત', accent: 'ચમક.' },
      intro: 'અસાધારણ હીરા, વિચારપૂર્વક ઉગાડેલા. દરેક કટ, દરેક ફેસેટ, દરેક નવી શરૂઆતમાં શક્યતાઓની એક દુનિયા શોધો.',
      explore: 'હીરા જુઓ',
      story: 'અમારી વાત',
      note: { line1: 'સ્વતંત્ર રીતે ગ્રેડ કરેલા.', line2: 'એવી ચમક, જેના પર ભરોસો કરી શકો.' },
      artTop: 'ચમકનું નવું ધોરણ',
      imageAlt: 'હાથીદાંત જેવા સફેદ અને આછા લીલા રંગના સ્ટુડિયોમાં મૂકેલો એક રાઉન્ડ બ્રિલિયન્ટ લેબ-ગ્રોન હીરો',
      artIndex: '01 / રાઉન્ડ બ્રિલિયન્ટ',
      artLine1: 'સ્વભાવથી અસાધારણ.',
      artLine2: 'ડિઝાઇનમાં બેમિસાલ.',
      shapesLink: 'હીરાના શેપ જુઓ',
    },
    trust: {
      real: 'અસલી હીરા',
      certified: 'સ્વતંત્ર સર્ટિફિકેશન',
      precision: 'દરેક ફેસેટમાં ચોકસાઈ',
      locations: 'દુનિયાભરમાં ચાર સ્થળો',
    },
    shapes: {
      eyebrow: 'દરેક વાર્તા માટે એક શેપ',
      title: 'શોધો તમારી પોતાની',
      accent: 'ચમક.',
      link: 'બધા શેપ જુઓ',
    },
    story: {
      imageAlt: 'ડાયમંડ સીડથી તૈયાર હીરા સુધીની સફરનું ચિત્ર',
      caption: 'સીડથી હીરા સુધી · ચિત્રણ',
      eyebrow: 'અસલી હીરા. એક અલગ શરૂઆત.',
      title: 'વિજ્ઞાનથી અદ્ભુત.',
      accent: 'ડિઝાઇનથી સુંદર.',
      p1: 'શરૂઆત એક સીડથી થાય છે. કાળજીપૂર્વક નિયંત્રિત CVD અને HPHT પ્રક્રિયાઓ દ્વારા કાર્બન કંઈક અસાધારણ બને છે: એક અસલી હીરો, જે જીવનભરના અર્થ માટે તૈયાર છે.',
      p2: 'રફ પસંદ કરવાથી લઈને છેલ્લા પોલિશ સુધી, અમારું ધ્યાન સ્પષ્ટ છે. સુંદર હીરા. ચોક્કસ કારીગરી. દરેક પસંદગીમાં ભરોસો.',
      link: 'લેબ-ગ્રોન હીરા વિશે જાણો',
    },
    jewellery: {
      eyebrow: 'કસ્ટમ જ્વેલરી સેવા',
      title: { line1: 'કેટલીક વાર્તાઓને જોઈએ', line2: 'પોતાનું આગવું', accent: 'સેટિંગ.' },
      body: 'એક અર્થપૂર્ણ વિગત. એક અનોખી ક્ષણ. તમારા પસંદ કરેલા હીરાને એવા પીસમાં ફેરવવામાં અમને મદદ કરવા દો, જે સંપૂર્ણપણે તમારો લાગે.',
      explore: 'કસ્ટમ જ્વેલરી જુઓ',
      talk: 'અમારી ટીમ સાથે વાત કરો',
      imageAlt: 'કસ્ટમ સેટિંગ દર્શાવતી ડાયમંડ જ્વેલરી',
    },
    faq: {
      eyebrow: 'થોડી ક્લેરિટી',
      title: 'સારા પ્રશ્નો.',
      accent: 'બ્રિલિયન્ટ જવાબો.',
      link: 'અમારા માહિતી કેન્દ્રની મુલાકાત લો',
    },
    questions: [
      ['શું લેબ-ગ્રોન હીરા અસલી હીરા છે?', 'હા. લેબ-ગ્રોન હીરા સ્ફટિકીકૃત કાર્બન છે, જેના ભૌતિક, રાસાયણિક અને ઑપ્ટિકલ ગુણધર્મો કુદરતી હીરા જેવા જ હોય છે. ફરક તેમના ઉદ્ગમનો છે.'],
      ['શું હું હીરાની ગ્રેડિંગ રિપોર્ટ જોઈ શકું?', 'અમારી ટીમ તમે પસંદ કરેલા હીરાની ઉપલબ્ધ સ્વતંત્ર ગ્રેડિંગ રિપોર્ટ, સ્પેસિફિકેશન અને વીડિયો શેર કરી શકે છે. તપાસની વ્યવસ્થા માટે અમારો સંપર્ક કરો.'],
      ['શું તમે કસ્ટમ જ્વેલરી બનાવો છો?', 'હા. તમારી પસંદગીનો હીરાનો શેપ, સેટિંગ, મેટલ અને બજેટ અમારી ટીમને જણાવો. તમારી જરૂરિયાત મુજબ બનેલા પીસના વિકલ્પો શોધવામાં અમે તમારી મદદ કરીશું.'],
      ['હોલસેલ સ્ટોક કેવી રીતે મંગાવવો?', 'તમારી પસંદગીના શેપ, કેરેટ રેન્જ, કલર, ક્લેરિટી અને જથ્થો newgrowndiamonds@gmail.com પર મોકલો, અથવા +91 99139 99794 પર કૉલ કરો.'],
    ],
    locations: {
      eyebrow: 'મૂળ સુરતમાં. જોડાણ આખી દુનિયા સાથે.',
      title: 'ચમક,',
      accent: 'સરહદોની પાર.',
      link: 'ચાલો, જોડાઈએ',
      countries: { india: 'ભારત', usa: 'અમેરિકા', hongKong: 'હોંગકોંગ' },
    },
  },
};
