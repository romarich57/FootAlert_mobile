import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import {
  fetchDiscoveryPlayers,
  fetchDiscoveryTeams,
} from '@data/endpoints/followsApi';
import type {
  FollowDiscoveryPlayerItem,
  FollowDiscoveryResponse,
  FollowDiscoveryTeamItem,
  FollowEntityTab,
} from '@ui/features/follows/types/follows.types';
import { queryKeys } from '@ui/shared/query/queryKeys';

type UseFollowsDiscoveryParams = {
  tab: FollowEntityTab;
  hidden?: boolean;
  enabled?: boolean;
  limit?: number;
};

export function useFollowsDiscovery({
  tab,
  hidden = false,
  enabled = true,
  limit,
}: UseFollowsDiscoveryParams) {
  const resolvedLimit =
    limit ??
    (tab === 'teams'
      ? appEnv.followsTrendsTeamsLimit
      : appEnv.followsTrendsPlayersLimit);

  return useQuery<
    FollowDiscoveryResponse<FollowDiscoveryTeamItem> | FollowDiscoveryResponse<FollowDiscoveryPlayerItem>
  >({
    queryKey: queryKeys.follows.discovery(tab, resolvedLimit),
    enabled: enabled && !hidden,
    staleTime: appEnv.followsTrendsTtlMs,
    placeholderData: previousData => previousData,
    queryFn: ({ signal }) => {
      if (tab === 'teams') {
        return fetchDiscoveryTeams(resolvedLimit, signal);
      }

      return fetchDiscoveryPlayers(resolvedLimit, signal);
    },
  });
}
