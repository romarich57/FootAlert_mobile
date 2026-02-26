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
