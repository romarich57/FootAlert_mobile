import type {
  PlayerCharacteristics,
  PlayerProfile,
  PlayerProfileCompetitionStats,
} from '@ui/features/players/types/players.types';
import type { TFunction } from 'i18next';
import { getCountryFlagUrl } from '@ui/features/players/utils/countryFlag';
import { toDisplayValue, toHeightValue } from '@ui/features/players/utils/playerDisplay';

export type TranslateFn = TFunction;

export type InfoTileItem = {
  id: string;
  icon: string;
  label: string;
  value: string;
  flagUrl?: string | null;
};

export type CompetitionKpiItem = {
  id: string;
  icon: string;
  label: string;
  value: string;
};

export const EMPTY_CHARACTERISTICS: PlayerCharacteristics = {
  touches: null,
  dribbles: null,
  chances: null,
  defense: null,
  duels: null,
  attack: null,
};

function hasDisplayValue(value: string | null | undefined): boolean {
  return toDisplayValue(value).length > 0;
}

export function buildInfoTiles(profile: PlayerProfile, t: TranslateFn): InfoTileItem[] {
  const entries: InfoTileItem[] = [];
  const height = toHeightValue(profile.height);
  if (height) {
    entries.push({
      id: 'height',
      icon: 'human-male-height',
      label: t('playerDetails.profile.labels.height'),
      value: `${height} ${t('playerDetails.profile.units.centimeters')}`,
    });
  }

  if (typeof profile.age === 'number') {
    entries.push({
      id: 'age',
      icon: 'calendar-account',
      label: t('playerDetails.profile.labels.age'),
      value: `${profile.age} ${t('playerDetails.profile.units.years')}`,
    });
  }

  if (hasDisplayValue(profile.nationality)) {
    entries.push({
      id: 'country',
      icon: 'flag-outline',
      label: t('playerDetails.profile.labels.country'),
      value: toDisplayValue(profile.nationality),
      flagUrl: getCountryFlagUrl(profile.nationality),
    });
  }

  if (typeof profile.number === 'number') {
    entries.push({
      id: 'number',
      icon: 'numeric',
      label: t('playerDetails.profile.labels.number'),
      value: String(profile.number),
    });
  }

  if (hasDisplayValue(profile.foot)) {
    entries.push({
      id: 'dominantFoot',
      icon: 'shoe-cleat',
      label: t('playerDetails.profile.labels.dominantFoot'),
      value: toDisplayValue(profile.foot),
    });
  }

  if (hasDisplayValue(profile.transferValue)) {
    entries.push({
      id: 'marketValue',
      icon: 'cash',
      label: t('playerDetails.profile.labels.marketValue'),
      value: toDisplayValue(profile.transferValue),
    });
  }

  return entries;
}

export function buildCompetitionKpis(
  competitionStats: PlayerProfileCompetitionStats | null,
  t: TranslateFn,
): CompetitionKpiItem[] {
  if (!competitionStats) {
    return [];
  }

  return [
    {
      id: 'matches',
      icon: 'calendar-check',
      label: t('playerDetails.profile.labels.matches'),
      value: toDisplayValue(competitionStats.matches),
    },
    {
      id: 'goals',
      icon: 'soccer',
      label: t('playerDetails.profile.labels.goals'),
      value: toDisplayValue(competitionStats.goals),
    },
    {
      id: 'assists',
      icon: 'shoe-cleat',
      label: t('playerDetails.profile.labels.assists'),
      value: toDisplayValue(competitionStats.assists),
    },
  ];
}
