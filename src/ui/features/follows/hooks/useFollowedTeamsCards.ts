import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { fetchNextFixtureForTeam, fetchTeamById } from '@data/endpoints/followsApi';
import { mapTeamDetailsAndFixtureToFollowedCard } from '@data/mappers/followsMapper';
import type { FollowedTeamCard } from '@ui/features/follows/types/follows.types';
import { mapWithConcurrency } from '@ui/shared/query/mapWithConcurrency';
import { queryKeys } from '@ui/shared/query/queryKeys';

type UseFollowedTeamsCardsParams = {
  teamIds: string[];
  timezone: string;
  enabled?: boolean;
};

export function useFollowedTeamsCards({
  teamIds,
  timezone,
  enabled = true,
}: UseFollowedTeamsCardsParams) {
  const sortedTeamIds = useMemo(() => [...teamIds].sort(), [teamIds]);

  return useQuery({
    queryKey: queryKeys.follows.followedTeamCards(sortedTeamIds, timezone),
    enabled: enabled && sortedTeamIds.length > 0,
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
