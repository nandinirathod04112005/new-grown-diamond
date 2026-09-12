/**
 * The cutting wheel's words, in the three languages (see src/i18n/useCopy.js).
 *
 * `cuts` is keyed by each cut's English name, which stays the id everywhere
 * else — the photograph's filename, the outline ShapeGlyph draws, the stock
 * lookup. Only what the visitor reads is translated. Shape names are trade
 * names, transliterated per glossary row 17.
 */
export default {
  en: {
    label: 'The cuts we grow',
    shown: 'Shown: a {carat} ct {name} in current stock',
    cuts: {
      Round: { name: 'Round', note: 'The classic 360-degree symmetrical outline, selected for strong light return and compatibility with almost every setting.' },
      Oval: { name: 'Oval', note: 'An elongated brilliant. The silhouette creates visual length while keeping brilliant-style faceting.' },
      Emerald: { name: 'Emerald', note: 'A step cut. Parallel facets foreground clarity rather than sparkle, so the stone is chosen for what it shows.' },
      Pear: { name: 'Pear', note: 'A round end meeting a single point, combining brilliant faceting with an elongated outline.' },
      Princess: { name: 'Princess', note: 'Crisp square geometry with brilliant-style faceting and sharp, uncropped corners.' },
      Cushion: { name: 'Cushion', note: 'Softened corners and larger facets give it a vintage-inflected character.' },
      Radiant: { name: 'Radiant', note: 'A rectangular outline with cropped corners, combined with brilliant-style faceting.' },
      Marquise: { name: 'Marquise', note: 'Two points and a broad face-up area, the navette outline, cut for length.' },
      Heart: { name: 'Heart', note: 'A cleft brilliant. It demands precise symmetry above every other consideration.' },
    },
  },

  hi: {
    label: 'जो कट हम उगाते हैं',
    shown: 'दिखाया गया: मौजूदा स्टॉक में {carat} ct का एक {name}',
    cuts: {
      Round: { name: 'राउंड', note: 'क्लासिक 360-डिग्री सममित आउटलाइन, जिसे रोशनी को भरपूर लौटाने और लगभग हर सेटिंग में फ़िट होने के कारण चुना जाता है।' },
      Oval: { name: 'ओवल', note: 'लंबा ब्रिलियंट। इसकी आकृति ब्रिलियंट-स्टाइल फ़ेसेटिंग बनाए रखते हुए देखने में लंबाई का एहसास देती है।' },
      Emerald: { name: 'एमरल्ड', note: 'एक स्टेप कट। समानांतर फ़ेसेट चमक के बजाय क्लैरिटी को सामने रखते हैं, इसलिए यह हीरा उसके लिए चुना जाता है जो वह दिखाता है।' },
      Pear: { name: 'पियर', note: 'एक गोल सिरा जो एक नुकीले सिरे से मिलता है — ब्रिलियंट फ़ेसेटिंग और लंबी आउटलाइन का मेल।' },
      Princess: { name: 'प्रिंसेस', note: 'ब्रिलियंट-स्टाइल फ़ेसेटिंग और तीखे, बिना कटे कोनों वाली साफ़ चौकोर ज्यामिति।' },
      Cushion: { name: 'कुशन', note: 'नरम कोने और बड़े फ़ेसेट इसे पुराने दौर की झलक वाला मिज़ाज देते हैं।' },
      Radiant: { name: 'रेडिएंट', note: 'कटे कोनों वाली आयताकार आउटलाइन, ब्रिलियंट-स्टाइल फ़ेसेटिंग के साथ।' },
      Marquise: { name: 'मार्क्विज़', note: 'दो नुकीले सिरे और चौड़ा फेस-अप हिस्सा — नवेट आउटलाइन, जिसे लंबाई के लिए काटा जाता है।' },
      Heart: { name: 'हार्ट', note: 'बीच में खाँचे वाला ब्रिलियंट। इसमें हर दूसरी बात से ऊपर सटीक सिमेट्री ज़रूरी है।' },
    },
  },

  gu: {
    label: 'અમે ગ્રો કરીએ છીએ એ કટ',
    shown: 'દર્શાવેલ: હાલના સ્ટોકમાં {carat} ct નો એક {name}',
    cuts: {
      Round: { name: 'રાઉન્ડ', note: 'ક્લાસિક 360-ડિગ્રી સમપ્રમાણ આઉટલાઇન, જે પ્રકાશને ભરપૂર પાછો ફેંકવા અને લગભગ દરેક સેટિંગ સાથે બંધબેસતી હોવાથી પસંદ કરવામાં આવે છે.' },
      Oval: { name: 'ઓવલ', note: 'લાંબો બ્રિલિયન્ટ. તેની આકૃતિ બ્રિલિયન્ટ-સ્ટાઇલ ફેસેટિંગ જાળવી રાખીને દેખાવમાં લંબાઈનો અહેસાસ આપે છે.' },
      Emerald: { name: 'એમરલ્ડ', note: 'એક સ્ટેપ કટ. સમાંતર ફેસેટ ચમકને બદલે ક્લેરિટીને આગળ લાવે છે, એટલે આ હીરો જે દેખાડે છે તેના માટે પસંદ થાય છે.' },
      Pear: { name: 'પિયર', note: 'એક ગોળ છેડો જે એક અણી સાથે મળે છે — બ્રિલિયન્ટ ફેસેટિંગ અને લાંબી આઉટલાઇનનો સંગમ.' },
      Princess: { name: 'પ્રિન્સેસ', note: 'બ્રિલિયન્ટ-સ્ટાઇલ ફેસેટિંગ અને તીખા, કાપ્યા વગરના ખૂણાવાળી ચોખ્ખી ચોરસ ભૂમિતિ.' },
      Cushion: { name: 'કુશન', note: 'નરમ ખૂણા અને મોટા ફેસેટ તેને જૂના જમાનાની છાંટવાળો મિજાજ આપે છે.' },
      Radiant: { name: 'રેડિયન્ટ', note: 'કાપેલા ખૂણાવાળી લંબચોરસ આઉટલાઇન, બ્રિલિયન્ટ-સ્ટાઇલ ફેસેટિંગ સાથે.' },
      Marquise: { name: 'માર્કીઝ', note: 'બે અણીદાર છેડા અને પહોળો ફેસ-અપ ભાગ — નેવેટ આઉટલાઇન, જે લંબાઈ માટે કાપવામાં આવે છે.' },
      Heart: { name: 'હાર્ટ', note: 'વચ્ચે ખાંચાવાળો બ્રિલિયન્ટ. તેમાં બીજી દરેક બાબત કરતાં ચોક્કસ સિમેટ્રી વધુ મહત્ત્વની છે.' },
    },
  },
};
