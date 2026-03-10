import { apiFootballGet } from '../../../lib/apiFootballClient.js';
import { buildCanonicalCacheKey, withCache } from '../../../lib/cache.js';
import { PLAYER_DETAILS_TTL_MS } from './contracts.js';
export async function fetchPlayerDetailForSeason(playerId, season, options = {}) {
    try {
        const payload = await withCache(buildCanonicalCacheKey('players:details:season', { playerId, season }), PLAYER_DETAILS_TTL_MS, () => {
            options.onUpstreamRequest?.();
            return apiFootballGet(`/players?id=${encodeURIComponent(playerId)}&season=${encodeURIComponent(String(season))}`);
        });
        return payload.response?.[0] ?? null;
    }
    catch {
        return null;
    }
}
export async function fetchPlayerSeasons(playerId, options = {}) {
    return withCache(buildCanonicalCacheKey('players:seasons', { playerId }), 120_000, () => {
        options.onUpstreamRequest?.();
        return apiFootballGet(`/players/seasons?player=${encodeURIComponent(playerId)}`);
    });
}
export async function fetchPlayerTrophies(playerId, options = {}) {
    return withCache(buildCanonicalCacheKey('players:trophies', { playerId }), 120_000, () => {
        options.onUpstreamRequest?.();
        return apiFootballGet(`/trophies?player=${encodeURIComponent(playerId)}`);
    });
}
export function resolveMappedTrophySeasons(availableSeasons, trophies) {
    if (availableSeasons.length === 0 || trophies.length === 0) {
        return [];
    }
    const uniqueSortedAvailableSeasons = Array.from(new Set(availableSeasons.filter(value => Number.isInteger(value)))).sort((first, second) => second - first);
    const resolvedSeasons = new Set();
    trophies.forEach(trophy => {
        const seasonYear = trophy.seasonYear;
        if (seasonYear === null) {
            return;
        }
        if (uniqueSortedAvailableSeasons.includes(seasonYear)) {
            resolvedSeasons.add(seasonYear);
            return;
        }
        const nearestSeason = [...uniqueSortedAvailableSeasons].sort((first, second) => {
            const firstDistance = Math.abs(first - seasonYear);
            const secondDistance = Math.abs(second - seasonYear);
            if (firstDistance !== secondDistance) {
                return firstDistance - secondDistance;
            }
            return second - first;
        })[0];
        if (typeof nearestSeason === 'number') {
            resolvedSeasons.add(nearestSeason);
        }
    });
    return [...resolvedSeasons].sort((first, second) => second - first);
}
