import { getLocales } from 'react-native-localize';

import {
  DEFAULT_LANGUAGE,
  LANGUAGE_DEFINITIONS,
  RELEASED_LANGUAGE_CODES,
  SUPPORTED_LANGUAGE_CODES,
  isReleasedLanguage,
  type AppLanguage,
} from '@/shared/i18n/languages';

export { DEFAULT_LANGUAGE } from '@/shared/i18n/languages';
export const SUPPORTED_LANGUAGES: readonly AppLanguage[] = [...SUPPORTED_LANGUAGE_CODES];
export const RELEASED_LANGUAGES: readonly AppLanguage[] = [...RELEASED_LANGUAGE_CODES];

const ALIAS_TO_LANGUAGE = Object.values(LANGUAGE_DEFINITIONS).reduce<Map<string, AppLanguage>>(
  (map, definition) => {
    map.set(normalizeLocaleValue(definition.code), definition.code);
    map.set(normalizeLocaleValue(definition.localeTag), definition.code);
    definition.detectionAliases.forEach(alias => {
      map.set(normalizeLocaleValue(alias), definition.code);
    });
    return map;
  },
  new Map<string, AppLanguage>(),
);

function normalizeLocaleValue(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, '-');
}

function resolveSupportedLanguage(value: string | undefined): AppLanguage | null {
  if (!value) {
    return null;
  }

  const normalizedValue = normalizeLocaleValue(value);
  const exactMatch = ALIAS_TO_LANGUAGE.get(normalizedValue);
  if (exactMatch) {
    return exactMatch;
  }

  const [baseLanguage] = normalizedValue.split('-');
  if (!baseLanguage) {
    return null;
  }

  return ALIAS_TO_LANGUAGE.get(baseLanguage) ?? null;
}

export function resolveDeviceLanguage(fallback: AppLanguage = DEFAULT_LANGUAGE): AppLanguage {
  const [primaryLocale] = getLocales();
  const resolvedLanguage =
    resolveSupportedLanguage(primaryLocale?.languageTag) ??
    resolveSupportedLanguage(primaryLocale?.languageCode);

  if (resolvedLanguage && isReleasedLanguage(resolvedLanguage)) {
    return resolvedLanguage;
  }

  return isReleasedLanguage(fallback) ? fallback : DEFAULT_LANGUAGE;
}
