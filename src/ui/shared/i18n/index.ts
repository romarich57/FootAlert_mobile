import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { en } from '@ui/shared/i18n/locales/en';
import { fr } from '@ui/shared/i18n/locales/fr';

const DEFAULT_LANGUAGE = 'fr';

const resources = {
  en: { translation: en },
  fr: { translation: fr },
};

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v4',
      resources,
      lng: DEFAULT_LANGUAGE,
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: ['fr', 'en'],
      nonExplicitSupportedLngs: true,
      interpolation: {
        escapeValue: false,
      },
      returnNull: false,
    })
    .catch(() => undefined);
}

export default i18n;
