import { bffGet } from '@data/endpoints/bffClient';
import type {
  PlayerApiDetailsDto,
  PlayerApiFixtureDto,
  PlayerApiMatchPerformanceDto,
  PlayerApiResponse,
  PlayerApiTrophyDto,
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
