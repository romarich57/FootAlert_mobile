import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
import { mapWithConcurrency } from '../../lib/concurrency/mapWithConcurrency.js';
import { aggregateCareerTeams, dedupeCareerSeasons, mapCareerSeasons, } from './careerMapper.js';
const MIN_CAREER_SEASON_YEAR = 2005;
const CAREER_DETAILS_MAX_CONCURRENCY = 4;
export function buildCareerSeasonsToFetch(availableSeasons) {
    const uniqueSortedSeasons = Array.from(new Set(availableSeasons.filter(value => Number.isInteger(value)))).sort((a, b) => b - a);
    if (uniqueSortedSeasons.length === 0) {
        return [];
    }
    const earliestAvailableSeason = uniqueSortedSeasons.at(-1);
    if (typeof earliestAvailableSeason !== 'number' || earliestAvailableSeason <= MIN_CAREER_SEASON_YEAR) {
        return uniqueSortedSeasons;
    }
    const backfilledSeasons = [];
    for (let season = earliestAvailableSeason - 1; season >= MIN_CAREER_SEASON_YEAR; season -= 1) {
        backfilledSeasons.push(season);
    }
    return uniqueSortedSeasons.concat(backfilledSeasons);
}
export async function fetchPlayerCareer(playerId) {
    const seasonsPayload = await apiFootballGet(`/players/seasons?player=${encodeURIComponent(playerId)}`);
    const seasons = buildCareerSeasonsToFetch(seasonsPayload.response ?? []);
    if (seasons.length === 0) {
        return {
            response: {
                seasons: [],
                teams: [],
            },
        };
    }
    const detailsPayloads = await mapWithConcurrency(seasons, CAREER_DETAILS_MAX_CONCURRENCY, async (season) => {
        try {
            const payload = await withCache(`players:details:career:${playerId}:${season}`, 60_000, () => apiFootballGet(`/players?id=${encodeURIComponent(playerId)}&season=${encodeURIComponent(String(season))}`));
            return payload.response?.[0] ?? null;
        }
        catch {
            return null;
        }
    });
    const allSeasons = detailsPayloads.flatMap(details => details ? mapCareerSeasons(details) : []);
    const uniqueSeasons = dedupeCareerSeasons(allSeasons);
    return {
        response: {
            seasons: uniqueSeasons,
            teams: aggregateCareerTeams(uniqueSeasons),
        },
    };
}
