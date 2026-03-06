import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { fetchFollowedTeamCards } from '@data/endpoints/followsApi';
import type { FollowedTeamCard } from '@ui/features/follows/types/follows.types';
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
    queryFn: ({ signal }): Promise<FollowedTeamCard[]> =>
      fetchFollowedTeamCards(sortedTeamIds, timezone, signal),
  });
}
