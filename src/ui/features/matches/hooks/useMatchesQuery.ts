import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchFixturesByDate } from '@data/endpoints/matchesApi';
import { appEnv } from '@data/config/env';
import {
  hasLiveMatches,
  mapFixturesToSections,
} from '@data/mappers/fixturesMapper';
import type { MatchesQueryResult } from '@ui/features/matches/types/matches.types';
import { ApiError } from '@data/api/http/client';
import { queryKeys } from '@ui/shared/query/queryKeys';

type UseMatchesQueryParams = {
  date: string;
  timezone: string;
  enabled?: boolean;
};

type BuildMatchesQueryResultParams = {
  date: string;
  timezone: string;
  signal?: AbortSignal;
};

export const MATCHES_QUERY_STALE_TIME_MS = appEnv.matchesQueryStaleTimeMs;

function isRetriableStatus(status: number): boolean {
  return [500, 502, 503, 504].includes(status);
}

export function shouldRetryMatchesQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount >= 2) {
    return false;
  }

  if (error instanceof ApiError) {
    return isRetriableStatus(error.status);
  }

  return true;
}

export async function buildMatchesQueryResult({
  date,
  timezone,
  signal,
}: BuildMatchesQueryResultParams): Promise<MatchesQueryResult> {
  const requestStartedAt = Date.now();
  const fixtures = await fetchFixturesByDate({ date, timezone, signal });
  const sections = mapFixturesToSections(fixtures);
  const requestDurationMs = Date.now() - requestStartedAt;

  return {
    sections,
    requestDurationMs,
    fetchedAt: new Date().toISOString(),
    hasLiveMatches: hasLiveMatches(sections),
  };
}

export function useMatchesQuery({ date, timezone, enabled = true }: UseMatchesQueryParams) {
  const query = useQuery({
    queryKey: queryKeys.matches(date, timezone),
    enabled,
    staleTime: MATCHES_QUERY_STALE_TIME_MS,
    refetchOnReconnect: true,
    refetchOnMount: true,
    retry: shouldRetryMatchesQuery,
    queryFn: ({ signal }) => buildMatchesQueryResult({ date, timezone, signal }),
  });

  const isSlowNetwork = useMemo(() => {
    return (query.data?.requestDurationMs ?? 0) > 3_500;
  }, [query.data?.requestDurationMs]);

  useEffect(() => {
    if (!(typeof __DEV__ === 'boolean' && __DEV__)) {
      return;
    }

    if (!query.error) {
      return;
    }

    const requestUrl = `${appEnv.mobileApiBaseUrl}/matches?date=${encodeURIComponent(
      date,
    )}&timezone=${encodeURIComponent(timezone)}`;

    if (query.error instanceof ApiError) {
      console.warn(
        `[FootAlert][matches] ${query.error.message} on ${requestUrl} | status=${query.error.status} payload=${query.error.payload}`,
      );
      return;
    }

    console.warn(`[FootAlert][matches] request failed on ${requestUrl}`, query.error);
  }, [date, query.error, timezone]);

  return {
    ...query,
    isSlowNetwork,
  };
}
