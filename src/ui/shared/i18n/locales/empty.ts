import type { ResourceLanguage } from 'i18next';

import type { I18nNamespace, LocaleNamespaceRecord } from '@ui/shared/i18n/resourceLoaders';

function createEmptyNamespaceRecord(): LocaleNamespaceRecord {
  return {
    translation: {},
    common: {},
    matches: {},
    settings: {},
    teams: {},
  };
}

export function createEmptyLocaleNamespaces(): LocaleNamespaceRecord {
  return createEmptyNamespaceRecord();
}

export const emptyLocaleNamespaces: LocaleNamespaceRecord = createEmptyNamespaceRecord();

export function getEmptyNamespaceResource(
  namespace: I18nNamespace,
): ResourceLanguage {
  return emptyLocaleNamespaces[namespace];
}
