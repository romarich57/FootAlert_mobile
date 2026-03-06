import { createFollowsReadService } from '@app-core/services/followsService';
import type {
  FollowsApiFixtureDto,
  FollowedPlayerCard,
  FollowedTeamCard,
  FollowsApiPlayerSearchDto,
  FollowsApiPlayerSeasonDto,
  FollowsApiStandingDto,
  FollowsApiTeamDetailsDto,
  FollowsApiTeamSearchDto,
  FollowsApiTopScorerDto,
} from '@domain/contracts/follows.types';
import {
  mobileReadHttpAdapter,
  mobileReadTelemetryAdapter,
} from '@data/endpoints/sharedReadServiceAdapters';

type NestedApiResponse<T> = {
  response: Array<{
    response?: T[];
  }>;
};

const followsReadService = createFollowsReadService({
  http: mobileReadHttpAdapter,
  telemetry: mobileReadTelemetryAdapter,
});

export async function searchTeamsByName(
  query: string,
  signal?: AbortSignal,
): Promise<FollowsApiTeamSearchDto[]> {
  return followsReadService.searchTeams<FollowsApiTeamSearchDto>(query, signal);
}

export async function searchPlayersByName(
  query: string,
  season: number,
  signal?: AbortSignal,
): Promise<FollowsApiPlayerSearchDto[]> {
  return followsReadService.searchPlayers<FollowsApiPlayerSearchDto>(query, season, signal);
}

export async function fetchNextFixtureForTeam(
  teamId: string,
  timezone: string,
  signal?: AbortSignal,
): Promise<FollowsApiFixtureDto | null> {
  return followsReadService.fetchTeamNextFixture<FollowsApiFixtureDto>(teamId, timezone, signal);
}

export async function fetchTeamById(
  teamId: string,
  signal?: AbortSignal,
): Promise<FollowsApiTeamDetailsDto | null> {
  return followsReadService.fetchTeamDetails<FollowsApiTeamDetailsDto>(teamId, signal);
}

export async function fetchPlayerSeasonStats(
  playerId: string,
  season: number,
  signal?: AbortSignal,
): Promise<FollowsApiPlayerSeasonDto | null> {
  return followsReadService.fetchPlayerSeason<FollowsApiPlayerSeasonDto>(playerId, season, signal);
}

export async function fetchFollowedTeamCards(
  teamIds: string[],
  timezone: string,
  signal?: AbortSignal,
): Promise<FollowedTeamCard[]> {
  return followsReadService.fetchTeamCards<FollowedTeamCard>(teamIds, timezone, signal);
}

export async function fetchFollowedPlayerCards(
  playerIds: string[],
  season: number,
  signal?: AbortSignal,
): Promise<FollowedPlayerCard[]> {
  return followsReadService.fetchPlayerCards<FollowedPlayerCard>(playerIds, season, signal);
}

export async function fetchTrendingTeams(
  topLeagueIds: string[],
  season: number,
  signal?: AbortSignal,
): Promise<FollowsApiStandingDto[]> {
  const payload = await followsReadService.fetchTeamsTrends<NestedApiResponse<FollowsApiStandingDto>['response'][number]>(
    topLeagueIds.join(','),
    season,
    signal,
  );

  return payload
    .map(group => group.response?.[0] ?? null)
    .filter(Boolean) as FollowsApiStandingDto[];
}

export async function fetchTrendingPlayers(
  topLeagueIds: string[],
  season: number,
  signal?: AbortSignal,
): Promise<FollowsApiTopScorerDto[]> {
  const payload = await followsReadService.fetchPlayersTrends<NestedApiResponse<FollowsApiTopScorerDto>['response'][number]>(
    topLeagueIds.join(','),
    season,
    signal,
  );

  return payload.flatMap(group => group.response ?? []);
}
