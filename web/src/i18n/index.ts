import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from './en';
import { fr } from './fr';

i18n
  .use(initReactI18next)
  .init({
  compatibilityJSON: 'v4',
  lng: 'fr',
  fallbackLng: 'en',
  resources: {
    en: { translation: en },
    fr: { translation: fr },
  },
  interpolation: { escapeValue: false },
  })
  .catch(() => undefined);

export default i18n;
