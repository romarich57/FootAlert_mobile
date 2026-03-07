import { useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

import { appEnv } from '@data/config/env';
import {
  fetchDiscoveryPlayers,
  fetchDiscoveryTeams,
} from '@data/endpoints/followsApi';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import type {
  FollowDiscoveryPlayerItem,
  FollowDiscoveryResponse,
  FollowDiscoveryTeamItem,
  FollowEntityTab,
} from '@ui/features/follows/types/follows.types';
import { buildFollowDiscoveryPlaceholderResponse } from '@ui/features/follows/utils/discoverySeeds';
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

  const query = useQuery<
    FollowDiscoveryResponse<FollowDiscoveryTeamItem> | FollowDiscoveryResponse<FollowDiscoveryPlayerItem>
  >({
    queryKey: queryKeys.follows.discovery(tab, resolvedLimit),
    enabled: enabled && !hidden,
    staleTime: appEnv.followsTrendsTtlMs,
    placeholderData: previousData =>
      previousData ?? buildFollowDiscoveryPlaceholderResponse(tab, resolvedLimit),
    queryFn: ({ signal }) => {
      if (tab === 'teams') {
        return fetchDiscoveryTeams(resolvedLimit, signal);
      }

      return fetchDiscoveryPlayers(resolvedLimit, signal);
    },
  });

  const lastTelemetryKeyRef = useRef<string | null>(null);
  const pendingPlaceholderReplacementRef = useRef(false);

  useEffect(() => {
    if (!query.data) {
      return;
    }

    const source = query.data.meta.source;
    const itemCount = query.data.items.length;
    const telemetryKey = `${tab}|${resolvedLimit}|${source}|${itemCount}|${query.isPlaceholderData ? 'placeholder' : 'resolved'}|${query.dataUpdatedAt}`;
    if (lastTelemetryKeyRef.current === telemetryKey) {
      return;
    }
    lastTelemetryKeyRef.current = telemetryKey;

    getMobileTelemetry().trackEvent('follows.discovery_source', {
      screen: 'follows',
      tab,
      source,
      itemCount,
    });

    if (query.isPlaceholderData && source === 'static_seed') {
      pendingPlaceholderReplacementRef.current = true;
      getMobileTelemetry().trackEvent('follows.discovery_seed_rendered', {
        screen: 'follows',
        tab,
        source,
        itemCount,
      });
      return;
    }

    if (pendingPlaceholderReplacementRef.current && source !== 'static_seed') {
      pendingPlaceholderReplacementRef.current = false;
      getMobileTelemetry().trackEvent('follows.discovery_remote_replaced', {
        screen: 'follows',
        tab,
        source,
        itemCount,
      });
    }
  }, [
    query.data,
    query.dataUpdatedAt,
    query.isPlaceholderData,
    resolvedLimit,
    tab,
  ]);

  return query;
}
