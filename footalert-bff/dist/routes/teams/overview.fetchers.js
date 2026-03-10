// Fonctions asynchrones de récupération des données overview depuis API-Football
import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../../lib/cache.js';
import { buildFixtureQuery, normalizeStandingsPayload, toNumericId } from './helpers.js';
import { fetchTeamTrophiesWithFallback } from './trophies.js';
import { toId, toNumber, toText } from './overview.mappers.js';
import { buildEstimatedLineup, mapPlayersToTopPlayers, mapPlayersToTopPlayersByCategory, } from './overview.players.js';
// TTL cache : données live vs données stables
const TEAM_OVERVIEW_TTL_MS = 45_000;
const TEAM_OVERVIEW_LONG_TTL_MS = 120_000;
// Pagination joueurs : limite pour éviter une surconsommation de quota API
const TEAM_PLAYERS_MAX_PAGES = 6;
const TEAM_PLAYERS_TARGET_ITEMS = 120;
export async function fetchOverviewFixtures(teamId, leagueId, season, timezone) {
    return withCache(buildCanonicalCacheKey('team:overview:fixtures', { teamId, leagueId, season, timezone }), TEAM_OVERVIEW_TTL_MS, async () => {
        const payload = await apiFootballGet(`/fixtures?${buildFixtureQuery(teamId, { leagueId, season, timezone })}`);
        return Array.isArray(payload.response) ? payload.response : [];
    });
}
export async function fetchOverviewNextFixture(teamId, timezone) {
    return withCache(buildCanonicalCacheKey('team:overview:next-fixture', { teamId, timezone }), TEAM_OVERVIEW_TTL_MS, async () => {
        const payload = await apiFootballGet(`/fixtures?team=${encodeURIComponent(teamId)}&next=1&timezone=${encodeURIComponent(timezone)}`);
        return payload.response?.[0] ?? null;
    });
}
export async function fetchOverviewStandings(leagueId, season) {
    return withCache(buildCanonicalCacheKey('team:overview:standings', { leagueId, season }), 60_000, async () => {
        const payload = await apiFootballGet(`/standings?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}`);
        const normalized = normalizeStandingsPayload(payload);
        return normalized.response?.[0] ?? null;
    });
}
export async function fetchOverviewStatistics(teamId, leagueId, season) {
    return withCache(buildCanonicalCacheKey('team:overview:statistics', { teamId, leagueId, season }), 60_000, async () => {
        const payload = await apiFootballGet(`/teams/statistics?league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}&team=${encodeURIComponent(teamId)}`);
        return payload.response ?? null;
    });
}
export async function fetchOverviewPlayers(teamId, leagueId, season) {
    const aggregated = [];
    for (let page = 1; page <= TEAM_PLAYERS_MAX_PAGES && aggregated.length < TEAM_PLAYERS_TARGET_ITEMS; page += 1) {
        const pagePayload = await withCache(buildCanonicalCacheKey('team:overview:players:page', { teamId, leagueId, season, page }), 60_000, () => apiFootballGet(`/players?team=${encodeURIComponent(teamId)}&league=${encodeURIComponent(leagueId)}&season=${encodeURIComponent(String(season))}&page=${page}`));
        const pageItems = Array.isArray(pagePayload.response) ? pagePayload.response : [];
        if (pageItems.length === 0) {
            break;
        }
        const remainingItems = TEAM_PLAYERS_TARGET_ITEMS - aggregated.length;
        aggregated.push(...pageItems.slice(0, Math.max(0, remainingItems)));
        const totalPages = toNumber(pagePayload.paging?.total);
        if (typeof totalPages === 'number' && page >= totalPages) {
            break;
        }
    }
    return aggregated;
}
export async function fetchOverviewCoach(teamId) {
    return withCache(buildCanonicalCacheKey('team:overview:coach', { teamId }), TEAM_OVERVIEW_LONG_TTL_MS, async () => {
        const coachRes = await apiFootballGet(`/coachs?team=${encodeURIComponent(teamId)}`);
        const coaches = coachRes.response ?? [];
        const teamIdAsNumber = toNumericId(teamId);
        const currentCoach = coaches.find(coach => {
            const currentJob = coach.career?.[0];
            return currentJob?.team?.id === teamIdAsNumber && currentJob.end === null;
        }) ??
            coaches[0] ??
            null;
        if (!currentCoach) {
            return null;
        }
        return {
            id: toId(currentCoach.id),
            name: toText(currentCoach.name),
            photo: toText(currentCoach.photo),
            age: toNumber(currentCoach.age),
        };
    });
}
export async function fetchOverviewTrophies(teamId, logger) {
    return withCache(buildCanonicalCacheKey('team:overview:trophies', { teamId }), TEAM_OVERVIEW_LONG_TTL_MS, async () => {
        const payload = await fetchTeamTrophiesWithFallback(teamId, logger);
        return Array.isArray(payload.response) ? payload.response : [];
    });
}
// --- Construction du payload leaders à partir des joueurs ---
export function buildOverviewLeadersPayload(playersPayload, playerContext, sourceUpdatedAt) {
    const topPlayers = mapPlayersToTopPlayers(playersPayload, playerContext, 30);
    const topPlayersByCategory = mapPlayersToTopPlayersByCategory(playersPayload, playerContext, 5);
    return {
        seasonLineup: buildEstimatedLineup(topPlayers),
        playerLeaders: {
            ratings: topPlayersByCategory.ratings.slice(0, 3),
            scorers: topPlayersByCategory.scorers.slice(0, 3),
            assisters: topPlayersByCategory.assisters.slice(0, 3),
        },
        sourceUpdatedAt,
    };
}
