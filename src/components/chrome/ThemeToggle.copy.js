/**
 * The theme control's words, in the three languages (see
 * src/i18n/useCopy.js). `modes` is keyed by the stored theme value, which
 * itself never changes; `{mode}` in the accessible name and the tooltip is
 * the mode's word in the same language. Hindi and Gujarati use the
 * light/dark words their phones and apps already use for this setting.
 */
export default {
  en: {
    modes: { light: 'Light', dark: 'Dark' },
    aria: 'Theme: {mode}. Change theme.',
    title: 'Theme: {mode}',
  },

  hi: {
    modes: { light: 'लाइट', dark: 'डार्क' },
    aria: 'थीम: {mode}। थीम बदलें।',
    title: 'थीम: {mode}',
  },

  gu: {
    modes: { light: 'લાઇટ', dark: 'ડાર્ક' },
    aria: 'થીમ: {mode}. થીમ બદલો.',
    title: 'થીમ: {mode}',
  },
};
