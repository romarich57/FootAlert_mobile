import { createTeamsReadService } from '@app-core/services/teamsService';

import { mobileReadHttpAdapter, mobileReadTelemetryAdapter } from '@data/endpoints/sharedReadServiceAdapters';
import type {
  ApiFootballPagedResponse,
  TeamAdvancedStatsDto,
  TeamApiFixtureDto,
  TeamApiLeagueDto,
  TeamApiPlayerDto,
  TeamApiSquadDto,
  TeamApiStandingsDto,
  TeamApiStatisticsDto,
  TeamApiTeamDetailsDto,
  TeamOverviewCoreData,
  TeamOverviewLeadersData,
  TeamOverviewData,
  TeamApiTransferDto,
} from '@domain/contracts/teams.types';

const teamsReadService = createTeamsReadService({
  http: mobileReadHttpAdapter,
  telemetry: mobileReadTelemetryAdapter,
});

export async function fetchTeamDetails(
  teamId: string,
  signal?: AbortSignal,
): Promise<TeamApiTeamDetailsDto | null> {
  return teamsReadService.fetchTeamDetails<TeamApiTeamDetailsDto>(teamId, signal);
}

export async function fetchTeamLeagues(
  teamId: string,
  signal?: AbortSignal,
): Promise<TeamApiLeagueDto[]> {
  return teamsReadService.fetchTeamLeagues<TeamApiLeagueDto>(teamId, signal);
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
  return teamsReadService.fetchTeamFixtures<TeamApiFixtureDto>(params, signal);
}

export async function fetchTeamNextFixture(
  teamId: string,
  timezone: string,
  signal?: AbortSignal,
): Promise<TeamApiFixtureDto | null> {
  return teamsReadService.fetchTeamNextFixture<TeamApiFixtureDto>(teamId, timezone, signal);
}

export async function fetchLeagueStandings(
  leagueId: string,
  season: number,
  signal?: AbortSignal,
): Promise<TeamApiStandingsDto | null> {
  return teamsReadService.fetchLeagueStandings<TeamApiStandingsDto>(leagueId, season, signal);
}

export async function fetchTeamStatistics(
  leagueId: string,
  season: number,
  teamId: string,
  signal?: AbortSignal,
): Promise<TeamApiStatisticsDto | null> {
  return teamsReadService.fetchTeamStatistics<TeamApiStatisticsDto>(
    leagueId,
    season,
    teamId,
    signal,
  );
}

type FetchTeamOverviewParams = {
  teamId: string;
  leagueId: string;
  season: number;
  timezone: string;
  historySeasons?: number[];
};

export async function fetchTeamOverview(
  params: FetchTeamOverviewParams,
  signal?: AbortSignal,
): Promise<TeamOverviewCoreData> {
  return teamsReadService.fetchTeamOverview<TeamOverviewCoreData>(params, signal);
}

type FetchTeamOverviewLeadersParams = {
  teamId: string;
  leagueId: string;
  season: number;
};

export async function fetchTeamOverviewLeaders(
  params: FetchTeamOverviewLeadersParams,
  signal?: AbortSignal,
): Promise<TeamOverviewLeadersData> {
  return teamsReadService.fetchTeamOverviewLeaders<TeamOverviewLeadersData>(params, signal);
}

export async function fetchTeamAdvancedStats(
  leagueId: string,
  season: number,
  teamId: string,
  signal?: AbortSignal,
): Promise<TeamAdvancedStatsDto | null> {
  return teamsReadService.fetchTeamAdvancedStats<TeamAdvancedStatsDto>(
    leagueId,
    season,
    teamId,
    signal,
  );
}

type FetchTeamPlayersParams = {
  teamId: string;
  leagueId: string;
  season: number;
  page?: number;
  limit?: number;
  cursor?: string;
};

export async function fetchTeamPlayers(
  params: FetchTeamPlayersParams,
  signal?: AbortSignal,
): Promise<ApiFootballPagedResponse<TeamApiPlayerDto>> {
  const payload = await teamsReadService.fetchTeamPlayers<TeamApiPlayerDto>(params, signal);
  return {
    response: payload.response,
    paging: payload.paging,
    pageInfo: payload.pageInfo,
  };
}

export async function fetchTeamSquad(
  teamId: string,
  signal?: AbortSignal,
): Promise<TeamApiSquadDto | null> {
  return teamsReadService.fetchTeamSquad<TeamApiSquadDto>(teamId, signal);
}

export async function fetchTeamTransfers(
  teamId: string,
  season: number | null,
  signal?: AbortSignal,
): Promise<TeamApiTransferDto[]> {
  return teamsReadService.fetchTeamTransfers<TeamApiTransferDto>(
    {
      teamId,
      season: typeof season === 'number' ? season : undefined,
    },
    signal,
  );
}
