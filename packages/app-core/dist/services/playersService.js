import { z } from 'zod';
import { parseRuntimePayloadOrFallback } from '../runtime/validation.js';
const listResponseSchema = z
    .object({
    response: z.array(z.unknown()).default([]),
})
    .passthrough();
const objectResponseSchema = z
    .object({
    response: z.unknown().optional(),
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
export const PLAYER_MATCHES_LIMIT = 99;
export function createPlayersReadService({ http, telemetry }) {
    return {
        async fetchPlayerDetails(playerId, season, signal) {
            const rawPayload = await http.get(`/players/${encodeURIComponent(playerId)}`, { season }, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'players.details',
                endpoint: `/players/${playerId}`,
            });
            return (payload.response[0] ?? null);
        },
        async fetchPlayerSeasons(playerId, signal) {
            const rawPayload = await http.get(`/players/${encodeURIComponent(playerId)}/seasons`, undefined, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'players.seasons',
                endpoint: `/players/${playerId}/seasons`,
            });
            return payload.response;
        },
        async fetchPlayerTrophies(playerId, signal) {
            const rawPayload = await http.get(`/players/${encodeURIComponent(playerId)}/trophies`, undefined, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'players.trophies',
                endpoint: `/players/${playerId}/trophies`,
            });
            return payload.response;
        },
        async fetchPlayerCareerAggregate(playerId, signal) {
            const rawPayload = await http.get(`/players/${encodeURIComponent(playerId)}/career`, undefined, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: careerAggregateResponseSchema,
                payload: rawPayload,
                fallback: { response: undefined },
                telemetry,
                feature: 'players.career',
                endpoint: `/players/${playerId}/career`,
            });
            return {
                seasons: (payload.response?.seasons ?? []),
                teams: (payload.response?.teams ?? []),
            };
        },
        async fetchPlayerOverview(playerId, season, signal) {
            const rawPayload = await http.get(`/players/${encodeURIComponent(playerId)}/overview`, { season }, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: objectResponseSchema,
                payload: rawPayload,
                fallback: { response: undefined },
                telemetry,
                feature: 'players.overview',
                endpoint: `/players/${playerId}/overview`,
            });
            return (payload.response ?? null);
        },
        async fetchPlayerStatsCatalog(playerId, signal) {
            const rawPayload = await http.get(`/players/${encodeURIComponent(playerId)}/stats-catalog`, undefined, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: objectResponseSchema,
                payload: rawPayload,
                fallback: { response: undefined },
                telemetry,
                feature: 'players.stats_catalog',
                endpoint: `/players/${playerId}/stats-catalog`,
            });
            return (payload.response ?? null);
        },
        async fetchPlayerFull(playerId, season, signal) {
            const rawPayload = await http.get(`/players/${encodeURIComponent(playerId)}/full`, { season }, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: objectResponseSchema,
                payload: rawPayload,
                fallback: { response: undefined },
                telemetry,
                feature: 'players.full',
                endpoint: `/players/${playerId}/full`,
            });
            const responseData = payload.response ?? null;
            if (responseData && typeof responseData === 'object') {
                const raw = rawPayload;
                if (raw && '_meta' in raw) {
                    responseData._meta = raw._meta;
                }
            }
            return responseData;
        },
        async fetchTeamFixtures(teamId, season, amount = PLAYER_MATCHES_LIMIT, signal) {
            const rawPayload = await http.get(`/players/team/${encodeURIComponent(teamId)}/fixtures`, {
                season,
                last: amount,
            }, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'players.team_fixtures',
                endpoint: `/players/team/${teamId}/fixtures`,
            });
            return payload.response;
        },
        async fetchFixturePlayerStats(fixtureId, teamId, signal) {
            const rawPayload = await http.get(`/players/fixtures/${encodeURIComponent(fixtureId)}/team/${encodeURIComponent(teamId)}/stats`, undefined, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'players.fixture_stats',
                endpoint: `/players/fixtures/${fixtureId}/team/${teamId}/stats`,
            });
            return (payload.response[0] ?? null);
        },
        async fetchPlayerMatchesAggregate(playerId, teamId, season, amount = PLAYER_MATCHES_LIMIT, signal) {
            const rawPayload = await http.get(`/players/${encodeURIComponent(playerId)}/matches`, {
                teamId,
                season,
                last: amount,
            }, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'players.matches_aggregate',
                endpoint: `/players/${playerId}/matches`,
            });
            return payload.response;
        },
    };
}
