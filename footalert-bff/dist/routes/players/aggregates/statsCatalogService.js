import { fetchPlayerDetailForSeason, fetchPlayerSeasons } from './playerApi.js';
import { mapPlayerDetailsToSeasonStatsDataset } from './seasonStats.js';
import { PLAYER_DETAILS_MAX_CONCURRENCY } from './contracts.js';
import { mapWithConcurrency } from '../../../lib/concurrency/mapWithConcurrency.js';
function resolveDefaultStatsSelection(competitions) {
    const availableSeasons = Array.from(new Set(competitions.flatMap(competition => competition.seasons))).sort((first, second) => second - first);
    const mostRecentSeason = availableSeasons[0] ?? null;
    if (mostRecentSeason === null) {
        return {
            leagueId: null,
            season: null,
        };
    }
    const competitionForSeason = competitions
        .filter(item => item.seasons.includes(mostRecentSeason))
        .sort((first, second) => (first.leagueName ?? '').localeCompare(second.leagueName ?? ''))[0];
    return {
        leagueId: competitionForSeason?.leagueId ?? null,
        season: mostRecentSeason,
    };
}
function buildStatsCatalog(competitions, availableSeasons) {
    const normalized = competitions
        .map(competition => ({
        ...competition,
        seasons: [...competition.seasons].sort((first, second) => second - first),
        currentSeason: competition.currentSeason ??
            [...competition.seasons].sort((first, second) => second - first)[0] ??
            null,
    }))
        .filter(item => item.seasons.length > 0)
        .sort((first, second) => (first.leagueName ?? '').localeCompare(second.leagueName ?? ''));
    return {
        competitions: normalized,
        defaultSelection: resolveDefaultStatsSelection(normalized),
        availableSeasons: [...availableSeasons].sort((first, second) => second - first),
    };
}
export async function fetchPlayerStatsCatalogService(playerId, options = {}) {
    const seasonsPayload = await fetchPlayerSeasons(playerId, options);
    const uniqueSeasons = Array.from(new Set((seasonsPayload.response ?? []).filter(value => Number.isFinite(value)))).sort((first, second) => second - first);
    if (uniqueSeasons.length === 0) {
        return {
            response: {
                competitions: [],
                defaultSelection: {
                    leagueId: null,
                    season: null,
                },
                availableSeasons: [],
            },
        };
    }
    const seasonDetails = await mapWithConcurrency(uniqueSeasons, PLAYER_DETAILS_MAX_CONCURRENCY, season => fetchPlayerDetailForSeason(playerId, season, options));
    const competitionsMap = new Map();
    seasonDetails.forEach((details, index) => {
        const season = uniqueSeasons[index];
        if (!details) {
            return;
        }
        const dataset = mapPlayerDetailsToSeasonStatsDataset(details, season);
        dataset.byCompetition.forEach(item => {
            if (!item.leagueId || item.season === null) {
                return;
            }
            const existing = competitionsMap.get(item.leagueId);
            if (existing) {
                if (!existing.seasons.includes(item.season)) {
                    existing.seasons.push(item.season);
                }
                if (existing.currentSeason === null || item.season > existing.currentSeason) {
                    existing.currentSeason = item.season;
                }
                if (!existing.leagueName && item.leagueName) {
                    existing.leagueName = item.leagueName;
                }
                if (!existing.leagueLogo && item.leagueLogo) {
                    existing.leagueLogo = item.leagueLogo;
                }
                return;
            }
            competitionsMap.set(item.leagueId, {
                leagueId: item.leagueId,
                leagueName: item.leagueName,
                leagueLogo: item.leagueLogo,
                type: null,
                country: null,
                seasons: [item.season],
                currentSeason: item.season,
            });
        });
    });
    return {
        response: buildStatsCatalog(Array.from(competitionsMap.values()), uniqueSeasons),
    };
}
