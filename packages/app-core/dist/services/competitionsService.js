import { z } from 'zod';
import { parseRuntimePayloadOrFallback } from '../runtime/validation.js';
const listResponseSchema = z
    .object({
    response: z.array(z.unknown()).default([]),
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
export function createCompetitionsReadService({ http, telemetry }) {
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
    async function fetchListWithPageInfo(path, query, feature, endpoint, signal) {
        const rawPayload = await http.get(path, query, { signal });
        const payload = parseRuntimePayloadOrFallback({
            schema: listResponseSchema,
            payload: rawPayload,
            fallback: { response: [] },
            telemetry,
            feature,
            endpoint,
        });
        return payload;
    }
    return {
        fetchAllLeagues(signal) {
            return fetchList('/competitions', undefined, 'competitions.list', '/competitions', signal);
        },
        searchLeaguesByName(query, signal) {
            return fetchList('/competitions/search', { q: query }, 'competitions.search', '/competitions/search', signal);
        },
        async fetchLeagueById(id, signal) {
            const items = await fetchList(`/competitions/${encodeURIComponent(id)}`, undefined, 'competitions.details', `/competitions/${id}`, signal);
            return items[0] ?? null;
        },
        async fetchLeagueStandings(leagueId, season, signal) {
            const items = await fetchList(`/competitions/${encodeURIComponent(String(leagueId))}/standings`, { season }, 'competitions.standings', `/competitions/${leagueId}/standings`, signal);
            return items[0] ?? null;
        },
        fetchLeagueFixtures(leagueId, season, signal, options) {
            return fetchList(`/competitions/${encodeURIComponent(String(leagueId))}/matches`, {
                season,
                limit: options?.limit,
                cursor: options?.cursor,
            }, 'competitions.fixtures', `/competitions/${leagueId}/matches`, signal);
        },
        fetchLeagueFixturesPage(leagueId, season, signal, options) {
            return fetchListWithPageInfo(`/competitions/${encodeURIComponent(String(leagueId))}/matches`, {
                season,
                limit: options?.limit,
                cursor: options?.cursor,
            }, 'competitions.fixtures_page', `/competitions/${leagueId}/matches`, signal);
        },
        fetchLeaguePlayerStats(leagueId, season, type, signal) {
            return fetchList(`/competitions/${encodeURIComponent(String(leagueId))}/player-stats`, { season, type }, 'competitions.player_stats', `/competitions/${leagueId}/player-stats`, signal);
        },
        fetchLeagueTransfers(leagueId, season, signal) {
            return fetchList(`/competitions/${encodeURIComponent(String(leagueId))}/transfers`, { season }, 'competitions.transfers', `/competitions/${leagueId}/transfers`, signal);
        },
        async fetchCompetitionBracket(leagueId, season, signal) {
            // Appel direct : le BFF retourne un objet { competitionKind, bracket } (pas d'enveloppe { response: [] })
            return http.get(`/competitions/${encodeURIComponent(String(leagueId))}/bracket`, { season }, { signal });
        },
        async fetchCompetitionTotw(leagueId, season, signal) {
            // Appel direct : la réponse BFF n'est pas une enveloppe { response: [] }
            // mais directement { topScorers, topAssists, topYellowCards, topRedCards }
            const raw = await http.get(`/competitions/${encodeURIComponent(String(leagueId))}/totw`, { season }, { signal });
            return {
                topScorers: (raw.topScorers ?? []),
                topAssists: (raw.topAssists ?? []),
                topYellowCards: (raw.topYellowCards ?? []),
                topRedCards: (raw.topRedCards ?? []),
            };
        },
        async fetchCompetitionTeamStats(leagueId, season, signal) {
            return http.get(`/competitions/${encodeURIComponent(String(leagueId))}/team-stats`, { season }, { signal });
        },
        async fetchCompetitionFull(leagueId, season, signal) {
            return http.get(`/competitions/${encodeURIComponent(String(leagueId))}/full`, { season }, { signal });
        },
    };
}
