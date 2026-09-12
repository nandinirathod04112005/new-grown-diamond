/**
 * The diamonds (inventory) page's own words, in the three languages (see
 * src/i18n/useCopy.js).
 *
 * Trade terms follow src/i18n/glossary.md: stock, certificate, grading, shape
 * names and lab-grown are written as the trade says them, in the local script.
 * New Grown Diamond, Supabase and file names are never translated.
 *
 * Only the page's own words are here. The stones, their specifications and
 * photographs come from the database; the filters, cards and viewer carry
 * their own copy; the CTA and the call line use the site-wide `common.*`
 * dictionary keys. The proof section's email subject is read by the desk, so
 * it stays in the component, in English.
 */
export default {
  en: {
    hero: {
      eyebrow: 'Diamond inventory / Trade & retail',
      title: 'Find the stone.',
      titleEm: 'See the proof.',
      intro: 'Live stock with grading, growth method and photography. Request availability, videos and certificates from the desk.',
      alt: 'A real New Grown Diamond round brilliant photographed loose against black',
    },
    error: {
      title: 'The inventory could not be loaded',
      body: 'This is on our side. Please try again in a moment.',
      retry: 'Retry',
    },
    unconfigured: {
      title: 'Inventory is not connected',
      body: 'Add the Supabase project details to .env.local to show live stock.',
    },
    empty: {
      noneTitle: 'No stones published yet',
      noneBody: 'Stock added in the admin appears here immediately.',
      noMatchTitle: 'No stones match these filters',
      noMatchBody: 'Widen the search, or ask the desk what is arriving.',
      clear: 'Clear all filters',
    },
    proof: {
      alt: 'Close view of a round brilliant laboratory-grown diamond',
      eyebrow: 'What accompanies a stone',
      title: 'Certificate. Video. A direct answer.',
      body: 'Ask for current availability with the grading information and inspection material needed to evaluate the diamond.',
      email: 'Email the diamond desk',
    },
  },

  hi: {
    hero: {
      eyebrow: 'हीरों का स्टॉक / ट्रेड और रिटेल',
      title: 'हीरा खोजें।',
      titleEm: 'प्रमाण देखें।',
      intro: 'ग्रेडिंग, ग्रोथ मेथड और फ़ोटोग्राफ़ी के साथ लाइव स्टॉक। उपलब्धता, वीडियो और सर्टिफिकेट डेस्क से मँगवाएँ।',
      alt: 'काले बैकग्राउंड पर लूज़ रखकर फ़ोटो खींचा गया New Grown Diamond का असली राउंड ब्रिलियंट',
    },
    error: {
      title: 'स्टॉक लोड नहीं हो सका',
      body: 'यह समस्या हमारी तरफ़ से है। कृपया थोड़ी देर बाद फिर से कोशिश करें।',
      retry: 'फिर से कोशिश करें',
    },
    unconfigured: {
      title: 'स्टॉक कनेक्ट नहीं है',
      body: 'लाइव स्टॉक दिखाने के लिए .env.local फ़ाइल में Supabase प्रोजेक्ट की जानकारी जोड़ें।',
    },
    empty: {
      noneTitle: 'अभी तक कोई हीरा प्रकाशित नहीं हुआ है',
      noneBody: 'एडमिन में जोड़ा गया स्टॉक तुरंत यहाँ दिखाई देता है।',
      noMatchTitle: 'इन फ़िल्टर से कोई हीरा मेल नहीं खाता',
      noMatchBody: 'खोज का दायरा बढ़ाएँ, या डेस्क से पूछें कि क्या आने वाला है।',
      clear: 'सभी फ़िल्टर हटाएँ',
    },
    proof: {
      alt: 'राउंड ब्रिलियंट लैब-ग्रोन हीरे का नज़दीकी दृश्य',
      eyebrow: 'हीरे के साथ क्या मिलता है',
      title: 'सर्टिफिकेट। वीडियो। सीधा जवाब।',
      body: 'हीरे को परखने के लिए ज़रूरी ग्रेडिंग जानकारी और जाँच सामग्री के साथ, मौजूदा उपलब्धता के बारे में पूछें।',
      email: 'डायमंड डेस्क को ईमेल करें',
    },
  },

  gu: {
    hero: {
      eyebrow: 'હીરાનો સ્ટોક / ટ્રેડ અને રિટેલ',
      title: 'હીરો શોધો.',
      titleEm: 'પુરાવો જુઓ.',
      intro: 'ગ્રેડિંગ, ગ્રોથ મેથડ અને ફોટોગ્રાફી સાથે લાઇવ સ્ટોક. ઉપલબ્ધતા, વીડિયો અને સર્ટિફિકેટ ડેસ્ક પાસેથી મંગાવો.',
      alt: 'કાળા બેકગ્રાઉન્ડ પર લૂઝ મૂકીને ફોટો પાડેલો New Grown Diamondનો અસલી રાઉન્ડ બ્રિલિયન્ટ',
    },
    error: {
      title: 'સ્ટોક લોડ થઈ શક્યો નહીં',
      body: 'આ સમસ્યા અમારી બાજુથી છે. કૃપા કરીને થોડી વાર પછી ફરી પ્રયાસ કરો.',
      retry: 'ફરી પ્રયાસ કરો',
    },
    unconfigured: {
      title: 'સ્ટોક કનેક્ટ થયેલો નથી',
      body: 'લાઇવ સ્ટોક બતાવવા માટે .env.local ફાઇલમાં Supabase પ્રોજેક્ટની વિગતો ઉમેરો.',
    },
    empty: {
      noneTitle: 'હજી સુધી કોઈ હીરો પ્રકાશિત થયો નથી',
      noneBody: 'એડમિનમાં ઉમેરેલો સ્ટોક તરત જ અહીં દેખાય છે.',
      noMatchTitle: 'આ ફિલ્ટર સાથે કોઈ હીરો મેળ ખાતો નથી',
      noMatchBody: 'શોધનો વ્યાપ વધારો, અથવા ડેસ્કને પૂછો કે શું આવી રહ્યું છે.',
      clear: 'બધા ફિલ્ટર દૂર કરો',
    },
    proof: {
      alt: 'રાઉન્ડ બ્રિલિયન્ટ લેબ-ગ્રોન હીરાનું નજીકથી દૃશ્ય',
      eyebrow: 'હીરા સાથે શું મળે છે',
      title: 'સર્ટિફિકેટ. વીડિયો. સીધો જવાબ.',
      body: 'હીરાને પારખવા માટે જરૂરી ગ્રેડિંગ માહિતી અને તપાસ સામગ્રી સાથે, હાલની ઉપલબ્ધતા વિશે પૂછો.',
      email: 'ડાયમંડ ડેસ્કને ઈમેલ કરો',
    },
  },
};
