import { bffGet } from '@data/endpoints/bffClient';
import type {
  ApiFootballListResponse,
  ApiFootballPagedResponse,
  TeamAdvancedStatsDto,
  TeamApiFixtureDto,
  TeamApiLeagueDto,
  TeamApiPlayerDto,
  TeamApiSquadDto,
  TeamApiStandingsDto,
  TeamApiStatisticsDto,
  TeamApiTeamDetailsDto,
  TeamApiTrophyDto,
  TeamApiTransferDto,
} from '@ui/features/teams/types/teams.types';

export async function fetchTeamDetails(
  teamId: string,
  signal?: AbortSignal,
): Promise<TeamApiTeamDetailsDto | null> {
  const payload = await bffGet<ApiFootballListResponse<TeamApiTeamDetailsDto>>(
    `/teams/${encodeURIComponent(teamId)}`,
    undefined,
    { signal },
  );

  return payload.response[0] ?? null;
}

export async function fetchTeamLeagues(
  teamId: string,
  signal?: AbortSignal,
): Promise<TeamApiLeagueDto[]> {
  const payload = await bffGet<ApiFootballListResponse<TeamApiLeagueDto>>(
    `/teams/${encodeURIComponent(teamId)}/leagues`,
    undefined,
    { signal },
  );

  return payload.response ?? [];
}

type FetchTeamFixturesParams = {
  teamId: string;
  season?: number;
  leagueId?: string | null;
  timezone?: string;
  next?: number;
};

export async function fetchTeamFixtures(
  params: FetchTeamFixturesParams,
  signal?: AbortSignal,
): Promise<TeamApiFixtureDto[]> {
  const payload = await bffGet<ApiFootballListResponse<TeamApiFixtureDto>>(
    `/teams/${encodeURIComponent(params.teamId)}/fixtures`,
    {
      season: params.season,
      leagueId: params.leagueId,
      timezone: params.timezone,
      next: params.next,
    },
    { signal },
  );

  return payload.response ?? [];
}

export async function fetchTeamNextFixture(
  teamId: string,
  timezone: string,
  signal?: AbortSignal,
): Promise<TeamApiFixtureDto | null> {
  const payload = await bffGet<ApiFootballListResponse<TeamApiFixtureDto>>(
    `/teams/${encodeURIComponent(teamId)}/next-fixture`,
    {
      timezone,
    },
    { signal },
  );

  return payload.response[0] ?? null;
}

export async function fetchLeagueStandings(
  leagueId: string,
  season: number,
  signal?: AbortSignal,
): Promise<TeamApiStandingsDto | null> {
  const payload = await bffGet<ApiFootballListResponse<TeamApiStandingsDto>>(
    '/teams/standings',
    {
      leagueId,
      season,
    },
    { signal },
  );

  return payload.response[0] ?? null;
}

export async function fetchTeamStatistics(
  leagueId: string,
  season: number,
  teamId: string,
  signal?: AbortSignal,
): Promise<TeamApiStatisticsDto | null> {
  const payload = await bffGet<{ response?: TeamApiStatisticsDto }>(
    `/teams/${encodeURIComponent(teamId)}/stats`,
    {
      leagueId,
      season,
    },
    { signal },
  );

  return payload.response ?? null;
}

export async function fetchTeamAdvancedStats(
  leagueId: string,
  season: number,
  teamId: string,
  signal?: AbortSignal,
): Promise<TeamAdvancedStatsDto | null> {
  const payload = await bffGet<{ response?: TeamAdvancedStatsDto }>(
    `/teams/${encodeURIComponent(teamId)}/advanced-stats`,
    {
      leagueId,
      season,
    },
    { signal },
  );

  return payload.response ?? null;
}

type FetchTeamPlayersParams = {
  teamId: string;
  leagueId: string;
  season: number;
  page?: number;
};

export async function fetchTeamPlayers(
  params: FetchTeamPlayersParams,
  signal?: AbortSignal,
): Promise<ApiFootballPagedResponse<TeamApiPlayerDto>> {
  const payload = await bffGet<ApiFootballPagedResponse<TeamApiPlayerDto>>(
    `/teams/${encodeURIComponent(params.teamId)}/players`,
    {
      leagueId: params.leagueId,
      season: params.season,
      page: params.page,
    },
    { signal },
  );

  return {
    response: payload.response ?? [],
    paging: payload.paging,
  };
}

export async function fetchTeamSquad(
  teamId: string,
  signal?: AbortSignal,
): Promise<TeamApiSquadDto | null> {
  const payload = await bffGet<ApiFootballListResponse<TeamApiSquadDto>>(
    `/teams/${encodeURIComponent(teamId)}/squad`,
    undefined,
    { signal },
  );

  return payload.response[0] ?? null;
}

export async function fetchTeamTransfers(
  teamId: string,
  signal?: AbortSignal,
): Promise<TeamApiTransferDto[]> {
  const payload = await bffGet<ApiFootballListResponse<TeamApiTransferDto>>(
    `/teams/${encodeURIComponent(teamId)}/transfers`,
    undefined,
    { signal },
  );

  return payload.response ?? [];
}

export async function fetchTeamTrophies(
  teamId: string,
  signal?: AbortSignal,
): Promise<TeamApiTrophyDto[]> {
  const payload = await bffGet<ApiFootballListResponse<TeamApiTrophyDto>>(
    `/teams/${encodeURIComponent(teamId)}/trophies`,
    undefined,
    { signal },
  );

  return payload.response ?? [];
}
