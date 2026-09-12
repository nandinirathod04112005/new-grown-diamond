/**
 * The grading scales' words, in the three languages (see src/i18n/useCopy.js).
 *
 * The scale titles come from the dictionary's `terms` (colour, clarity, cut).
 * The grades themselves — D, VVS1, Excellent — are trade codes and are never
 * translated; only the names of the bands printed under them are. Each band
 * list is in scale order and must keep the English list's length.
 */
export default {
  en: {
    bands: {
      colour: ['Colourless', 'Near colourless', 'Faint'],
      clarity: ['Flawless', 'Very very slight', 'Very slight', 'Slight', 'Included'],
    },
    scaleLabel: '{title} scale, this stone is {grade}',
  },

  hi: {
    bands: {
      colour: ['रंगहीन', 'लगभग रंगहीन', 'हल्का रंग'],
      clarity: ['दोषरहित', 'बहुत-बहुत मामूली', 'बहुत मामूली', 'मामूली', 'इन्क्लूडेड'],
    },
    scaleLabel: '{title} स्केल, यह हीरा {grade} है',
  },

  gu: {
    bands: {
      colour: ['રંગહીન', 'લગભગ રંગહીન', 'આછો રંગ'],
      clarity: ['દોષરહિત', 'ખૂબ ખૂબ નજીવા', 'ખૂબ નજીવા', 'નજીવા', 'ઇન્ક્લુડેડ'],
    },
    scaleLabel: '{title} સ્કેલ, આ હીરો {grade} છે',
  },
};
