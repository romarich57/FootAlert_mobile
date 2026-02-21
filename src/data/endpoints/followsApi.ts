import { bffGet } from '@data/endpoints/bffClient';
import type {
  FollowsApiFixtureDto,
  FollowsApiPlayerSearchDto,
  FollowsApiPlayerSeasonDto,
  FollowsApiResponse,
  FollowsApiStandingDto,
  FollowsApiTeamDetailsDto,
  FollowsApiTeamSearchDto,
  FollowsApiTopScorerDto,
} from '@ui/features/follows/types/follows.types';

type NestedApiResponse<T> = {
  response: Array<{
    response?: T[];
  }>;
};

export async function searchTeamsByName(
  query: string,
  signal?: AbortSignal,
): Promise<FollowsApiTeamSearchDto[]> {
  const payload = await bffGet<FollowsApiResponse<FollowsApiTeamSearchDto>>(
    '/follows/search/teams',
    { q: query },
    { signal },
  );

  return payload.response;
}

export async function searchPlayersByName(
  query: string,
  season: number,
  signal?: AbortSignal,
): Promise<FollowsApiPlayerSearchDto[]> {
  const payload = await bffGet<FollowsApiResponse<FollowsApiPlayerSearchDto>>(
    '/follows/search/players',
    { q: query, season },
    { signal },
  );

  return payload.response;
}

export async function fetchNextFixtureForTeam(
  teamId: string,
  timezone: string,
  signal?: AbortSignal,
): Promise<FollowsApiFixtureDto | null> {
  const payload = await bffGet<FollowsApiResponse<FollowsApiFixtureDto>>(
    `/follows/teams/${encodeURIComponent(teamId)}/next-fixture`,
    { timezone },
    { signal },
  );

  return payload.response[0] ?? null;
}

export async function fetchTeamById(
  teamId: string,
  signal?: AbortSignal,
): Promise<FollowsApiTeamDetailsDto | null> {
  const payload = await bffGet<FollowsApiResponse<FollowsApiTeamDetailsDto>>(
    `/follows/teams/${encodeURIComponent(teamId)}`,
    undefined,
    { signal },
  );

  return payload.response[0] ?? null;
}

export async function fetchPlayerSeasonStats(
  playerId: string,
  season: number,
  signal?: AbortSignal,
): Promise<FollowsApiPlayerSeasonDto | null> {
  const payload = await bffGet<FollowsApiResponse<FollowsApiPlayerSeasonDto>>(
    `/follows/players/${encodeURIComponent(playerId)}/season/${encodeURIComponent(String(season))}`,
    undefined,
    { signal },
  );

  return payload.response[0] ?? null;
}

export async function fetchTrendingTeams(
  topLeagueIds: string[],
  season: number,
  signal?: AbortSignal,
): Promise<FollowsApiStandingDto[]> {
  const payload = await bffGet<NestedApiResponse<FollowsApiStandingDto>>(
    '/follows/trends/teams',
    {
      leagueIds: topLeagueIds.join(','),
      season,
    },
    { signal },
  );

  return payload.response
    .map(group => group.response?.[0] ?? null)
    .filter(Boolean) as FollowsApiStandingDto[];
}

export async function fetchTrendingPlayers(
  topLeagueIds: string[],
  season: number,
  signal?: AbortSignal,
): Promise<FollowsApiTopScorerDto[]> {
  const payload = await bffGet<NestedApiResponse<FollowsApiTopScorerDto>>(
    '/follows/trends/players',
    {
      leagueIds: topLeagueIds.join(','),
      season,
    },
    { signal },
  );

  return payload.response.flatMap(group => group.response ?? []);
}
