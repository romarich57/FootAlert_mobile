import { getApiFootballEnvOrThrow } from '@data/config/env';
import { httpGet } from '@data/api/http/client';
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
  const { apiFootballBaseUrl, apiFootballKey } = getApiFootballEnvOrThrow();
  const requestUrl = `${apiFootballBaseUrl}/fixtures?date=${encodeURIComponent(date)}&timezone=${encodeURIComponent(timezone)}`;
  const payload = await httpGet<ApiFootballResponse<ApiFootballFixtureDto>>(requestUrl, {
    signal,
    headers: {
      'x-apisports-key': apiFootballKey,
    },
  });

  return payload.response;
}
