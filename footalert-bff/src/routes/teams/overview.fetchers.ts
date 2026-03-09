// Fonctions asynchrones de récupération des données overview depuis API-Football

import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../../lib/cache.js';

import { buildFixtureQuery, normalizeStandingsPayload, toNumericId } from './helpers.js';
import { fetchTeamTrophiesWithFallback } from './trophies.js';
import { toId, toNumber, toText } from './overview.mappers.js';
import {
  buildEstimatedLineup,
  mapPlayersToTopPlayers,
  mapPlayersToTopPlayersByCategory,
} from './overview.players.js';

import type {
  TeamApiFixtureDto,
  TeamApiPlayerDto,
  TeamApiPlayersEnvelope,
  TeamApiStandingsPayload,
  TeamApiStatisticsDto,
  TeamApiTrophyDto,
  TeamCoachDto,
  TeamOverviewCoach,
  TeamOverviewLeadersResponse,
  WarnLogger,
} from './overview.types.js';

// TTL cache : données live vs données stables
const TEAM_OVERVIEW_TTL_MS = 45_000;
const TEAM_OVERVIEW_LONG_TTL_MS = 120_000;

// Pagination joueurs : limite pour éviter une surconsommation de quota API
const TEAM_PLAYERS_MAX_PAGES = 6;
const TEAM_PLAYERS_TARGET_ITEMS = 120;

export async function fetchOverviewFixtures(
  teamId: string,
  leagueId: string,
  season: number,
  timezone: string,
): Promise<TeamApiFixtureDto[]> {
  return withCache(
    buildCanonicalCacheKey('team:overview:fixtures', { teamId, leagueId, season, timezone }),
    TEAM_OVERVIEW_TTL_MS,
    async () => {
      const payload = await apiFootballGet<{ response?: TeamApiFixtureDto[] }>(
        `/fixtures?${buildFixtureQuery(teamId, { leagueId, season, timezone })}`,
      );
      return Array.isArray(payload.response) ? payload.response : [];
    },
  );
}

export async function fetchOverviewNextFixture(
  teamId: string,
  timezone: string,
): Promise<TeamApiFixtureDto | null> {
  return withCache(
    buildCanonicalCacheKey('team:overview:next-fixture', { teamId, timezone }),
    TEAM_OVERVIEW_TTL_MS,
    async () => {
      const payload = await apiFootballGet<{ response?: TeamApiFixtureDto[] }>(
        `/fixtures?team=${encodeURIComponent(teamId)}&next=1&timezone=${encodeURIComponent(timezone)}`,
      );
      return payload.response?.[0] ?? null;
    },
  );
}

export async function fetchOverviewStandings(
  leagueId: string,
  season: number,
): Promise<TeamApiStandingsPayload | null> {
  return withCache(
    buildCanonicalCacheKey('team:overview:standings', { leagueId, season }),
    60_000,
    async () => {
      const payload = await apiFootballGet<{ response?: TeamApiStandingsPayload[] }>(
        `/standings?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`,
      );
      const normalized = normalizeStandingsPayload(payload);
      return (normalized.response?.[0] as TeamApiStandingsPayload | undefined) ?? null;
    },
  );
}

export async function fetchOverviewStatistics(
  teamId: string,
  leagueId: string,
  season: number,
): Promise<TeamApiStatisticsDto | null> {
  return withCache(
    buildCanonicalCacheKey('team:overview:statistics', { teamId, leagueId, season }),
    60_000,
    async () => {
      const payload = await apiFootballGet<{ response?: TeamApiStatisticsDto | null }>(
        `/teams/statistics?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}&team=${encodeURIComponent(teamId)}`,
      );
      return payload.response ?? null;
    },
  );
}

export async function fetchOverviewPlayers(
  teamId: string,
  leagueId: string,
  season: number,
): Promise<TeamApiPlayerDto[]> {
  const aggregated: TeamApiPlayerDto[] = [];

  for (
    let page = 1;
    page <= TEAM_PLAYERS_MAX_PAGES && aggregated.length < TEAM_PLAYERS_TARGET_ITEMS;
    page += 1
  ) {
    const pagePayload = await withCache(
      buildCanonicalCacheKey('team:overview:players:page', { teamId, leagueId, season, page }),
      60_000,
      () =>
        apiFootballGet<TeamApiPlayersEnvelope>(
          `/players?team=${encodeURIComponent(teamId)}&league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}&page=${page}`,
        ),
    );

    const pageItems = Array.isArray(pagePayload.response) ? pagePayload.response : [];
    if (pageItems.length === 0) {
      break;
    }

    const remainingItems = TEAM_PLAYERS_TARGET_ITEMS - aggregated.length;
    aggregated.push(...pageItems.slice(0, Math.max(0, remainingItems)));

    const totalPages = toNumber(pagePayload.paging?.total);
    if (typeof totalPages === 'number' && page >= totalPages) {
      break;
    }
  }

  return aggregated;
}

export async function fetchOverviewCoach(teamId: string): Promise<TeamOverviewCoach | null> {
  return withCache(
    buildCanonicalCacheKey('team:overview:coach', { teamId }),
    TEAM_OVERVIEW_LONG_TTL_MS,
    async () => {
      const coachRes = await apiFootballGet<{ response?: TeamCoachDto[] }>(
        `/coachs?team=${encodeURIComponent(teamId)}`,
      );
      const coaches = coachRes.response ?? [];
      const teamIdAsNumber = toNumericId(teamId);

      const currentCoach =
        coaches.find(coach => {
          const currentJob = coach.career?.[0];
          return currentJob?.team?.id === teamIdAsNumber && currentJob.end === null;
        }) ??
        coaches[0] ??
        null;

      if (!currentCoach) {
        return null;
      }

      return {
        id: toId(currentCoach.id),
        name: toText(currentCoach.name),
        photo: toText(currentCoach.photo),
        age: toNumber(currentCoach.age),
      };
    },
  );
}

export async function fetchOverviewTrophies(
  teamId: string,
  logger: WarnLogger,
): Promise<TeamApiTrophyDto[]> {
  return withCache(
    buildCanonicalCacheKey('team:overview:trophies', { teamId }),
    TEAM_OVERVIEW_LONG_TTL_MS,
    async () => {
      const payload = await fetchTeamTrophiesWithFallback(teamId, logger);
      return Array.isArray(payload.response) ? (payload.response as TeamApiTrophyDto[]) : [];
    },
  );
}

// --- Construction du payload leaders à partir des joueurs ---

export function buildOverviewLeadersPayload(
  playersPayload: TeamApiPlayerDto[],
  playerContext: {
    teamId: string;
    leagueId: string;
    season: number;
  },
  sourceUpdatedAt: string | null,
): TeamOverviewLeadersResponse {
  const topPlayers = mapPlayersToTopPlayers(playersPayload, playerContext, 30);
  const topPlayersByCategory = mapPlayersToTopPlayersByCategory(playersPayload, playerContext, 5);

  return {
    seasonLineup: buildEstimatedLineup(topPlayers),
    playerLeaders: {
      ratings: topPlayersByCategory.ratings.slice(0, 3),
      scorers: topPlayersByCategory.scorers.slice(0, 3),
      assisters: topPlayersByCategory.assisters.slice(0, 3),
    },
    sourceUpdatedAt,
  };
}
