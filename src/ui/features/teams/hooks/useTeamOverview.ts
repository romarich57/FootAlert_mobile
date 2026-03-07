import { useMemo } from 'react';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import {
  fetchTeamOverview,
  fetchTeamOverviewLeaders,
} from '@data/endpoints/teamsApi';
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

function hasLineupPlayers(lineup: TeamOverviewLeadersData['seasonLineup'] | null | undefined): boolean {
  return (
    Boolean(lineup?.goalkeeper) ||
    (lineup?.defenders.length ?? 0) > 0 ||
    (lineup?.midfielders.length ?? 0) > 0 ||
    (lineup?.attackers.length ?? 0) > 0
  );
}

function hasLeaderPlayers(leaders: TeamOverviewLeadersData['playerLeaders']): boolean {
  return leaders.ratings.length > 0 || leaders.scorers.length > 0 || leaders.assisters.length > 0;
}

function mergeStandingHistoryWithFallback(
  previousHistory: TeamOverviewCoreData['standingHistory'],
  nextHistory: TeamOverviewCoreData['standingHistory'],
): TeamOverviewCoreData['standingHistory'] {
  if (previousHistory.length === 0) {
    return nextHistory;
  }

  const previousBySeason = new Map(previousHistory.map(item => [item.season, item.rank]));
  return nextHistory.map(item => ({
    season: item.season,
    rank: item.rank ?? previousBySeason.get(item.season) ?? null,
  }));
}

function mergeSeasonStatsWithFallback(
  previousStats: TeamOverviewCoreData['seasonStats'],
  nextStats: TeamOverviewCoreData['seasonStats'],
): TeamOverviewCoreData['seasonStats'] {
  return {
    rank: nextStats.rank ?? previousStats.rank,
    points: nextStats.points ?? previousStats.points,
    played: nextStats.played ?? previousStats.played,
    goalDiff: nextStats.goalDiff ?? previousStats.goalDiff,
    wins: nextStats.wins ?? previousStats.wins,
    draws: nextStats.draws ?? previousStats.draws,
    losses: nextStats.losses ?? previousStats.losses,
    scored: nextStats.scored ?? previousStats.scored,
    conceded: nextStats.conceded ?? previousStats.conceded,
  };
}

function mergeOverviewCoreData(
  previousData: TeamOverviewCoreData | undefined,
  nextData: TeamOverviewCoreData,
): TeamOverviewCoreData {
  if (!previousData) {
    return nextData;
  }

  const nextHasMiniStandingRows = (nextData.miniStanding?.rows.length ?? 0) > 0;
  const nextHasRecentForm = nextData.recentForm.length > 0;

  return {
    ...nextData,
    nextMatch: nextData.nextMatch ?? previousData.nextMatch,
    recentForm: nextHasRecentForm ? nextData.recentForm : previousData.recentForm,
    seasonStats: mergeSeasonStatsWithFallback(previousData.seasonStats, nextData.seasonStats),
    miniStanding: nextHasMiniStandingRows ? nextData.miniStanding : previousData.miniStanding,
    standingHistory: mergeStandingHistoryWithFallback(previousData.standingHistory, nextData.standingHistory),
    coachPerformance: nextData.coachPerformance ?? previousData.coachPerformance,
    trophiesCount: nextData.trophiesCount ?? previousData.trophiesCount,
    trophyWinsCount: nextData.trophyWinsCount ?? previousData.trophyWinsCount,
  };
}

function mergeOverviewLeadersData(
  previousData: TeamOverviewLeadersData | undefined,
  nextData: TeamOverviewLeadersData,
): TeamOverviewLeadersData {
  if (!previousData) {
    return nextData;
  }

  const nextHasLineupPlayers = hasLineupPlayers(nextData.seasonLineup);
  const nextHasLeaders = hasLeaderPlayers(nextData.playerLeaders);

  return {
    seasonLineup: nextHasLineupPlayers ? nextData.seasonLineup : previousData.seasonLineup,
    playerLeaders: nextHasLeaders ? nextData.playerLeaders : previousData.playerLeaders,
    sourceUpdatedAt: nextData.sourceUpdatedAt ?? previousData.sourceUpdatedAt,
  };
}

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

  const coreQuery = useQuery<TeamOverviewCoreData>({
    queryKey: queryKeys.teams.overview(teamId, leagueId, season, timezone, historySeasonsKey),
    enabled: isCoreEnabled,
    placeholderData: previousData => previousData,
    structuralSharing: (oldData, newData) =>
      mergeOverviewCoreData(oldData as TeamOverviewCoreData | undefined, newData as TeamOverviewCoreData),
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
    Boolean(coreQuery.data) &&
    Boolean(teamId) &&
    Boolean(leagueId) &&
    typeof season === 'number';

  const leadersQuery = useQuery<TeamOverviewLeadersData>({
    queryKey: queryKeys.teams.overviewLeaders(teamId, leagueId, season),
    enabled: isLeadersEnabled,
    placeholderData: previousData => previousData,
    structuralSharing: (oldData, newData) =>
      mergeOverviewLeadersData(
        oldData as TeamOverviewLeadersData | undefined,
        newData as TeamOverviewLeadersData,
      ),
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

  const data = useMemo(() => {
    if (!coreQuery.data) {
      return undefined;
    }

    return {
      ...coreQuery.data,
      ...(leadersQuery.data ?? EMPTY_OVERVIEW_LEADERS),
    } satisfies TeamOverviewData;
  }, [coreQuery.data, leadersQuery.data]);

  return {
    data,
    coreData: coreQuery.data,
    leadersData: leadersQuery.data,
    coreUpdatedAt: coreQuery.dataUpdatedAt,
    leadersUpdatedAt: leadersQuery.dataUpdatedAt,
    isLoading: coreQuery.isLoading && !coreQuery.data,
    isFetching: coreQuery.isFetching || leadersQuery.isFetching,
    isError: coreQuery.isError && !coreQuery.data,
    isFetched: coreQuery.isFetched,
    isFetchedAfterMount: coreQuery.isFetchedAfterMount,
    dataUpdatedAt: Math.max(coreQuery.dataUpdatedAt, leadersQuery.dataUpdatedAt),
    isLeadersLoading: leadersQuery.isLoading && !leadersQuery.data,
    isLeadersFetching: leadersQuery.isFetching,
    isLeadersError: leadersQuery.isError && !leadersQuery.data,
    refetch: async () => {
      await Promise.allSettled([coreQuery.refetch(), leadersQuery.refetch()]);
    },
  };
}
