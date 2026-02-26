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
    };
}
