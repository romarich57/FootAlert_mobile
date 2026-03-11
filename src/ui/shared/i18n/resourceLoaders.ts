import type { BackendModule, ResourceLanguage } from 'i18next';

import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGE_CODES,
  type AppLanguage,
} from '@/shared/i18n/languages';
import { emptyLocaleNamespaces, getEmptyNamespaceResource } from '@ui/shared/i18n/locales/empty';

export const I18N_NAMESPACES = [
  'translation',
  'common',
  'matches',
  'settings',
  'teams',
] as const;

export type I18nNamespace = typeof I18N_NAMESPACES[number];

export type LocaleNamespaceRecord = Record<I18nNamespace, ResourceLanguage>;

type LocaleModule = {
  default?: LocaleNamespaceRecord;
  localeNamespaces?: LocaleNamespaceRecord;
};

type LocaleLoader = () => Promise<LocaleModule>;

const LOCALE_LOADERS: Record<AppLanguage, LocaleLoader> = {
  en: () => import('@ui/shared/i18n/locales/en/index'),
  es: () => import('@ui/shared/i18n/locales/es'),
  zh_CN: () => import('@ui/shared/i18n/locales/zh_CN'),
  ar: () => import('@ui/shared/i18n/locales/ar'),
  pt: () => import('@ui/shared/i18n/locales/pt'),
  fr: () => import('@ui/shared/i18n/locales/fr/index'),
  id: () => import('@ui/shared/i18n/locales/id'),
  ja: () => import('@ui/shared/i18n/locales/ja'),
  de: () => import('@ui/shared/i18n/locales/de'),
  ru: () => import('@ui/shared/i18n/locales/ru'),
  it: () => import('@ui/shared/i18n/locales/it'),
  tr: () => import('@ui/shared/i18n/locales/tr'),
  hi: () => import('@ui/shared/i18n/locales/hi'),
  ko: () => import('@ui/shared/i18n/locales/ko'),
  vi: () => import('@ui/shared/i18n/locales/vi'),
  th: () => import('@ui/shared/i18n/locales/th'),
  pl: () => import('@ui/shared/i18n/locales/pl'),
  nl: () => import('@ui/shared/i18n/locales/nl'),
  sw: () => import('@ui/shared/i18n/locales/sw'),
  bn: () => import('@ui/shared/i18n/locales/bn'),
};

const localePromiseCache = new Map<AppLanguage, Promise<LocaleNamespaceRecord>>();
const namespacePromiseCache = new Map<string, Promise<ResourceLanguage>>();

function isI18nNamespace(value: string): value is I18nNamespace {
  return (I18N_NAMESPACES as readonly string[]).includes(value);
}

function toSupportedLanguage(value: string): AppLanguage {
  return (SUPPORTED_LANGUAGE_CODES as readonly string[]).includes(value)
    ? (value as AppLanguage)
    : DEFAULT_LANGUAGE;
}

function toSupportedNamespace(value: string): I18nNamespace {
  return isI18nNamespace(value) ? value : 'translation';
}

async function loadLocaleModule(language: AppLanguage): Promise<LocaleNamespaceRecord> {
  const cachedPromise = localePromiseCache.get(language);
  if (cachedPromise) {
    return cachedPromise;
  }

  const loader = LOCALE_LOADERS[language];
  const promise = loader()
    .then(module => module.default ?? module.localeNamespaces ?? emptyLocaleNamespaces)
    .catch(() => emptyLocaleNamespaces);

  localePromiseCache.set(language, promise);
  return promise;
}

export async function loadNamespaceResource(
  language: AppLanguage,
  namespace: I18nNamespace,
): Promise<ResourceLanguage> {
  const cacheKey = `${language}:${namespace}`;
  const cachedPromise = namespacePromiseCache.get(cacheKey);
  if (cachedPromise) {
    return cachedPromise;
  }

  const promise = loadLocaleModule(language)
    .then(localeNamespaces => localeNamespaces[namespace] ?? getEmptyNamespaceResource(namespace));

  namespacePromiseCache.set(cacheKey, promise);
  return promise;
}

export const i18nResourceBackend: BackendModule = {
  type: 'backend',
  init: () => undefined,
  read(language, namespace, callback) {
    loadNamespaceResource(
      toSupportedLanguage(language),
      toSupportedNamespace(namespace),
    )
      .then(resource => {
        callback(null, resource);
      })
      .catch(error => {
        callback(error as Error, false);
      });
  },
};
