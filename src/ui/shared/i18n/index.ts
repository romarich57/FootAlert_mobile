import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGE_CODES,
  type AppLanguage,
} from '@/shared/i18n/languages';
import bundledEnglishNamespaces from '@ui/shared/i18n/locales/en/index';
import {
  I18N_NAMESPACES,
  i18nResourceBackend,
  loadNamespaceResource,
  type I18nNamespace,
} from '@ui/shared/i18n/resourceLoaders';

export type { I18nNamespace } from '@ui/shared/i18n/resourceLoaders';

export async function ensureLanguageResources(
  language: AppLanguage,
  namespaces: readonly I18nNamespace[] = I18N_NAMESPACES,
): Promise<void> {
  await Promise.all(
    namespaces.map(async namespace => {
      if (i18n.hasResourceBundle(language, namespace)) {
        return;
      }

      const resource = await loadNamespaceResource(language, namespace);
      i18n.addResourceBundle(language, namespace, resource, true, true);
    }),
  );
}

if (!i18n.isInitialized) {
  i18n
    .use(i18nResourceBackend)
    .use(initReactI18next)
    .init({
      compatibilityJSON: 'v4',
      // Keep the startup bundle minimal: English is bundled, all other locales
      // are resolved on demand before the hydrated app renders.
      resources: {
        [DEFAULT_LANGUAGE]: bundledEnglishNamespaces,
      },
      lng: DEFAULT_LANGUAGE,
      fallbackLng: DEFAULT_LANGUAGE,
      supportedLngs: [...SUPPORTED_LANGUAGE_CODES],
      ns: [...I18N_NAMESPACES],
      defaultNS: 'translation',
      partialBundledLanguages: true,
      nonExplicitSupportedLngs: true,
      interpolation: {
        escapeValue: false,
      },
      react: {
        useSuspense: false,
      },
      returnNull: false,
    })
    .catch(() => undefined);
}

export default i18n;
