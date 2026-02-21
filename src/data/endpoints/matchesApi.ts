import { bffGet } from '@data/endpoints/bffClient';
import type {
  ApiFootballFixtureDto,
  ApiFootballResponse,
} from '@ui/features/matches/types/matches.types';

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
  const payload = await bffGet<ApiFootballResponse<ApiFootballFixtureDto>>(
    '/matches',
    {
      date,
      timezone,
    },
    { signal },
  );

  return payload.response;
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
  const payload = await bffGet<ApiFootballResponse<ApiFootballFixtureDto>>(
    `/matches/${encodeURIComponent(fixtureId)}`,
    {
      timezone,
    },
    { signal },
  );

  return payload.response[0] ?? null;
}
