/**
 * The contact page's words, in the three languages (see src/i18n/useCopy.js).
 *
 * Trade terms follow src/i18n/glossary.md: carat, colour, clarity, shape and
 * certificate are written as the trade says them, in the local script. Office
 * names, addresses, phone numbers and email addresses are never translated.
 *
 * `subjects[].value` is what is stored on the enquiry and read by the desk, so
 * it stays in English in every language; only `label` is translated.
 */
export default {
  en: {
    hero: {
      eyebrow: 'Contact / Four locations',
      title: 'Tell us the stone you need.',
      intro: 'Share a shape, carat range, colour, clarity and quantity. Our team will respond with available options and supporting certificates.',
      action: 'Start an enquiry',
    },
    office: 'Office',
    subjects: [
      { value: 'Loose diamonds', label: 'Loose diamonds' },
      { value: 'Custom jewellery', label: 'Custom jewellery' },
      { value: 'Trade programme', label: 'Trade programme' },
      { value: 'Certificate or inspection', label: 'Certificate or inspection' },
    ],
    defaultMessage: 'I would like more information about {reference}. ',
    status: {
      check: 'Check the highlighted fields before continuing.',
      unavailable: 'The enquiry service is unavailable on this deployment. Use the direct email link below.',
      failed: 'We could not send your enquiry. Check your connection and try again.',
      received: 'Thank you — enquiry {id} has been received.',
    },
    form: {
      eyebrow: 'Structured enquiry',
      title: 'Give the diamond desk a useful starting point.',
      note: 'Submitted enquiries are stored in the existing protected Supabase workflow and receive a reference you can use with the desk.',
      linked: 'Linked {type}',
      types: { diamond: 'diamond', jewellery: 'jewellery' },
      who: 'Who you are',
      name: 'Name *',
      email: 'Email *',
      company: 'Company',
      phone: 'Phone',
      phoneHint: 'Digits, spaces, and + ( ) - only',
      what: 'What you need',
      country: 'Country',
      type: 'Enquiry type *',
      brief: 'Shape, carat, colour, clarity and quantity *',
      sending: 'Sending…',
      send: 'Send enquiry',
      whatsapp: 'Continue on WhatsApp',
    },
    direct: {
      eyebrow: 'Direct enquiry',
      title: 'Certificates, videos and inspection support are available.',
      email: 'Email the desk',
    },
  },

  hi: {
    hero: {
      eyebrow: 'संपर्क / चार स्थान',
      title: 'हमें बताइए, आपको कौन-सा हीरा चाहिए।',
      intro: 'शेप, कैरेट रेंज, कलर, क्लैरिटी और मात्रा बताइए। हमारी टीम उपलब्ध विकल्पों और सहायक सर्टिफिकेट के साथ जवाब देगी।',
      action: 'पूछताछ शुरू करें',
    },
    office: 'ऑफिस',
    subjects: [
      { label: 'लूज़ हीरे' },
      { label: 'कस्टम ज्वेलरी' },
      { label: 'ट्रेड प्रोग्राम' },
      { label: 'सर्टिफिकेट या जाँच' },
    ],
    defaultMessage: 'मुझे {reference} के बारे में और जानकारी चाहिए। ',
    status: {
      check: 'आगे बढ़ने से पहले हाइलाइट किए गए फ़ील्ड जाँच लें।',
      unavailable: 'इस साइट पर पूछताछ सेवा अभी उपलब्ध नहीं है। नीचे दिए गए सीधे ईमेल लिंक का उपयोग करें।',
      failed: 'आपकी पूछताछ नहीं भेजी जा सकी। अपना कनेक्शन जाँचें और दोबारा कोशिश करें।',
      received: 'धन्यवाद — पूछताछ {id} हमें मिल गई है।',
    },
    form: {
      eyebrow: 'विस्तृत पूछताछ',
      title: 'डायमंड डेस्क को एक उपयोगी शुरुआत दीजिए।',
      note: 'भेजी गई पूछताछ हमारे सुरक्षित सिस्टम में सहेजी जाती है और आपको एक रेफ़रेंस नंबर मिलता है, जिसका उपयोग आप डेस्क के साथ कर सकते हैं।',
      linked: 'जुड़ा हुआ {type}',
      types: { diamond: 'हीरा', jewellery: 'ज्वेलरी' },
      who: 'आप कौन हैं',
      name: 'नाम *',
      email: 'ईमेल *',
      company: 'कंपनी',
      phone: 'फ़ोन',
      phoneHint: 'केवल अंक, स्पेस और + ( ) -',
      what: 'आपको क्या चाहिए',
      country: 'देश',
      type: 'पूछताछ का प्रकार *',
      brief: 'शेप, कैरेट, कलर, क्लैरिटी और मात्रा *',
      sending: 'भेजा जा रहा है…',
      send: 'पूछताछ भेजें',
      whatsapp: 'WhatsApp पर आगे बढ़ें',
    },
    direct: {
      eyebrow: 'सीधी पूछताछ',
      title: 'सर्टिफिकेट, वीडियो और जाँच की सुविधा उपलब्ध है।',
      email: 'डेस्क को ईमेल करें',
    },
  },

  gu: {
    hero: {
      eyebrow: 'સંપર્ક / ચાર સ્થળો',
      title: 'અમને જણાવો, તમને કયો હીરો જોઈએ છે.',
      intro: 'શેપ, કેરેટ રેન્જ, કલર, ક્લેરિટી અને જથ્થો જણાવો. અમારી ટીમ ઉપલબ્ધ વિકલ્પો અને સહાયક સર્ટિફિકેટ સાથે જવાબ આપશે.',
      action: 'પૂછપરછ શરૂ કરો',
    },
    office: 'ઓફિસ',
    subjects: [
      { label: 'લૂઝ હીરા' },
      { label: 'કસ્ટમ જ્વેલરી' },
      { label: 'ટ્રેડ પ્રોગ્રામ' },
      { label: 'સર્ટિફિકેટ અથવા તપાસ' },
    ],
    defaultMessage: 'મને {reference} વિશે વધુ માહિતી જોઈએ છે. ',
    status: {
      check: 'આગળ વધતા પહેલાં હાઇલાઇટ કરેલાં ફીલ્ડ તપાસો.',
      unavailable: 'આ સાઇટ પર પૂછપરછ સેવા હાલમાં ઉપલબ્ધ નથી. નીચે આપેલી સીધી ઈમેલ લિંકનો ઉપયોગ કરો.',
      failed: 'તમારી પૂછપરછ મોકલી શકાઈ નથી. તમારું કનેક્શન તપાસો અને ફરી પ્રયાસ કરો.',
      received: 'આભાર — પૂછપરછ {id} અમને મળી ગઈ છે.',
    },
    form: {
      eyebrow: 'વિગતવાર પૂછપરછ',
      title: 'ડાયમંડ ડેસ્કને ઉપયોગી શરૂઆત આપો.',
      note: 'મોકલેલી પૂછપરછ અમારી સુરક્ષિત સિસ્ટમમાં સાચવવામાં આવે છે અને તમને એક રેફરન્સ નંબર મળે છે, જેનો ઉપયોગ તમે ડેસ્ક સાથે કરી શકો છો.',
      linked: 'જોડાયેલ {type}',
      types: { diamond: 'હીરો', jewellery: 'જ્વેલરી' },
      who: 'તમે કોણ છો',
      name: 'નામ *',
      email: 'ઈમેલ *',
      company: 'કંપની',
      phone: 'ફોન',
      phoneHint: 'ફક્ત અંકો, સ્પેસ અને + ( ) -',
      what: 'તમને શું જોઈએ છે',
      country: 'દેશ',
      type: 'પૂછપરછનો પ્રકાર *',
      brief: 'શેપ, કેરેટ, કલર, ક્લેરિટી અને જથ્થો *',
      sending: 'મોકલાઈ રહ્યું છે…',
      send: 'પૂછપરછ મોકલો',
      whatsapp: 'WhatsApp પર આગળ વધો',
    },
    direct: {
      eyebrow: 'સીધી પૂછપરછ',
      title: 'સર્ટિફિકેટ, વીડિયો અને તપાસની સુવિધા ઉપલબ્ધ છે.',
      email: 'ડેસ્કને ઈમેલ કરો',
    },
  },
};
