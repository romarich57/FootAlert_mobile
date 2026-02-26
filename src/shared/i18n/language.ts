import { getLocales } from 'react-native-localize';

import type { AppLanguage } from '@/shared/types/preferences.types';

export const DEFAULT_LANGUAGE: AppLanguage = 'fr';
export const SUPPORTED_LANGUAGES: readonly AppLanguage[] = ['fr', 'en'];

function resolveSupportedLanguage(value: string | undefined): AppLanguage | null {
  if (!value) {
    return null;
  }

  const normalizedValue = value.toLowerCase();
  if (normalizedValue.startsWith('fr')) {
    return 'fr';
  }

  if (normalizedValue.startsWith('en')) {
    return 'en';
  }

  return null;
}

export function resolveDeviceLanguage(fallback: AppLanguage = DEFAULT_LANGUAGE): AppLanguage {
  const [primaryLocale] = getLocales();
  const resolvedLanguage =
    resolveSupportedLanguage(primaryLocale?.languageTag) ??
    resolveSupportedLanguage(primaryLocale?.languageCode);

  return resolvedLanguage ?? fallback;
}
