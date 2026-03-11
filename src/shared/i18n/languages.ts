export const SUPPORTED_LANGUAGE_CODES = [
  'en',
  'es',
  'zh_CN',
  'ar',
  'pt',
  'fr',
  'id',
  'ja',
  'de',
  'ru',
  'it',
  'tr',
  'hi',
  'ko',
  'vi',
  'th',
  'pl',
  'nl',
  'sw',
  'bn',
] as const;

export type AppLanguage = typeof SUPPORTED_LANGUAGE_CODES[number];
export const LANGUAGE_AVAILABILITIES = ['released', 'hidden', 'coming_soon'] as const;
export type LanguageAvailability = typeof LANGUAGE_AVAILABILITIES[number];

export type LanguageDefinition = {
  code: AppLanguage;
  nativeLabel: string;
  localeTag: string;
  isRTL: boolean;
  detectionAliases: readonly string[];
  availability: LanguageAvailability;
};

export const DEFAULT_LANGUAGE: AppLanguage = 'en';

export const LANGUAGE_DEFINITIONS: Record<AppLanguage, LanguageDefinition> = {
  en: {
    code: 'en',
    nativeLabel: 'English',
    localeTag: 'en-US',
    isRTL: false,
    detectionAliases: ['en', 'en-us', 'en-gb', 'en-au', 'en-ca'],
    availability: 'released',
  },
  es: {
    code: 'es',
    nativeLabel: 'Español',
    localeTag: 'es-ES',
    isRTL: false,
    detectionAliases: ['es', 'es-es', 'es-mx', 'es-ar', 'es-co'],
    availability: 'coming_soon',
  },
  zh_CN: {
    code: 'zh_CN',
    nativeLabel: '简体中文',
    localeTag: 'zh-CN',
    isRTL: false,
    detectionAliases: ['zh', 'zh-cn', 'zh-hans', 'zh-hans-cn', 'zh-sg'],
    availability: 'coming_soon',
  },
  ar: {
    code: 'ar',
    nativeLabel: 'العربية',
    localeTag: 'ar-SA',
    isRTL: true,
    detectionAliases: ['ar', 'ar-sa', 'ar-ae', 'ar-eg', 'ar-ma'],
    availability: 'hidden',
  },
  pt: {
    code: 'pt',
    nativeLabel: 'Português',
    localeTag: 'pt-BR',
    isRTL: false,
    detectionAliases: ['pt', 'pt-br', 'pt-pt', 'pt-ao', 'pt-mz'],
    availability: 'coming_soon',
  },
  fr: {
    code: 'fr',
    nativeLabel: 'Français',
    localeTag: 'fr-FR',
    isRTL: false,
    detectionAliases: ['fr', 'fr-fr', 'fr-be', 'fr-ca', 'fr-ch'],
    availability: 'released',
  },
  id: {
    code: 'id',
    nativeLabel: 'Bahasa Indonesia',
    localeTag: 'id-ID',
    isRTL: false,
    detectionAliases: ['id', 'id-id'],
    availability: 'coming_soon',
  },
  ja: {
    code: 'ja',
    nativeLabel: '日本語',
    localeTag: 'ja-JP',
    isRTL: false,
    detectionAliases: ['ja', 'ja-jp'],
    availability: 'coming_soon',
  },
  de: {
    code: 'de',
    nativeLabel: 'Deutsch',
    localeTag: 'de-DE',
    isRTL: false,
    detectionAliases: ['de', 'de-de', 'de-at', 'de-ch'],
    availability: 'coming_soon',
  },
  ru: {
    code: 'ru',
    nativeLabel: 'Русский',
    localeTag: 'ru-RU',
    isRTL: false,
    detectionAliases: ['ru', 'ru-ru', 'ru-kz'],
    availability: 'coming_soon',
  },
  it: {
    code: 'it',
    nativeLabel: 'Italiano',
    localeTag: 'it-IT',
    isRTL: false,
    detectionAliases: ['it', 'it-it', 'it-ch'],
    availability: 'coming_soon',
  },
  tr: {
    code: 'tr',
    nativeLabel: 'Türkçe',
    localeTag: 'tr-TR',
    isRTL: false,
    detectionAliases: ['tr', 'tr-tr'],
    availability: 'coming_soon',
  },
  hi: {
    code: 'hi',
    nativeLabel: 'हिन्दी',
    localeTag: 'hi-IN',
    isRTL: false,
    detectionAliases: ['hi', 'hi-in'],
    availability: 'coming_soon',
  },
  ko: {
    code: 'ko',
    nativeLabel: '한국어',
    localeTag: 'ko-KR',
    isRTL: false,
    detectionAliases: ['ko', 'ko-kr'],
    availability: 'coming_soon',
  },
  vi: {
    code: 'vi',
    nativeLabel: 'Tiếng Việt',
    localeTag: 'vi-VN',
    isRTL: false,
    detectionAliases: ['vi', 'vi-vn'],
    availability: 'coming_soon',
  },
  th: {
    code: 'th',
    nativeLabel: 'ไทย',
    localeTag: 'th-TH',
    isRTL: false,
    detectionAliases: ['th', 'th-th'],
    availability: 'coming_soon',
  },
  pl: {
    code: 'pl',
    nativeLabel: 'Polski',
    localeTag: 'pl-PL',
    isRTL: false,
    detectionAliases: ['pl', 'pl-pl'],
    availability: 'coming_soon',
  },
  nl: {
    code: 'nl',
    nativeLabel: 'Nederlands',
    localeTag: 'nl-NL',
    isRTL: false,
    detectionAliases: ['nl', 'nl-nl', 'nl-be'],
    availability: 'coming_soon',
  },
  sw: {
    code: 'sw',
    nativeLabel: 'Kiswahili',
    localeTag: 'sw-KE',
    isRTL: false,
    detectionAliases: ['sw', 'sw-ke', 'sw-tz'],
    availability: 'coming_soon',
  },
  bn: {
    code: 'bn',
    nativeLabel: 'বাংলা',
    localeTag: 'bn-BD',
    isRTL: false,
    detectionAliases: ['bn', 'bn-bd', 'bn-in'],
    availability: 'coming_soon',
  },
};

export const RELEASED_LANGUAGE_CODES: readonly AppLanguage[] = Object.freeze(
  SUPPORTED_LANGUAGE_CODES.filter(code => LANGUAGE_DEFINITIONS[code].availability === 'released'),
);

export const HIDDEN_LANGUAGE_CODES: readonly AppLanguage[] = Object.freeze(
  SUPPORTED_LANGUAGE_CODES.filter(code => LANGUAGE_DEFINITIONS[code].availability === 'hidden'),
);

export const COMING_SOON_LANGUAGE_CODES: readonly AppLanguage[] = Object.freeze(
  SUPPORTED_LANGUAGE_CODES.filter(
    code => LANGUAGE_DEFINITIONS[code].availability === 'coming_soon',
  ),
);

export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && value in LANGUAGE_DEFINITIONS;
}

export function isLanguageAvailability(value: unknown): value is LanguageAvailability {
  return (
    typeof value === 'string' &&
    (LANGUAGE_AVAILABILITIES as readonly string[]).includes(value)
  );
}

export function isReleasedLanguage(
  language: string | null | undefined,
): language is AppLanguage {
  return (
    typeof language === 'string' &&
    isAppLanguage(language) &&
    LANGUAGE_DEFINITIONS[language].availability === 'released'
  );
}

export function getLanguageCodesByAvailability(
  availability: LanguageAvailability,
): readonly AppLanguage[] {
  switch (availability) {
    case 'released':
      return RELEASED_LANGUAGE_CODES;
    case 'hidden':
      return HIDDEN_LANGUAGE_CODES;
    case 'coming_soon':
      return COMING_SOON_LANGUAGE_CODES;
    default:
      return RELEASED_LANGUAGE_CODES;
  }
}

export function getLanguageDefinition(
  language: string | null | undefined,
): LanguageDefinition {
  if (language && isAppLanguage(language)) {
    return LANGUAGE_DEFINITIONS[language];
  }

  return LANGUAGE_DEFINITIONS[DEFAULT_LANGUAGE];
}

export function resolveLanguageLocaleTag(
  language: string | null | undefined,
): string {
  return getLanguageDefinition(language).localeTag;
}

export function isRtlLanguage(language: string | null | undefined): boolean {
  return getLanguageDefinition(language).isRTL;
}
