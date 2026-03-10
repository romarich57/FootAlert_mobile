import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { fetchLeagueStandings } from '@data/endpoints/competitionsApi';
import {
  fetchMatchFull,
  fetchFixtureAbsences,
  fetchFixtureById,
  fetchFixtureEvents,
  fetchFixtureHeadToHead,
  fetchFixtureLineups,
  fetchFixturePlayersStatsByTeam,
  fetchFixturePredictions,
  fetchFixtureStatistics,
} from '@data/endpoints/matchesApi';
import {
  fetchTeamFixtures,
} from '@data/endpoints/teamsApi';
import {
  mapFixturesToTeamMatches,
  mapPlayersToTopPlayers,
  mapPlayersToTopPlayersByCategory,
} from '@data/mappers/teamsMapper';
import { fetchAllTeamPlayers } from '@ui/features/teams/utils/fetchAllTeamPlayers';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import { queryKeys } from '@ui/shared/query/queryKeys';
import type {
  MatchDetailsTabKey,
} from '@ui/features/matches/types/matches.types';
import type {
  TeamMatchesData,
  TeamTopPlayersByCategory,
} from '@ui/features/teams/types/teams.types';

import { buildMatchFullQuerySlice } from '@ui/features/matches/details/hooks/matchFullQueryAdapter';
import { resolveMatchDetailsQueryPolicy } from '@ui/features/matches/details/hooks/matchDetailsQueryPolicy';
import { useMatchLocalFirst } from '@ui/features/matches/details/hooks/useMatchLocalFirst';
import {
  extractFixtureSeason,
  type MatchStandingsData,
  pickTeamIdsFromFixture,
  shouldRetryMatchDetailsRequest,
  toId,
  toLifecycleState,
  toNumber,
  toRawRecord,
} from '@ui/features/matches/details/hooks/matchDetailsDataTransforms';

type UseMatchDetailsQueryBundleInput = {
  safeMatchId: string | null;
  timezone: string;
  activeTab: MatchDetailsTabKey;
};

type FetchTeamMatchesSnapshotParams = {
  teamId: string;
  leagueId: number;
  season: number;
  timezone: string;
  signal?: AbortSignal;
};

async function fetchTeamMatchesSnapshot({
  teamId,
  leagueId,
  season,
  timezone,
  signal,
}: FetchTeamMatchesSnapshotParams): Promise<TeamMatchesData> {
  const fixtures = await fetchTeamFixtures(
    {
      teamId,
      leagueId: String(leagueId),
      season,
      timezone,
    },
    signal,
  );

  return mapFixturesToTeamMatches(fixtures);
}

async function fetchTeamLeadersByCategory({
  teamId,
  leagueId,
  season,
  signal,
}: {
  teamId: string;
  leagueId: number;
  season: number;
  signal?: AbortSignal;
}): Promise<TeamTopPlayersByCategory> {
  const players = await fetchAllTeamPlayers({
    teamId,
    leagueId,
    season,
    signal,
  });

  const leadersByCategory = mapPlayersToTopPlayersByCategory(players, 1, {
    teamId,
    leagueId: String(leagueId),
    season,
  });

  const topPlayers = mapPlayersToTopPlayers(players, 30, {
    teamId,
    leagueId: String(leagueId),
    season,
  });

  const fallbackTopScorer = [...topPlayers]
    .filter(player => player.goals !== null)
    .sort((first, second) => {
      const byGoals = (second.goals ?? -1) - (first.goals ?? -1);
      if (byGoals !== 0) {
        return byGoals;
      }

      return (second.rating ?? -1) - (first.rating ?? -1);
    })
    .slice(0, 1);

  const fallbackTopAssister = [...topPlayers]
    .filter(player => player.assists !== null)
    .sort((first, second) => {
      const byAssists = (second.assists ?? -1) - (first.assists ?? -1);
      if (byAssists !== 0) {
        return byAssists;
      }

      return (second.rating ?? -1) - (first.rating ?? -1);
    })
    .slice(0, 1);

  return {
    ratings: leadersByCategory.ratings,
    scorers: leadersByCategory.scorers.length > 0 ? leadersByCategory.scorers : fallbackTopScorer,
    assisters: leadersByCategory.assisters.length > 0 ? leadersByCategory.assisters : fallbackTopAssister,
  };
}

export function useMatchDetailsQueryBundle({
  safeMatchId,
  timezone,
  activeTab,
}: UseMatchDetailsQueryBundleInput) {
  const useMatchFullEndpoint = appEnv.mobileEnableBffMatchFull;

  const sqliteMatchFullQuery = useMatchLocalFirst({
    matchId: safeMatchId,
    timezone,
    enabled: useMatchFullEndpoint && Boolean(safeMatchId),
  });
  const networkMatchFullQuery = useQuery({
    queryKey: queryKeys.matchesFull(safeMatchId ?? 'invalid', timezone),
    enabled:
      useMatchFullEndpoint &&
      Boolean(safeMatchId) &&
      !appEnv.mobileEnableSqliteLocalFirst,
    queryFn: ({ signal }) =>
      fetchMatchFull({
        fixtureId: safeMatchId ?? '',
        timezone,
        signal,
      }),
    ...featureQueryOptions.matches.full,
    refetchOnMount: 'always',
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.full.retry),
  });
  const fullQuery = appEnv.mobileEnableSqliteLocalFirst
    ? sqliteMatchFullQuery
    : networkMatchFullQuery;

  const legacyFixtureQuery = useQuery({
    queryKey: queryKeys.matchDetails(safeMatchId ?? 'invalid', timezone),
    enabled: !useMatchFullEndpoint && Boolean(safeMatchId),
    queryFn: ({ signal }) =>
      fetchFixtureById({
        fixtureId: safeMatchId ?? '',
        timezone,
        signal,
      }),
    ...featureQueryOptions.matches.details,
    refetchOnMount: 'always',
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.details.retry),
  });

  const fixtureQuery = useMatchFullEndpoint
    ? buildMatchFullQuerySlice(fullQuery, payload => payload?.fixture ?? null)
    : legacyFixtureQuery;
  const fixture = fixtureQuery.data ?? null;
  const fullPayload = useMatchFullEndpoint ? fullQuery.data ?? null : null;
  const fullContext = useMemo(() => toRawRecord(fullPayload?.context), [fullPayload]);
  const lifecycleState = useMemo(() => {
    if (useMatchFullEndpoint && fullPayload?.lifecycleState) {
      return fullPayload.lifecycleState;
    }

    return toLifecycleState(fixture);
  }, [fixture, fullPayload?.lifecycleState, useMatchFullEndpoint]);

  const legacyLineupsQuery = useQuery({
    queryKey: queryKeys.matchLineups(safeMatchId ?? 'invalid'),
    enabled: !useMatchFullEndpoint && Boolean(safeMatchId),
    queryFn: ({ signal }) =>
      fetchFixtureLineups({
        fixtureId: safeMatchId ?? '',
        signal,
      }),
    ...featureQueryOptions.matches.lineups,
    refetchOnMount: lifecycleState === 'pre_match' ? 'always' : false,
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.lineups.retry),
  });

  const fixtureTeamIds = useMemo(() => pickTeamIdsFromFixture(fixture), [fixture]);
  const homeTeamId = fixtureTeamIds.homeTeamId ?? toId(fullContext?.homeTeamId);
  const awayTeamId = fixtureTeamIds.awayTeamId ?? toId(fullContext?.awayTeamId);
  const season = useMemo(() => {
    const fixtureSeason = extractFixtureSeason(fixture);
    if (fixtureSeason !== null) {
      return fixtureSeason;
    }

    const contextSeason = toNumber(fullContext?.season);
    return contextSeason !== null ? contextSeason : null;
  }, [fixture, fullContext]);
  const leagueId = useMemo(() => {
    if (typeof fixture?.league?.id === 'number' && Number.isFinite(fixture.league.id)) {
      return fixture.league.id;
    }

    const contextLeagueId = toNumber(fullContext?.leagueId);
    return contextLeagueId !== null ? contextLeagueId : undefined;
  }, [fixture?.league?.id, fullContext]);

  const queryPolicy = useMemo(
    () =>
      resolveMatchDetailsQueryPolicy({
        safeMatchId,
        lifecycleState,
        activeTab,
        homeTeamId,
        awayTeamId,
        leagueId,
        season,
      }),
    [activeTab, awayTeamId, homeTeamId, leagueId, lifecycleState, safeMatchId, season],
  );

  const legacyEventsQuery = useQuery({
    queryKey: queryKeys.matchEvents(safeMatchId ?? 'invalid'),
    enabled: !useMatchFullEndpoint && queryPolicy.enableEvents,
    queryFn: ({ signal }) =>
      fetchFixtureEvents({
        fixtureId: safeMatchId ?? '',
        signal,
      }),
    ...featureQueryOptions.matches.events,
    refetchOnMount: 'always',
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.events.retry),
  });

  const legacyStatisticsQuery = useQuery({
    queryKey: queryKeys.matchStatistics(safeMatchId ?? 'invalid', 'all'),
    enabled: !useMatchFullEndpoint && queryPolicy.enableStatistics,
    queryFn: ({ signal }) =>
      fetchFixtureStatistics({
        fixtureId: safeMatchId ?? '',
        period: 'all',
        signal,
      }),
    ...featureQueryOptions.matches.statistics,
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.statistics.retry),
  });

  const canUseHalfStatistics = queryPolicy.enableHalfStatistics;

  const legacyStatisticsFirstHalfQuery = useQuery({
    queryKey: queryKeys.matchStatistics(safeMatchId ?? 'invalid', 'first'),
    enabled: !useMatchFullEndpoint && canUseHalfStatistics,
    queryFn: ({ signal }) =>
      fetchFixtureStatistics({
        fixtureId: safeMatchId ?? '',
        period: 'first',
        signal,
      }),
    ...featureQueryOptions.matches.statistics,
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.statistics.retry),
  });

  const legacyStatisticsSecondHalfQuery = useQuery({
    queryKey: queryKeys.matchStatistics(safeMatchId ?? 'invalid', 'second'),
    enabled: !useMatchFullEndpoint && canUseHalfStatistics,
    queryFn: ({ signal }) =>
      fetchFixtureStatistics({
        fixtureId: safeMatchId ?? '',
        period: 'second',
        signal,
      }),
    ...featureQueryOptions.matches.statistics,
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.statistics.retry),
  });

  const legacyPredictionsQuery = useQuery({
    queryKey: queryKeys.matchPredictions(safeMatchId ?? 'invalid'),
    enabled: !useMatchFullEndpoint && queryPolicy.enablePredictions,
    queryFn: ({ signal }) =>
      fetchFixturePredictions({
        fixtureId: safeMatchId ?? '',
        signal,
      }),
    ...featureQueryOptions.matches.predictions,
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.predictions.retry),
  });

  const legacyAbsencesQuery = useQuery({
    queryKey: queryKeys.matchAbsences(safeMatchId ?? 'invalid', timezone),
    enabled: !useMatchFullEndpoint && queryPolicy.enableAbsences,
    queryFn: ({ signal }) =>
      fetchFixtureAbsences({
        fixtureId: safeMatchId ?? '',
        timezone,
        signal,
      }),
    ...featureQueryOptions.matches.absences,
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.absences.retry),
  });

  const legacyHeadToHeadQuery = useQuery({
    queryKey: queryKeys.matchHeadToHead(safeMatchId ?? 'invalid'),
    enabled: !useMatchFullEndpoint && queryPolicy.enableHeadToHead,
    queryFn: ({ signal }) =>
      fetchFixtureHeadToHead({
        fixtureId: safeMatchId ?? '',
        last: 20,
        timezone,
        signal,
      }),
    ...featureQueryOptions.matches.headToHead,
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.headToHead.retry),
  });

  const legacyHomePlayersStatsQuery = useQuery({
    queryKey: queryKeys.matchPlayersStatsByTeam(safeMatchId ?? 'invalid', homeTeamId ?? 'unknown'),
    enabled: !useMatchFullEndpoint && queryPolicy.enableHomePlayersStats,
    queryFn: ({ signal }) =>
      fetchFixturePlayersStatsByTeam({
        fixtureId: safeMatchId ?? '',
        teamId: homeTeamId ?? '',
        signal,
      }),
    ...featureQueryOptions.matches.playersStats,
    refetchOnMount: 'always',
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.playersStats.retry),
  });

  const legacyAwayPlayersStatsQuery = useQuery({
    queryKey: queryKeys.matchPlayersStatsByTeam(safeMatchId ?? 'invalid', awayTeamId ?? 'unknown'),
    enabled: !useMatchFullEndpoint && queryPolicy.enableAwayPlayersStats,
    queryFn: ({ signal }) =>
      fetchFixturePlayersStatsByTeam({
        fixtureId: safeMatchId ?? '',
        teamId: awayTeamId ?? '',
        signal,
      }),
    ...featureQueryOptions.matches.playersStats,
    refetchOnMount: 'always',
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.matches.playersStats.retry),
  });

  const lineupsQuery = useMatchFullEndpoint
    ? buildMatchFullQuerySlice(fullQuery, payload => payload?.lineups ?? [])
    : legacyLineupsQuery;
  const eventsQuery = useMatchFullEndpoint
    ? buildMatchFullQuerySlice(fullQuery, payload => payload?.events ?? [])
    : legacyEventsQuery;
  const statisticsQuery = useMatchFullEndpoint
    ? buildMatchFullQuerySlice(fullQuery, payload => payload?.statistics?.all ?? [])
    : legacyStatisticsQuery;
  const statisticsFirstHalfQuery = useMatchFullEndpoint
    ? buildMatchFullQuerySlice(fullQuery, payload => payload?.statistics?.first ?? [])
    : legacyStatisticsFirstHalfQuery;
  const statisticsSecondHalfQuery = useMatchFullEndpoint
    ? buildMatchFullQuerySlice(fullQuery, payload => payload?.statistics?.second ?? [])
    : legacyStatisticsSecondHalfQuery;
  const predictionsQuery = useMatchFullEndpoint
    ? buildMatchFullQuerySlice(fullQuery, payload => payload?.predictions ?? [])
    : legacyPredictionsQuery;
  const absencesQuery = useMatchFullEndpoint
    ? buildMatchFullQuerySlice(fullQuery, payload => payload?.absences ?? [])
    : legacyAbsencesQuery;
  const headToHeadQuery = useMatchFullEndpoint
    ? buildMatchFullQuerySlice(fullQuery, payload => payload?.headToHead ?? [])
    : legacyHeadToHeadQuery;
  const homePlayersStatsQuery = useMatchFullEndpoint
    ? buildMatchFullQuerySlice(fullQuery, payload => payload?.playersStats?.home ?? [])
    : legacyHomePlayersStatsQuery;
  const awayPlayersStatsQuery = useMatchFullEndpoint
    ? buildMatchFullQuerySlice(fullQuery, payload => payload?.playersStats?.away ?? [])
    : legacyAwayPlayersStatsQuery;

  const legacyStandingsQuery = useQuery({
    queryKey: queryKeys.competitions.standings(
      typeof leagueId === 'number' ? leagueId : undefined,
      typeof season === 'number' ? season : undefined,
    ),
    enabled: !useMatchFullEndpoint && queryPolicy.enableStandings,
    queryFn: ({ signal }) => fetchLeagueStandings(leagueId as number, season as number, signal),
    ...featureQueryOptions.competitions.standings,
  });

  const legacyHomeTeamMatchesQuery = useQuery({
    queryKey: queryKeys.teamRecentResults(homeTeamId ?? 'unknown', leagueId, season, timezone),
    enabled: !useMatchFullEndpoint && queryPolicy.enableTeamContext && Boolean(homeTeamId),
    queryFn: ({ signal }) =>
      fetchTeamMatchesSnapshot({
        teamId: homeTeamId ?? '',
        leagueId: leagueId as number,
        season: season as number,
        timezone,
        signal,
      }),
    ...featureQueryOptions.teams.matches,
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.teams.matches.retry),
  });

  const legacyAwayTeamMatchesQuery = useQuery({
    queryKey: queryKeys.teamRecentResults(awayTeamId ?? 'unknown', leagueId, season, timezone),
    enabled: !useMatchFullEndpoint && queryPolicy.enableTeamContext && Boolean(awayTeamId),
    queryFn: ({ signal }) =>
      fetchTeamMatchesSnapshot({
        teamId: awayTeamId ?? '',
        leagueId: leagueId as number,
        season: season as number,
        timezone,
        signal,
      }),
    ...featureQueryOptions.teams.matches,
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.teams.matches.retry),
  });

  const legacyHomeLeadersQuery = useQuery({
    queryKey: queryKeys.teamLeaders(homeTeamId ?? 'unknown', leagueId, season),
    enabled: !useMatchFullEndpoint && queryPolicy.enablePreMatchExtras && Boolean(homeTeamId),
    queryFn: ({ signal }) =>
      fetchTeamLeadersByCategory({
        teamId: homeTeamId ?? '',
        leagueId: leagueId as number,
        season: season as number,
        signal,
      }),
    ...featureQueryOptions.teams.stats,
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.teams.stats.retry),
  });

  const legacyAwayLeadersQuery = useQuery({
    queryKey: queryKeys.teamLeaders(awayTeamId ?? 'unknown', leagueId, season),
    enabled: !useMatchFullEndpoint && queryPolicy.enablePreMatchExtras && Boolean(awayTeamId),
    queryFn: ({ signal }) =>
      fetchTeamLeadersByCategory({
        teamId: awayTeamId ?? '',
        leagueId: leagueId as number,
        season: season as number,
        signal,
      }),
    ...featureQueryOptions.teams.stats,
    retry: shouldRetryMatchDetailsRequest(featureQueryOptions.teams.stats.retry),
  });

  const standingsQuery = useMatchFullEndpoint
    ? buildMatchFullQuerySlice(fullQuery, payload => (payload?.standings ?? null) as MatchStandingsData)
    : legacyStandingsQuery;
  const homeTeamMatchesQuery = useMatchFullEndpoint
    ? buildMatchFullQuerySlice(fullQuery, payload =>
        mapFixturesToTeamMatches((payload?.homeRecentResults ?? []) as never),
      )
    : legacyHomeTeamMatchesQuery;
  const awayTeamMatchesQuery = useMatchFullEndpoint
    ? buildMatchFullQuerySlice(fullQuery, payload =>
        mapFixturesToTeamMatches((payload?.awayRecentResults ?? []) as never),
      )
    : legacyAwayTeamMatchesQuery;
  const homeLeadersQuery = useMatchFullEndpoint
    ? buildMatchFullQuerySlice(
        fullQuery,
        payload => (payload?.homeLeaders ?? null) as TeamTopPlayersByCategory | null,
      )
    : legacyHomeLeadersQuery;
  const awayLeadersQuery = useMatchFullEndpoint
    ? buildMatchFullQuerySlice(
        fullQuery,
        payload => (payload?.awayLeaders ?? null) as TeamTopPlayersByCategory | null,
      )
    : legacyAwayLeadersQuery;

  return {
    fixtureQuery,
    fixture,
    lifecycleState,
    lineupsQuery,
    homeTeamId,
    awayTeamId,
    season,
    leagueId,
    queryPolicy,
    eventsQuery,
    statisticsQuery,
    canUseHalfStatistics,
    statisticsFirstHalfQuery,
    statisticsSecondHalfQuery,
    predictionsQuery,
    absencesQuery,
    headToHeadQuery,
    homePlayersStatsQuery,
    awayPlayersStatsQuery,
    standingsQuery,
    homeTeamMatchesQuery,
    awayTeamMatchesQuery,
    homeLeadersQuery,
    awayLeadersQuery,
  };
}
