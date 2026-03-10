import { useCallback } from 'react';

import { appEnv } from '@data/config/env';
import { buildMatchFullEntityId } from '@data/db/fullEntityIds';
import { useLocalFirstQuery } from '@data/db/useLocalFirstQuery';
import {
  fetchMatchFull,
  type ApiFootballMatchFullResponse,
} from '@data/endpoints/matchesApi';
import { isJestRuntime } from '@data/runtime/isJestRuntime';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import { queryKeys } from '@ui/shared/query/queryKeys';

const MATCH_FULL_MAX_AGE_MS = 30_000;

type UseMatchLocalFirstParams = {
  matchId: string | null;
  timezone: string;
  enabled?: boolean;
};

export function useMatchLocalFirst({
  matchId,
  timezone,
  enabled = true,
}: UseMatchLocalFirstParams) {
  const fullEnabled =
    enabled &&
    !isJestRuntime() &&
    appEnv.mobileEnableSqliteLocalFirst &&
    appEnv.mobileEnableBffMatchFull &&
    Boolean(matchId);

  const fetchFn = useCallback(
    async (signal?: AbortSignal) =>
      fetchMatchFull({
        fixtureId: matchId ?? '',
        timezone,
        signal,
      }),
    [matchId, timezone],
  );

  const query = useLocalFirstQuery<ApiFootballMatchFullResponse>({
    queryKey: queryKeys.matchesFull(matchId ?? 'invalid', timezone),
    entityType: 'match',
    entityId: buildMatchFullEntityId(matchId ?? 'invalid'),
    maxAgeMs: MATCH_FULL_MAX_AGE_MS,
    fetchFn,
    enabled: fullEnabled,
    queryOptions: featureQueryOptions.matches.full,
  });

  return {
    ...query,
    isFullEnabled: fullEnabled,
  };
}
