import { z } from 'zod';

import { bffGet } from '@data/endpoints/bffClient';
import { parseRuntimePayloadOrFallback } from '@data/endpoints/runtimeValidation';
import {
  mapPlayerCareerSeasonAggregate,
  mapPlayerCareerTeamAggregate,
  mapPlayerMatchPerformanceAggregate,
} from '@data/mappers/playersMapper';
import type {
  PlayerApiCareerSeasonAggregateDto,
  PlayerApiCareerTeamAggregateDto,
  PlayerApiDetailsDto,
  PlayerApiFixtureDto,
  PlayerApiMatchesAggregateResponse,
  PlayerApiMatchPerformanceDto,
  PlayerApiResponse,
  PlayerApiTrophyDto,
  PlayerCareerSeason,
  PlayerCareerTeam,
  PlayerMatchPerformance,
} from '@ui/features/players/types/players.types';

const listResponseSchema = z
  .object({
    response: z.array(z.unknown()).default([]),
  })
  .passthrough();

const careerAggregateResponseSchema = z
  .object({
    response: z
      .object({
        seasons: z.array(z.unknown()).optional(),
        teams: z.array(z.unknown()).optional(),
      })
      .optional(),
  })
  .passthrough();

export async function fetchPlayerDetails(
  playerId: string,
  season: number,
  signal?: AbortSignal,
): Promise<PlayerApiDetailsDto | null> {
  const rawPayload = await bffGet<unknown>(
    `/players/${encodeURIComponent(playerId)}`,
    { season },
    { signal },
  );
  const payload = parseRuntimePayloadOrFallback({
    schema: listResponseSchema,
    payload: rawPayload,
    fallback: { response: [] },
    feature: 'players.details',
    endpoint: `/players/${playerId}`,
  });

  return (payload.response as PlayerApiResponse<PlayerApiDetailsDto>['response'])[0] ?? null;
}

export async function fetchPlayerSeasons(
  playerId: string,
  signal?: AbortSignal,
): Promise<number[]> {
  const rawPayload = await bffGet<unknown>(
    `/players/${encodeURIComponent(playerId)}/seasons`,
    undefined,
    { signal },
  );
  const payload = parseRuntimePayloadOrFallback({
    schema: listResponseSchema,
    payload: rawPayload,
    fallback: { response: [] },
    feature: 'players.seasons',
    endpoint: `/players/${playerId}/seasons`,
  });

  return payload.response as PlayerApiResponse<number>['response'];
}

export async function fetchPlayerTrophies(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerApiTrophyDto[]> {
  const rawPayload = await bffGet<unknown>(
    `/players/${encodeURIComponent(playerId)}/trophies`,
    undefined,
    { signal },
  );
  const payload = parseRuntimePayloadOrFallback({
    schema: listResponseSchema,
    payload: rawPayload,
    fallback: { response: [] },
    feature: 'players.trophies',
    endpoint: `/players/${playerId}/trophies`,
  });

  return payload.response as PlayerApiResponse<PlayerApiTrophyDto>['response'];
}

export async function fetchPlayerCareerAggregate(
  playerId: string,
  signal?: AbortSignal,
): Promise<{ seasons: PlayerCareerSeason[]; teams: PlayerCareerTeam[] }> {
  const rawPayload = await bffGet<unknown>(
    `/players/${encodeURIComponent(playerId)}/career`,
    undefined,
    { signal },
  );
  const payload = parseRuntimePayloadOrFallback({
    schema: careerAggregateResponseSchema,
    payload: rawPayload,
    fallback: { response: undefined },
    feature: 'players.career',
    endpoint: `/players/${playerId}/career`,
  });

  const seasonsInput = (payload.response?.seasons ?? []) as PlayerApiCareerSeasonAggregateDto[];
  const seasons = seasonsInput
    .map(mapPlayerCareerSeasonAggregate)
    .sort((a, b) => {
      const aYear = a.season ? Number.parseInt(a.season, 10) : Number.NEGATIVE_INFINITY;
      const bYear = b.season ? Number.parseInt(b.season, 10) : Number.NEGATIVE_INFINITY;
      return bYear - aYear;
    });

  const teamsInput = (payload.response?.teams ?? []) as PlayerApiCareerTeamAggregateDto[];
  const teams = teamsInput.map(mapPlayerCareerTeamAggregate);

  return { seasons, teams };
}

export async function fetchTeamFixtures(
  teamId: string,
  season: number,
  amount: number = 10,
  signal?: AbortSignal,
): Promise<PlayerApiFixtureDto[]> {
  const rawPayload = await bffGet<unknown>(
    `/players/team/${encodeURIComponent(teamId)}/fixtures`,
    {
      season,
      last: amount,
    },
    { signal },
  );
  const payload = parseRuntimePayloadOrFallback({
    schema: listResponseSchema,
    payload: rawPayload,
    fallback: { response: [] },
    feature: 'players.team_fixtures',
    endpoint: `/players/team/${teamId}/fixtures`,
  });

  return payload.response as PlayerApiResponse<PlayerApiFixtureDto>['response'];
}

export async function fetchFixturePlayerStats(
  fixtureId: string,
  teamId: string,
  signal?: AbortSignal,
): Promise<PlayerApiMatchPerformanceDto | null> {
  const rawPayload = await bffGet<unknown>(
    `/players/fixtures/${encodeURIComponent(fixtureId)}/team/${encodeURIComponent(teamId)}/stats`,
    undefined,
    { signal },
  );
  const payload = parseRuntimePayloadOrFallback({
    schema: listResponseSchema,
    payload: rawPayload,
    fallback: { response: [] },
    feature: 'players.fixture_stats',
    endpoint: `/players/fixtures/${fixtureId}/team/${teamId}/stats`,
  });

  return (payload.response as PlayerApiResponse<PlayerApiMatchPerformanceDto>['response'])[0] ?? null;
}

export async function fetchPlayerMatchesAggregate(
  playerId: string,
  teamId: string,
  season: number,
  amount: number = 15,
  signal?: AbortSignal,
): Promise<PlayerMatchPerformance[]> {
  const rawPayload = await bffGet<unknown>(
    `/players/${encodeURIComponent(playerId)}/matches`,
    {
      teamId,
      season,
      last: amount,
    },
    { signal },
  );
  const payload = parseRuntimePayloadOrFallback({
    schema: listResponseSchema,
    payload: rawPayload,
    fallback: { response: [] },
    feature: 'players.matches_aggregate',
    endpoint: `/players/${playerId}/matches`,
  });

  const aggregateResponse =
    (payload.response as PlayerApiMatchesAggregateResponse['response']) ?? [];

  return aggregateResponse
    .map(mapPlayerMatchPerformanceAggregate)
    .filter((item): item is PlayerMatchPerformance => item !== null);
}
