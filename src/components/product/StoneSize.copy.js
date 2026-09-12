/**
 * The size-on-a-finger view's words, in the three languages (see
 * src/i18n/useCopy.js).
 *
 * "ct" and "mm" beside a figure are kept as the trade writes them on a memo or
 * a certificate; "carat" written out follows the glossary (कैरेट / કેરેટ).
 */
export default {
  en: {
    across: '{size} mm across',
    acrossLong: '{length} × {width} mm',
    aria: 'A {ct} carat {shape}, {across}, on a ring finger, to scale',
    measured: '{across}, measured',
    about: 'about {across}',
    slider: 'Carat weight',
    back: 'Back to this stone ({ct} ct)',
    caption: 'Drawn to scale on a 17 mm ring finger. Other weights are estimated from carat.',
  },

  hi: {
    across: '{size} mm चौड़ा',
    aria: '{ct} कैरेट {shape}, {across}, अंगूठी वाली उँगली पर, स्केल के अनुसार',
    measured: '{across}, माप के अनुसार',
    about: 'लगभग {across}',
    slider: 'कैरेट वज़न',
    back: 'इस हीरे पर वापस ({ct} ct)',
    caption: '17 mm की अंगूठी वाली उँगली पर स्केल के अनुसार बनाया गया। दूसरे वज़न कैरेट के आधार पर अनुमानित हैं।',
  },

  gu: {
    across: '{size} mm પહોળો',
    aria: '{ct} કેરેટ {shape}, {across}, વીંટીવાળી આંગળી પર, સ્કેલ મુજબ',
    measured: '{across}, માપ મુજબ',
    about: 'આશરે {across}',
    slider: 'કેરેટ વજન',
    back: 'આ હીરા પર પાછા ({ct} ct)',
    caption: 'વીંટીવાળી 17 mm આંગળી પર સ્કેલ મુજબ દોરેલું. બીજાં વજન કેરેટના આધારે અંદાજેલાં છે.',
  },
};
