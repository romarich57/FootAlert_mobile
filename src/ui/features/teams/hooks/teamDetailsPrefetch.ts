import { useMemo } from 'react';

import { getTeamPrefetchStrategies } from '@data/prefetch/entityPrefetchOrchestrator';
import { usePrefetchOnMount } from '@data/prefetch/usePrefetchOnMount';
import type { TeamDetailsContentSelection } from '@ui/features/teams/hooks/teamDetailsSelection';

type UseTeamDetailsPrefetchArgs = {
  safeTeamId: string | null;
  teamId: string;
  contentSelection: TeamDetailsContentSelection;
  selectedCompetitionSeasons: number[];
  timezone: string | null | undefined;
  transfersSeason: number | null;
  overviewCoreData: unknown;
};

export const useTeamDetailsPrefetch = ({
  safeTeamId,
  teamId,
  contentSelection,
  selectedCompetitionSeasons,
  timezone,
  transfersSeason,
  overviewCoreData,
}: UseTeamDetailsPrefetchArgs): void => {
  const strategies = useMemo(
    () =>
      getTeamPrefetchStrategies({
        teamId,
        leagueId: safeTeamId ? contentSelection.leagueId : null,
        season: safeTeamId ? contentSelection.season : null,
        timezone,
        historySeasons: selectedCompetitionSeasons,
        transfersSeason,
        enableStatsCore: Boolean(overviewCoreData),
      }),
    [
      contentSelection.leagueId,
      contentSelection.season,
      overviewCoreData,
      safeTeamId,
      selectedCompetitionSeasons,
      teamId,
      timezone,
      transfersSeason,
    ],
  );

  usePrefetchOnMount(strategies);
};
