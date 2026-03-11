import { getLocales } from 'react-native-localize';

import { resolveDeviceLanguage } from '@/shared/i18n/language';

jest.mock('react-native-localize', () => ({
  getLocales: jest.fn(),
}));

type MockLocale = {
  languageCode: string;
  languageTag: string;
  countryCode: string;
  isRTL: boolean;
};

function buildLocale(languageCode: string, languageTag: string, countryCode: string): MockLocale {
  return {
    languageCode,
    languageTag,
    countryCode,
    isRTL: false,
  };
}

const mockedGetLocales = jest.mocked(getLocales);

describe('resolveDeviceLanguage', () => {
  beforeEach(() => {
    mockedGetLocales.mockReset();
  });

  it('maps en-US to en', () => {
    mockedGetLocales.mockReturnValue([buildLocale('en', 'en-US', 'US')]);

    expect(resolveDeviceLanguage()).toBe('en');
  });

  it('maps fr-FR to fr', () => {
    mockedGetLocales.mockReturnValue([buildLocale('fr', 'fr-FR', 'FR')]);

    expect(resolveDeviceLanguage()).toBe('fr');
  });

  it('falls back to en for zh-CN while the locale is not released', () => {
    mockedGetLocales.mockReturnValue([buildLocale('zh', 'zh-CN', 'CN')]);

    expect(resolveDeviceLanguage()).toBe('en');
  });

  it('falls back to en for zh-Hans while the locale is not released', () => {
    mockedGetLocales.mockReturnValue([buildLocale('zh', 'zh-Hans', 'CN')]);

    expect(resolveDeviceLanguage()).toBe('en');
  });

  it('falls back to en for pt-BR while the locale is not released', () => {
    mockedGetLocales.mockReturnValue([buildLocale('pt', 'pt-BR', 'BR')]);

    expect(resolveDeviceLanguage()).toBe('en');
  });

  it('falls back to en for hidden arabic locales', () => {
    mockedGetLocales.mockReturnValue([buildLocale('ar', 'ar-SA', 'SA')]);

    expect(resolveDeviceLanguage()).toBe('en');
  });

  it('falls back to en for unsupported locales', () => {
    mockedGetLocales.mockReturnValue([buildLocale('cs', 'cs-CZ', 'CZ')]);

    expect(resolveDeviceLanguage()).toBe('en');
  });

  it('uses a released custom fallback when the locale is unsupported', () => {
    mockedGetLocales.mockReturnValue([buildLocale('cs', 'cs-CZ', 'CZ')]);

    expect(resolveDeviceLanguage('fr')).toBe('fr');
  });
});
