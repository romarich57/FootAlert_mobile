import { freshnessLocaleFragments } from '@ui/shared/i18n/locales/freshness';
import { fr } from '@ui/shared/i18n/locales/translation.fr';
import { frCommon } from '@ui/shared/i18n/locales/fr/common';
import { frMatches } from '@ui/shared/i18n/locales/fr/matches';
import { frSettings } from '@ui/shared/i18n/locales/fr/settings';
import { frTeams } from '@ui/shared/i18n/locales/fr/teams';
import type { LocaleNamespaceRecord } from '@ui/shared/i18n/resourceLoaders';

export const localeNamespaces: LocaleNamespaceRecord = {
  translation: {
    ...fr,
    ...freshnessLocaleFragments.fr,
  },
  common: frCommon,
  matches: frMatches,
  settings: frSettings,
  teams: frTeams,
};

export default localeNamespaces;
