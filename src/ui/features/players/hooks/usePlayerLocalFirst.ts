import { useCallback } from 'react';

import { appEnv } from '@data/config/env';
import { useLocalFirstQuery } from '@data/db/useLocalFirstQuery';
import { buildPlayerFullEntityId } from '@data/db/fullEntityIds';
import { fetchPlayerFull } from '@data/endpoints/playersApi';
import { isJestRuntime } from '@data/runtime/isJestRuntime';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import { queryKeys } from '@ui/shared/query/queryKeys';

import type { PlayerFullPayload } from './playerFullQuery';
import { hasPlayerFullIdentity } from './playerFullPayload';

/** Durée max en ms avant de considérer le cache player stale — aligné sur PLAYER_POLICY BFF (12h). */
const PLAYER_FULL_MAX_AGE_MS = 12 * 60 * 60_000;

type UsePlayerLocalFirstParams = {
  playerId: string;
  season: number;
  enabled?: boolean;
};

export function usePlayerLocalFirst({
  playerId,
  season,
  enabled = true,
}: UsePlayerLocalFirstParams) {
  const fullEnabled =
    enabled &&
    !isJestRuntime() &&
    appEnv.mobileEnableSqliteLocalFirst &&
    appEnv.mobileEnableBffPlayerFull &&
    Boolean(playerId) &&
    Number.isFinite(season);

  const fetchFn = useCallback(
    async (signal?: AbortSignal) => {
      const payload = await fetchPlayerFull(playerId, season, signal);
      if (!payload || !hasPlayerFullIdentity(payload)) {
        throw new Error('Player not found');
      }

      return payload;
    },
    [playerId, season],
  );

  const query = useLocalFirstQuery<PlayerFullPayload>({
    queryKey: queryKeys.players.full(playerId, season),
    entityType: 'player',
    entityId: buildPlayerFullEntityId(playerId, season),
    maxAgeMs: PLAYER_FULL_MAX_AGE_MS,
    fetchFn,
    enabled: fullEnabled,
    queryOptions: featureQueryOptions.players.full,
  });

  return {
    ...query,
    isFullEnabled: fullEnabled,
  };
}
