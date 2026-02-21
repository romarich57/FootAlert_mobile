import { httpGet } from '@data/api/http/client';
import { getApiFootballEnvOrThrow } from '@data/config/env';
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

function buildRequestUrl(pathWithQuery: string): string {
  const { apiFootballBaseUrl } = getApiFootballEnvOrThrow();
  return `${apiFootballBaseUrl}${pathWithQuery}`;
}

function buildAuthHeaders(): Record<string, string> {
  const { apiFootballKey } = getApiFootballEnvOrThrow();
  return {
    'x-apisports-key': apiFootballKey,
  };
}

export async function searchTeamsByName(
  query: string,
  signal?: AbortSignal,
): Promise<FollowsApiTeamSearchDto[]> {
  const requestUrl = buildRequestUrl(`/teams?search=${encodeURIComponent(query)}`);
  const payload = await httpGet<FollowsApiResponse<FollowsApiTeamSearchDto>>(requestUrl, {
    signal,
    headers: buildAuthHeaders(),
  });

  return payload.response;
}

export async function searchPlayersByName(
  query: string,
  season: number,
  signal?: AbortSignal,
): Promise<FollowsApiPlayerSearchDto[]> {
  const requestUrl = buildRequestUrl(
    `/players?search=${encodeURIComponent(query)}&season=${season}`,
  );
  const payload = await httpGet<FollowsApiResponse<FollowsApiPlayerSearchDto>>(requestUrl, {
    signal,
    headers: buildAuthHeaders(),
  });

  return payload.response;
}

export async function fetchNextFixtureForTeam(
  teamId: string,
  timezone: string,
  signal?: AbortSignal,
): Promise<FollowsApiFixtureDto | null> {
  const requestUrl = buildRequestUrl(
    `/fixtures?team=${encodeURIComponent(teamId)}&next=1&timezone=${encodeURIComponent(timezone)}`,
  );
  const payload = await httpGet<FollowsApiResponse<FollowsApiFixtureDto>>(requestUrl, {
    signal,
    headers: buildAuthHeaders(),
  });

  return payload.response[0] ?? null;
}

export async function fetchTeamById(
  teamId: string,
  signal?: AbortSignal,
): Promise<FollowsApiTeamDetailsDto | null> {
  const requestUrl = buildRequestUrl(`/teams?id=${encodeURIComponent(teamId)}`);
  const payload = await httpGet<FollowsApiResponse<FollowsApiTeamDetailsDto>>(requestUrl, {
    signal,
    headers: buildAuthHeaders(),
  });

  return payload.response[0] ?? null;
}

export async function fetchPlayerSeasonStats(
  playerId: string,
  season: number,
  signal?: AbortSignal,
): Promise<FollowsApiPlayerSeasonDto | null> {
  const requestUrl = buildRequestUrl(
    `/players?id=${encodeURIComponent(playerId)}&season=${season}`,
  );
  const payload = await httpGet<FollowsApiResponse<FollowsApiPlayerSeasonDto>>(requestUrl, {
    signal,
    headers: buildAuthHeaders(),
  });

  return payload.response[0] ?? null;
}

export async function fetchTrendingTeams(
  topLeagueIds: string[],
  season: number,
  signal?: AbortSignal,
): Promise<FollowsApiStandingDto[]> {
  const requests = topLeagueIds.map(leagueId => {
    const requestUrl = buildRequestUrl(
      `/standings?league=${encodeURIComponent(leagueId)}&season=${season}`,
    );

    return httpGet<FollowsApiResponse<FollowsApiStandingDto>>(requestUrl, {
      signal,
      headers: buildAuthHeaders(),
    })
      .then(payload => payload.response[0])
      .catch(() => null);
  });

  const responses = await Promise.all(requests);
  return responses.filter(Boolean) as FollowsApiStandingDto[];
}

export async function fetchTrendingPlayers(
  topLeagueIds: string[],
  season: number,
  signal?: AbortSignal,
): Promise<FollowsApiTopScorerDto[]> {
  const requests = topLeagueIds.map(leagueId => {
    const requestUrl = buildRequestUrl(
      `/players/topscorers?league=${encodeURIComponent(leagueId)}&season=${season}`,
    );

    return httpGet<FollowsApiResponse<FollowsApiTopScorerDto>>(requestUrl, {
      signal,
      headers: buildAuthHeaders(),
    })
      .then(payload => payload.response)
      .catch(() => []);
  });

  const responseGroups = await Promise.all(requests);
  return responseGroups.flat();
}
