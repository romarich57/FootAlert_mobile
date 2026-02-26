import { z } from 'zod';
import { parseRuntimePayloadOrFallback } from '../runtime/validation';
const listResponseSchema = z
    .object({
    response: z.array(z.unknown()).default([]),
})
    .passthrough();
export function createMatchesReadService({ http, telemetry }) {
    return {
        async fetchFixturesByDate(params) {
            const rawPayload = await http.get('/matches', {
                date: params.date,
                timezone: params.timezone,
            }, { signal: params.signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'matches.fixtures',
                endpoint: '/matches',
            });
            return payload.response;
        },
        async fetchFixtureById(params) {
            const rawPayload = await http.get(`/matches/${encodeURIComponent(params.fixtureId)}`, {
                timezone: params.timezone,
            }, { signal: params.signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'matches.fixture_details',
                endpoint: `/matches/${params.fixtureId}`,
            });
            return (payload.response[0] ?? null);
        },
        async fetchFixtureEvents(params) {
            const rawPayload = await http.get(`/matches/${encodeURIComponent(params.fixtureId)}/events`, undefined, { signal: params.signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'matches.fixture_events',
                endpoint: `/matches/${params.fixtureId}/events`,
            });
            return payload.response;
        },
        async fetchFixtureStatistics(params) {
            const rawPayload = await http.get(`/matches/${encodeURIComponent(params.fixtureId)}/statistics`, undefined, { signal: params.signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'matches.fixture_statistics',
                endpoint: `/matches/${params.fixtureId}/statistics`,
            });
            return payload.response;
        },
        async fetchFixtureLineups(params) {
            const rawPayload = await http.get(`/matches/${encodeURIComponent(params.fixtureId)}/lineups`, undefined, { signal: params.signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'matches.fixture_lineups',
                endpoint: `/matches/${params.fixtureId}/lineups`,
            });
            return payload.response;
        },
        async fetchFixtureHeadToHead(params) {
            const rawPayload = await http.get(`/matches/${encodeURIComponent(params.fixtureId)}/head-to-head`, {
                timezone: params.timezone,
                last: params.last,
            }, { signal: params.signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'matches.fixture_h2h',
                endpoint: `/matches/${params.fixtureId}/head-to-head`,
            });
            return payload.response;
        },
        async fetchFixturePredictions(params) {
            const rawPayload = await http.get(`/matches/${encodeURIComponent(params.fixtureId)}/predictions`, undefined, { signal: params.signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'matches.fixture_predictions',
                endpoint: `/matches/${params.fixtureId}/predictions`,
            });
            return payload.response;
        },
        async fetchFixturePlayersStatsByTeam(params) {
            const rawPayload = await http.get(`/matches/${encodeURIComponent(params.fixtureId)}/players/${encodeURIComponent(params.teamId)}/stats`, undefined, { signal: params.signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'matches.fixture_players_stats',
                endpoint: `/matches/${params.fixtureId}/players/${params.teamId}/stats`,
            });
            return payload.response;
        },
        async fetchFixtureAbsences(params) {
            const rawPayload = await http.get(`/matches/${encodeURIComponent(params.fixtureId)}/absences`, {
                timezone: params.timezone,
            }, { signal: params.signal });
            const payload = parseRuntimePayloadOrFallback({
                schema: listResponseSchema,
                payload: rawPayload,
                fallback: { response: [] },
                telemetry,
                feature: 'matches.fixture_absences',
                endpoint: `/matches/${params.fixtureId}/absences`,
            });
            return payload.response;
        },
    };
}
