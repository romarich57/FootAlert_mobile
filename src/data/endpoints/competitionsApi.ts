import { z } from 'zod';

import { bffGet } from '@data/endpoints/bffClient';
import { parseRuntimePayloadOrFallback } from '@data/endpoints/runtimeValidation';
import type {
  CompetitionsApiLeagueDto,
  CompetitionsApiResponse,
  CompetitionsApiStandingDto,
  CompetitionsApiFixtureDto,
  CompetitionsApiPlayerStatDto,
  CompetitionsApiTransferDto,
} from '@ui/features/competitions/types/competitions.types';

const listResponseSchema = z
  .object({
    response: z.array(z.unknown()).default([]),
  })
  .passthrough();

export async function fetchAllLeagues(signal?: AbortSignal): Promise<CompetitionsApiLeagueDto[]> {
  const rawPayload = await bffGet<unknown>(
    '/competitions',
    undefined,
    { signal },
  );
  const payload = parseRuntimePayloadOrFallback({
    schema: listResponseSchema,
    payload: rawPayload,
    fallback: { response: [] },
    feature: 'competitions.list',
    endpoint: '/competitions',
  });

  return payload.response as CompetitionsApiResponse<CompetitionsApiLeagueDto>['response'];
}

export async function searchLeaguesByName(
  query: string,
  signal?: AbortSignal,
): Promise<CompetitionsApiLeagueDto[]> {
  const rawPayload = await bffGet<unknown>(
    '/competitions/search',
    { q: query },
    { signal },
  );
  const payload = parseRuntimePayloadOrFallback({
    schema: listResponseSchema,
    payload: rawPayload,
    fallback: { response: [] },
    feature: 'competitions.search',
    endpoint: '/competitions/search',
  });

  return payload.response as CompetitionsApiResponse<CompetitionsApiLeagueDto>['response'];
}

export async function fetchLeagueById(
  id: string,
  signal?: AbortSignal,
): Promise<CompetitionsApiLeagueDto | null> {
  const rawPayload = await bffGet<unknown>(
    `/competitions/${encodeURIComponent(id)}`,
    undefined,
    { signal },
  );
  const payload = parseRuntimePayloadOrFallback({
    schema: listResponseSchema,
    payload: rawPayload,
    fallback: { response: [] },
    feature: 'competitions.details',
    endpoint: `/competitions/${id}`,
  });

  return (payload.response as CompetitionsApiResponse<CompetitionsApiLeagueDto>['response'])[0] ?? null;
}

export async function fetchLeagueStandings(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiStandingDto | null> {
  const rawPayload = await bffGet<unknown>(
    `/competitions/${encodeURIComponent(String(leagueId))}/standings`,
    { season },
    { signal },
  );
  const payload = parseRuntimePayloadOrFallback({
    schema: listResponseSchema,
    payload: rawPayload,
    fallback: { response: [] },
    feature: 'competitions.standings',
    endpoint: `/competitions/${leagueId}/standings`,
  });

  return (payload.response as CompetitionsApiResponse<CompetitionsApiStandingDto>['response'])[0] ?? null;
}

export async function fetchLeagueFixtures(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiFixtureDto[]> {
  const rawPayload = await bffGet<unknown>(
    `/competitions/${encodeURIComponent(String(leagueId))}/matches`,
    { season },
    { signal },
  );
  const payload = parseRuntimePayloadOrFallback({
    schema: listResponseSchema,
    payload: rawPayload,
    fallback: { response: [] },
    feature: 'competitions.fixtures',
    endpoint: `/competitions/${leagueId}/matches`,
  });

  return payload.response as CompetitionsApiResponse<CompetitionsApiFixtureDto>['response'];
}

async function fetchLeaguePlayerStatsByType(
  leagueId: number,
  season: number,
  type: 'topscorers' | 'topassists' | 'topyellowcards' | 'topredcards',
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  const rawPayload = await bffGet<unknown>(
    `/competitions/${encodeURIComponent(String(leagueId))}/player-stats`,
    { season, type },
    { signal },
  );
  const payload = parseRuntimePayloadOrFallback({
    schema: listResponseSchema,
    payload: rawPayload,
    fallback: { response: [] },
    feature: 'competitions.player_stats',
    endpoint: `/competitions/${leagueId}/player-stats`,
  });

  return payload.response as CompetitionsApiResponse<CompetitionsApiPlayerStatDto>['response'];
}

export async function fetchLeagueTopScorers(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  return fetchLeaguePlayerStatsByType(leagueId, season, 'topscorers', signal);
}

export async function fetchLeagueTopAssists(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  return fetchLeaguePlayerStatsByType(leagueId, season, 'topassists', signal);
}

export async function fetchLeagueTopYellowCards(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  return fetchLeaguePlayerStatsByType(leagueId, season, 'topyellowcards', signal);
}

export async function fetchLeagueTopRedCards(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  return fetchLeaguePlayerStatsByType(leagueId, season, 'topredcards', signal);
}

export async function fetchLeagueTransfers(
  leagueId: number,
  season?: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiTransferDto[]> {
  const rawPayload = await bffGet<unknown>(
    `/competitions/${encodeURIComponent(String(leagueId))}/transfers`,
    { season },
    { signal },
  );
  const payload = parseRuntimePayloadOrFallback({
    schema: listResponseSchema,
    payload: rawPayload,
    fallback: { response: [] },
    feature: 'competitions.transfers',
    endpoint: `/competitions/${leagueId}/transfers`,
  });

  return payload.response as CompetitionsApiResponse<CompetitionsApiTransferDto>['response'];
}
