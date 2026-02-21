import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { fetchNextFixtureForTeam, fetchTeamById } from '@data/endpoints/followsApi';
import { mapTeamDetailsAndFixtureToFollowedCard } from '@data/mappers/followsMapper';
import { loadCachedTeamCards, saveCachedTeamCards } from '@data/storage/followsCardsCacheStorage';
import type { FollowedTeamCard } from '@ui/features/follows/types/follows.types';

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

type UseFollowedTeamsCardsParams = {
  teamIds: string[];
  timezone: string;
};

export function useFollowedTeamsCards({ teamIds, timezone }: UseFollowedTeamsCardsParams) {
  const sortedTeamIds = useMemo(() => [...teamIds], [teamIds]);

  return useQuery({
    queryKey: ['follows', 'teams', 'cards', sortedTeamIds, timezone],
    enabled: sortedTeamIds.length > 0,
    staleTime: appEnv.followsTeamNextFixtureTtlMs,
    queryFn: async (): Promise<FollowedTeamCard[]> => {
      const cachedCards = await loadCachedTeamCards(
        sortedTeamIds,
        appEnv.followsTeamNextFixtureTtlMs,
      );

      if (cachedCards) {
        return cachedCards;
      }

      const cards = await mapWithConcurrency(sortedTeamIds, 3, async teamId => {
        const [teamDetails, nextFixture] = await Promise.all([
          fetchTeamById(teamId),
          fetchNextFixtureForTeam(teamId, timezone),
        ]);

        return mapTeamDetailsAndFixtureToFollowedCard(teamId, teamDetails, nextFixture);
      });

      await saveCachedTeamCards(sortedTeamIds, cards);
      return cards;
    },
  });
}
