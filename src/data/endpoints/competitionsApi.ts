import { createCompetitionsReadService } from '@app-core/services/competitionsService';
import type {
  CompetitionsApiFixtureDto,
  CompetitionsApiLeagueDto,
  CompetitionsApiPlayerStatDto,
  CompetitionsApiStandingDto,
  CompetitionsApiTransferDto,
} from '@domain/contracts/competitions.types';
import {
  mobileReadHttpAdapter,
  mobileReadTelemetryAdapter,
} from '@data/endpoints/sharedReadServiceAdapters';

const competitionsReadService = createCompetitionsReadService({
  http: mobileReadHttpAdapter,
  telemetry: mobileReadTelemetryAdapter,
});

export async function fetchAllLeagues(signal?: AbortSignal): Promise<CompetitionsApiLeagueDto[]> {
  return competitionsReadService.fetchAllLeagues<CompetitionsApiLeagueDto>(signal);
}

export async function searchLeaguesByName(
  query: string,
  signal?: AbortSignal,
): Promise<CompetitionsApiLeagueDto[]> {
  return competitionsReadService.searchLeaguesByName<CompetitionsApiLeagueDto>(query, signal);
}

export async function fetchLeagueById(
  id: string,
  signal?: AbortSignal,
): Promise<CompetitionsApiLeagueDto | null> {
  return competitionsReadService.fetchLeagueById<CompetitionsApiLeagueDto>(id, signal);
}

export async function fetchLeagueStandings(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiStandingDto | null> {
  return competitionsReadService.fetchLeagueStandings<CompetitionsApiStandingDto>(
    leagueId,
    season,
    signal,
  );
}

export async function fetchLeagueFixtures(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
  options?: {
    limit?: number;
    cursor?: string;
  },
): Promise<CompetitionsApiFixtureDto[]> {
  return competitionsReadService.fetchLeagueFixtures<CompetitionsApiFixtureDto>(
    leagueId,
    season,
    signal,
    options,
  );
}

async function fetchLeaguePlayerStatsByType(
  leagueId: number,
  season: number,
  type: 'topscorers' | 'topassists' | 'topyellowcards' | 'topredcards',
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  return competitionsReadService.fetchLeaguePlayerStats<CompetitionsApiPlayerStatDto>(
    leagueId,
    season,
    type,
    signal,
  );
}

export async function fetchLeagueTopScorers(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  return fetchLeaguePlayerStatsByType(leagueId, season, 'topscorers', signal);
}

export async function fetchLeagueTopAssists(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  return fetchLeaguePlayerStatsByType(leagueId, season, 'topassists', signal);
}

export async function fetchLeagueTopYellowCards(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  return fetchLeaguePlayerStatsByType(leagueId, season, 'topyellowcards', signal);
}

export async function fetchLeagueTopRedCards(
  leagueId: number,
  season: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiPlayerStatDto[]> {
  return fetchLeaguePlayerStatsByType(leagueId, season, 'topredcards', signal);
}

export async function fetchLeagueTransfers(
  leagueId: number,
  season?: number,
  signal?: AbortSignal,
): Promise<CompetitionsApiTransferDto[]> {
  return competitionsReadService.fetchLeagueTransfers<CompetitionsApiTransferDto>(
    leagueId,
    season,
    signal,
  );
}
