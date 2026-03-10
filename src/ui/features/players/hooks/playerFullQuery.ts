import { useQuery, type QueryFunctionContext } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { fetchPlayerFull } from '@data/endpoints/playersApi';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import { queryKeys } from '@ui/shared/query/queryKeys';

import { usePlayerLocalFirst } from './usePlayerLocalFirst';

export type PlayerFullQueryKey = ReturnType<typeof queryKeys.players.full>;

export type PlayerFullPayload = NonNullable<
  Awaited<ReturnType<typeof fetchPlayerFull>>
>;

export function getPlayerFullQueryKey(
  playerId: string,
  season: number,
): PlayerFullQueryKey {
  return queryKeys.players.full(playerId, season);
}

export async function fetchPlayerFullQuery(
  context: QueryFunctionContext<PlayerFullQueryKey>,
): Promise<PlayerFullPayload> {
  const [, , playerId, season] = context.queryKey;
  const payload = await fetchPlayerFull(playerId, season, context.signal);

  if (!payload) {
    throw new Error('Player not found');
  }

  return payload;
}

export function usePlayerFullQuery(
  playerId: string,
  season: number,
  enabled: boolean = true,
) {
  const useSqliteLocalFirst = appEnv.mobileEnableSqliteLocalFirst;
  const fullEnabled =
    enabled &&
    appEnv.mobileEnableBffPlayerFull &&
    Boolean(playerId) &&
    Number.isFinite(season);
  const localFirstQuery = usePlayerLocalFirst({
    playerId,
    season,
    enabled: useSqliteLocalFirst && enabled,
  });

  const networkQuery = useQuery<PlayerFullPayload, Error>({
    queryKey: getPlayerFullQueryKey(playerId, season),
    queryFn: async ({ signal }) => {
      const payload = await fetchPlayerFull(playerId, season, signal);
      if (!payload) {
        throw new Error('Player not found');
      }

      return payload;
    },
    enabled: !useSqliteLocalFirst && fullEnabled,
    placeholderData: previousData => previousData,
    ...featureQueryOptions.players.full,
  });

  if (useSqliteLocalFirst) {
    return localFirstQuery;
  }

  return {
    ...networkQuery,
    isFullEnabled: fullEnabled,
  };
}
