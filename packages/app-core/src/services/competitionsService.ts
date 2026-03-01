import { z } from 'zod';

import type { HttpAdapter } from '../adapters/http.js';
import type { TelemetryAdapter } from '../adapters/telemetry.js';
import type { ListEnvelope } from '../domain/network.js';
import { parseRuntimePayloadOrFallback } from '../runtime/validation.js';

const listResponseSchema = z
  .object({
    response: z.array(z.unknown()).default([]),
    pageInfo: z
      .object({
        hasMore: z.boolean(),
        nextCursor: z.string().nullable(),
        returnedCount: z.number(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

type CompetitionsServiceDependencies = {
  http: HttpAdapter;
  telemetry: TelemetryAdapter;
};

export function createCompetitionsReadService({ http, telemetry }: CompetitionsServiceDependencies) {
  async function fetchList<T = unknown>(
    path: string,
    query: Record<string, string | number | undefined> | undefined,
    feature: string,
    endpoint: string,
    signal?: AbortSignal,
  ): Promise<T[]> {
    const rawPayload = await http.get<unknown>(path, query, { signal });
    const payload = parseRuntimePayloadOrFallback({
      schema: listResponseSchema,
      payload: rawPayload,
      fallback: { response: [] },
      telemetry,
      feature,
      endpoint,
    });

    return (payload as ListEnvelope<T>).response;
  }

  return {
    fetchAllLeagues<T = unknown>(signal?: AbortSignal): Promise<T[]> {
      return fetchList('/competitions', undefined, 'competitions.list', '/competitions', signal);
    },

    searchLeaguesByName<T = unknown>(query: string, signal?: AbortSignal): Promise<T[]> {
      return fetchList(
        '/competitions/search',
        { q: query },
        'competitions.search',
        '/competitions/search',
        signal,
      );
    },

    async fetchLeagueById<T = unknown>(id: string, signal?: AbortSignal): Promise<T | null> {
      const items = await fetchList<T>(
        `/competitions/${encodeURIComponent(id)}`,
        undefined,
        'competitions.details',
        `/competitions/${id}`,
        signal,
      );

      return items[0] ?? null;
    },

    async fetchLeagueStandings<T = unknown>(
      leagueId: number,
      season: number,
      signal?: AbortSignal,
    ): Promise<T | null> {
      const items = await fetchList<T>(
        `/competitions/${encodeURIComponent(String(leagueId))}/standings`,
        { season },
        'competitions.standings',
        `/competitions/${leagueId}/standings`,
        signal,
      );

      return items[0] ?? null;
    },

    fetchLeagueFixtures<T = unknown>(
      leagueId: number,
      season: number,
      signal?: AbortSignal,
      options?: {
        limit?: number;
        cursor?: string;
      },
    ): Promise<T[]> {
      return fetchList(
        `/competitions/${encodeURIComponent(String(leagueId))}/matches`,
        {
          season,
          limit: options?.limit,
          cursor: options?.cursor,
        },
        'competitions.fixtures',
        `/competitions/${leagueId}/matches`,
        signal,
      );
    },

    fetchLeaguePlayerStats<T = unknown>(
      leagueId: number,
      season: number,
      type: 'topscorers' | 'topassists' | 'topyellowcards' | 'topredcards',
      signal?: AbortSignal,
    ): Promise<T[]> {
      return fetchList(
        `/competitions/${encodeURIComponent(String(leagueId))}/player-stats`,
        { season, type },
        'competitions.player_stats',
        `/competitions/${leagueId}/player-stats`,
        signal,
      );
    },

    fetchLeagueTransfers<T = unknown>(
      leagueId: number,
      season?: number,
      signal?: AbortSignal,
    ): Promise<T[]> {
      return fetchList(
        `/competitions/${encodeURIComponent(String(leagueId))}/transfers`,
        { season },
        'competitions.transfers',
        `/competitions/${leagueId}/transfers`,
        signal,
      );
    },
  };
}
