import { z } from 'zod';

import type { HttpAdapter } from '../adapters/http';
import type { TelemetryAdapter } from '../adapters/telemetry';
import type { ListEnvelope } from '../domain/network';
import { parseRuntimePayloadOrFallback } from '../runtime/validation';

const listResponseSchema = z
  .object({
    response: z.array(z.unknown()).default([]),
  })
  .passthrough();

type MatchesServiceDependencies = {
  http: HttpAdapter;
  telemetry: TelemetryAdapter;
};

export function createMatchesReadService({ http, telemetry }: MatchesServiceDependencies) {
  return {
    async fetchFixturesByDate<T = unknown>(params: {
      date: string;
      timezone: string;
      signal?: AbortSignal;
    }): Promise<T[]> {
      const rawPayload = await http.get<unknown>(
        '/matches',
        {
          date: params.date,
          timezone: params.timezone,
        },
        { signal: params.signal },
      );

      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'matches.fixtures',
        endpoint: '/matches',
      });

      return (payload as ListEnvelope<T>).response;
    },

    async fetchFixtureById<T = unknown>(params: {
      fixtureId: string;
      timezone: string;
      signal?: AbortSignal;
    }): Promise<T | null> {
      const rawPayload = await http.get<unknown>(
        `/matches/${encodeURIComponent(params.fixtureId)}`,
        {
          timezone: params.timezone,
        },
        { signal: params.signal },
      );

      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'matches.fixture_details',
        endpoint: `/matches/${params.fixtureId}`,
      });

      return ((payload as ListEnvelope<T>).response[0] ?? null) as T | null;
    },

    async fetchFixtureEvents<T = unknown>(params: {
      fixtureId: string;
      signal?: AbortSignal;
    }): Promise<T[]> {
      const rawPayload = await http.get<unknown>(
        `/matches/${encodeURIComponent(params.fixtureId)}/events`,
        undefined,
        { signal: params.signal },
      );

      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'matches.fixture_events',
        endpoint: `/matches/${params.fixtureId}/events`,
      });

      return (payload as ListEnvelope<T>).response;
    },

    async fetchFixtureStatistics<T = unknown>(params: {
      fixtureId: string;
      signal?: AbortSignal;
    }): Promise<T[]> {
      const rawPayload = await http.get<unknown>(
        `/matches/${encodeURIComponent(params.fixtureId)}/statistics`,
        undefined,
        { signal: params.signal },
      );

      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'matches.fixture_statistics',
        endpoint: `/matches/${params.fixtureId}/statistics`,
      });

      return (payload as ListEnvelope<T>).response;
    },

    async fetchFixtureLineups<T = unknown>(params: {
      fixtureId: string;
      signal?: AbortSignal;
    }): Promise<T[]> {
      const rawPayload = await http.get<unknown>(
        `/matches/${encodeURIComponent(params.fixtureId)}/lineups`,
        undefined,
        { signal: params.signal },
      );

      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'matches.fixture_lineups',
        endpoint: `/matches/${params.fixtureId}/lineups`,
      });

      return (payload as ListEnvelope<T>).response;
    },

    async fetchFixtureHeadToHead<T = unknown>(params: {
      fixtureId: string;
      timezone?: string;
      last?: number;
      signal?: AbortSignal;
    }): Promise<T[]> {
      const rawPayload = await http.get<unknown>(
        `/matches/${encodeURIComponent(params.fixtureId)}/head-to-head`,
        {
          timezone: params.timezone,
          last: params.last,
        },
        { signal: params.signal },
      );

      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'matches.fixture_h2h',
        endpoint: `/matches/${params.fixtureId}/head-to-head`,
      });

      return (payload as ListEnvelope<T>).response;
    },

    async fetchFixturePredictions<T = unknown>(params: {
      fixtureId: string;
      signal?: AbortSignal;
    }): Promise<T[]> {
      const rawPayload = await http.get<unknown>(
        `/matches/${encodeURIComponent(params.fixtureId)}/predictions`,
        undefined,
        { signal: params.signal },
      );

      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'matches.fixture_predictions',
        endpoint: `/matches/${params.fixtureId}/predictions`,
      });

      return (payload as ListEnvelope<T>).response;
    },

    async fetchFixturePlayersStatsByTeam<T = unknown>(params: {
      fixtureId: string;
      teamId: string;
      signal?: AbortSignal;
    }): Promise<T[]> {
      const rawPayload = await http.get<unknown>(
        `/matches/${encodeURIComponent(params.fixtureId)}/players/${encodeURIComponent(params.teamId)}/stats`,
        undefined,
        { signal: params.signal },
      );

      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'matches.fixture_players_stats',
        endpoint: `/matches/${params.fixtureId}/players/${params.teamId}/stats`,
      });

      return (payload as ListEnvelope<T>).response;
    },

    async fetchFixtureAbsences<T = unknown>(params: {
      fixtureId: string;
      timezone?: string;
      signal?: AbortSignal;
    }): Promise<T[]> {
      const rawPayload = await http.get<unknown>(
        `/matches/${encodeURIComponent(params.fixtureId)}/absences`,
        {
          timezone: params.timezone,
        },
        { signal: params.signal },
      );

      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'matches.fixture_absences',
        endpoint: `/matches/${params.fixtureId}/absences`,
      });

      return (payload as ListEnvelope<T>).response;
    },
  };
}
