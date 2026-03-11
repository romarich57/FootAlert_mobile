jest.mock('@ui/shared/i18n/resourceLoaders', () => {
  const actual = jest.requireActual('@ui/shared/i18n/resourceLoaders');

  return {
    ...actual,
    loadNamespaceResource: jest.fn(async (language: string, namespace: string) => {
      if (language === 'fr' && namespace === 'common') {
        return {
          calendar: {
            todayShort: 'AUJ',
          },
        };
      }

      return {};
    }),
  };
});

import i18n, { ensureLanguageResources } from '@ui/shared/i18n';
import { loadNamespaceResource } from '@ui/shared/i18n/resourceLoaders';

const mockedLoadNamespaceResource = jest.mocked(loadNamespaceResource);

describe('i18n lazy resources', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await i18n.changeLanguage('en');
  });

  it('bundles english resources immediately', () => {
    expect(i18n.t('common:calendar.todayShort')).toBe('TOD');
  });

  it('loads missing language resources on demand', async () => {
    await ensureLanguageResources('fr');

    expect(mockedLoadNamespaceResource).toHaveBeenCalledWith('fr', 'common');
    expect(i18n.getResourceBundle('fr', 'common')).toEqual({
      calendar: {
        todayShort: 'AUJ',
      },
    });
  });

  it('keeps english fallback for scaffolded empty locales', async () => {
    await ensureLanguageResources('es');

    expect(i18n.hasResourceBundle('es', 'common')).toBe(true);
    expect(i18n.t('common:calendar.todayShort', { lng: 'es' })).toBe('TOD');
  });
});
