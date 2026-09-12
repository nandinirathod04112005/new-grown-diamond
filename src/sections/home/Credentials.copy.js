/**
 * The recognition block's words, in the three languages (see
 * src/i18n/useCopy.js).
 *
 * `awards[].id` matches the award photograph and stays English. The event
 * names and places are proper names — the expo, the show and the city as
 * printed on the award — and are not translated either; only the photograph
 * descriptions and the citations are. Partner and laboratory names live in
 * Credentials.jsx and are never translated.
 */
export default {
  en: {
    label: 'Awards and recognition',
    kicker: 'Recognition',
    title: 'Awards & recognition',
    connected: 'Connected with',
    certified: 'Certified by',
    awards: [
      {
        id: 'carats-2025',
        event: 'CARATS 2025 Diamond Expo',
        place: 'Surat',
        photoAlt:
          'The CARATS 2025 award: a hinged wooden frame holding a gold handshake relief beside a '
          + 'brass plate presented to New Grown Diamond by the Surat Diamond Association.',
        body:
          'An appreciation award received at CARATS 2025 Diamond Expo (Surat), organised by the ' +
          'Surat Diamond Association, for our participation and contribution to the evolving ' +
          'lab-grown diamond industry.',
      },
      {
        id: 'ugjis-2024',
        event: 'Unique Gems & Jewellery International Show',
        place: 'Pune · 2024',
        photoAlt:
          'The UGJIS 2024 award: a hexagonal wooden plaque reading "Heartfelt Appreciation", '
          + 'presented to New Grown Diamond in Pune.',
        body:
          'An appreciation award received at UGJIS 2024, Pune, for our participation and ' +
          'contribution to the lab-grown diamond industry — recognising our work on quality ' +
          'craftsmanship, innovation and trust in modern diamond jewellery.',
      },
    ],
  },

  hi: {
    label: 'पुरस्कार और सम्मान',
    kicker: 'सम्मान',
    title: 'पुरस्कार और सम्मान',
    connected: 'इनके साथ जुड़े',
    certified: 'इनके द्वारा सर्टिफाइड',
    awards: [
      {
        photoAlt:
          'Surat Diamond Association द्वारा New Grown Diamond को भेंट किया गया CARATS 2025 पुरस्कार: '
          + 'कब्ज़ेदार लकड़ी का फ़्रेम, जिसमें हाथ मिलाने की सुनहरी उभरी आकृति के बगल में पीतल की प्लेट लगी है।',
        body:
          'Surat Diamond Association द्वारा आयोजित CARATS 2025 Diamond Expo (सूरत) में, लगातार ' +
          'विकसित हो रहे लैब-ग्रोन डायमंड उद्योग में हमारी भागीदारी और योगदान के लिए मिला ' +
          'सराहना पुरस्कार।',
      },
      {
        photoAlt:
          'UGJIS 2024 पुरस्कार: छह कोनों वाली लकड़ी की पट्टिका, जिस पर "Heartfelt Appreciation" '
          + 'लिखा है, जो पुणे में New Grown Diamond को भेंट की गई।',
        body:
          'UGJIS 2024, पुणे में लैब-ग्रोन डायमंड उद्योग में हमारी भागीदारी और योगदान के लिए मिला ' +
          'सराहना पुरस्कार, जो आधुनिक डायमंड ज्वेलरी में क्वालिटी कारीगरी, नवाचार और भरोसे पर ' +
          'हमारे काम को मान्यता देता है।',
      },
    ],
  },

  gu: {
    label: 'પુરસ્કાર અને સન્માન',
    kicker: 'સન્માન',
    title: 'પુરસ્કાર અને સન્માન',
    connected: 'આમની સાથે જોડાયેલા',
    certified: 'આમના દ્વારા સર્ટિફાઇડ',
    awards: [
      {
        photoAlt:
          'Surat Diamond Association દ્વારા New Grown Diamondને અર્પણ કરાયેલો CARATS 2025 પુરસ્કાર: '
          + 'મિજાગરાવાળી લાકડાની ફ્રેમ, જેમાં હાથ મિલાવતી સોનેરી ઉપસાવેલી આકૃતિની બાજુમાં પિત્તળની પ્લેટ છે.',
        body:
          'Surat Diamond Association દ્વારા આયોજિત CARATS 2025 Diamond Expo (સુરત)માં, સતત ' +
          'વિકસતા લેબ-ગ્રોન ડાયમંડ ઉદ્યોગમાં અમારી ભાગીદારી અને યોગદાન બદલ મળેલો ' +
          'પ્રશંસા પુરસ્કાર.',
      },
      {
        photoAlt:
          'UGJIS 2024 પુરસ્કાર: છ ખૂણાવાળી લાકડાની તકતી, જેના પર "Heartfelt Appreciation" '
          + 'લખેલું છે, જે પુણેમાં New Grown Diamondને અર્પણ કરાઈ.',
        body:
          'UGJIS 2024, પુણેમાં લેબ-ગ્રોન ડાયમંડ ઉદ્યોગમાં અમારી ભાગીદારી અને યોગદાન બદલ મળેલો ' +
          'પ્રશંસા પુરસ્કાર, જે આધુનિક ડાયમંડ જ્વેલરીમાં ગુણવત્તાસભર કારીગરી, નવીનતા અને વિશ્વાસ પરના ' +
          'અમારા કામને માન્યતા આપે છે.',
      },
    ],
  },
};
