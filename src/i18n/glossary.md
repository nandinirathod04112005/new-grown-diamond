# Trade glossary — for review

**This is the file to correct.** Every diamond trade term used anywhere in the
Hindi and Gujarati copy is listed here once. Change a term here and it changes
everywhere it appears; there is no need to hunt through the code.

The corresponding keys live in `src/i18n/dictionary/hi.js` and
`src/i18n/dictionary/gu.js` under `terms.*`.

## The decision this table encodes

Where the Surat trade normally writes the **English** word — in a WhatsApp
message, on a memo, on a certificate — the English word is kept, transliterated
into the local script only where the sentence needs it to read naturally.
Translating "carat" to a formal Sanskritised equivalent would be *correct* and
would still read as wrong to a buyer who says "carat" fifty times a day.

Where a word is ordinary language rather than trade vocabulary — "price",
"available", "contact us" — it is translated properly.

Mark any row you disagree with. **Status** is what needs your attention:

- `keep-english` — deliberately left in English
- `translit` — English word written in the local script
- `translated` — a real translation
- `⚠ check` — I am not confident; please confirm

| # | English | Hindi | Gujarati | Status | Note |
|---|---------|-------|----------|--------|------|
| 1 | Diamond | हीरा | હીરા | translated | Everyday word in both. Safe. |
| 2 | Lab-grown diamond | लैब-ग्रोन हीरा | લેબ-ગ્રોન હીરા | translit | The trade says "lab-grown". A full translation (प्रयोगशाला में निर्मित) reads like a government form. |
| 3 | Natural diamond | प्राकृतिक हीरा | કુદરતી હીરા | translated | |
| 4 | Carat | कैरेट | કેરેટ | translit | Never translated in the trade. |
| 5 | Cut | कट | કટ | translit | ⚠ check — "कटाई" exists but means the act of cutting, not the grade. |
| 6 | Colour | कलर | કલર | translit | ⚠ check — रंग / રંગ is the ordinary word, but the grade is said as "colour". |
| 7 | Clarity | क्लैरिटी | ક્લેરિટી | translit | Same reasoning as colour. |
| 8 | Polish | पॉलिश | પોલિશ | translit | |
| 9 | Symmetry | सिमेट्री | સિમેટ્રી | translit | ⚠ check |
| 10 | Fluorescence | फ्लोरेसेंस | ફ્લોરેસન્સ | translit | |
| 11 | Certificate | सर्टिफिकेट | સર્ટિફિકેટ | translit | प्रमाणपत्र / પ્રમાણપત્ર is correct but not what the desk says. |
| 12 | Grading report | ग्रेडिंग रिपोर्ट | ગ્રેડિંગ રિપોર્ટ | translit | |
| 13 | Laboratory (IGI, GIA) | लैब | લેબ | translit | The lab names stay Latin: IGI, GIA. |
| 14 | CVD | CVD | CVD | keep-english | A process name. Never transliterated. |
| 15 | HPHT | HPHT | HPHT | keep-english | |
| 16 | Shape | शेप | શેપ | translit | ⚠ check — आकार / આકાર is the ordinary word. |
| 17 | Round brilliant | राउंड ब्रिलियंट | રાઉન્ડ બ્રિલિયન્ટ | translit | All shape names stay as trade names. |
| 18 | Stock / inventory | स्टॉक | સ્ટોક | translit | |
| 19 | Stock number | स्टॉक नंबर | સ્ટોક નંબર | translit | |
| 20 | In stock | उपलब्ध | ઉપલબ્ધ | translated | Ordinary language. |
| 21 | Sold | बिक गया | વેચાયેલ | translated | |
| 22 | On hold | होल्ड पर | હોલ્ડ પર | translit | |
| 23 | Price | कीमत | કિંમત | translated | |
| 24 | Price on request | कीमत पूछताछ पर | કિંમત પૂછપરછ પર | translated | |
| 25 | Enquiry | पूछताछ | પૂછપરછ | translated | |
| 26 | Jewellery | ज्वेलरी | જ્વેલરી | translit | ⚠ check — आभूषण / આભૂષણ is formal; the trade says jewellery. |
| 27 | Custom jewellery | कस्टम ज्वेलरी | કસ્ટમ જ્વેલરી | translit | |
| 28 | Setting (a mount) | सेटिंग | સેટિંગ | translit | |
| 29 | Metal | मेटल | મેટલ | translit | |
| 30 | Contact / the desk | संपर्क | સંપર્ક | translated | |

## Names that must never be translated

New Grown Diamond · NGD · IGI · GIA · CVD · HPHT · Surat · Mumbai · New York ·
Hong Kong · every stock number, certificate number and email address.

## How to correct a term

1. Change the Hindi or Gujarati cell above.
2. Change the same key in `src/i18n/dictionary/hi.js` / `gu.js` under `terms`.
3. Any sentence that uses the term composes it from `terms`, so the sentence
   updates with it.
