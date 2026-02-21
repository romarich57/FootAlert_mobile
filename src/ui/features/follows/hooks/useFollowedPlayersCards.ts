import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { fetchPlayerSeasonStats } from '@data/endpoints/followsApi';
import {
  getCurrentSeasonYear,
  mapPlayerSeasonToFollowedCard,
} from '@data/mappers/followsMapper';
import type { FollowedPlayerCard } from '@ui/features/follows/types/follows.types';
import { queryKeys } from '@ui/shared/query/queryKeys';

async function mapWithConcurrency<TInput, TOutput>(
  items: TInput[],
  limit: number,
  mapper: (item: TInput) => Promise<TOutput>,
): Promise<TOutput[]> {
  const results: TOutput[] = [];
  const queue = items.map((item, index) => ({ item, index }));

  async function consume(): Promise<void> {
    while (queue.length > 0) {
      const next = queue.shift();
      if (!next) {
        return;
      }

      results[next.index] = await mapper(next.item);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => consume()));

  return results;
}

type UseFollowedPlayersCardsParams = {
  playerIds: string[];
};

export function useFollowedPlayersCards({ playerIds }: UseFollowedPlayersCardsParams) {
  const season = getCurrentSeasonYear();
  const sortedPlayerIds = useMemo(() => [...playerIds].sort(), [playerIds]);

  return useQuery({
    queryKey: queryKeys.follows.followedPlayerCards(sortedPlayerIds, season),
    enabled: sortedPlayerIds.length > 0,
    staleTime: appEnv.followsPlayerStatsTtlMs,
    queryFn: async ({ signal }): Promise<FollowedPlayerCard[]> => {
      const cards = await mapWithConcurrency(sortedPlayerIds, 3, async playerId => {
        const payload = await fetchPlayerSeasonStats(playerId, season, signal);
        return mapPlayerSeasonToFollowedCard(playerId, payload, season);
      });

      return cards;
    },
  });
}
