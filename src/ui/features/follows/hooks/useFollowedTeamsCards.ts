import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { fetchNextFixtureForTeam, fetchTeamById } from '@data/endpoints/followsApi';
import { mapTeamDetailsAndFixtureToFollowedCard } from '@data/mappers/followsMapper';
import type { FollowedTeamCard } from '@ui/features/follows/types/follows.types';
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

type UseFollowedTeamsCardsParams = {
  teamIds: string[];
  timezone: string;
};

export function useFollowedTeamsCards({ teamIds, timezone }: UseFollowedTeamsCardsParams) {
  const sortedTeamIds = useMemo(() => [...teamIds].sort(), [teamIds]);

  return useQuery({
    queryKey: queryKeys.follows.followedTeamCards(sortedTeamIds, timezone),
    enabled: sortedTeamIds.length > 0,
    staleTime: appEnv.followsTeamNextFixtureTtlMs,
    queryFn: async ({ signal }): Promise<FollowedTeamCard[]> => {
      const cards = await mapWithConcurrency(sortedTeamIds, 3, async teamId => {
        const [teamDetails, nextFixture] = await Promise.all([
          fetchTeamById(teamId, signal),
          fetchNextFixtureForTeam(teamId, timezone, signal),
        ]);

        return mapTeamDetailsAndFixtureToFollowedCard(teamId, teamDetails, nextFixture);
      });

      return cards;
    },
  });
}
