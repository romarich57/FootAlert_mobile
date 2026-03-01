import type {
  MatchDetailTabDefinition,
  MatchLifecycleState,
} from '@ui/features/matches/types/matches.types';

type TranslationFn = (key: string) => string;

export type MatchDetailsVM = {
  tabs: MatchDetailTabDefinition[];
};

export function composeMatchDetailsViewModel(
  lifecycleState: MatchLifecycleState,
  t: TranslationFn,
): MatchDetailsVM {
  return {
    tabs: [
      {
        key: 'primary',
        label: lifecycleState === 'pre_match'
          ? t('matchDetails.tabs.preMatch')
          : t('matchDetails.tabs.summary'),
      },
      {
        key: 'timeline',
        label: t('matchDetails.tabs.timeline'),
      },
      {
        key: 'lineups',
        label: t('matchDetails.tabs.lineups'),
      },
      {
        key: 'standings',
        label: t('matchDetails.tabs.standings'),
      },
      {
        key: 'stats',
        label: t('matchDetails.tabs.stats'),
      },
      {
        key: 'faceOff',
        label: t('matchDetails.tabs.faceOff'),
      },
    ],
  };
}

