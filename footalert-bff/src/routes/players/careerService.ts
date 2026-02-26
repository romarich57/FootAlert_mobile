import { apiFootballGet } from '../../lib/apiFootballClient.js';
import { withCache } from '../../lib/cache.js';
import { mapWithConcurrency } from '../../lib/concurrency/mapWithConcurrency.js';

import {
  aggregateCareerTeams,
  dedupeCareerSeasons,
  mapCareerSeasons,
  type PlayerCareerSeasonAggregate,
  type PlayerCareerTeamAggregate,
  type PlayerDetailsResponseDto,
} from './careerMapper.js';

const MIN_CAREER_SEASON_YEAR = 2005;
const CAREER_DETAILS_MAX_CONCURRENCY = 4;

type ApiFootballListResponse<T> = {
  response?: T[];
};

export function buildCareerSeasonsToFetch(availableSeasons: number[]): number[] {
  const uniqueSortedSeasons = Array.from(
    new Set(availableSeasons.filter(value => Number.isInteger(value))),
  ).sort((a, b) => b - a);

  if (uniqueSortedSeasons.length === 0) {
    return [];
  }

  const earliestAvailableSeason = uniqueSortedSeasons.at(-1);
  if (typeof earliestAvailableSeason !== 'number' || earliestAvailableSeason <= MIN_CAREER_SEASON_YEAR) {
    return uniqueSortedSeasons;
  }

  const backfilledSeasons: number[] = [];
  for (
    let season = earliestAvailableSeason - 1;
    season >= MIN_CAREER_SEASON_YEAR;
    season -= 1
  ) {
    backfilledSeasons.push(season);
  }

  return uniqueSortedSeasons.concat(backfilledSeasons);
}

export async function fetchPlayerCareer(
  playerId: string,
): Promise<{
  response: {
    seasons: PlayerCareerSeasonAggregate[];
    teams: PlayerCareerTeamAggregate[];
  };
}> {
  const seasonsPayload = await apiFootballGet<ApiFootballListResponse<number>>(
    `/players/seasons?player=${encodeURIComponent(playerId)}`,
  );
  const seasons = buildCareerSeasonsToFetch(seasonsPayload.response ?? []);

  if (seasons.length === 0) {
    return {
      response: {
        seasons: [] as PlayerCareerSeasonAggregate[],
        teams: [] as PlayerCareerTeamAggregate[],
      },
    };
  }

  const detailsPayloads = await mapWithConcurrency(
    seasons,
    CAREER_DETAILS_MAX_CONCURRENCY,
    async season => {
      try {
        const payload = await withCache(
          `players:details:career:${playerId}:${season}`,
          60_000,
          () =>
            apiFootballGet<ApiFootballListResponse<PlayerDetailsResponseDto>>(
              `/players?id=${encodeURIComponent(playerId)}&season=${encodeURIComponent(String(season))}`,
            ),
        );

        return payload.response?.[0] ?? null;
      } catch {
        return null;
      }
    },
  );

  const allSeasons = detailsPayloads.flatMap(details =>
    details ? mapCareerSeasons(details) : [],
  );
  const uniqueSeasons = dedupeCareerSeasons(allSeasons);

  return {
    response: {
      seasons: uniqueSeasons,
      teams: aggregateCareerTeams(uniqueSeasons),
    },
  };
}
