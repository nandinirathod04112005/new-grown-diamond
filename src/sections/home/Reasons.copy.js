/**
 * The six reasons' words, in the three languages (see src/i18n/useCopy.js).
 *
 * `reasons[].id` picks the card's icon and stays English in every language;
 * only `title`, `lead` and `body` are translated. IGI, GIA and New Grown
 * Diamond are never translated; carat and certificate follow
 * src/i18n/glossary.md. The figures are kept exactly.
 */
export default {
  en: {
    label: 'Why lab-grown diamonds',
    kicker: 'The case',
    title: 'Why lab-grown diamonds',
    /*
     * The claims, as the company makes them.
     *
     * `lead` is what a skim reads; `body` is what a crawler and a serious buyer
     * read. Keeping the specific numbers — IGI, GIA, 40 to 50 percent, 100 sq ft,
     * 6000 lbs — matters twice over: they are the substance of the claim, and they
     * are the long-tail phrases people actually type into a search box.
     */
    reasons: [
      {
        id: 'certified',
        title: 'Certified',
        lead: 'Graded by an independent laboratory.',
        body:
          'New Grown Diamonds are graded by the independent diamond grading laboratory ' +
          'International Gemological Institute (IGI). If you are looking for real lab grown ' +
          'diamonds that are GIA certified, you can always contact New Grown Diamond.',
      },
      {
        id: 'quality',
        title: 'Quality',
        lead: 'The same hardness, stiffness and thermal conductivity.',
        body:
          'We bring you the best lab manufactured diamonds, with the same exceptional hardness, ' +
          'stiffness and thermal conductivity as their earth-mined counterparts. They are created ' +
          'to last for years, exactly as an earth-mined diamond does.',
      },
      {
        id: 'value',
        title: 'Value',
        lead: 'Around 40 to 50 percent less, like for like.',
        body:
          'Lab created diamonds offer excellent value and are more affordable than natural ' +
          'diamonds of comparable size and quality. Our lab-manufactured diamonds are priced ' +
          'around 40 to 50 percent less, and are free of humanitarian and environmental concerns.',
      },
      {
        id: 'conflict',
        title: 'Conflict-free',
        lead: 'No negative environmental or social impact.',
        body:
          'Our collection of ethical, affordable, conflict-free grown diamonds is more beautiful ' +
          'than anything we will ever take out of the earth, and comes free of any negative ' +
          'environmental or social impact.',
      },
      {
        id: 'genuine',
        title: 'Genuine',
        lead: '100% crystallised carbon, certificate included.',
        body:
          'Our grown diamonds are 100% pure crystallised carbon and identical in every way to ' +
          'earth-mined diamonds. You can trust New Grown Diamond to buy wholesale lab diamonds ' +
          'that are 100 percent real. We supply a certificate with every diamond.',
      },
      {
        id: 'eco',
        title: 'Eco-conscious',
        lead: 'Mining one carat disturbs nearly 100 sq ft of land.',
        body:
          'For every carat of diamond mined, nearly 100 sq ft of land is disturbed and almost ' +
          '6,000 lbs (2.7 tonnes) of mineral waste is created. Every purchase at New Grown Diamond ' +
          'funds the foundation that helps restore diamond communities.',
      },
    ],
  },

  hi: {
    label: 'लैब-ग्रोन हीरे क्यों',
    kicker: 'कारण',
    title: 'लैब-ग्रोन हीरे क्यों',
    reasons: [
      {
        title: 'सर्टिफाइड',
        lead: 'एक स्वतंत्र लैब द्वारा ग्रेड किए गए।',
        body:
          'New Grown Diamond के हीरे स्वतंत्र डायमंड ग्रेडिंग लैब International Gemological ' +
          'Institute (IGI) द्वारा ग्रेड किए जाते हैं। अगर आप GIA सर्टिफाइड असली लैब-ग्रोन हीरे ' +
          'ढूँढ रहे हैं, तो आप कभी भी New Grown Diamond से संपर्क कर सकते हैं।',
      },
      {
        title: 'क्वालिटी',
        lead: 'वही कठोरता, वही दृढ़ता और वही ऊष्मीय चालकता।',
        body:
          'हम आपके लिए लाते हैं लैब में बने बेहतरीन हीरे, जिनकी असाधारण कठोरता, दृढ़ता और ' +
          'ऊष्मीय चालकता धरती से निकाले गए हीरों जैसी ही है। इन्हें बरसों तक टिकने के लिए बनाया ' +
          'जाता है, ठीक वैसे ही जैसे धरती से निकला हीरा टिकता है।',
      },
      {
        title: 'मूल्य',
        lead: 'समान हीरे की तुलना में लगभग 40 से 50 प्रतिशत कम।',
        body:
          'लैब में बने हीरे बेहतरीन मूल्य देते हैं और समान साइज़ व क्वालिटी के प्राकृतिक हीरों से ' +
          'ज़्यादा किफ़ायती हैं। हमारे लैब में बने हीरों की कीमत लगभग 40 से 50 प्रतिशत कम होती है, ' +
          'और इनके साथ मानवीय या पर्यावरण से जुड़ी कोई चिंता नहीं जुड़ी होती।',
      },
      {
        title: 'कॉन्फ़्लिक्ट-फ़्री',
        lead: 'पर्यावरण या समाज पर कोई बुरा असर नहीं।',
        body:
          'नैतिक, किफ़ायती और कॉन्फ़्लिक्ट-फ़्री उगाए गए हीरों का हमारा कलेक्शन धरती से कभी भी ' +
          'निकाली जाने वाली किसी भी चीज़ से ज़्यादा ख़ूबसूरत है, और पर्यावरण या समाज पर इसका ' +
          'कोई बुरा असर नहीं पड़ता।',
      },
      {
        title: 'असली',
        lead: '100% क्रिस्टलीकृत कार्बन, साथ में सर्टिफिकेट।',
        body:
          'हमारे उगाए गए हीरे 100% शुद्ध क्रिस्टलीकृत कार्बन हैं और हर तरह से धरती से निकाले गए ' +
          'हीरों जैसे ही हैं। 100 प्रतिशत असली होलसेल लैब हीरे ख़रीदने के लिए आप New Grown Diamond ' +
          'पर भरोसा कर सकते हैं। हम हर हीरे के साथ सर्टिफिकेट देते हैं।',
      },
      {
        title: 'पर्यावरण के प्रति सजग',
        lead: 'एक कैरेट की माइनिंग से लगभग 100 वर्ग फ़ुट ज़मीन प्रभावित होती है।',
        body:
          'खदान से निकाले गए हर एक कैरेट हीरे के लिए लगभग 100 वर्ग फ़ुट ज़मीन प्रभावित होती है और ' +
          'करीब 6,000 पाउंड (2.7 टन) खनिज कचरा पैदा होता है। New Grown Diamond से की गई हर ' +
          'ख़रीदारी उस फ़ाउंडेशन को फ़ंड देती है, जो हीरा समुदायों को फिर से सँवारने में मदद करता है।',
      },
    ],
  },

  gu: {
    label: 'લેબ-ગ્રોન હીરા શા માટે',
    kicker: 'કારણ',
    title: 'લેબ-ગ્રોન હીરા શા માટે',
    reasons: [
      {
        title: 'સર્ટિફાઇડ',
        lead: 'સ્વતંત્ર લેબ દ્વારા ગ્રેડ કરેલા.',
        body:
          'New Grown Diamondના હીરા સ્વતંત્ર ડાયમંડ ગ્રેડિંગ લેબ International Gemological ' +
          'Institute (IGI) દ્વારા ગ્રેડ કરવામાં આવે છે. જો તમે GIA સર્ટિફાઇડ અસલી લેબ-ગ્રોન હીરા ' +
          'શોધી રહ્યા હો, તો તમે ક્યારેય પણ New Grown Diamondનો સંપર્ક કરી શકો છો.',
      },
      {
        title: 'ક્વૉલિટી',
        lead: 'એ જ કઠિનતા, એ જ દૃઢતા અને એ જ ઉષ્મા વાહકતા.',
        body:
          'અમે તમારા માટે લાવીએ છીએ લેબમાં બનેલા શ્રેષ્ઠ હીરા, જેની અસાધારણ કઠિનતા, દૃઢતા અને ' +
          'ઉષ્મા વાહકતા ધરતીમાંથી કાઢેલા હીરા જેવી જ છે. તે વર્ષો સુધી ટકે એ રીતે બનાવવામાં આવે ' +
          'છે, બરાબર એ જ રીતે જેમ ધરતીમાંથી કાઢેલો હીરો ટકે છે.',
      },
      {
        title: 'મૂલ્ય',
        lead: 'સમાન હીરાની સરખામણીમાં આશરે 40 થી 50 ટકા ઓછું.',
        body:
          'લેબમાં બનેલા હીરા ઉત્તમ મૂલ્ય આપે છે અને સમાન સાઇઝ અને ક્વૉલિટીના કુદરતી હીરા કરતાં ' +
          'વધુ કિફાયતી છે. અમારા લેબમાં બનેલા હીરાની કિંમત આશરે 40 થી 50 ટકા ઓછી હોય છે, અને ' +
          'તેની સાથે માનવીય કે પર્યાવરણ સંબંધી કોઈ ચિંતા જોડાયેલી નથી.',
      },
      {
        title: 'કોન્ફ્લિક્ટ-ફ્રી',
        lead: 'પર્યાવરણ કે સમાજ પર કોઈ નકારાત્મક અસર નહીં.',
        body:
          'નૈતિક, કિફાયતી અને કોન્ફ્લિક્ટ-ફ્રી ઉગાડેલા હીરાનું અમારું કલેક્શન ધરતીમાંથી ક્યારેય ' +
          'કાઢવામાં આવનારી કોઈ પણ વસ્તુ કરતાં વધુ સુંદર છે, અને પર્યાવરણ કે સમાજ પર તેની કોઈ ' +
          'નકારાત્મક અસર થતી નથી.',
      },
      {
        title: 'અસલી',
        lead: '100% સ્ફટિકીકૃત કાર્બન, સાથે સર્ટિફિકેટ.',
        body:
          'અમારા ઉગાડેલા હીરા 100% શુદ્ધ સ્ફટિકીકૃત કાર્બન છે અને દરેક રીતે ધરતીમાંથી કાઢેલા હીરા ' +
          'જેવા જ છે. 100 ટકા અસલી હોલસેલ લેબ હીરા ખરીદવા માટે તમે New Grown Diamond પર ભરોસો ' +
          'કરી શકો છો. અમે દરેક હીરા સાથે સર્ટિફિકેટ આપીએ છીએ.',
      },
      {
        title: 'પર્યાવરણ પ્રત્યે સજાગ',
        lead: 'એક કેરેટના માઇનિંગથી આશરે 100 ચોરસ ફૂટ જમીન પ્રભાવિત થાય છે.',
        body:
          'ખાણમાંથી કાઢવામાં આવતા દરેક કેરેટ હીરા માટે આશરે 100 ચોરસ ફૂટ જમીન પ્રભાવિત થાય છે અને ' +
          'લગભગ 6,000 પાઉન્ડ (2.7 ટન) ખનિજ કચરો પેદા થાય છે. New Grown Diamond પરથી થતી દરેક ' +
          'ખરીદી એ ફાઉન્ડેશનને ફંડ આપે છે, જે હીરા સમુદાયોને ફરી બેઠા કરવામાં મદદ કરે છે.',
      },
    ],
  },
};
