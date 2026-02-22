import { bffGet } from '@data/endpoints/bffClient';
import {
  mapPlayerCareerSeasonAggregate,
  mapPlayerCareerTeamAggregate,
  mapPlayerMatchPerformanceAggregate,
} from '@data/mappers/playersMapper';
import type {
  PlayerApiCareerAggregateResponse,
  PlayerApiDetailsDto,
  PlayerApiFixtureDto,
  PlayerApiMatchesAggregateResponse,
  PlayerApiMatchPerformanceDto,
  PlayerApiResponse,
  PlayerApiTrophyDto,
  PlayerCareerSeason,
  PlayerCareerTeam,
  PlayerMatchPerformance,
} from '@ui/features/players/types/players.types';

export async function fetchPlayerDetails(
  playerId: string,
  season: number,
  signal?: AbortSignal,
): Promise<PlayerApiDetailsDto | null> {
  const payload = await bffGet<PlayerApiResponse<PlayerApiDetailsDto>>(
    `/players/${encodeURIComponent(playerId)}`,
    { season },
    { signal },
  );

  return payload.response[0] ?? null;
}

export async function fetchPlayerSeasons(
  playerId: string,
  signal?: AbortSignal,
): Promise<number[]> {
  const payload = await bffGet<PlayerApiResponse<number>>(
    `/players/${encodeURIComponent(playerId)}/seasons`,
    undefined,
    { signal },
  );

  return payload.response ?? [];
}

export async function fetchPlayerTrophies(
  playerId: string,
  signal?: AbortSignal,
): Promise<PlayerApiTrophyDto[]> {
  const payload = await bffGet<PlayerApiResponse<PlayerApiTrophyDto>>(
    `/players/${encodeURIComponent(playerId)}/trophies`,
    undefined,
    { signal },
  );

  return payload.response ?? [];
}

export async function fetchPlayerCareerAggregate(
  playerId: string,
  signal?: AbortSignal,
): Promise<{ seasons: PlayerCareerSeason[]; teams: PlayerCareerTeam[] }> {
  const payload = await bffGet<PlayerApiCareerAggregateResponse>(
    `/players/${encodeURIComponent(playerId)}/career`,
    undefined,
    { signal },
  );

  const seasons = (payload.response?.seasons ?? [])
    .map(mapPlayerCareerSeasonAggregate)
    .sort((a, b) => {
      const aYear = a.season ? Number.parseInt(a.season, 10) : Number.NEGATIVE_INFINITY;
      const bYear = b.season ? Number.parseInt(b.season, 10) : Number.NEGATIVE_INFINITY;
      return bYear - aYear;
    });

  const teams = (payload.response?.teams ?? []).map(mapPlayerCareerTeamAggregate);

  return { seasons, teams };
}

export async function fetchTeamFixtures(
  teamId: string,
  season: number,
  amount: number = 10,
  signal?: AbortSignal,
): Promise<PlayerApiFixtureDto[]> {
  const payload = await bffGet<PlayerApiResponse<PlayerApiFixtureDto>>(
    `/players/team/${encodeURIComponent(teamId)}/fixtures`,
    {
      season,
      last: amount,
    },
    { signal },
  );

  return payload.response ?? [];
}

export async function fetchFixturePlayerStats(
  fixtureId: string,
  teamId: string,
  signal?: AbortSignal,
): Promise<PlayerApiMatchPerformanceDto | null> {
  const payload = await bffGet<PlayerApiResponse<PlayerApiMatchPerformanceDto>>(
    `/players/fixtures/${encodeURIComponent(fixtureId)}/team/${encodeURIComponent(teamId)}/stats`,
    undefined,
    { signal },
  );

  return payload.response[0] ?? null;
}

export async function fetchPlayerMatchesAggregate(
  playerId: string,
  teamId: string,
  season: number,
  amount: number = 15,
  signal?: AbortSignal,
): Promise<PlayerMatchPerformance[]> {
  const payload = await bffGet<PlayerApiMatchesAggregateResponse>(
    `/players/${encodeURIComponent(playerId)}/matches`,
    {
      teamId,
      season,
      last: amount,
    },
    { signal },
  );

  return (payload.response ?? [])
    .map(mapPlayerMatchPerformanceAggregate)
    .filter((item): item is PlayerMatchPerformance => item !== null);
}
