/**
 * Our Story's headings, labels and figures' captions, in the three languages
 * (see src/i18n/useCopy.js). The owner's own paragraphs are not here — they
 * are in content/aboutCompany.js.
 *
 * A heading with an emphasised phrase is split into `before`, `em` and
 * `after`, because Hindi and Gujarati put the phrase in a different place in
 * the sentence. English keeps an empty `after` so a translation can use one.
 *
 * Trade terms follow src/i18n/glossary.md. Surat, Mumbai, New York and Hong
 * Kong stay in English.
 */
export default {
  en: {
    who: {
      title: { before: 'Built on a legacy of ', em: 'integrity and honesty.', after: '' },
      tags: 'What we deliver',
    },
    facts: {
      years: 'Years in diamonds',
      since: 'Lab-grown since',
      carats: 'Carat range',
      colours: 'Colour range',
      shapes: 'Shapes',
    },
    range: {
      eyebrow: 'The range',
      title: { before: 'Ten shapes. ', em: 'D to J.', after: ' 0.30 to 6.00 carats.' },
      shapes: 'Diamond shapes we offer',
    },
    reach: {
      eyebrow: 'From Surat',
      title: { before: 'State-of-the-art production in Surat. ', em: 'Clientele across the globe.', after: '' },
      body: 'Our diamond production facilities are in Surat, India. From there we supply B2B clienteles, retailers and jewellery traders around the world, with offices in Mumbai, New York and Hong Kong.',
    },
    mission: {
      eyebrow: 'Our mission',
      title: { before: 'Our ', em: 'mission.', after: '' },
    },
  },

  hi: {
    who: {
      title: { before: '', em: 'सत्यनिष्ठा और ईमानदारी', after: ' की विरासत पर आधारित।' },
      tags: 'हम क्या उपलब्ध कराते हैं',
    },
    facts: {
      years: 'हीरा कारोबार में वर्ष',
      since: 'लैब-ग्रोन की शुरुआत',
      carats: 'कैरेट रेंज',
      colours: 'कलर रेंज',
      shapes: 'शेप',
    },
    range: {
      eyebrow: 'रेंज',
      title: { before: 'दस शेप। ', em: 'D से J तक।', after: ' 0.30 से 6.00 कैरेट।' },
      shapes: 'हमारे यहाँ उपलब्ध हीरों के शेप',
    },
    reach: {
      eyebrow: 'Surat से',
      title: { before: 'Surat में अत्याधुनिक उत्पादन। ', em: 'दुनिया भर में ग्राहक।', after: '' },
      body: 'हमारी हीरा उत्पादन सुविधाएँ Surat, भारत में हैं। वहीं से हम दुनिया भर के B2B ग्राहकों, रिटेलरों और ज्वेलरी व्यापारियों को आपूर्ति करते हैं, और Mumbai, New York तथा Hong Kong में हमारे ऑफिस हैं।',
    },
    mission: {
      eyebrow: 'हमारा मिशन',
      title: { before: 'हमारा ', em: 'मिशन।', after: '' },
    },
  },

  gu: {
    who: {
      title: { before: '', em: 'સત્યનિષ્ઠા અને પ્રામાણિકતાના', after: ' વારસા પર આધારિત.' },
      tags: 'અમે શું પૂરું પાડીએ છીએ',
    },
    facts: {
      years: 'હીરાના વેપારમાં વર્ષ',
      since: 'લેબ-ગ્રોનની શરૂઆત',
      carats: 'કેરેટ રેન્જ',
      colours: 'કલર રેન્જ',
      shapes: 'શેપ',
    },
    range: {
      eyebrow: 'રેન્જ',
      title: { before: 'દસ શેપ. ', em: 'D થી J સુધી.', after: ' 0.30 થી 6.00 કેરેટ.' },
      shapes: 'અમારી પાસે ઉપલબ્ધ હીરાના શેપ',
    },
    reach: {
      eyebrow: 'Surat થી',
      title: { before: 'Surat માં અત્યાધુનિક ઉત્પાદન. ', em: 'દુનિયાભરમાં ગ્રાહકો.', after: '' },
      body: 'અમારી હીરા ઉત્પાદન સુવિધાઓ Surat, ભારતમાં છે. ત્યાંથી અમે દુનિયાભરના B2B ગ્રાહકો, રિટેલરો અને જ્વેલરી વેપારીઓને સપ્લાય કરીએ છીએ, અને Mumbai, New York તથા Hong Kong માં અમારી ઓફિસો છે.',
    },
    mission: {
      eyebrow: 'અમારું મિશન',
      title: { before: 'અમારું ', em: 'મિશન.', after: '' },
    },
  },
};
