import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
  fetchTeamOverview,
  fetchTeamOverviewLeaders,
} from '@data/endpoints/teamsApi';
import {
  useTeamFull,
} from '@ui/features/teams/hooks/useTeamFull';
import type {
  TeamOverviewCoreData,
  TeamOverviewData,
  TeamOverviewLeadersData,
} from '@ui/features/teams/types/teams.types';
import { queryKeys } from '@ui/shared/query/queryKeys';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';

type UseTeamOverviewParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  timezone: string;
  competitionSeasons?: number[];
  enabled?: boolean;
};

export type TeamOverviewQueryResult = Pick<
  UseQueryResult<TeamOverviewData>,
  'isLoading' | 'isFetching' | 'isError' | 'isFetched' | 'isFetchedAfterMount' | 'dataUpdatedAt'
> & {
  data: TeamOverviewData | undefined;
  coreData: TeamOverviewCoreData | undefined;
  leadersData: TeamOverviewLeadersData | undefined;
  coreUpdatedAt: number;
  leadersUpdatedAt: number;
  isLeadersLoading: boolean;
  isLeadersFetching: boolean;
  isLeadersError: boolean;
  refetch: () => Promise<void>;
};

const EMPTY_OVERVIEW_CORE: TeamOverviewCoreData = {
  nextMatch: null,
  recentForm: [],
  seasonStats: {
    rank: null,
    points: null,
    played: null,
    goalDiff: null,
    wins: null,
    draws: null,
    losses: null,
    scored: null,
    conceded: null,
  },
  miniStanding: null,
  standingHistory: [],
  coachPerformance: null,
  trophiesCount: null,
  trophyWinsCount: null,
};

const EMPTY_OVERVIEW_LEADERS: TeamOverviewLeadersData = {
  seasonLineup: {
    formation: '4-3-3',
    estimated: true,
    goalkeeper: null,
    defenders: [],
    midfielders: [],
    attackers: [],
  },
  playerLeaders: {
    ratings: [],
    scorers: [],
    assisters: [],
  },
  sourceUpdatedAt: null,
};

export function useTeamOverview({
  teamId,
  leagueId,
  season,
  timezone,
  competitionSeasons,
  enabled = true,
}: UseTeamOverviewParams): TeamOverviewQueryResult {
  const limitedHistorySeasons = useMemo(
    () =>
      (competitionSeasons ?? [])
        .filter(item => item !== season)
        .slice(0, 5),
    [competitionSeasons, season],
  );
  const historySeasonsKey = useMemo(
    () => limitedHistorySeasons.join(','),
    [limitedHistorySeasons],
  );
  const isCoreEnabled = enabled && Boolean(teamId) && Boolean(leagueId) && typeof season === 'number';
  const teamFullQuery = useTeamFull({
    teamId,
    timezone,
    leagueId,
    season,
    enabled,
  });
  const canUseFullPayload =
    teamFullQuery.isFullEnabled && Boolean(teamFullQuery.data);

  const coreQuery = useQuery<TeamOverviewCoreData>({
    queryKey: queryKeys.teams.overview(teamId, leagueId, season, timezone, historySeasonsKey),
    enabled: isCoreEnabled && !canUseFullPayload,
    ...featureQueryOptions.teams.overview,
    queryFn: async ({ signal }): Promise<TeamOverviewCoreData> => {
      if (!teamId || !leagueId || typeof season !== 'number') {
        return EMPTY_OVERVIEW_CORE;
      }

      return fetchTeamOverview(
        {
          teamId,
          leagueId,
          season,
          timezone,
          historySeasons: limitedHistorySeasons,
        },
        signal,
      );
    },
  });

  const isLeadersEnabled =
    isCoreEnabled &&
    !canUseFullPayload &&
    Boolean(coreQuery.data) &&
    Boolean(teamId) &&
    Boolean(leagueId) &&
    typeof season === 'number';

  const leadersQuery = useQuery<TeamOverviewLeadersData>({
    queryKey: queryKeys.teams.overviewLeaders(teamId, leagueId, season),
    enabled: isLeadersEnabled,
    ...featureQueryOptions.teams.overviewLeaders,
    queryFn: async ({ signal }): Promise<TeamOverviewLeadersData> => {
      if (!teamId || !leagueId || typeof season !== 'number') {
        return EMPTY_OVERVIEW_LEADERS;
      }

      return fetchTeamOverviewLeaders(
        {
          teamId,
          leagueId,
          season,
        },
        signal,
      );
    },
  });

  const fullCoreData = canUseFullPayload ? teamFullQuery.data?.overview ?? undefined : undefined;
  const fullLeadersData =
    canUseFullPayload ? teamFullQuery.data?.overviewLeaders ?? undefined : undefined;

  const data = useMemo(() => {
    if (fullCoreData) {
      return {
        ...fullCoreData,
        ...(fullLeadersData ?? EMPTY_OVERVIEW_LEADERS),
      } satisfies TeamOverviewData;
    }

    if (!coreQuery.data) {
      return undefined;
    }

    return {
      ...coreQuery.data,
      ...(leadersQuery.data ?? EMPTY_OVERVIEW_LEADERS),
    } satisfies TeamOverviewData;
  }, [coreQuery.data, fullCoreData, fullLeadersData, leadersQuery.data]);

  return {
    data,
    coreData: fullCoreData ?? coreQuery.data,
    leadersData: fullLeadersData ?? leadersQuery.data,
    coreUpdatedAt: canUseFullPayload ? teamFullQuery.dataUpdatedAt : coreQuery.dataUpdatedAt,
    leadersUpdatedAt: canUseFullPayload ? teamFullQuery.dataUpdatedAt : leadersQuery.dataUpdatedAt,
    isLoading: canUseFullPayload
      ? teamFullQuery.isLoading && !teamFullQuery.data
      : coreQuery.isLoading && !coreQuery.data,
    isFetching: canUseFullPayload
      ? teamFullQuery.isFetching
      : coreQuery.isFetching || leadersQuery.isFetching,
    isError: canUseFullPayload
      ? teamFullQuery.isError && !teamFullQuery.data
      : coreQuery.isError && !coreQuery.data,
    isFetched: canUseFullPayload ? teamFullQuery.isFetched : coreQuery.isFetched,
    isFetchedAfterMount: canUseFullPayload
      ? teamFullQuery.isFetchedAfterMount
      : coreQuery.isFetchedAfterMount,
    dataUpdatedAt: canUseFullPayload
      ? teamFullQuery.dataUpdatedAt
      : Math.max(coreQuery.dataUpdatedAt, leadersQuery.dataUpdatedAt),
    isLeadersLoading: canUseFullPayload ? false : leadersQuery.isLoading && !leadersQuery.data,
    isLeadersFetching: canUseFullPayload ? false : leadersQuery.isFetching,
    isLeadersError: canUseFullPayload ? false : leadersQuery.isError && !leadersQuery.data,
    refetch: async () => {
      if (canUseFullPayload) {
        await teamFullQuery.refetch();
        return;
      }

      await Promise.allSettled([coreQuery.refetch(), leadersQuery.refetch()]);
    },
  };
}
