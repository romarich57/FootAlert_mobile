import {
  upsertMatchesByDate,
} from '@data/db/matchesByDateStore';
import { ApiError, isNetworkRequestFailedError } from '@data/api/http/client';
import { appEnv } from '@data/config/env';
import { fetchFixturesByDate } from '@data/endpoints/matchesApi';
import {
  hasLiveMatches,
  mapFixtureToMatchItem,
  mapFixturesToSections,
} from '@data/mappers/fixturesMapper';
import { MobileAttestationProviderUnavailableError } from '@data/security/mobileAttestationProvider';
import type { MatchesQueryResult } from '@domain/contracts/matches.types';

export const MATCHES_QUERY_STALE_TIME_MS = appEnv.matchesQueryStaleTimeMs;

type BuildMatchesQueryResultParams = {
  date: string;
  timezone: string;
  signal?: AbortSignal;
};

function isRetriableStatus(status: number): boolean {
  return [500, 502, 503, 504].includes(status);
}

function isAttestationProviderUnavailable(error: unknown): boolean {
  return error instanceof MobileAttestationProviderUnavailableError;
}

export function shouldRetryMatchesQuery(
  failureCount: number,
  error: unknown,
): boolean {
  if (failureCount >= 2) {
    return false;
  }

  if (isNetworkRequestFailedError(error)) {
    return false;
  }

  if (isAttestationProviderUnavailable(error)) {
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

  if (appEnv.mobileEnableSqliteLocalFirst) {
    upsertMatchesByDate(
      date,
      fixtures.map(fixture => {
        const matchItem = mapFixtureToMatchItem(fixture);
        return {
          matchId: matchItem.fixtureId,
          leagueId: matchItem.competitionId,
          status: matchItem.status,
          data: matchItem,
        };
      }),
    );
  }

  return {
    sections,
    requestDurationMs,
    fetchedAt: new Date().toISOString(),
    hasLiveMatches: hasLiveMatches(sections),
  };
}
