/**
 * The profile form's words, in the three languages (see src/i18n/useCopy.js).
 * "Full name" is the site dictionary's `auth.fullName`; the other three labels
 * are here, keyed by the field names the database function takes. What the
 * customer types is saved exactly as typed, in whatever script they used.
 */
export default {
  en: {
    fields: { company_name: 'Company', phone: 'Phone', country: 'Country' },
    failed: 'Your profile could not be saved. Check your connection and try again.',
    noChange: 'No profile change was returned. Your account may no longer be active.',
    saved: 'Your profile was updated.',
    saving: 'Saving…',
    save: 'Save changes',
    discard: 'Discard',
  },

  hi: {
    fields: { company_name: 'कंपनी', phone: 'फ़ोन', country: 'देश' },
    failed: 'आपकी प्रोफ़ाइल सहेजी नहीं जा सकी। अपना कनेक्शन जाँचें और फिर कोशिश करें।',
    noChange: 'प्रोफ़ाइल में कोई बदलाव वापस नहीं मिला। हो सकता है आपका खाता अब सक्रिय न हो।',
    saved: 'आपकी प्रोफ़ाइल अपडेट हो गई।',
    saving: 'सहेजा जा रहा है…',
    save: 'बदलाव सहेजें',
    discard: 'बदलाव रद्द करें',
  },

  gu: {
    fields: { company_name: 'કંપની', phone: 'ફોન', country: 'દેશ' },
    failed: 'તમારી પ્રોફાઇલ સાચવી શકાઈ નથી. તમારું કનેક્શન તપાસો અને ફરી પ્રયાસ કરો.',
    noChange: 'પ્રોફાઇલમાં કોઈ ફેરફાર પરત મળ્યો નથી. કદાચ તમારું ખાતું હવે સક્રિય નથી.',
    saved: 'તમારી પ્રોફાઇલ અપડેટ થઈ ગઈ.',
    saving: 'સાચવી રહ્યા છીએ…',
    save: 'ફેરફાર સાચવો',
    discard: 'ફેરફાર રદ કરો',
  },
};
