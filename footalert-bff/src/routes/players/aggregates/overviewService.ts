import { mapWithConcurrency } from '../../../lib/concurrency/mapWithConcurrency.js';
import { mapCareerSeasons } from '../careerMapper.js';
import type {
  PlayerAggregateFetchOptions,
  PlayerDetailsDto,
  PlayerOverviewPayload,
  PlayerTrophyDto,
} from './contracts.js';
import { PLAYER_DETAILS_MAX_CONCURRENCY } from './contracts.js';
import { fetchPlayerDetailForSeason, fetchPlayerSeasons, fetchPlayerTrophies, resolveMappedTrophySeasons } from './playerApi.js';
import { mapPlayerDetailsToProfile, mapPlayerDetailsToCharacteristics, selectProfileCompetitionStats } from './profileMapper.js';
import { mapPlayerDetailsToSeasonStatsDataset } from './seasonStats.js';
import { mapPlayerDetailsToPositions } from './positionsMapper.js';
import { groupPlayerTrophiesByClub, mapPlayerTrophies } from './trophiesByClub.js';

export function buildEmptyPlayerOverviewPayload(): PlayerOverviewPayload {
  return {
    profile: null,
    characteristics: null,
    positions: null,
    seasonStats: null,
    seasonStatsDataset: null,
    profileCompetitionStats: null,
    trophiesByClub: [],
  };
}

export async function buildPlayerOverviewPayload(input: {
  playerId: string;
  season: number;
  details: PlayerDetailsDto;
  seasons: number[];
  trophies: PlayerTrophyDto[];
  options?: PlayerAggregateFetchOptions;
}): Promise<PlayerOverviewPayload> {
  const seasonStatsDataset = mapPlayerDetailsToSeasonStatsDataset(input.details, input.season);
  const mappedTrophies = mapPlayerTrophies(input.trophies);
  const seasonsToFetch = resolveMappedTrophySeasons(input.seasons, mappedTrophies);

  const trophySeasonDetails = await mapWithConcurrency(
    seasonsToFetch,
    PLAYER_DETAILS_MAX_CONCURRENCY,
    seasonYear => fetchPlayerDetailForSeason(input.playerId, seasonYear, input.options),
  );
  const careerSeasons = trophySeasonDetails.flatMap(detail =>
    detail ? mapCareerSeasons(detail) : [],
  );

  return {
    profile: mapPlayerDetailsToProfile(input.details, input.season),
    characteristics: mapPlayerDetailsToCharacteristics(input.details, input.season),
    positions: mapPlayerDetailsToPositions(input.details, input.season),
    seasonStats: seasonStatsDataset.overall,
    seasonStatsDataset,
    profileCompetitionStats: selectProfileCompetitionStats(seasonStatsDataset),
    trophiesByClub: groupPlayerTrophiesByClub(mappedTrophies, careerSeasons),
  };
}

export async function fetchPlayerOverviewService(
  playerId: string,
  season: number,
  options: PlayerAggregateFetchOptions = {},
): Promise<{ response: PlayerOverviewPayload }> {
  const [details, trophiesPayload, seasonsPayload] = await Promise.allSettled([
    fetchPlayerDetailForSeason(playerId, season, options),
    fetchPlayerTrophies(playerId, options),
    fetchPlayerSeasons(playerId, options),
  ]);

  const resolvedDetails = details.status === 'fulfilled' ? details.value : null;
  if (!resolvedDetails) {
    return {
      response: buildEmptyPlayerOverviewPayload(),
    };
  }

  const resolvedTrophies =
    trophiesPayload.status === 'fulfilled' && Array.isArray(trophiesPayload.value.response)
      ? trophiesPayload.value.response
      : [];
  const resolvedSeasons =
    seasonsPayload.status === 'fulfilled' && Array.isArray(seasonsPayload.value.response)
      ? seasonsPayload.value.response
      : [];

  return {
    response: await buildPlayerOverviewPayload({
      playerId,
      season,
      details: resolvedDetails,
      seasons: resolvedSeasons,
      trophies: resolvedTrophies,
      options,
    }),
  };
}
