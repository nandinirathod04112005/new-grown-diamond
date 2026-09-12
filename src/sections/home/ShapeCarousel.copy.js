/**
 * The shape ring's words, in the three languages (see src/i18n/useCopy.js).
 *
 * Shape names are trade names and follow src/i18n/glossary.md (row 17): the
 * English name, written in the local script. Facet, faceting, outline, light
 * return and symmetry are said the same way.
 *
 * `cuts[].id` is the English name in every language: it picks the stone's
 * photographs (cuts/small/<id>.webp and its phone copy) and keys the ring, so
 * only `name` and `desc` are translated. The ring is built on the English
 * list's length.
 */
export default {
  en: {
    /* Same order as the strip this replaces, and the same descriptions the shapes
       page (ShapeWheel) gives each cut, so the two pages never disagree. */
    cuts: [
      { id: 'Round', name: 'Round', desc: 'The classic 360-degree symmetrical outline, selected for strong light return and compatibility with almost every setting.' },
      { id: 'Oval', name: 'Oval', desc: 'An elongated brilliant. The silhouette creates visual length while keeping brilliant-style faceting.' },
      { id: 'Emerald', name: 'Emerald', desc: 'A step cut. Parallel facets foreground clarity rather than sparkle, so the stone is chosen for what it shows.' },
      { id: 'Pear', name: 'Pear', desc: 'A round end meeting a single point, combining brilliant faceting with an elongated outline.' },
      { id: 'Cushion', name: 'Cushion', desc: 'Softened corners and larger facets give it a vintage-inflected character.' },
      { id: 'Radiant', name: 'Radiant', desc: 'A rectangular outline with cropped corners, combined with brilliant-style faceting.' },
      { id: 'Princess', name: 'Princess', desc: 'Crisp square geometry with brilliant-style faceting and sharp, uncropped corners.' },
      { id: 'Marquise', name: 'Marquise', desc: 'Two points and a broad face-up area, the navette outline, cut for length.' },
      { id: 'Heart', name: 'Heart', desc: 'A cleft brilliant. It demands precise symmetry above every other consideration.' },
    ],
    /* What a screen reader hears for each stone in the list. */
    stoneLabel: '{name} cut. {desc}',
    ringLabel: 'Diamond shapes',
    hint: 'Drag to turn',
    previous: 'Previous shape',
    next: 'Next shape',
    /* {name} arrives lower-cased: "Explore the round". */
    explore: 'Explore the {name}',
    pause: 'Pause',
    play: 'Play',
  },

  hi: {
    cuts: [
      { name: 'राउंड', desc: 'क्लासिक 360-डिग्री सिमेट्रिकल आउटलाइन, जिसे दमदार लाइट रिटर्न और लगभग हर सेटिंग में फ़िट बैठने के लिए चुना जाता है।' },
      { name: 'ओवल', desc: 'एक लंबा ब्रिलियंट। इसकी आउटलाइन देखने में लंबाई का एहसास देती है, जबकि फ़ैसेटिंग ब्रिलियंट स्टाइल की ही रहती है।' },
      { name: 'एमरल्ड', desc: 'एक स्टेप कट। समानांतर फ़ैसेट जगमगाहट से ज़्यादा क्लैरिटी को सामने लाते हैं, इसलिए यह हीरा उसी के लिए चुना जाता है जो उसमें दिखता है।' },
      { name: 'पियर', desc: 'एक गोल सिरा, जो एक नोक से आकर मिलता है; इसमें ब्रिलियंट फ़ैसेटिंग और लंबी आउटलाइन एक साथ आती हैं।' },
      { name: 'कुशन', desc: 'गोलाई लिए कोने और बड़े फ़ैसेट इसे विंटेज झलक वाला अंदाज़ देते हैं।' },
      { name: 'रेडिएंट', desc: 'कटे कोनों वाली आयताकार आउटलाइन, ब्रिलियंट स्टाइल फ़ैसेटिंग के साथ।' },
      { name: 'प्रिंसेस', desc: 'साफ़-सुथरी चौकोर ज्यामिति, ब्रिलियंट स्टाइल फ़ैसेटिंग और बिना कटे, नुकीले कोनों के साथ।' },
      { name: 'मार्कीज़', desc: 'दो नोकें और चौड़ा फ़ेस-अप एरिया, यानी नैवेट आउटलाइन, जिसे लंबाई के लिए कट किया जाता है।' },
      { name: 'हार्ट', desc: 'बीच में खाँचे वाला ब्रिलियंट। इसमें हर दूसरी बात से ऊपर सटीक सिमेट्री ज़रूरी है।' },
    ],
    stoneLabel: '{name} कट। {desc}',
    ringLabel: 'हीरों के शेप',
    hint: 'घुमाने के लिए खींचें',
    previous: 'पिछला शेप',
    next: 'अगला शेप',
    explore: '{name} शेप देखें',
    pause: 'रोकें',
    play: 'चलाएँ',
  },

  gu: {
    cuts: [
      { name: 'રાઉન્ડ', desc: 'ક્લાસિક 360-ડિગ્રી સિમેટ્રિકલ આઉટલાઇન, જે દમદાર લાઇટ રિટર્ન અને લગભગ દરેક સેટિંગમાં બંધબેસતી હોવાથી પસંદ કરાય છે.' },
      { name: 'ઓવલ', desc: 'એક લાંબો બ્રિલિયન્ટ. તેની આઉટલાઇન જોવામાં લંબાઈનો અહેસાસ આપે છે, જ્યારે ફેસેટિંગ બ્રિલિયન્ટ સ્ટાઇલનું જ રહે છે.' },
      { name: 'એમરલ્ડ', desc: 'એક સ્ટેપ કટ. સમાંતર ફેસેટ ઝગમગાટ કરતાં ક્લેરિટીને આગળ લાવે છે, તેથી આ હીરો તેમાં જે દેખાય છે તેના માટે પસંદ કરાય છે.' },
      { name: 'પિયર', desc: 'એક ગોળ છેડો, જે એક અણી સાથે આવીને મળે છે; તેમાં બ્રિલિયન્ટ ફેસેટિંગ અને લાંબી આઉટલાઇન એકસાથે આવે છે.' },
      { name: 'કુશન', desc: 'ગોળાઈવાળા ખૂણા અને મોટા ફેસેટ તેને વિન્ટેજ ઝલકવાળો અંદાજ આપે છે.' },
      { name: 'રેડિયન્ટ', desc: 'કાપેલા ખૂણાવાળી લંબચોરસ આઉટલાઇન, બ્રિલિયન્ટ સ્ટાઇલ ફેસેટિંગ સાથે.' },
      { name: 'પ્રિન્સેસ', desc: 'સ્પષ્ટ ચોરસ ભૂમિતિ, બ્રિલિયન્ટ સ્ટાઇલ ફેસેટિંગ અને કાપ્યા વગરના, અણીદાર ખૂણા સાથે.' },
      { name: 'માર્કીઝ', desc: 'બે અણી અને પહોળો ફેસ-અપ એરિયા, એટલે કે નેવેટ આઉટલાઇન, જેને લંબાઈ માટે કટ કરવામાં આવે છે.' },
      { name: 'હાર્ટ', desc: 'વચ્ચે ખાંચાવાળો બ્રિલિયન્ટ. તેમાં બીજી દરેક બાબત કરતાં ચોક્કસ સિમેટ્રી સૌથી વધુ જરૂરી છે.' },
    ],
    stoneLabel: '{name} કટ. {desc}',
    ringLabel: 'હીરાના શેપ',
    hint: 'ફેરવવા માટે ખેંચો',
    previous: 'પાછલો શેપ',
    next: 'આગળનો શેપ',
    explore: '{name} શેપ જુઓ',
    pause: 'રોકો',
    play: 'ચલાવો',
  },
};
