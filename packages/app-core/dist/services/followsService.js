import { z } from 'zod';
import { parseRuntimePayloadOrFallback } from '../runtime/validation.js';
const listResponseSchema = z
    .object({
    response: z.array(z.unknown()).default([]),
})
    .passthrough();
export function createFollowsReadService({ http, telemetry }) {
    async function fetchList(path, query, feature, endpoint, signal) {
        const rawPayload = await http.get(path, query, { signal });
        const payload = parseRuntimePayloadOrFallback({
            schema: listResponseSchema,
            payload: rawPayload,
            fallback: { response: [] },
            telemetry,
            feature,
            endpoint,
        });
        return payload.response;
    }
    return {
        searchTeams(query, signal) {
            return fetchList('/follows/search/teams', { q: query }, 'follows.search.teams', '/follows/search/teams', signal);
        },
        searchPlayers(query, season, signal) {
            return fetchList('/follows/search/players', { q: query, season }, 'follows.search.players', '/follows/search/players', signal);
        },
        async fetchTeamDetails(teamId, signal) {
            const items = await fetchList(`/follows/teams/${encodeURIComponent(teamId)}`, undefined, 'follows.team_details', `/follows/teams/${teamId}`, signal);
            return items[0] ?? null;
        },
        async fetchTeamNextFixture(teamId, timezone, signal) {
            const items = await fetchList(`/follows/teams/${encodeURIComponent(teamId)}/next-fixture`, { timezone }, 'follows.team_next_fixture', `/follows/teams/${teamId}/next-fixture`, signal);
            return items[0] ?? null;
        },
        async fetchPlayerSeason(playerId, season, signal) {
            const items = await fetchList(`/follows/players/${encodeURIComponent(playerId)}/season/${season}`, undefined, 'follows.player_season', `/follows/players/${playerId}/season/${season}`, signal);
            return items[0] ?? null;
        },
        fetchTeamsTrends(leagueIds, season, signal) {
            return fetchList('/follows/trends/teams', { leagueIds, season }, 'follows.trends.teams', '/follows/trends/teams', signal);
        },
        fetchPlayersTrends(leagueIds, season, signal) {
            return fetchList('/follows/trends/players', { leagueIds, season }, 'follows.trends.players', '/follows/trends/players', signal);
        },
    };
}
