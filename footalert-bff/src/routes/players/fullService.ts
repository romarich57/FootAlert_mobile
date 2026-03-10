import { env } from '../../config/env.js';
import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../../lib/cache.js';

import { fetchPlayerOverview, fetchPlayerStatsCatalog } from './aggregates.js';
import { fetchPlayerDetailForSeason, fetchPlayerSeasons, fetchPlayerTrophies } from './aggregates/playerApi.js';
import { fetchPlayerCareer } from './careerService.js';
import {
  mapPlayerMatchPerformance,
  type PlayerFixtureDto,
  type PlayerFixtureStatsDto,
  type PlayerMatchPerformanceAggregate,
} from './matchMapper.js';
import { PLAYER_MATCHES_LIMIT } from './schemas.js';

type ApiFootballListResponse<T> = {
  response?: T[];
};

export type PlayerFullRoutePayload = {
  response: {
    details: { response: unknown[] };
    seasons: { response: number[] };
    trophies: { response: unknown[] };
    career: { response: { seasons: unknown[]; teams: unknown[] } };
    overview: { response: unknown | null };
    statsCatalog: { response: unknown | null };
    matches: { response: PlayerMatchPerformanceAggregate[] };
  };
};

function firstSettledError(results: PromiseSettledResult<unknown>[]): Error {
  for (const result of results) {
    if (result.status === 'rejected') {
      return result.reason instanceof Error
        ? result.reason
        : new Error(String(result.reason));
    }
  }

  return new Error('Unable to load player full payload');
}

function resolveSettledValue<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback;
}

async function fetchPlayerDetailsPayload(
  playerId: string,
  season: number,
): Promise<{ response: unknown[] }> {
  const details = await fetchPlayerDetailForSeason(playerId, season);
  return {
    response: details ? [details] : [],
  };
}

async function fetchPlayerSeasonsPayload(playerId: string): Promise<{ response: number[] }> {
  const payload = await fetchPlayerSeasons(playerId);
  return {
    response: Array.isArray(payload.response) ? payload.response : [],
  };
}

async function fetchPlayerTrophiesPayload(playerId: string): Promise<{ response: unknown[] }> {
  const payload = await fetchPlayerTrophies(playerId);
  return {
    response: Array.isArray(payload.response) ? payload.response : [],
  };
}

async function fetchPlayerMatchesPayload(
  playerId: string,
  teamId: string | null,
  season: number,
): Promise<{ response: PlayerMatchPerformanceAggregate[] }> {
  if (!teamId) {
    return { response: [] };
  }

  const fixturesPayload = await withCache(
    buildCanonicalCacheKey('players:full:matches:fixtures', {
      teamId,
      season,
      last: PLAYER_MATCHES_LIMIT,
    }),
    env.cacheTtl.matches,
    () =>
      apiFootballGet<ApiFootballListResponse<PlayerFixtureDto>>(
        `/fixtures?team=${encodeURIComponent(teamId)}&season=${encodeURIComponent(String(season))}&last=${encodeURIComponent(String(PLAYER_MATCHES_LIMIT))}`,
      ),
  );

  const fixtures = fixturesPayload.response ?? [];
  const performances = await Promise.all(
    fixtures
      .filter(fixture => Boolean(fixture.fixture?.id))
      .map(async fixture => {
        const fixtureId = fixture.fixture?.id;
        if (!fixtureId) {
          return null;
        }

        try {
          const fixtureStatsPayload = await withCache(
            buildCanonicalCacheKey('players:full:matches:fixture-stats', {
              fixtureId,
              teamId,
            }),
            env.cacheTtl.matches,
            () =>
              apiFootballGet<ApiFootballListResponse<PlayerFixtureStatsDto>>(
                `/fixtures/players?fixture=${encodeURIComponent(String(fixtureId))}&team=${encodeURIComponent(teamId)}`,
              ),
          );
          const fixtureStats = fixtureStatsPayload.response?.[0] ?? null;
          return mapPlayerMatchPerformance(playerId, teamId, fixture, fixtureStats);
        } catch {
          return mapPlayerMatchPerformance(playerId, teamId, fixture, null);
        }
      }),
  );

  return {
    response: performances.filter(
      (performance): performance is PlayerMatchPerformanceAggregate => performance !== null,
    ),
  };
}

export async function fetchPlayerFullPayload(params: {
  playerId: string;
  season: number;
}): Promise<PlayerFullRoutePayload> {
  const results = await Promise.allSettled([
    fetchPlayerDetailsPayload(params.playerId, params.season),
    fetchPlayerSeasonsPayload(params.playerId),
    fetchPlayerTrophiesPayload(params.playerId),
    fetchPlayerCareer(params.playerId),
    fetchPlayerOverview(params.playerId, params.season),
    fetchPlayerStatsCatalog(params.playerId),
  ]);

  if (results.every(result => result.status === 'rejected')) {
    throw firstSettledError(results);
  }

  const [details, seasons, trophies, career, overview, statsCatalog] = results;
  const overviewPayload =
    overview.status === 'fulfilled'
      ? overview.value
      : { response: null as unknown | null };
  const statsCatalogPayload =
    statsCatalog.status === 'fulfilled'
      ? statsCatalog.value
      : { response: null as unknown | null };
  const teamId =
    overview.status === 'fulfilled'
      ? (overview.value.response.profile?.team.id ?? '')
      : '';
  const matches = await fetchPlayerMatchesPayload(
    params.playerId,
    teamId || null,
    params.season,
  );

  return {
    response: {
      details: resolveSettledValue(details, { response: [] }),
      seasons: resolveSettledValue(seasons, { response: [] }),
      trophies: resolveSettledValue(trophies, { response: [] }),
      career: resolveSettledValue(career, { response: { seasons: [], teams: [] } }),
      overview: overviewPayload,
      statsCatalog: statsCatalogPayload,
      matches,
    },
  };
}
