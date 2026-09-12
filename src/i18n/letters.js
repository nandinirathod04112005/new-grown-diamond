/**
 * The pieces an animated heading is cut into.
 *
 * Latin is cut into letters. Hindi and Gujarati must not be: a vowel sign or a
 * half-letter is not a letter on its own, and given a span of its own it is
 * drawn detached from the letter it belongs to, on a dotted circle. A word in
 * either script is kept whole and animates as one piece.
 */
const INDIC = /[\p{Script=Devanagari}\p{Script=Gujarati}]/u;

export function lettersOf(word) {
  return INDIC.test(word) ? [word] : [...word];
}
