import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  resolveDeviceLanguage,
} from '@/shared/i18n/language';
import { en } from '@ui/shared/i18n/locales/en';
import { fr } from '@ui/shared/i18n/locales/fr';

const resources = {
  en: { translation: en },
  fr: { translation: fr },
};

if (!i18n.isInitialized) {
  const initialLanguage = resolveDeviceLanguage(DEFAULT_LANGUAGE);

  i18n
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v4',
      resources,
      lng: initialLanguage,
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: [...SUPPORTED_LANGUAGES],
      nonExplicitSupportedLngs: true,
      interpolation: {
        escapeValue: false,
      },
      returnNull: false,
    })
    .catch(() => undefined);
}

export default i18n;
