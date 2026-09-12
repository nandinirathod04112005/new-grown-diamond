/**
 * The feedback page's words, in the three languages (see src/i18n/useCopy.js).
 *
 * Topic labels, "On “…”" and the form's own words live with the feedback
 * components (src/components/feedback/Feedback.copy.js). `status` is keyed by
 * the status the lib reports; the key stays English, only the label changes.
 * What clients wrote is always shown exactly as they wrote it.
 */
export default {
  en: {
    status: {
      pending: 'Waiting for review',
      approved: 'Published',
      rejected: 'Not published',
    },
    hero: {
      eyebrow: 'Write to us',
      titleLead: 'Tell us ',
      titleEm: 'how we did.',
      intro: 'Every stone we grow, cut and grade goes to someone. Tell us how the diamond, the service or this website worked for you — or send us an article for the journal. Our team reads everything, and approved feedback is published on this page with the name you choose.',
    },
    score: {
      label: 'Average rating {average} out of 5 from {count} reviews',
      one: '{count} published review',
      many: '{count} published reviews',
    },
    write: {
      article: 'Send an article',
      feedback: 'Send feedback',
      switch: 'What would you like to send?',
      feedbackOption: 'Feedback',
      feedbackHint: 'Rate us and tell us how it went',
      articleOption: 'An article',
      articleHint: 'Write a piece for our journal',
    },
    articleSteps: {
      label: 'How articles are published',
      write: { title: 'Write', text: 'Your own words about diamonds, jewellery or buying well — no account needed.' },
      edit: { title: 'Edit', text: 'Our editors read it and write back to you before anything is published.' },
      publish: { title: 'Publish', text: 'If it runs, it appears in the journal with your name.' },
    },
    feedbackSteps: {
      label: 'How feedback is published',
      write: { title: 'Write', text: 'Rate us and say what you think. No account needed.' },
      review: { title: 'Review', text: 'Our team reads it. Nothing is published before that.' },
      publish: { title: 'Publish', text: 'Approved feedback appears here and across the website, with the name and city you gave.' },
    },
    mine: {
      title: 'Your feedback',
      none: 'You have not sent any feedback from this account yet.',
      changeLead: 'To change or remove published feedback, ',
      changeLink: 'write to the desk',
      changeTail: ' with its reference.',
    },
    wall: {
      eyebrow: 'Published feedback',
      title: 'What clients say',
      filters: 'Show feedback about',
      all: 'All',
      empty: 'No feedback has been published yet. Yours could be the first.',
      loading: 'Loading feedback…',
    },
  },

  hi: {
    status: {
      pending: 'समीक्षा की प्रतीक्षा में',
      approved: 'प्रकाशित',
      rejected: 'प्रकाशित नहीं',
    },
    hero: {
      eyebrow: 'हमें लिखें',
      titleLead: 'हमें बताइए, ',
      titleEm: 'हमारा काम कैसा रहा।',
      intro: 'हम जो भी हीरा ग्रो, कट और ग्रेड करते हैं, वह किसी न किसी के पास जाता है। हमें बताइए कि हीरा, हमारी सेवा या यह वेबसाइट आपके लिए कैसी रही — या जर्नल के लिए हमें एक लेख भेजिए। हमारी टीम सब कुछ पढ़ती है, और स्वीकृत प्रतिक्रिया इस पेज पर आपके चुने हुए नाम के साथ प्रकाशित की जाती है।',
    },
    score: {
      label: 'औसत रेटिंग 5 में से {average}, {count} समीक्षाओं के आधार पर',
      one: '{count} प्रकाशित समीक्षा',
      many: '{count} प्रकाशित समीक्षाएँ',
    },
    write: {
      article: 'लेख भेजें',
      feedback: 'प्रतिक्रिया भेजें',
      switch: 'आप क्या भेजना चाहेंगे?',
      feedbackOption: 'प्रतिक्रिया',
      feedbackHint: 'हमें रेटिंग दें और बताइए कि अनुभव कैसा रहा',
      articleOption: 'एक लेख',
      articleHint: 'हमारे जर्नल के लिए लेख लिखें',
    },
    articleSteps: {
      label: 'लेख कैसे प्रकाशित होते हैं',
      write: { title: 'लेखन', text: 'हीरों, ज्वेलरी या समझदारी से खरीदारी पर आपके अपने शब्द — किसी खाते की ज़रूरत नहीं।' },
      edit: { title: 'संपादन', text: 'हमारे संपादक इसे पढ़ते हैं और कुछ भी प्रकाशित होने से पहले आपको जवाब लिखते हैं।' },
      publish: { title: 'प्रकाशन', text: 'अगर यह छपता है, तो जर्नल में आपके नाम के साथ दिखाई देता है।' },
    },
    feedbackSteps: {
      label: 'प्रतिक्रिया कैसे प्रकाशित होती है',
      write: { title: 'लेखन', text: 'हमें रेटिंग दें और अपनी राय बताइए। किसी खाते की ज़रूरत नहीं।' },
      review: { title: 'समीक्षा', text: 'हमारी टीम इसे पढ़ती है। उससे पहले कुछ भी प्रकाशित नहीं होता।' },
      publish: { title: 'प्रकाशन', text: 'स्वीकृत प्रतिक्रिया यहाँ और पूरी वेबसाइट पर, आपके दिए गए नाम और शहर के साथ दिखाई देती है।' },
    },
    mine: {
      title: 'आपकी प्रतिक्रिया',
      none: 'आपने इस खाते से अभी तक कोई प्रतिक्रिया नहीं भेजी है।',
      changeLead: 'प्रकाशित प्रतिक्रिया बदलने या हटाने के लिए उसके रेफ़रेंस के साथ ',
      changeLink: 'डेस्क को लिखें',
      changeTail: '।',
    },
    wall: {
      eyebrow: 'प्रकाशित प्रतिक्रिया',
      title: 'ग्राहक क्या कहते हैं',
      filters: 'इस विषय की प्रतिक्रिया दिखाएँ',
      all: 'सभी',
      empty: 'अभी तक कोई प्रतिक्रिया प्रकाशित नहीं हुई है। पहली प्रतिक्रिया आपकी हो सकती है।',
      loading: 'प्रतिक्रिया लोड हो रही है…',
    },
  },

  gu: {
    status: {
      pending: 'સમીક્ષાની રાહમાં',
      approved: 'પ્રકાશિત',
      rejected: 'પ્રકાશિત નથી',
    },
    hero: {
      eyebrow: 'અમને લખો',
      titleLead: 'અમને જણાવો, ',
      titleEm: 'અમારું કામ કેવું રહ્યું.',
      intro: 'અમે જે પણ હીરો ગ્રો, કટ અને ગ્રેડ કરીએ છીએ, તે કોઈક ને કોઈક પાસે જાય છે. હીરો, અમારી સેવા અથવા આ વેબસાઇટ તમારા માટે કેવી રહી તે અમને જણાવો — અથવા જર્નલ માટે અમને એક લેખ મોકલો. અમારી ટીમ બધું વાંચે છે, અને મંજૂર થયેલો પ્રતિસાદ આ પેજ પર તમે પસંદ કરેલા નામ સાથે પ્રકાશિત થાય છે.',
    },
    score: {
      label: 'સરેરાશ રેટિંગ 5 માંથી {average}, {count} સમીક્ષાઓના આધારે',
      one: '{count} પ્રકાશિત સમીક્ષા',
      many: '{count} પ્રકાશિત સમીક્ષાઓ',
    },
    write: {
      article: 'લેખ મોકલો',
      feedback: 'પ્રતિસાદ મોકલો',
      switch: 'તમે શું મોકલવા માંગો છો?',
      feedbackOption: 'પ્રતિસાદ',
      feedbackHint: 'અમને રેટિંગ આપો અને અનુભવ કેવો રહ્યો તે જણાવો',
      articleOption: 'એક લેખ',
      articleHint: 'અમારા જર્નલ માટે લેખ લખો',
    },
    articleSteps: {
      label: 'લેખ કેવી રીતે પ્રકાશિત થાય છે',
      write: { title: 'લેખન', text: 'હીરા, જ્વેલરી અથવા સમજદારીથી ખરીદી વિશે તમારા પોતાના શબ્દો — ખાતાની જરૂર નથી.' },
      edit: { title: 'સંપાદન', text: 'અમારા સંપાદકો તેને વાંચે છે અને કંઈ પણ પ્રકાશિત થાય તે પહેલાં તમને જવાબ લખે છે.' },
      publish: { title: 'પ્રકાશન', text: 'જો તે છપાય, તો જર્નલમાં તમારા નામ સાથે દેખાય છે.' },
    },
    feedbackSteps: {
      label: 'પ્રતિસાદ કેવી રીતે પ્રકાશિત થાય છે',
      write: { title: 'લેખન', text: 'અમને રેટિંગ આપો અને તમારો અભિપ્રાય જણાવો. ખાતાની જરૂર નથી.' },
      review: { title: 'સમીક્ષા', text: 'અમારી ટીમ તેને વાંચે છે. તે પહેલાં કંઈ પણ પ્રકાશિત થતું નથી.' },
      publish: { title: 'પ્રકાશન', text: 'મંજૂર થયેલો પ્રતિસાદ અહીં અને આખી વેબસાઇટ પર, તમે આપેલા નામ અને શહેર સાથે દેખાય છે.' },
    },
    mine: {
      title: 'તમારો પ્રતિસાદ',
      none: 'તમે આ ખાતામાંથી હજી સુધી કોઈ પ્રતિસાદ મોકલ્યો નથી.',
      changeLead: 'પ્રકાશિત પ્રતિસાદ બદલવા કે દૂર કરવા માટે તેના રેફરન્સ સાથે ',
      changeLink: 'ડેસ્કને લખો',
      changeTail: '.',
    },
    wall: {
      eyebrow: 'પ્રકાશિત પ્રતિસાદ',
      title: 'ગ્રાહકો શું કહે છે',
      filters: 'આ વિષયનો પ્રતિસાદ બતાવો',
      all: 'બધા',
      empty: 'હજી સુધી કોઈ પ્રતિસાદ પ્રકાશિત થયો નથી. પહેલો પ્રતિસાદ તમારો હોઈ શકે છે.',
      loading: 'પ્રતિસાદ લોડ થઈ રહ્યો છે…',
    },
  },
};
