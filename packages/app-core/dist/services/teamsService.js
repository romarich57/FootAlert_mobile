import { z } from 'zod';
import { parseRuntimePayloadOrFallback } from '../runtime/validation';
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
export function createTeamsReadService({ http, telemetry }) {
    return {
        async fetchTeamDetails(teamId, signal) {
            const rawPayload = await http.get(`/teams/${encodeURIComponent(teamId)}`, undefined, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'teams.details',
                endpoint: `/teams/${teamId}`,
            });
            return (payload.response[0] ?? null);
        },
        async fetchTeamLeagues(teamId, signal) {
            const rawPayload = await http.get(`/teams/${encodeURIComponent(teamId)}/leagues`, undefined, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'teams.leagues',
                endpoint: `/teams/${teamId}/leagues`,
            });
            return payload.response;
        },
        async fetchTeamFixtures(params, signal) {
            const rawPayload = await http.get(`/teams/${encodeURIComponent(params.teamId)}/fixtures`, {
                season: params.season,
                leagueId: params.leagueId,
                timezone: params.timezone,
                next: params.next,
            }, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'teams.fixtures',
                endpoint: `/teams/${params.teamId}/fixtures`,
            });
            return payload.response;
        },
        async fetchTeamNextFixture(teamId, timezone, signal) {
            const rawPayload = await http.get(`/teams/${encodeURIComponent(teamId)}/next-fixture`, {
                timezone,
            }, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'teams.next_fixture',
                endpoint: `/teams/${teamId}/next-fixture`,
            });
            return (payload.response[0] ?? null);
        },
        async fetchLeagueStandings(leagueId, season, signal) {
            const rawPayload = await http.get('/teams/standings', {
                leagueId,
                season,
            }, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'teams.standings',
                endpoint: '/teams/standings',
            });
            return (payload.response[0] ?? null);
        },
        async fetchTeamStatistics(leagueId, season, teamId, signal) {
            const rawPayload = await http.get(`/teams/${encodeURIComponent(teamId)}/stats`, {
                leagueId,
                season,
            }, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: optionalResponseSchema,
                payload: rawPayload,
                fallback: { response: undefined },
                telemetry,
                feature: 'teams.statistics',
                endpoint: `/teams/${teamId}/stats`,
            });
            return (payload.response ?? null);
        },
        async fetchTeamAdvancedStats(leagueId, season, teamId, signal) {
            const rawPayload = await http.get(`/teams/${encodeURIComponent(teamId)}/advanced-stats`, {
                leagueId,
                season,
            }, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: optionalResponseSchema,
                payload: rawPayload,
                fallback: { response: undefined },
                telemetry,
                feature: 'teams.advanced_stats',
                endpoint: `/teams/${teamId}/advanced-stats`,
            });
            return (payload.response ?? null);
        },
        async fetchTeamPlayers(params, signal) {
            const rawPayload = await http.get(`/teams/${encodeURIComponent(params.teamId)}/players`, {
                leagueId: params.leagueId,
                season: params.season,
                page: params.page,
                limit: params.limit,
                cursor: params.cursor,
            }, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: pagedResponseSchema,
                payload: rawPayload,
                fallback: { response: [], paging: undefined },
                telemetry,
                feature: 'teams.players',
                endpoint: `/teams/${params.teamId}/players`,
            });
            return {
                response: payload.response,
                paging: payload.paging,
                pageInfo: payload.pageInfo,
            };
        },
        async fetchTeamSquad(teamId, signal) {
            const rawPayload = await http.get(`/teams/${encodeURIComponent(teamId)}/squad`, undefined, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'teams.squad',
                endpoint: `/teams/${teamId}/squad`,
            });
            return (payload.response[0] ?? null);
        },
        async fetchTeamTransfers(teamId, signal) {
            const rawPayload = await http.get(`/teams/${encodeURIComponent(teamId)}/transfers`, undefined, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'teams.transfers',
                endpoint: `/teams/${teamId}/transfers`,
            });
            return payload.response;
        },
        async fetchTeamTrophies(teamId, signal) {
            const rawPayload = await http.get(`/teams/${encodeURIComponent(teamId)}/trophies`, undefined, { signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'teams.trophies',
                endpoint: `/teams/${teamId}/trophies`,
            });
            return payload.response;
        },
    };
}
