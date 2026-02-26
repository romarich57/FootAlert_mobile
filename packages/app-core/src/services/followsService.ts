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

type FollowsServiceDependencies = {
  http: HttpAdapter;
  telemetry: TelemetryAdapter;
};

export function createFollowsReadService({ http, telemetry }: FollowsServiceDependencies) {
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
    searchTeams<T = unknown>(query: string, signal?: AbortSignal): Promise<T[]> {
      return fetchList('/follows/search/teams', { q: query }, 'follows.search.teams', '/follows/search/teams', signal);
    },

    searchPlayers<T = unknown>(query: string, signal?: AbortSignal): Promise<T[]> {
      return fetchList('/follows/search/players', { q: query }, 'follows.search.players', '/follows/search/players', signal);
    },

    async fetchTeamDetails<T = unknown>(teamId: string, signal?: AbortSignal): Promise<T | null> {
      const items = await fetchList<T>(
        `/follows/teams/${encodeURIComponent(teamId)}`,
        undefined,
        'follows.team_details',
        `/follows/teams/${teamId}`,
        signal,
      );
      return items[0] ?? null;
    },

    async fetchTeamNextFixture<T = unknown>(
      teamId: string,
      timezone: string,
      signal?: AbortSignal,
    ): Promise<T | null> {
      const items = await fetchList<T>(
        `/follows/teams/${encodeURIComponent(teamId)}/next-fixture`,
        { timezone },
        'follows.team_next_fixture',
        `/follows/teams/${teamId}/next-fixture`,
        signal,
      );
      return items[0] ?? null;
    },

    async fetchPlayerSeason<T = unknown>(
      playerId: string,
      season: number,
      signal?: AbortSignal,
    ): Promise<T | null> {
      const items = await fetchList<T>(
        `/follows/players/${encodeURIComponent(playerId)}/season/${season}`,
        undefined,
        'follows.player_season',
        `/follows/players/${playerId}/season/${season}`,
        signal,
      );
      return items[0] ?? null;
    },

    fetchTeamsTrends<T = unknown>(leagueIds: string, season: number, signal?: AbortSignal): Promise<T[]> {
      return fetchList(
        '/follows/trends/teams',
        { leagueIds, season },
        'follows.trends.teams',
        '/follows/trends/teams',
        signal,
      );
    },

    fetchPlayersTrends<T = unknown>(leagueIds: string, season: number, signal?: AbortSignal): Promise<T[]> {
      return fetchList(
        '/follows/trends/players',
        { leagueIds, season },
        'follows.trends.players',
        '/follows/trends/players',
        signal,
      );
    },
  };
}
