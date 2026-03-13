import { env } from '../../config/env.js';
import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../../lib/cache.js';
import {
  buildFreshnessMeta,
  freshnessHints,
  type PayloadFreshnessMeta,
} from '../../lib/freshnessMeta.js';
import type { FullPayloadHydration } from '../../lib/readStore/hydration.js';

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
  _meta: PayloadFreshnessMeta;
  _hydration?: FullPayloadHydration;
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

export type PlayerCoreSnapshotPayload = Pick<
  PlayerFullRoutePayload['response'],
  'details' | 'seasons' | 'overview'
>;

export type PlayerTrophiesSectionPayload = PlayerFullRoutePayload['response']['trophies'];
export type PlayerCareerSectionPayload = PlayerFullRoutePayload['response']['career'];
export type PlayerStatsCatalogSectionPayload = PlayerFullRoutePayload['response']['statsCatalog'];
export type PlayerMatchesSectionPayload = PlayerFullRoutePayload['response']['matches'];

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

export async function buildPlayerCoreSnapshot(params: {
  playerId: string;
  season: number;
}): Promise<PlayerCoreSnapshotPayload> {
  const results = await Promise.allSettled([
    fetchPlayerDetailsPayload(params.playerId, params.season),
    fetchPlayerSeasonsPayload(params.playerId),
    fetchPlayerOverview(params.playerId, params.season),
  ]);

  if (results.every(result => result.status === 'rejected')) {
    throw firstSettledError(results);
  }

  const [details, seasons, overview] = results;

  return {
    details: resolveSettledValue(details, { response: [] }),
    seasons: resolveSettledValue(seasons, { response: [] }),
    overview:
      overview.status === 'fulfilled'
        ? overview.value
        : { response: null as unknown | null },
  };
}

export async function buildPlayerTrophiesSection(params: {
  playerId: string;
}): Promise<PlayerTrophiesSectionPayload> {
  return fetchPlayerTrophiesPayload(params.playerId);
}

export async function buildPlayerCareerSection(params: {
  playerId: string;
}): Promise<PlayerCareerSectionPayload> {
  return fetchPlayerCareer(params.playerId);
}

export async function buildPlayerStatsCatalogSection(params: {
  playerId: string;
}): Promise<PlayerStatsCatalogSectionPayload> {
  return fetchPlayerStatsCatalog(params.playerId);
}

function readTeamIdFromPlayerCore(core: PlayerCoreSnapshotPayload): string | null {
  const overview = core.overview.response;
  if (!overview || typeof overview !== 'object') {
    return null;
  }

  const profile = (overview as Record<string, unknown>).profile;
  if (!profile || typeof profile !== 'object') {
    return null;
  }

  const team = (profile as Record<string, unknown>).team;
  if (!team || typeof team !== 'object') {
    return null;
  }

  const teamId = (team as Record<string, unknown>).id;
  return typeof teamId === 'string' && teamId.trim().length > 0 ? teamId : null;
}

export async function buildPlayerMatchesSection(params: {
  playerId: string;
  season: number;
  core: PlayerCoreSnapshotPayload;
}): Promise<PlayerMatchesSectionPayload> {
  return fetchPlayerMatchesPayload(
    params.playerId,
    readTeamIdFromPlayerCore(params.core),
    params.season,
  );
}

export function composePlayerFullPayload(input: {
  core: PlayerCoreSnapshotPayload;
  trophies: PlayerTrophiesSectionPayload;
  career: PlayerCareerSectionPayload;
  statsCatalog: PlayerStatsCatalogSectionPayload;
  matches: PlayerMatchesSectionPayload;
  hydration?: FullPayloadHydration;
}): PlayerFullRoutePayload {
  return {
    _meta: buildFreshnessMeta({
      details: freshnessHints.static,
      seasons: freshnessHints.static,
      trophies: freshnessHints.static,
      career: freshnessHints.static,
      overview: freshnessHints.postMatch,
      statsCatalog: freshnessHints.static,
      matches: freshnessHints.postMatch,
    }),
    _hydration: input.hydration,
    response: {
      ...input.core,
      trophies: input.trophies,
      career: input.career,
      statsCatalog: input.statsCatalog,
      matches: input.matches,
    },
  };
}

export function splitPlayerFullPayload(payload: PlayerFullRoutePayload): {
  core: PlayerCoreSnapshotPayload;
  trophies: PlayerTrophiesSectionPayload;
  career: PlayerCareerSectionPayload;
  statsCatalog: PlayerStatsCatalogSectionPayload;
  matches: PlayerMatchesSectionPayload;
} {
  return {
    core: {
      details: payload.response.details,
      seasons: payload.response.seasons,
      overview: payload.response.overview,
    },
    trophies: payload.response.trophies,
    career: payload.response.career,
    statsCatalog: payload.response.statsCatalog,
    matches: payload.response.matches,
  };
}

export async function fetchPlayerFullPayload(params: {
  playerId: string;
  season: number;
}): Promise<PlayerFullRoutePayload> {
  const core = await buildPlayerCoreSnapshot(params);
  const [trophies, career, statsCatalog, matches] = await Promise.all([
    buildPlayerTrophiesSection({
      playerId: params.playerId,
    }),
    buildPlayerCareerSection({
      playerId: params.playerId,
    }),
    buildPlayerStatsCatalogSection({
      playerId: params.playerId,
    }),
    buildPlayerMatchesSection({
      playerId: params.playerId,
      season: params.season,
      core,
    }),
  ]);

  return composePlayerFullPayload({
    core,
    trophies,
    career,
    statsCatalog,
    matches,
  });
}
