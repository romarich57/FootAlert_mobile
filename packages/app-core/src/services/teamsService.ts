import { z } from 'zod';

import type { HttpAdapter } from '../adapters/http.js';
import type { TelemetryAdapter } from '../adapters/telemetry.js';
import type { ListEnvelope, OptionalEnvelope, PagedEnvelope } from '../domain/network.js';
import { parseRuntimePayloadOrFallback } from '../runtime/validation.js';

const listResponseSchema = z
  .object({
    response: z.array(z.unknown()).default([]),
  })
  .passthrough();

const optionalResponseSchema = z
  .object({
    response: z.unknown().optional(),
  })
  .passthrough();

const objectResponseSchema = z.object({}).passthrough();

const pagedResponseSchema = z
  .object({
    response: z.array(z.unknown()).default([]),
    paging: z
      .object({
        current: z.number().optional(),
        total: z.number().optional(),
      })
      .passthrough()
      .optional(),
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

type TeamsServiceDependencies = {
  http: HttpAdapter;
  telemetry: TelemetryAdapter;
};

export function createTeamsReadService({ http, telemetry }: TeamsServiceDependencies) {
  return {
    async fetchTeamDetails<T = unknown>(teamId: string, signal?: AbortSignal): Promise<T | null> {
      const rawPayload = await http.get<unknown>(
        `/teams/${encodeURIComponent(teamId)}`,
        undefined,
        { signal },
      );
      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'teams.details',
        endpoint: `/teams/${teamId}`,
      });

      return ((payload as ListEnvelope<T>).response[0] ?? null) as T | null;
    },

    async fetchTeamLeagues<T = unknown>(teamId: string, signal?: AbortSignal): Promise<T[]> {
      const rawPayload = await http.get<unknown>(
        `/teams/${encodeURIComponent(teamId)}/leagues`,
        undefined,
        { signal },
      );
      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'teams.leagues',
        endpoint: `/teams/${teamId}/leagues`,
      });

      return (payload as ListEnvelope<T>).response;
    },

    async fetchTeamFixtures<T = unknown>(
      params: {
        teamId: string;
        season?: number;
        leagueId?: string | null;
        timezone?: string;
        next?: number;
      },
      signal?: AbortSignal,
    ): Promise<T[]> {
      const rawPayload = await http.get<unknown>(
        `/teams/${encodeURIComponent(params.teamId)}/fixtures`,
        {
          season: params.season,
          leagueId: params.leagueId,
          timezone: params.timezone,
          next: params.next,
        },
        { signal },
      );
      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'teams.fixtures',
        endpoint: `/teams/${params.teamId}/fixtures`,
      });

      return (payload as ListEnvelope<T>).response;
    },

    async fetchTeamNextFixture<T = unknown>(
      teamId: string,
      timezone: string,
      signal?: AbortSignal,
    ): Promise<T | null> {
      const rawPayload = await http.get<unknown>(
        `/teams/${encodeURIComponent(teamId)}/next-fixture`,
        {
          timezone,
        },
        { signal },
      );
      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'teams.next_fixture',
        endpoint: `/teams/${teamId}/next-fixture`,
      });

      return ((payload as ListEnvelope<T>).response[0] ?? null) as T | null;
    },

    async fetchLeagueStandings<T = unknown>(
      leagueId: string,
      season: number,
      signal?: AbortSignal,
    ): Promise<T | null> {
      const rawPayload = await http.get<unknown>(
        '/teams/standings',
        {
          leagueId,
          season,
        },
        { signal },
      );
      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'teams.standings',
        endpoint: '/teams/standings',
      });

      return ((payload as ListEnvelope<T>).response[0] ?? null) as T | null;
    },

    async fetchTeamStatistics<T = unknown>(
      leagueId: string,
      season: number,
      teamId: string,
      signal?: AbortSignal,
    ): Promise<T | null> {
      const rawPayload = await http.get<unknown>(
        `/teams/${encodeURIComponent(teamId)}/stats`,
        {
          leagueId,
          season,
        },
        { signal },
      );
      const payload = parseRuntimePayloadOrFallback({
        schema: optionalResponseSchema,
        payload: rawPayload,
        fallback: { response: undefined },
        telemetry,
        feature: 'teams.statistics',
        endpoint: `/teams/${teamId}/stats`,
      });

      return ((payload as OptionalEnvelope<T>).response ?? null) as T | null;
    },

    async fetchTeamOverview<T = unknown>(
      params: {
        teamId: string;
        leagueId: string;
        season: number;
        timezone: string;
        historySeasons?: number[];
      },
      signal?: AbortSignal,
    ): Promise<T> {
      const rawPayload = await http.get<unknown>(
        `/teams/${encodeURIComponent(params.teamId)}/overview`,
        {
          leagueId: params.leagueId,
          season: params.season,
          timezone: params.timezone,
          historySeasons:
            params.historySeasons && params.historySeasons.length > 0
              ? params.historySeasons.join(',')
              : undefined,
        },
        { signal },
      );
      const payload = parseRuntimePayloadOrFallback({
        schema: objectResponseSchema,
        payload: rawPayload,
        fallback: {},
        telemetry,
        feature: 'teams.overview',
        endpoint: `/teams/${params.teamId}/overview`,
      });

      return payload as T;
    },

    async fetchTeamOverviewLeaders<T = unknown>(
      params: {
        teamId: string;
        leagueId: string;
        season: number;
      },
      signal?: AbortSignal,
    ): Promise<T> {
      const rawPayload = await http.get<unknown>(
        `/teams/${encodeURIComponent(params.teamId)}/overview-leaders`,
        {
          leagueId: params.leagueId,
          season: params.season,
        },
        { signal },
      );
      const payload = parseRuntimePayloadOrFallback({
        schema: objectResponseSchema,
        payload: rawPayload,
        fallback: {},
        telemetry,
        feature: 'teams.overview_leaders',
        endpoint: `/teams/${params.teamId}/overview-leaders`,
      });

      return payload as T;
    },

    async fetchTeamAdvancedStats<T = unknown>(
      leagueId: string,
      season: number,
      teamId: string,
      signal?: AbortSignal,
    ): Promise<T | null> {
      const rawPayload = await http.get<unknown>(
        `/teams/${encodeURIComponent(teamId)}/advanced-stats`,
        {
          leagueId,
          season,
        },
        { signal },
      );
      const payload = parseRuntimePayloadOrFallback({
        schema: optionalResponseSchema,
        payload: rawPayload,
        fallback: { response: undefined },
        telemetry,
        feature: 'teams.advanced_stats',
        endpoint: `/teams/${teamId}/advanced-stats`,
      });

      return ((payload as OptionalEnvelope<T>).response ?? null) as T | null;
    },

    async fetchTeamPlayers<T = unknown>(
      params: {
        teamId: string;
        leagueId: string;
        season: number;
        page?: number;
        limit?: number;
        cursor?: string;
      },
      signal?: AbortSignal,
    ): Promise<PagedEnvelope<T>> {
      const rawPayload = await http.get<unknown>(
        `/teams/${encodeURIComponent(params.teamId)}/players`,
        {
          leagueId: params.leagueId,
          season: params.season,
          page: params.page,
          limit: params.limit,
          cursor: params.cursor,
        },
        { signal },
      );
      const payload = parseRuntimePayloadOrFallback({
        schema: pagedResponseSchema,
        payload: rawPayload,
        fallback: { response: [], paging: undefined },
        telemetry,
        feature: 'teams.players',
        endpoint: `/teams/${params.teamId}/players`,
      });

      return {
        response: (payload as PagedEnvelope<T>).response,
        paging: (payload as PagedEnvelope<T>).paging,
        pageInfo: (payload as PagedEnvelope<T>).pageInfo,
      };
    },

    async fetchTeamSquad<T = unknown>(teamId: string, signal?: AbortSignal): Promise<T | null> {
      const rawPayload = await http.get<unknown>(
        `/teams/${encodeURIComponent(teamId)}/squad`,
        undefined,
        { signal },
      );
      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'teams.squad',
        endpoint: `/teams/${teamId}/squad`,
      });

      return ((payload as ListEnvelope<T>).response[0] ?? null) as T | null;
    },

    async fetchTeamTransfers<T = unknown>(
      params: {
        teamId: string;
        season?: number;
      },
      signal?: AbortSignal,
    ): Promise<T[]> {
      const rawPayload = await http.get<unknown>(
        `/teams/${encodeURIComponent(params.teamId)}/transfers`,
        {
          season: params.season,
        },
        { signal },
      );
      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'teams.transfers',
        endpoint: `/teams/${params.teamId}/transfers`,
      });

      return (payload as ListEnvelope<T>).response;
    },

    async fetchTeamTrophies<T = unknown>(teamId: string, signal?: AbortSignal): Promise<T[]> {
      const rawPayload = await http.get<unknown>(
        `/teams/${encodeURIComponent(teamId)}/trophies`,
        undefined,
        { signal },
      );
      const payload = parseRuntimePayloadOrFallback({
        schema: listResponseSchema,
        payload: rawPayload,
        fallback: { response: [] },
        telemetry,
        feature: 'teams.trophies',
        endpoint: `/teams/${teamId}/trophies`,
      });

      return (payload as ListEnvelope<T>).response;
    },
  };
}
