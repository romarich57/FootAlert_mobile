import { createMatchesReadService } from '@app-core/services/matchesService';
import { mobileReadHttpAdapter, mobileReadTelemetryAdapter } from '@data/endpoints/sharedReadServiceAdapters';
import type {
  ApiFootballFixtureDto,
} from '@ui/features/matches/types/matches.types';

const matchesReadService = createMatchesReadService({
  http: mobileReadHttpAdapter,
  telemetry: mobileReadTelemetryAdapter,
});

type FetchFixturesByDateParams = {
  date: string;
  timezone: string;
  signal?: AbortSignal;
};

export async function fetchFixturesByDate({
  date,
  timezone,
  signal,
}: FetchFixturesByDateParams): Promise<ApiFootballFixtureDto[]> {
  return matchesReadService.fetchFixturesByDate<ApiFootballFixtureDto>({
    date,
    timezone,
    signal,
  });
}

type FetchFixtureByIdParams = {
  fixtureId: string;
  timezone: string;
  signal?: AbortSignal;
};

export async function fetchFixtureById({
  fixtureId,
  timezone,
  signal,
}: FetchFixtureByIdParams): Promise<ApiFootballFixtureDto | null> {
  return matchesReadService.fetchFixtureById<ApiFootballFixtureDto>({
    fixtureId,
    timezone,
    signal,
  });
}

type FetchFixtureEventsParams = {
  fixtureId: string;
  signal?: AbortSignal;
};

export async function fetchFixtureEvents({
  fixtureId,
  signal,
}: FetchFixtureEventsParams): Promise<unknown[]> {
  return matchesReadService.fetchFixtureEvents<unknown>({
    fixtureId,
    signal,
  });
}

type FetchFixtureStatisticsParams = {
  fixtureId: string;
  signal?: AbortSignal;
};

export async function fetchFixtureStatistics({
  fixtureId,
  signal,
}: FetchFixtureStatisticsParams): Promise<unknown[]> {
  return matchesReadService.fetchFixtureStatistics<unknown>({
    fixtureId,
    signal,
  });
}

type FetchFixtureLineupsParams = {
  fixtureId: string;
  signal?: AbortSignal;
};

export async function fetchFixtureLineups({
  fixtureId,
  signal,
}: FetchFixtureLineupsParams): Promise<unknown[]> {
  return matchesReadService.fetchFixtureLineups<unknown>({
    fixtureId,
    signal,
  });
}

type FetchFixtureHeadToHeadParams = {
  fixtureId: string;
  timezone?: string;
  last?: number;
  signal?: AbortSignal;
};

export async function fetchFixtureHeadToHead({
  fixtureId,
  timezone,
  last,
  signal,
}: FetchFixtureHeadToHeadParams): Promise<unknown[]> {
  return matchesReadService.fetchFixtureHeadToHead<unknown>({
    fixtureId,
    timezone,
    last,
    signal,
  });
}

type FetchFixturePredictionsParams = {
  fixtureId: string;
  signal?: AbortSignal;
};

export async function fetchFixturePredictions({
  fixtureId,
  signal,
}: FetchFixturePredictionsParams): Promise<unknown[]> {
  return matchesReadService.fetchFixturePredictions<unknown>({
    fixtureId,
    signal,
  });
}

type FetchFixturePlayersStatsByTeamParams = {
  fixtureId: string;
  teamId: string;
  signal?: AbortSignal;
};

export async function fetchFixturePlayersStatsByTeam({
  fixtureId,
  teamId,
  signal,
}: FetchFixturePlayersStatsByTeamParams): Promise<unknown[]> {
  return matchesReadService.fetchFixturePlayersStatsByTeam<unknown>({
    fixtureId,
    teamId,
    signal,
  });
}

type FetchFixtureAbsencesParams = {
  fixtureId: string;
  timezone?: string;
  signal?: AbortSignal;
};

export async function fetchFixtureAbsences({
  fixtureId,
  timezone,
  signal,
}: FetchFixtureAbsencesParams): Promise<unknown[]> {
  return matchesReadService.fetchFixtureAbsences<unknown>({
    fixtureId,
    timezone,
    signal,
  });
}
