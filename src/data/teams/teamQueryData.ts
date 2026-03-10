import {
  fetchLeagueStandings,
  fetchTeamFixtures,
  fetchTeamPlayers,
  fetchTeamSquad,
  fetchTeamStatistics,
  fetchTeamTransfers,
} from '@data/endpoints/teamsApi';
import {
  mapFixturesToTeamMatches,
  mapPlayersToTopPlayers,
  mapPlayersToTopPlayersByCategory,
  mapStandingsToTeamData,
  mapTeamAdvancedComparisonMetrics,
  mapTeamStatisticsToStats,
  mapSquadToTeamSquad,
  mapTransfersToTeamTransfers,
} from '@data/mappers/teamsMapper';
import type {
  TeamAdvancedStatsDto,
  TeamApiPlayerDto,
  TeamMatchesData,
  TeamSquadData,
  TeamStandingsData,
  TeamStatsCoreData,
  TeamStatsData,
  TeamTransfersData,
} from '@domain/contracts/teams.types';

const DEFAULT_TEAM_PLAYERS_PAGE_LIMIT = 50;
const DEFAULT_TEAM_PLAYERS_MAX_REQUESTS = 4;
const DEFAULT_TEAM_PLAYERS_TARGET_ITEMS = 120;

const EMPTY_TEAM_MATCHES: TeamMatchesData = {
  all: [],
  upcoming: [],
  live: [],
  past: [],
};

const EMPTY_TEAM_STANDINGS: TeamStandingsData = {
  groups: [],
};

const EMPTY_TEAM_SQUAD: TeamSquadData = {
  coach: null,
  players: [],
};

const EMPTY_TEAM_TRANSFERS: TeamTransfersData = {
  arrivals: [],
  departures: [],
};

const EMPTY_TEAM_STATS_CORE: TeamStatsCoreData = {
  rank: null,
  points: null,
  played: null,
  wins: null,
  draws: null,
  losses: null,
  goalsFor: null,
  goalsAgainst: null,
  homePlayed: null,
  homeWins: null,
  homeDraws: null,
  homeLosses: null,
  awayPlayed: null,
  awayWins: null,
  awayDraws: null,
  awayLosses: null,
  expectedGoalsFor: null,
  pointsByVenue: {
    home: null,
    away: null,
  },
  goalsForPerMatch: null,
  goalsAgainstPerMatch: null,
  cleanSheets: null,
  failedToScore: null,
  comparisonMetrics: [],
  goalBreakdown: [],
};

const EMPTY_TEAM_STATS_PLAYERS: Pick<TeamStatsData, 'topPlayers' | 'topPlayersByCategory'> = {
  topPlayers: [],
  topPlayersByCategory: {
    ratings: [],
    scorers: [],
    assisters: [],
  },
};

function isAbortError(error: unknown): error is Error {
  return error instanceof Error && error.name === 'AbortError';
}

function toAdvancedExpectedGoals(
  advancedStats: TeamAdvancedStatsDto | null | undefined,
): number | null {
  if (!advancedStats) {
    return null;
  }

  const xg = advancedStats.metrics?.expectedGoalsPerMatch?.value ?? null;

  return typeof xg === 'number' && Number.isFinite(xg) ? xg : null;
}

export async function fetchAllTeamPlayers({
  teamId,
  leagueId,
  season,
  signal,
  limit = DEFAULT_TEAM_PLAYERS_PAGE_LIMIT,
  maxRequests = DEFAULT_TEAM_PLAYERS_MAX_REQUESTS,
  targetItems = DEFAULT_TEAM_PLAYERS_TARGET_ITEMS,
}: {
  teamId: string;
  leagueId: string | number;
  season: number;
  signal?: AbortSignal;
  limit?: number;
  maxRequests?: number;
  targetItems?: number;
}): Promise<TeamApiPlayerDto[]> {
  const aggregated: TeamApiPlayerDto[] = [];
  const seenCursors = new Set<string>();
  let cursor: string | undefined;

  for (let requestIndex = 0; requestIndex < maxRequests; requestIndex += 1) {
    const page = await fetchTeamPlayers(
      {
        teamId,
        leagueId: String(leagueId),
        season,
        limit,
        cursor,
      },
      signal,
    );

    if (Array.isArray(page.response) && page.response.length > 0) {
      aggregated.push(...page.response);
    }

    const nextCursor = page.pageInfo?.nextCursor ?? undefined;
    const hasMore = page.pageInfo?.hasMore ?? false;
    if (!hasMore || !nextCursor || seenCursors.has(nextCursor)) {
      break;
    }

    if (aggregated.length >= targetItems) {
      break;
    }

    seenCursors.add(nextCursor);
    cursor = nextCursor;
  }

  return aggregated;
}

export async function fetchTeamMatchesData({
  teamId,
  leagueId,
  season,
  timezone,
  signal,
}: {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  timezone: string;
  signal?: AbortSignal;
}): Promise<TeamMatchesData> {
  if (!teamId || !leagueId || typeof season !== 'number') {
    return EMPTY_TEAM_MATCHES;
  }

  const payload = await fetchTeamFixtures(
    {
      teamId,
      leagueId,
      season,
      timezone,
    },
    signal,
  );

  return mapFixturesToTeamMatches(payload);
}

export async function fetchTeamStandingsData({
  teamId,
  leagueId,
  season,
  signal,
}: {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  signal?: AbortSignal;
}): Promise<TeamStandingsData> {
  if (!teamId || !leagueId || typeof season !== 'number') {
    return EMPTY_TEAM_STANDINGS;
  }

  const payload = await fetchLeagueStandings(leagueId, season, signal);
  return mapStandingsToTeamData(payload, teamId);
}

export async function fetchTeamSquadData({
  teamId,
  signal,
}: {
  teamId: string;
  signal?: AbortSignal;
}): Promise<TeamSquadData> {
  if (!teamId) {
    return EMPTY_TEAM_SQUAD;
  }

  const payload = await fetchTeamSquad(teamId, signal);
  return mapSquadToTeamSquad(payload);
}

export async function fetchTeamTransfersData({
  teamId,
  season,
  signal,
}: {
  teamId: string;
  season: number | null;
  signal?: AbortSignal;
}): Promise<TeamTransfersData> {
  if (!teamId) {
    return EMPTY_TEAM_TRANSFERS;
  }

  const payload = await fetchTeamTransfers(teamId, season, signal);
  return mapTransfersToTeamTransfers(payload, teamId, season);
}

export async function fetchTeamStatsCoreData({
  teamId,
  leagueId,
  season,
  signal,
}: {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  signal?: AbortSignal;
}): Promise<TeamStatsCoreData> {
  if (!teamId || !leagueId || typeof season !== 'number') {
    return EMPTY_TEAM_STATS_CORE;
  }

  const [statisticsResult, standingsResult] = await Promise.allSettled([
    fetchTeamStatistics(leagueId, season, teamId, signal),
    fetchLeagueStandings(leagueId, season, signal),
  ]);

  if (statisticsResult.status === 'rejected' && isAbortError(statisticsResult.reason)) {
    throw statisticsResult.reason;
  }
  if (standingsResult.status === 'rejected' && isAbortError(standingsResult.reason)) {
    throw standingsResult.reason;
  }

  const statisticsPayload = statisticsResult.status === 'fulfilled' ? statisticsResult.value : null;
  const standingsPayload = standingsResult.status === 'fulfilled' ? standingsResult.value : null;

  if (statisticsPayload === null && standingsPayload === null) {
    if (statisticsResult.status === 'fulfilled' && standingsResult.status === 'fulfilled') {
      return EMPTY_TEAM_STATS_CORE;
    }

    const coreError =
      statisticsResult.status === 'rejected'
        ? statisticsResult.reason
        : standingsResult.status === 'rejected'
          ? standingsResult.reason
          : null;

    throw coreError instanceof Error
      ? coreError
      : new Error('Unable to load team statistics core datasets');
  }

  const standings = mapStandingsToTeamData(standingsPayload, teamId);
  const mappedStats = mapTeamStatisticsToStats(
    statisticsPayload,
    standings,
    [],
    EMPTY_TEAM_STATS_PLAYERS.topPlayersByCategory,
    null,
  );
  return {
    rank: mappedStats.rank,
    points: mappedStats.points,
    played: mappedStats.played,
    wins: mappedStats.wins,
    draws: mappedStats.draws,
    losses: mappedStats.losses,
    goalsFor: mappedStats.goalsFor,
    goalsAgainst: mappedStats.goalsAgainst,
    homePlayed: mappedStats.homePlayed,
    homeWins: mappedStats.homeWins,
    homeDraws: mappedStats.homeDraws,
    homeLosses: mappedStats.homeLosses,
    awayPlayed: mappedStats.awayPlayed,
    awayWins: mappedStats.awayWins,
    awayDraws: mappedStats.awayDraws,
    awayLosses: mappedStats.awayLosses,
    expectedGoalsFor: mappedStats.expectedGoalsFor,
    pointsByVenue: mappedStats.pointsByVenue,
    goalsForPerMatch: mappedStats.goalsForPerMatch,
    goalsAgainstPerMatch: mappedStats.goalsAgainstPerMatch,
    cleanSheets: mappedStats.cleanSheets,
    failedToScore: mappedStats.failedToScore,
    comparisonMetrics: mappedStats.comparisonMetrics,
    goalBreakdown: mappedStats.goalBreakdown,
  };
}

export async function fetchTeamStatsPlayersData({
  teamId,
  leagueId,
  season,
  signal,
}: {
  teamId: string;
  leagueId: string | null;
  season: number | null;
  signal?: AbortSignal;
}): Promise<Pick<TeamStatsData, 'topPlayers' | 'topPlayersByCategory'>> {
  if (!teamId || !leagueId || typeof season !== 'number') {
    return EMPTY_TEAM_STATS_PLAYERS;
  }

  const playersPayload = await fetchAllTeamPlayers({
    teamId,
    leagueId,
    season,
    signal,
  });

  return {
    topPlayers: mapPlayersToTopPlayers(playersPayload, 8, {
      teamId,
      leagueId,
      season,
    }),
    topPlayersByCategory: mapPlayersToTopPlayersByCategory(playersPayload, 3, {
      teamId,
      leagueId,
      season,
    }),
  };
}

export function mapAdvancedComparisonData(
  advancedStatsPayload: TeamAdvancedStatsDto | null | undefined,
) {
  return {
    comparisonMetrics: mapTeamAdvancedComparisonMetrics(advancedStatsPayload ?? null),
    expectedGoalsFor: toAdvancedExpectedGoals(advancedStatsPayload),
  };
}
