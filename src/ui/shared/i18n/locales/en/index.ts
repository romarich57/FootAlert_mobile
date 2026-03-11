import { freshnessLocaleFragments } from '@ui/shared/i18n/locales/freshness';
import { en } from '@ui/shared/i18n/locales/translation.en';
import { enCommon } from '@ui/shared/i18n/locales/en/common';
import { enMatches } from '@ui/shared/i18n/locales/en/matches';
import { enSettings } from '@ui/shared/i18n/locales/en/settings';
import { enTeams } from '@ui/shared/i18n/locales/en/teams';
import type { LocaleNamespaceRecord } from '@ui/shared/i18n/resourceLoaders';

export const localeNamespaces: LocaleNamespaceRecord = {
  translation: {
    ...en,
    ...freshnessLocaleFragments.en,
  },
  common: enCommon,
  matches: enMatches,
  settings: enSettings,
  teams: enTeams,
};

export default localeNamespaces;
