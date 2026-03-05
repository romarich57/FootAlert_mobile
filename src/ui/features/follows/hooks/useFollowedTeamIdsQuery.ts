import { useQuery } from '@tanstack/react-query';

import { loadFollowedTeamIds } from '@data/storage/followsStorage';
import { queryKeys } from '@ui/shared/query/queryKeys';

export function useFollowedTeamIdsQuery() {
  return useQuery({
    queryKey: queryKeys.follows.followedTeamIds(),
    queryFn: loadFollowedTeamIds,
    staleTime: 10 * 60_000,
    refetchOnReconnect: true,
  });
}
