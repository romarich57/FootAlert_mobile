import { useQuery, type QueryFunctionContext } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { fetchPlayerFull } from '@data/endpoints/playersApi';
import {
  getHydrationSection,
  isHydrationPending,
  resolveProgressiveHydrationRefetchInterval,
} from '@domain/contracts/fullPayloadHydration.types';
import { featureQueryOptions } from '@ui/shared/query/queryOptions';
import { queryKeys } from '@ui/shared/query/queryKeys';

import { usePlayerLocalFirst } from './usePlayerLocalFirst';
import { hasPlayerFullIdentity } from './playerFullPayload';

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

  if (!payload || !hasPlayerFullIdentity(payload)) {
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
    enabled && Boolean(playerId) && Number.isFinite(season);
  const localFirstQuery = usePlayerLocalFirst({
    playerId,
    season,
    enabled: useSqliteLocalFirst && enabled,
  });
  const isLocalFirstActive = localFirstQuery.isFullEnabled;

  const networkQuery = useQuery<PlayerFullPayload, Error>({
    queryKey: getPlayerFullQueryKey(playerId, season),
    queryFn: async ({ signal }) => {
      const payload = await fetchPlayerFull(playerId, season, signal);
      if (!payload || !hasPlayerFullIdentity(payload)) {
        throw new Error('Player not found');
      }

      return payload;
    },
    enabled: !isLocalFirstActive && fullEnabled,
    placeholderData: previousData => previousData,
    refetchInterval: query =>
      resolveProgressiveHydrationRefetchInterval(
        query.state.data?._hydration,
        query.state.dataUpdatedAt,
      ),
    refetchIntervalInBackground: false,
    ...featureQueryOptions.players.full,
  });

  if (isLocalFirstActive) {
    return localFirstQuery;
  }

  return {
    ...networkQuery,
    isFullEnabled: fullEnabled,
    hydration: networkQuery.data?._hydration ?? null,
    hydrationStatus: networkQuery.data?._hydration?.status ?? null,
    hydrationSections: networkQuery.data?._hydration?.sections ?? {},
    isHydrationPending: isHydrationPending(networkQuery.data?._hydration),
    getSectionHydration: (sectionKey: string) =>
      getHydrationSection(networkQuery.data?._hydration, sectionKey),
  };
}
