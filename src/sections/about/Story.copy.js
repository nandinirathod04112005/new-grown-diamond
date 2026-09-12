/**
 * The journey's six chapters, in the three languages (see
 * src/i18n/useCopy.js).
 *
 * `key` is the chapter's anchor (#story-b1…) and stays as it is. A `marker`
 * that is only names or figures — CVD · HPHT, the carat range, the four
 * cities, IGI · GIA — is the same in every language, so the translations
 * leave it out and English supplies it.
 *
 * `lines` are joined with a space into one paragraph (StoryTimeline), so
 * where a translation breaks them does not show; each keeps three.
 */
export default {
  en: {
    steps: [
      {
        key: 'b1',
        marker: '1980s',
        title: 'A cutting house',
        lines: [
          'The business began in Surat with',
          'earth-mined diamonds, and with the',
          'cutting tradition the city is known for.',
        ],
      },
      {
        key: 'b2',
        marker: '2012',
        title: 'The turn to grown',
        lines: [
          'We moved into polished laboratory-grown',
          'manufacturing, carrying four decades of',
          'cutting practice across with us.',
        ],
      },
      {
        key: 'b3',
        marker: 'CVD · HPHT',
        title: 'The technology',
        lines: [
          'State-of-the-art production in Surat,',
          'supporting certified and non-certified',
          'CVD and HPHT diamonds.',
        ],
      },
      {
        key: 'b4',
        marker: '0.30 — 6.00 ct',
        title: 'The range',
        lines: [
          'Colours D through J, in round, cushion,',
          'heart, marquise, pear, princess, radiant,',
          'emerald, square radiant and oval.',
        ],
      },
      {
        key: 'b5',
        marker: 'Surat · Mumbai · New York · Hong Kong',
        title: 'The reach',
        lines: [
          'We supply B2B clients, retailers and',
          'jewellery traders worldwide, direct from',
          'the manufacturing floor.',
        ],
      },
      {
        key: 'b6',
        marker: 'IGI · GIA',
        title: 'The standard',
        lines: [
          'We invest in current technology, consistent',
          'quality and clear diamond education, so',
          'clients can evaluate a stone with confidence.',
        ],
      },
    ],
  },

  hi: {
    steps: [
      {
        marker: '1980 का दशक',
        title: 'एक कटिंग हाउस',
        lines: [
          'कारोबार की शुरुआत Surat में खदान से',
          'निकले हीरों के साथ हुई, और उस कटिंग',
          'परंपरा के साथ, जिसके लिए यह शहर जाना जाता है।',
        ],
      },
      {
        title: 'लैब-ग्रोन की ओर रुख',
        lines: [
          'हमने पॉलिश्ड लैब-ग्रोन हीरों के निर्माण',
          'में कदम रखा, और चार दशकों का कटिंग',
          'अनुभव भी अपने साथ ले आए।',
        ],
      },
      {
        title: 'तकनीक',
        lines: [
          'Surat में अत्याधुनिक उत्पादन,',
          'सर्टिफाइड और नॉन-सर्टिफाइड',
          'CVD और HPHT हीरों के लिए।',
        ],
      },
      {
        title: 'रेंज',
        lines: [
          'D से J तक के कलर, राउंड, कुशन,',
          'हार्ट, मार्कीज़, पियर, प्रिंसेस, रेडिएंट,',
          'एमरल्ड, स्क्वेयर रेडिएंट और ओवल शेप में।',
        ],
      },
      {
        title: 'पहुँच',
        lines: [
          'हम दुनिया भर के B2B ग्राहकों, रिटेलरों और',
          'ज्वेलरी व्यापारियों को सीधे फैक्ट्री से',
          'आपूर्ति करते हैं।',
        ],
      },
      {
        title: 'मानक',
        lines: [
          'हम आधुनिक तकनीक, एक-समान गुणवत्ता और',
          'हीरों की स्पष्ट जानकारी में निवेश करते हैं, ताकि',
          'ग्राहक किसी हीरे को भरोसे के साथ परख सकें।',
        ],
      },
    ],
  },

  gu: {
    steps: [
      {
        marker: '1980નો દાયકો',
        title: 'એક કટિંગ હાઉસ',
        lines: [
          'વ્યવસાયની શરૂઆત Surat માં ખાણમાંથી',
          'નીકળતા હીરા સાથે થઈ, અને એ કટિંગ',
          'પરંપરા સાથે, જેના માટે આ શહેર જાણીતું છે.',
        ],
      },
      {
        title: 'લેબ-ગ્રોન તરફ વળાંક',
        lines: [
          'અમે પૉલિશ્ડ લેબ-ગ્રોન હીરાના ઉત્પાદનમાં',
          'પ્રવેશ્યા, અને ચાર દાયકાનો કટિંગનો',
          'અનુભવ પણ સાથે લઈ આવ્યા.',
        ],
      },
      {
        title: 'તકનીક',
        lines: [
          'Surat માં અત્યાધુનિક ઉત્પાદન,',
          'સર્ટિફાઇડ અને નોન-સર્ટિફાઇડ',
          'CVD અને HPHT હીરા માટે.',
        ],
      },
      {
        title: 'રેન્જ',
        lines: [
          'D થી J સુધીના કલર, રાઉન્ડ, કુશન,',
          'હાર્ટ, માર્કીઝ, પિયર, પ્રિન્સેસ, રેડિયન્ટ,',
          'એમરલ્ડ, સ્ક્વેર રેડિયન્ટ અને ઓવલ શેપમાં.',
        ],
      },
      {
        title: 'પહોંચ',
        lines: [
          'અમે દુનિયાભરના B2B ગ્રાહકો, રિટેલરો અને',
          'જ્વેલરી વેપારીઓને સીધા કારખાનામાંથી',
          'સપ્લાય કરીએ છીએ.',
        ],
      },
      {
        title: 'ધોરણ',
        lines: [
          'અમે આધુનિક તકનીક, એકસરખી ગુણવત્તા અને',
          'હીરાની સ્પષ્ટ માહિતીમાં રોકાણ કરીએ છીએ, જેથી',
          'ગ્રાહકો કોઈ હીરાને વિશ્વાસ સાથે પારખી શકે.',
        ],
      },
    ],
  },
};
