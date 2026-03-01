import { z } from 'zod';

import type { HttpAdapter } from '../adapters/http.js';
import type { TelemetryAdapter } from '../adapters/telemetry.js';
import type { ListEnvelope } from '../domain/network.js';
import { parseRuntimePayloadOrFallback } from '../runtime/validation.js';

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

type PlayersServiceDependencies = {
  http: HttpAdapter;
  telemetry: TelemetryAdapter;
};

export function createPlayersReadService({ http, telemetry }: PlayersServiceDependencies) {
  return {
    async fetchPlayerDetails<T = unknown>(
      playerId: string,
      season: number,
      signal?: AbortSignal,
    ): Promise<T | null> {
      const rawPayload = await http.get<unknown>(
        `/players/${encodeURIComponent(playerId)}`,
        { season },
        { signal },
      );
      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'players.details',
        endpoint: `/players/${playerId}`,
      });

      return ((payload as ListEnvelope<T>).response[0] ?? null) as T | null;
    },

    async fetchPlayerSeasons(playerId: string, signal?: AbortSignal): Promise<number[]> {
      const rawPayload = await http.get<unknown>(
        `/players/${encodeURIComponent(playerId)}/seasons`,
        undefined,
        { signal },
      );
      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'players.seasons',
        endpoint: `/players/${playerId}/seasons`,
      });

      return (payload as ListEnvelope<number>).response;
    },

    async fetchPlayerTrophies<T = unknown>(playerId: string, signal?: AbortSignal): Promise<T[]> {
      const rawPayload = await http.get<unknown>(
        `/players/${encodeURIComponent(playerId)}/trophies`,
        undefined,
        { signal },
      );
      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'players.trophies',
        endpoint: `/players/${playerId}/trophies`,
      });

      return (payload as ListEnvelope<T>).response;
    },

    async fetchPlayerCareerAggregate<TSeason = unknown, TTeam = unknown>(
      playerId: string,
      signal?: AbortSignal,
    ): Promise<{ seasons: TSeason[]; teams: TTeam[] }> {
      const rawPayload = await http.get<unknown>(
        `/players/${encodeURIComponent(playerId)}/career`,
        undefined,
        { signal },
      );
      const payload = parseRuntimePayloadOrFallback({
        schema: careerAggregateResponseSchema,
        payload: rawPayload,
        fallback: { response: undefined },
        telemetry,
        feature: 'players.career',
        endpoint: `/players/${playerId}/career`,
      });

      return {
        seasons: (payload.response?.seasons ?? []) as TSeason[],
        teams: (payload.response?.teams ?? []) as TTeam[],
      };
    },

    async fetchTeamFixtures<T = unknown>(
      teamId: string,
      season: number,
      amount: number = 10,
      signal?: AbortSignal,
    ): Promise<T[]> {
      const rawPayload = await http.get<unknown>(
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
        telemetry,
        feature: 'players.team_fixtures',
        endpoint: `/players/team/${teamId}/fixtures`,
      });

      return (payload as ListEnvelope<T>).response;
    },

    async fetchFixturePlayerStats<T = unknown>(
      fixtureId: string,
      teamId: string,
      signal?: AbortSignal,
    ): Promise<T | null> {
      const rawPayload = await http.get<unknown>(
        `/players/fixtures/${encodeURIComponent(fixtureId)}/team/${encodeURIComponent(teamId)}/stats`,
        undefined,
        { signal },
      );
      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'players.fixture_stats',
        endpoint: `/players/fixtures/${fixtureId}/team/${teamId}/stats`,
      });

      return ((payload as ListEnvelope<T>).response[0] ?? null) as T | null;
    },

    async fetchPlayerMatchesAggregate<T = unknown>(
      playerId: string,
      teamId: string,
      season: number,
      amount: number = 15,
      signal?: AbortSignal,
    ): Promise<T[]> {
      const rawPayload = await http.get<unknown>(
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
        telemetry,
        feature: 'players.matches_aggregate',
        endpoint: `/players/${playerId}/matches`,
      });

      return (payload as ListEnvelope<T>).response;
    },
  };
}
