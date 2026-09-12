import labVsMined from '@/assets/journal/lab-vs-mined.webp';
import buyingQuestions from '@/assets/journal/buying-questions.webp';
import buyingQuestionsRing from '@/assets/journal/buying-questions-ring.webp';
import history from '@/assets/journal/history-lab-grown.webp';
import pink from '@/assets/journal/pink-diamonds.webp';

/**
 * The archive's photographs, keyed as journalPosts.js names them.
 *
 * All five are the previous site's own images (newgrowndiamond.com/Images),
 * re-encoded as WebP at no more than 1600 px wide. The comparison image was
 * only ever 398 px wide, so it is marked `contain`: it is shown at a size it
 * can hold, on the black it was made on, rather than stretched soft.
 */
export const JOURNAL_COVERS = {
  labVsMined: {
    src: labVsMined,
    width: 398,
    height: 241,
    fit: 'contain',
    alt: 'A natural diamond and a lab-grown diamond side by side, labelled “Natural Diamonds” and “Lab-Grown Diamonds”.',
  },
  buyingQuestions: {
    src: buyingQuestions,
    width: 1600,
    height: 1067,
    fit: 'cover',
    alt: 'A polished diamond lit in blue, resting on dark fabric.',
  },
  buyingQuestionsRing: {
    src: buyingQuestionsRing,
    width: 1600,
    height: 1067,
    fit: 'cover',
    alt: 'A cushion-shaped halo ring in rose gold beside a diamond band, on dark leather.',
  },
  history: {
    src: history,
    width: 1600,
    height: 900,
    fit: 'cover',
    alt: 'A large octagonal crystal among small faceted stones on a grey surface.',
  },
  pink: {
    src: pink,
    width: 1600,
    height: 1062,
    fit: 'cover',
    alt: 'A large faceted diamond glowing under cool blue light.',
  },
};

/**
 * The same descriptions in Hindi and Gujarati, keyed as above; English is
 * each photograph's own `alt`. lib/journal.js swaps them in for a visitor
 * reading in either language. The words printed on the comparison image are
 * quoted as they appear on it, in English.
 */
export const JOURNAL_COVER_ALT = {
  hi: {
    labVsMined: 'एक प्राकृतिक हीरा और एक लैब-ग्रोन हीरा साथ-साथ, जिन पर “Natural Diamonds” और “Lab-Grown Diamonds” लिखा है।',
    buyingQuestions: 'नीली रोशनी में चमकता एक पॉलिश किया हुआ हीरा, गहरे रंग के कपड़े पर रखा हुआ।',
    buyingQuestionsRing: 'रोज़ गोल्ड में कुशन शेप की हेलो अंगूठी, एक डायमंड बैंड के पास, गहरे रंग के चमड़े पर।',
    history: 'धूसर सतह पर छोटे फ़ैसेट वाले पत्थरों के बीच एक बड़ा अष्टकोणीय क्रिस्टल।',
    pink: 'ठंडी नीली रोशनी में चमकता एक बड़ा फ़ैसेट वाला हीरा।',
  },
  gu: {
    labVsMined: 'એક કુદરતી હીરો અને એક લેબ-ગ્રોન હીરો બાજુ-બાજુમાં, જેના પર “Natural Diamonds” અને “Lab-Grown Diamonds” લખેલું છે.',
    buyingQuestions: 'વાદળી પ્રકાશમાં ઝળકતો એક પોલિશ કરેલો હીરો, ઘેરા રંગના કાપડ પર મૂકેલો.',
    buyingQuestionsRing: 'રોઝ ગોલ્ડમાં કુશન શેપની હેલો વીંટી, એક ડાયમંડ બેન્ડની બાજુમાં, ઘેરા રંગના ચામડા પર.',
    history: 'રાખોડી સપાટી પર નાના પાસાદાર પથ્થરો વચ્ચે એક મોટો અષ્ટકોણીય ક્રિસ્ટલ.',
    pink: 'ઠંડા વાદળી પ્રકાશમાં ઝળહળતો એક મોટો પાસાદાર હીરો.',
  },
};
