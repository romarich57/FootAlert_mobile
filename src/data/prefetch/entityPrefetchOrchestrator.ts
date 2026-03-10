import { mapLeagueDtoToCompetition } from '@data/mappers/competitionsMapper';
import { mapFixturesDtoToFixtures, mapPlayerStatsDtoToPlayerStats, mapStandingDtoToGroups } from '@data/mappers/competitionsMapper';
import { appEnv } from '@data/config/env';
import {
  fetchCompetitionFull,
  fetchCompetitionTeamStats,
  fetchLeagueById,
  fetchLeagueFixturesPage,
  fetchLeagueStandings,
  fetchLeagueTopScorers,
} from '@data/endpoints/competitionsApi';
import {
  fetchFixtureById,
  fetchFixtureEvents,
  fetchFixtureHeadToHead,
  fetchFixtureLineups,
  fetchMatchFull,
  fetchFixturePredictions,
} from '@data/endpoints/matchesApi';
import {
  fetchPlayerFull,
  fetchPlayerCareerAggregate,
  fetchPlayerMatchesAggregate,
  fetchPlayerStatsCatalog,
  fetchPlayerTrophies,
  PLAYER_MATCHES_LIMIT,
} from '@data/endpoints/playersApi';
import { fetchTeamFull, fetchTeamOverview } from '@data/endpoints/teamsApi';
import {
  fetchTeamMatchesData,
  fetchTeamSquadData,
  fetchTeamStandingsData,
  fetchTeamStatsCoreData,
  fetchTeamTransfersData,
} from '@data/teams/teamQueryData';
import { queryKeys } from '@data/query/queryKeys';
import {
  featureQueryOptions,
  type QueryTimingOptions,
} from '@data/query/queryOptions';

export type PrefetchPriority = 'immediate' | 'idle';

type QueryPrefetchStrategy = {
  kind?: 'query';
  queryKey: readonly unknown[];
  queryFn: (signal: AbortSignal) => Promise<unknown>;
  queryOptions: QueryTimingOptions;
  enabled?: boolean;
  priority?: PrefetchPriority;
};

type InfinitePrefetchStrategy = {
  kind: 'infinite';
  queryKey: readonly unknown[];
  queryFn: (signal: AbortSignal, pageParam: unknown) => Promise<unknown>;
  initialPageParam: unknown;
  getNextPageParam?: (lastPage: unknown) => unknown;
  getPreviousPageParam?: (firstPage: unknown) => unknown;
  queryOptions: QueryTimingOptions;
  enabled?: boolean;
  priority?: PrefetchPriority;
};

export type PrefetchStrategy = QueryPrefetchStrategy | InfinitePrefetchStrategy;

type TeamPrefetchParams = {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  timezone: string | null | undefined;
  historySeasons?: number[];
  transfersSeason?: number | null;
  enableStatsCore?: boolean;
};

type PlayerPrefetchParams = {
  playerId: string;
  teamId?: string | null;
  season?: number | null;
};

type CompetitionPrefetchParams = {
  competitionId: string;
  season?: number | null;
};

type MatchPrefetchParams = {
  matchId: string;
  timezone?: string | null;
  enableEvents?: boolean;
  enableLineups?: boolean;
  enablePredictions?: boolean;
  enableFaceOff?: boolean;
};

const COMPETITION_FIXTURES_PAGE_SIZE = 50;

function asQueryStrategy(strategy: QueryPrefetchStrategy): PrefetchStrategy {
  return {
    kind: 'query',
    priority: 'immediate',
    enabled: true,
    ...strategy,
  };
}

export function getTeamPrefetchStrategies({
  teamId,
  leagueId,
  season,
  timezone,
  historySeasons = [],
  transfersSeason = season,
  enableStatsCore = true,
}: TeamPrefetchParams): PrefetchStrategy[] {
  const hasContentContext = Boolean(teamId && leagueId && timezone) && typeof season === 'number';
  const trimmedHistorySeasons = historySeasons.filter(item => item !== season).slice(0, 5);
  const historySeasonsKey = trimmedHistorySeasons.join(',');
  const useTeamFullPrefetch = Boolean(teamId && timezone) && appEnv.mobileEnableBffTeamFull;

  if (useTeamFullPrefetch) {
    return [
      asQueryStrategy({
        queryKey: queryKeys.teams.full(teamId, timezone ?? 'Europe/Paris', leagueId, season),
        queryFn: async signal =>
          (
            await fetchTeamFull(
              {
                teamId,
                timezone: timezone ?? 'Europe/Paris',
                leagueId,
                season,
              },
              signal,
            )
          ).response,
        queryOptions: featureQueryOptions.teams.full,
      }),
    ];
  }

  return [
    asQueryStrategy({
      queryKey: queryKeys.teams.overview(teamId, leagueId, season, timezone ?? '', historySeasonsKey),
      enabled: hasContentContext,
      queryFn: signal =>
        fetchTeamOverview(
          {
            teamId,
            leagueId: leagueId as string,
            season: season as number,
            timezone: timezone as string,
            historySeasons: trimmedHistorySeasons,
          },
          signal,
        ),
      queryOptions: featureQueryOptions.teams.overview,
    }),
    asQueryStrategy({
      queryKey: queryKeys.teams.transfers(teamId, transfersSeason ?? null),
      enabled: Boolean(teamId),
      queryFn: signal =>
        fetchTeamTransfersData({
          teamId,
          season: transfersSeason ?? null,
          signal,
        }),
      queryOptions: featureQueryOptions.teams.transfers,
    }),
    asQueryStrategy({
      queryKey: queryKeys.teams.squad(teamId),
      enabled: Boolean(teamId),
      queryFn: signal => fetchTeamSquadData({ teamId, signal }),
      queryOptions: featureQueryOptions.teams.squad,
    }),
    asQueryStrategy({
      queryKey: queryKeys.teams.standings(teamId, leagueId, season),
      enabled: hasContentContext,
      queryFn: signal =>
        fetchTeamStandingsData({
          teamId,
          leagueId,
          season,
          signal,
        }),
      queryOptions: featureQueryOptions.teams.standings,
    }),
    asQueryStrategy({
      queryKey: queryKeys.teams.matches(teamId, leagueId, season, timezone ?? ''),
      enabled: hasContentContext,
      queryFn: signal =>
        fetchTeamMatchesData({
          teamId,
          leagueId,
          season,
          timezone: timezone as string,
          signal,
        }),
      queryOptions: featureQueryOptions.teams.matches,
    }),
    asQueryStrategy({
      queryKey: queryKeys.teams.statsCore(teamId, leagueId, season),
      enabled: hasContentContext && enableStatsCore,
      priority: 'idle',
      queryFn: signal =>
        fetchTeamStatsCoreData({
          teamId,
          leagueId,
          season,
          signal,
        }),
      queryOptions: featureQueryOptions.teams.statsCore,
    }),
  ];
}

export function getPlayerPrefetchStrategies({
  playerId,
  teamId,
  season,
}: PlayerPrefetchParams): PrefetchStrategy[] {
  const usePlayerFullPrefetch = Boolean(playerId) && typeof season === 'number' && appEnv.mobileEnableBffPlayerFull;
  const useStatsCatalogAggregate = appEnv.mobileEnablePlayerStatsCatalogAggregate;
  const useMatchesAggregate = appEnv.mobileEnableBffPlayerAggregates;
  const canPrefetchMatches = Boolean(playerId && teamId) && typeof season === 'number';

  if (usePlayerFullPrefetch) {
    return [
      asQueryStrategy({
        queryKey: queryKeys.players.full(playerId, season as number),
        queryFn: signal => fetchPlayerFull(playerId, season as number, signal),
        queryOptions: featureQueryOptions.players.full,
      }),
    ];
  }

  return [
    asQueryStrategy({
      queryKey: queryKeys.players.statsCatalogV2(playerId),
      enabled: Boolean(playerId) && useStatsCatalogAggregate,
      queryFn: signal => fetchPlayerStatsCatalog(playerId, signal),
      queryOptions: featureQueryOptions.players.statsCatalog,
    }),
    asQueryStrategy({
      queryKey: queryKeys.players.careerAggregate(playerId),
      enabled: Boolean(playerId),
      queryFn: signal => fetchPlayerCareerAggregate(playerId, signal),
      queryOptions: featureQueryOptions.players.career,
    }),
    asQueryStrategy({
      queryKey: queryKeys.players.trophies(playerId),
      enabled: Boolean(playerId),
      queryFn: signal => fetchPlayerTrophies(playerId, signal),
      queryOptions: featureQueryOptions.players.trophies,
    }),
    asQueryStrategy({
      queryKey: queryKeys.players.matchesAggregate(playerId, teamId ?? '', season ?? 0),
      enabled: canPrefetchMatches && useMatchesAggregate,
      queryFn: signal =>
        fetchPlayerMatchesAggregate(
          playerId,
          teamId as string,
          season as number,
          PLAYER_MATCHES_LIMIT,
          signal,
        ),
      queryOptions: featureQueryOptions.players.matches,
    }),
  ];
}

export function getCompetitionPrefetchStrategies({
  competitionId,
  season,
}: CompetitionPrefetchParams): PrefetchStrategy[] {
  const numericCompetitionId = Number(competitionId);
  const hasCompetitionContext = Number.isFinite(numericCompetitionId);
  const hasSeasonContext = hasCompetitionContext && typeof season === 'number';
  const useCompetitionFullPrefetch =
    hasCompetitionContext &&
    typeof season === 'number' &&
    appEnv.mobileEnableBffCompetitionFull;

  if (useCompetitionFullPrefetch) {
    return [
      asQueryStrategy({
        queryKey: queryKeys.competitions.full(competitionId, season ?? null),
        queryFn: signal => fetchCompetitionFull(numericCompetitionId, season as number, signal),
        queryOptions: featureQueryOptions.competitions.full,
      }),
    ];
  }

  return [
    asQueryStrategy({
      queryKey: queryKeys.competitions.detailsHeader(competitionId),
      enabled: hasCompetitionContext,
      queryFn: async signal => {
        const dto = await fetchLeagueById(competitionId, signal);
        return dto ? mapLeagueDtoToCompetition(dto) : null;
      },
      queryOptions: featureQueryOptions.competitions.seasons,
    }),
    asQueryStrategy({
      queryKey: queryKeys.competitions.seasons(numericCompetitionId),
      enabled: hasCompetitionContext,
      queryFn: signal => fetchLeagueById(competitionId, signal),
      queryOptions: featureQueryOptions.competitions.seasons,
    }),
    asQueryStrategy({
      queryKey: queryKeys.competitions.standings(numericCompetitionId, season ?? undefined),
      enabled: hasSeasonContext,
      queryFn: async signal => {
        const dto = await fetchLeagueStandings(numericCompetitionId, season as number, signal);
        return mapStandingDtoToGroups(dto);
      },
      queryOptions: featureQueryOptions.competitions.standings,
    }),
    {
      kind: 'infinite',
      queryKey: queryKeys.competitions.fixtures(numericCompetitionId, season ?? undefined),
      enabled: hasSeasonContext,
      initialPageParam: undefined,
      queryFn: async (signal, pageParam) => {
        const page = await fetchLeagueFixturesPage(
          numericCompetitionId,
          season as number,
          signal,
          {
            limit: COMPETITION_FIXTURES_PAGE_SIZE,
            cursor: pageParam as string | undefined,
          },
        );

        return {
          items: mapFixturesDtoToFixtures(page.items),
          hasMore: page.pageInfo?.hasMore ?? false,
          nextCursor: page.pageInfo?.nextCursor ?? null,
          hasPrevious: page.pageInfo?.hasPrevious ?? false,
          previousCursor: page.pageInfo?.previousCursor ?? null,
        };
      },
      getNextPageParam: lastPage =>
        (lastPage as { hasMore?: boolean; nextCursor?: string | null }).hasMore
          ? (lastPage as { nextCursor?: string | null }).nextCursor
          : undefined,
      getPreviousPageParam: firstPage =>
        (firstPage as { hasPrevious?: boolean; previousCursor?: string | null }).hasPrevious
          ? (firstPage as { previousCursor?: string | null }).previousCursor
          : undefined,
      queryOptions: featureQueryOptions.competitions.fixtures,
      priority: 'idle',
    },
    asQueryStrategy({
      queryKey: queryKeys.competitions.playerStats(numericCompetitionId, season ?? undefined, 'goals'),
      enabled: hasSeasonContext,
      queryFn: async signal => {
        const payload = await fetchLeagueTopScorers(numericCompetitionId, season as number, signal);
        return mapPlayerStatsDtoToPlayerStats(payload, season as number);
      },
      queryOptions: featureQueryOptions.competitions.playerStats,
    }),
    asQueryStrategy({
      queryKey: queryKeys.competitions.teamStats(numericCompetitionId, season ?? undefined),
      enabled: hasSeasonContext,
      queryFn: signal => fetchCompetitionTeamStats(numericCompetitionId, season as number, signal),
      queryOptions: featureQueryOptions.competitions.teamStats,
    }),
  ];
}

export function getMatchPrefetchStrategies({
  matchId,
  timezone,
  enableEvents = false,
  enableLineups = true,
  enablePredictions = true,
  enableFaceOff = true,
}: MatchPrefetchParams): PrefetchStrategy[] {
  const resolvedTimezone = timezone ?? 'Europe/Paris';
  const useMatchFullPrefetch = Boolean(matchId) && Boolean(timezone) && appEnv.mobileEnableBffMatchFull;

  if (useMatchFullPrefetch) {
    return [
      asQueryStrategy({
        queryKey: queryKeys.matchesFull(matchId, resolvedTimezone),
        queryFn: signal =>
          fetchMatchFull({
            fixtureId: matchId,
            timezone: resolvedTimezone,
            signal,
          }),
        queryOptions: featureQueryOptions.matches.full,
      }),
    ];
  }

  return [
    asQueryStrategy({
      queryKey: queryKeys.matchDetails(matchId, resolvedTimezone),
      enabled: Boolean(matchId && timezone),
      queryFn: signal =>
        fetchFixtureById({
          fixtureId: matchId,
          timezone: resolvedTimezone,
          signal,
        }),
      queryOptions: featureQueryOptions.matches.details,
    }),
    asQueryStrategy({
      queryKey: queryKeys.matchLineups(matchId),
      enabled: Boolean(matchId) && enableLineups,
      queryFn: signal => fetchFixtureLineups({ fixtureId: matchId, signal }),
      queryOptions: featureQueryOptions.matches.lineups,
    }),
    asQueryStrategy({
      queryKey: queryKeys.matchPredictions(matchId),
      enabled: Boolean(matchId) && enablePredictions,
      queryFn: signal => fetchFixturePredictions({ fixtureId: matchId, signal }),
      queryOptions: featureQueryOptions.matches.predictions,
    }),
    asQueryStrategy({
      queryKey: queryKeys.matchEvents(matchId),
      enabled: Boolean(matchId) && enableEvents,
      priority: 'idle',
      queryFn: signal => fetchFixtureEvents({ fixtureId: matchId, signal }),
      queryOptions: featureQueryOptions.matches.events,
    }),
    asQueryStrategy({
      queryKey: queryKeys.matchHeadToHead(matchId),
      enabled: Boolean(matchId) && enableFaceOff,
      priority: 'idle',
      queryFn: signal =>
        fetchFixtureHeadToHead({
          fixtureId: matchId,
          timezone: timezone ?? undefined,
          signal,
        }),
      queryOptions: featureQueryOptions.matches.headToHead,
    }),
  ];
}
