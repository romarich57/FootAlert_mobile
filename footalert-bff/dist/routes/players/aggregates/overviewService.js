import { mapWithConcurrency } from '../../../lib/concurrency/mapWithConcurrency.js';
import { mapCareerSeasons } from '../careerMapper.js';
import { PLAYER_DETAILS_MAX_CONCURRENCY } from './contracts.js';
import { fetchPlayerDetailForSeason, fetchPlayerSeasons, fetchPlayerTrophies, resolveMappedTrophySeasons } from './playerApi.js';
import { mapPlayerDetailsToProfile, mapPlayerDetailsToCharacteristics, selectProfileCompetitionStats } from './profileMapper.js';
import { mapPlayerDetailsToSeasonStatsDataset } from './seasonStats.js';
import { mapPlayerDetailsToPositions } from './positionsMapper.js';
import { groupPlayerTrophiesByClub, mapPlayerTrophies } from './trophiesByClub.js';
export async function fetchPlayerOverviewService(playerId, season, options = {}) {
    const [details, trophiesPayload, seasonsPayload] = await Promise.all([
        fetchPlayerDetailForSeason(playerId, season, options),
        fetchPlayerTrophies(playerId, options),
        fetchPlayerSeasons(playerId, options),
    ]);
    if (!details) {
        return {
            response: {
                profile: null,
                characteristics: null,
                positions: null,
                seasonStats: null,
                seasonStatsDataset: null,
                profileCompetitionStats: null,
                trophiesByClub: [],
            },
        };
    }
    const seasonStatsDataset = mapPlayerDetailsToSeasonStatsDataset(details, season);
    const mappedTrophies = mapPlayerTrophies(trophiesPayload.response ?? []);
    const seasonsToFetch = resolveMappedTrophySeasons(seasonsPayload.response ?? [], mappedTrophies);
    const trophySeasonDetails = await mapWithConcurrency(seasonsToFetch, PLAYER_DETAILS_MAX_CONCURRENCY, seasonYear => fetchPlayerDetailForSeason(playerId, seasonYear, options));
    const careerSeasons = trophySeasonDetails.flatMap(detail => detail ? mapCareerSeasons(detail) : []);
    return {
        response: {
            profile: mapPlayerDetailsToProfile(details, season),
            characteristics: mapPlayerDetailsToCharacteristics(details, season),
            positions: mapPlayerDetailsToPositions(details, season),
            seasonStats: seasonStatsDataset.overall,
            seasonStatsDataset,
            profileCompetitionStats: selectProfileCompetitionStats(seasonStatsDataset),
            trophiesByClub: groupPlayerTrophiesByClub(mappedTrophies, careerSeasons),
        },
    };
}
