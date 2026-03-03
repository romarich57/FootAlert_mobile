import type {
  MatchDetailTabDefinition,
  MatchLifecycleState,
} from '@ui/features/matches/types/matches.types';

type TranslationFn = (key: string) => string;

export type MatchDetailsVM = {
  tabs: MatchDetailTabDefinition[];
};

type MatchDetailsTabVisibility = {
  showTimeline?: boolean;
  showLineups?: boolean;
  showStandings?: boolean;
  showStats?: boolean;
  showFaceOff?: boolean;
};

export function composeMatchDetailsViewModel(
  lifecycleState: MatchLifecycleState,
  t: TranslationFn,
  visibility: MatchDetailsTabVisibility = {},
): MatchDetailsVM {
  const showTimeline = visibility.showTimeline ?? true;
  const showLineups = visibility.showLineups ?? true;
  const showStandings = visibility.showStandings ?? true;
  const showStats = visibility.showStats ?? true;
  const showFaceOff = visibility.showFaceOff ?? true;

  const tabs: MatchDetailTabDefinition[] = [
    {
      key: 'primary',
      label: lifecycleState === 'pre_match'
        ? t('matchDetails.tabs.preMatch')
        : t('matchDetails.tabs.summary'),
    },
  ];

  if (showTimeline) {
    tabs.push({
      key: 'timeline',
      label: t('matchDetails.tabs.timeline'),
    });
  }

  if (showLineups) {
    tabs.push({
      key: 'lineups',
      label: t('matchDetails.tabs.lineups'),
    });
  }

  if (showStandings) {
    tabs.push({
      key: 'standings',
      label: t('matchDetails.tabs.standings'),
    });
  }

  if (showStats) {
    tabs.push({
      key: 'stats',
      label: t('matchDetails.tabs.stats'),
    });
  }

  if (showFaceOff) {
    tabs.push({
      key: 'faceOff',
      label: t('matchDetails.tabs.faceOff'),
    });
  }

  return {
    tabs,
  };
}
