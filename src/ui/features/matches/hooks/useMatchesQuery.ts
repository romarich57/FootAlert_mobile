import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  getMatchesByDate,
} from '@data/db/matchesByDateStore';
import { appEnv } from '@data/config/env';
import {
  hasLiveMatches,
} from '@data/mappers/fixturesMapper';
import {
  buildMatchesQueryResult,
  MATCHES_QUERY_STALE_TIME_MS,
  shouldRetryMatchesQuery,
} from '@data/matches/matchesQueryData';
import type {
  CompetitionSection,
  MatchItem,
  MatchesQueryResult,
} from '@ui/features/matches/types/matches.types';
import { ApiError, isNetworkRequestFailedError } from '@data/api/http/client';
import { MobileAttestationProviderUnavailableError } from '@data/security/mobileAttestationProvider';
import { queryKeys } from '@ui/shared/query/queryKeys';

type UseMatchesQueryParams = {
  date: string;
  timezone: string;
  enabled?: boolean;
};

export {
  MATCHES_QUERY_STALE_TIME_MS,
  shouldRetryMatchesQuery,
} from '@data/matches/matchesQueryData';

function buildMatchesQueryResultFromStore(date: string): MatchesQueryResult | null {
  const entries = getMatchesByDate<MatchItem>(date);
  if (entries.length === 0) {
    return null;
  }

  const sectionsByCompetition = new Map<string, CompetitionSection>();
  let latestUpdatedAt = 0;

  entries.forEach(entry => {
    const match = entry.data;
    if (!match) {
      return;
    }

    const section =
      sectionsByCompetition.get(match.competitionId) ??
      {
        id: match.competitionId,
        name: match.competitionName,
        logo: match.competitionLogo,
        country: match.competitionCountry,
        matches: [],
      };

    section.matches.push(match);
    sectionsByCompetition.set(match.competitionId, section);
    latestUpdatedAt = Math.max(latestUpdatedAt, entry.updatedAt);
  });

  const sections = Array.from(sectionsByCompetition.values())
    .map(section => ({
      ...section,
      matches: [...section.matches].sort((first, second) =>
        first.startDate.localeCompare(second.startDate),
      ),
    }))
    .sort((first, second) => first.name.localeCompare(second.name));

  return {
    sections,
    requestDurationMs: 0,
    fetchedAt: new Date(latestUpdatedAt || Date.now()).toISOString(),
    hasLiveMatches: hasLiveMatches(sections),
  };
}

export function useMatchesQuery({ date, timezone, enabled = true }: UseMatchesQueryParams) {
  const sqliteSnapshot = useMemo(
    () =>
      appEnv.mobileEnableSqliteLocalFirst
        ? buildMatchesQueryResultFromStore(date)
        : null,
    [date],
  );

  const query = useQuery<MatchesQueryResult, Error>({
    queryKey: queryKeys.matches(date, timezone),
    enabled,
    staleTime: MATCHES_QUERY_STALE_TIME_MS,
    refetchOnReconnect: true,
    refetchOnMount: false,
    retry: shouldRetryMatchesQuery,
    placeholderData: previousData => previousData ?? sqliteSnapshot ?? undefined,
    queryFn: async ({ signal }) => {
      try {
        return await buildMatchesQueryResult({ date, timezone, signal });
      } catch (error) {
        if (sqliteSnapshot) {
          return sqliteSnapshot;
        }

        throw error;
      }
    },
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

    if (isNetworkRequestFailedError(query.error)) {
      console.warn(
        `[FootAlert][matches] network unavailable or request timed out on ${requestUrl}`,
      );
      return;
    }

    if (query.error instanceof MobileAttestationProviderUnavailableError) {
      console.info(
        `[FootAlert][matches] mobile attestation provider unavailable on ${requestUrl}. ` +
          'Install Play Integrity/App Attest native bridge modules, or use a local dev backend that accepts mock attestation.',
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
