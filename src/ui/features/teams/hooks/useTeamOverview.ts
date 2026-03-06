import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  fetchTeamOverview,
} from '@data/endpoints/teamsApi';
import type { TeamOverviewData } from '@ui/features/teams/types/teams.types';
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

const EMPTY_OVERVIEW: TeamOverviewData = {
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
  seasonLineup: {
    formation: '4-3-3',
    estimated: true,
    goalkeeper: null,
    defenders: [],
    midfielders: [],
    attackers: [],
  },
  miniStanding: null,
  standingHistory: [],
  coachPerformance: null,
  playerLeaders: {
    ratings: [],
    scorers: [],
    assisters: [],
  },
  trophiesCount: null,
  trophyWinsCount: null,
};

function hasLineupPlayers(lineup: TeamOverviewData['seasonLineup'] | null | undefined): boolean {
  return (
    Boolean(lineup?.goalkeeper) ||
    (lineup?.defenders.length ?? 0) > 0 ||
    (lineup?.midfielders.length ?? 0) > 0 ||
    (lineup?.attackers.length ?? 0) > 0
  );
}

function hasLeaderPlayers(leaders: TeamOverviewData['playerLeaders']): boolean {
  return leaders.ratings.length > 0 || leaders.scorers.length > 0 || leaders.assisters.length > 0;
}

function mergeStandingHistoryWithFallback(
  previousHistory: TeamOverviewData['standingHistory'],
  nextHistory: TeamOverviewData['standingHistory'],
): TeamOverviewData['standingHistory'] {
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
  previousStats: TeamOverviewData['seasonStats'],
  nextStats: TeamOverviewData['seasonStats'],
): TeamOverviewData['seasonStats'] {
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

function mergeOverviewData(
  previousData: TeamOverviewData | undefined,
  nextData: TeamOverviewData,
): TeamOverviewData {
  if (!previousData) {
    return nextData;
  }

  const nextHasLineupPlayers = hasLineupPlayers(nextData.seasonLineup);
  const nextHasLeaders = hasLeaderPlayers(nextData.playerLeaders);
  const nextHasMiniStandingRows = (nextData.miniStanding?.rows.length ?? 0) > 0;
  const nextHasRecentForm = nextData.recentForm.length > 0;

  return {
    ...nextData,
    nextMatch: nextData.nextMatch ?? previousData.nextMatch,
    recentForm: nextHasRecentForm ? nextData.recentForm : previousData.recentForm,
    seasonStats: mergeSeasonStatsWithFallback(previousData.seasonStats, nextData.seasonStats),
    seasonLineup: nextHasLineupPlayers ? nextData.seasonLineup : previousData.seasonLineup,
    miniStanding: nextHasMiniStandingRows ? nextData.miniStanding : previousData.miniStanding,
    standingHistory: mergeStandingHistoryWithFallback(previousData.standingHistory, nextData.standingHistory),
    coachPerformance: nextData.coachPerformance ?? previousData.coachPerformance,
    playerLeaders: nextHasLeaders ? nextData.playerLeaders : previousData.playerLeaders,
    trophiesCount: nextData.trophiesCount ?? previousData.trophiesCount,
    trophyWinsCount: nextData.trophyWinsCount ?? previousData.trophyWinsCount,
  };
}

export function useTeamOverview({
  teamId,
  leagueId,
  season,
  timezone,
  competitionSeasons,
  enabled = true,
}: UseTeamOverviewParams) {
  const limitedHistorySeasons = useMemo(
    () => (competitionSeasons ?? []).slice(0, 5),
    [competitionSeasons],
  );
  const historySeasonsKey = useMemo(
    () => limitedHistorySeasons.join(','),
    [limitedHistorySeasons],
  );

  return useQuery<TeamOverviewData>({
    queryKey: queryKeys.teams.overview(teamId, leagueId, season, timezone, historySeasonsKey),
    enabled: enabled && Boolean(teamId) && Boolean(leagueId) && typeof season === 'number',
    structuralSharing: (oldData, newData) =>
      mergeOverviewData(oldData as TeamOverviewData | undefined, newData as TeamOverviewData),
    ...featureQueryOptions.teams.overview,
    queryFn: async ({ signal }): Promise<TeamOverviewData> => {
      if (!teamId || !leagueId || typeof season !== 'number') {
        return EMPTY_OVERVIEW;
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
}
