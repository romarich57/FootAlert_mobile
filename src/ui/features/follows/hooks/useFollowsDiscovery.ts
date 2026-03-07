import type {
  FollowDiscoveryPlayerItem,
  FollowDiscoveryResponse,
  FollowDiscoveryTeamItem,
  FollowEntityTab,
} from '@ui/features/follows/types/follows.types';
import { useDiscoveryEntities } from '@ui/features/follows/hooks/useDiscoveryEntities';

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
  const discovery = useDiscoveryEntities({
    tab,
    surface: 'follows',
    hidden,
    enabled,
    limit,
  });

  const data =
    hidden || !enabled
      ? undefined
      : ({
          items: discovery.resolvedItems,
          meta: discovery.meta,
        } as
          | FollowDiscoveryResponse<FollowDiscoveryTeamItem>
          | FollowDiscoveryResponse<FollowDiscoveryPlayerItem>);

  return {
    data,
    isLoading: discovery.isLoading,
    isFetching: discovery.isFetching,
    isError: discovery.isError,
    hasRemoteData: discovery.hasRemoteData,
    dataUpdatedAt: discovery.dataUpdatedAt,
    isPlaceholderData: discovery.usedSeedFallback,
    refetch: discovery.refetch,
  };
}
