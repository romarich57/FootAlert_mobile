import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import { fetchFollowedPlayerCards } from '@data/endpoints/followsApi';
import { getCurrentSeasonYear } from '@data/mappers/followsMapper';
import type { FollowedPlayerCard } from '@ui/features/follows/types/follows.types';
import { queryKeys } from '@ui/shared/query/queryKeys';

type UseFollowedPlayersCardsParams = {
  playerIds: string[];
  enabled?: boolean;
};

export function useFollowedPlayersCards({
  playerIds,
  enabled = true,
}: UseFollowedPlayersCardsParams) {
  const season = getCurrentSeasonYear();
  const sortedPlayerIds = useMemo(() => [...playerIds].sort(), [playerIds]);

  return useQuery({
    queryKey: queryKeys.follows.followedPlayerCards(sortedPlayerIds, season),
    enabled: enabled && sortedPlayerIds.length > 0,
    staleTime: appEnv.followsPlayerStatsTtlMs,
    queryFn: ({ signal }): Promise<FollowedPlayerCard[]> =>
      fetchFollowedPlayerCards(sortedPlayerIds, season, signal),
  });
}
