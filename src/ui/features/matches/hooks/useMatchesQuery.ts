import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { fetchFixturesByDate } from '@data/endpoints/matchesApi';
import { appEnv } from '@data/config/env';
import {
  hasLiveMatches,
  mapFixturesToSections,
} from '@data/mappers/fixturesMapper';
import type { MatchesQueryResult } from '@ui/features/matches/types/matches.types';
import { ApiError } from '@data/api/http/client';

type UseMatchesQueryParams = {
  date: string;
  timezone: string;
  enabled?: boolean;
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

  if (
    error instanceof Error &&
    error.message.includes('Missing API_FOOTBALL_KEY')
  ) {
    return false;
  }

  return true;
}

export function useMatchesQuery({ date, timezone, enabled = true }: UseMatchesQueryParams) {
  const query = useQuery({
    queryKey: ['matches', date, timezone],
    enabled,
    staleTime: MATCHES_QUERY_STALE_TIME_MS,
    refetchOnReconnect: true,
    refetchOnMount: true,
    retry: shouldRetryMatchesQuery,
    queryFn: async ({ signal }): Promise<MatchesQueryResult> => {
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
    },
  });

  const isSlowNetwork = useMemo(() => {
    return (query.data?.requestDurationMs ?? 0) > 3_500;
  }, [query.data?.requestDurationMs]);

  return {
    ...query,
    isSlowNetwork,
  };
}
