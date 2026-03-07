import { createFollowsReadService } from '@app-core/services/followsService';
import { bffGet, bffPost } from '@data/endpoints/bffClient';
import type {
  FollowDiscoveryPlayerItem,
  FollowDiscoveryResponse,
  FollowDiscoveryTeamItem,
  FollowEventPayload,
  FollowEventResponse,
  FollowsApiFixtureDto,
  FollowedPlayerCard,
  FollowedTeamCard,
  FollowsApiPlayerSearchDto,
  FollowsApiPlayerSeasonDto,
  FollowsApiTeamDetailsDto,
  FollowsApiTeamSearchDto,
} from '@domain/contracts/follows.types';
import {
  mobileReadHttpAdapter,
  mobileReadTelemetryAdapter,
} from '@data/endpoints/sharedReadServiceAdapters';

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

export async function fetchDiscoveryTeams(
  limit: number,
  signal?: AbortSignal,
): Promise<FollowDiscoveryResponse<FollowDiscoveryTeamItem>> {
  return bffGet<FollowDiscoveryResponse<FollowDiscoveryTeamItem>>(
    '/follows/discovery/teams',
    { limit },
    { signal },
  );
}

export async function fetchDiscoveryPlayers(
  limit: number,
  signal?: AbortSignal,
): Promise<FollowDiscoveryResponse<FollowDiscoveryPlayerItem>> {
  return bffGet<FollowDiscoveryResponse<FollowDiscoveryPlayerItem>>(
    '/follows/discovery/players',
    { limit },
    { signal },
  );
}

export async function postFollowEvent(payload: FollowEventPayload): Promise<FollowEventResponse> {
  return bffPost<FollowEventResponse, FollowEventPayload>(
    '/follows/events',
    payload,
    { scope: 'telemetry:write' },
  );
}
