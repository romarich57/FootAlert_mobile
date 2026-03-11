import {
  COMING_SOON_LANGUAGE_CODES,
  HIDDEN_LANGUAGE_CODES,
  RELEASED_LANGUAGE_CODES,
  getLanguageDefinition,
  isReleasedLanguage,
} from '@/shared/i18n/languages';

describe('language availability registry', () => {
  it('exposes only released languages in the released set', () => {
    expect(RELEASED_LANGUAGE_CODES).toEqual(['en', 'fr']);
    expect(HIDDEN_LANGUAGE_CODES).toEqual(['ar']);
    expect(COMING_SOON_LANGUAGE_CODES).toEqual([
      'es',
      'zh_CN',
      'pt',
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
    ]);
  });

  it('marks arabic as hidden until the RTL track is ready', () => {
    expect(getLanguageDefinition('ar').availability).toBe('hidden');
    expect(isReleasedLanguage('ar')).toBe(false);
  });
});
