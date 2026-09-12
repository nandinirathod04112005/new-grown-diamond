/**
 * The selection (cart) page's words, in the three languages (see
 * src/i18n/useCopy.js). The grade labels, "Price on request" and "Explore
 * diamonds" come from the site dictionaries (`terms.*`, `common.*`).
 *
 * Not here, and deliberately English: the availability request the page
 * builds for email and WhatsApp. The desk reads it. Stock numbers, carats,
 * shapes and grades are the inventory's own values and are never translated.
 *
 * `title.lead` + `title.em` make the heading; `countOne` / `countMany` are the
 * singular and plural of the summary count.
 */
export default {
  en: {
    eyebrow: 'YOUR SELECTION / {n}',
    title: { lead: 'Selected ', em: 'brilliance.' },
    intro: 'Review your diamonds, then ask our team to confirm live availability, certificates and current pricing.',
    empty: {
      title: 'Your selection is waiting.',
      body: 'Browse our inventory and add the diamonds you would like to compare.',
    },
    alt: '{carat} carat {shape} diamond',
    remove: 'Remove',
    removeLabel: 'Remove {stock} from cart',
    summary: 'SELECTION SUMMARY',
    countOne: '{n} diamond',
    countMany: '{n} diamonds',
    note: 'Final price and availability will be confirmed by our diamond desk.',
    whatsapp: 'Request on WhatsApp',
    email: 'Request by email',
    account: 'Sign in / View account',
    clear: 'Clear selection',
    back: 'Continue browsing',
  },

  hi: {
    eyebrow: 'आपका चयन / {n}',
    title: { lead: 'चुनी हुई ', em: 'चमक।' },
    intro: 'अपने हीरे देखें, फिर हमारी टीम से लाइव उपलब्धता, सर्टिफिकेट और मौजूदा कीमत की पुष्टि करने को कहें।',
    empty: {
      title: 'आपका चयन आपकी प्रतीक्षा में है।',
      body: 'हमारा स्टॉक देखें और जिन हीरों की तुलना करना चाहते हैं, उन्हें जोड़ें।',
    },
    alt: '{carat} कैरेट {shape} हीरा',
    remove: 'हटाएँ',
    removeLabel: '{stock} को कार्ट से हटाएँ',
    summary: 'चयन का सारांश',
    countOne: '{n} हीरा',
    countMany: '{n} हीरे',
    note: 'अंतिम कीमत और उपलब्धता की पुष्टि हमारा डायमंड डेस्क करेगा।',
    whatsapp: 'WhatsApp पर अनुरोध करें',
    email: 'ईमेल से अनुरोध करें',
    account: 'साइन इन / खाता देखें',
    clear: 'चयन खाली करें',
    back: 'देखना जारी रखें',
  },

  gu: {
    eyebrow: 'તમારી પસંદગી / {n}',
    title: { lead: 'પસંદ કરેલી ', em: 'ચમક.' },
    intro: 'તમારા હીરા જુઓ, પછી અમારી ટીમને લાઇવ ઉપલબ્ધતા, સર્ટિફિકેટ અને હાલની કિંમતની પુષ્ટિ કરવા કહો.',
    empty: {
      title: 'તમારી પસંદગી તમારી રાહ જોઈ રહી છે.',
      body: 'અમારો સ્ટોક જુઓ અને જે હીરાની સરખામણી કરવા માંગો છો તે ઉમેરો.',
    },
    alt: '{carat} કેરેટ {shape} હીરો',
    remove: 'દૂર કરો',
    removeLabel: '{stock} ને કાર્ટમાંથી દૂર કરો',
    summary: 'પસંદગીનો સારાંશ',
    countOne: '{n} હીરો',
    countMany: '{n} હીરા',
    note: 'અંતિમ કિંમત અને ઉપલબ્ધતાની પુષ્ટિ અમારું ડાયમંડ ડેસ્ક કરશે.',
    whatsapp: 'WhatsApp પર વિનંતી કરો',
    email: 'ઈમેલથી વિનંતી કરો',
    account: 'સાઇન ઇન / ખાતું જુઓ',
    clear: 'પસંદગી ખાલી કરો',
    back: 'જોવાનું ચાલુ રાખો',
  },
};
