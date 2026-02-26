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
  };
}
