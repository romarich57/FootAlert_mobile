import { useEffect, useMemo, useRef } from 'react';
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
import {
  buildFollowDiscoveryPlaceholderResponse,
  DISCOVERY_SEED_REFRESH_AFTER_MS,
} from '@ui/features/follows/utils/discoverySeeds';
import { queryKeys } from '@ui/shared/query/queryKeys';

type DiscoverySurface = 'follows' | 'search' | 'onboarding';

type UseDiscoveryEntitiesParams = {
  tab: FollowEntityTab;
  surface: DiscoverySurface;
  hidden?: boolean;
  enabled?: boolean;
  limit?: number;
};

type DiscoveryItem = FollowDiscoveryTeamItem | FollowDiscoveryPlayerItem;
type DiscoveryResponse =
  | FollowDiscoveryResponse<FollowDiscoveryTeamItem>
  | FollowDiscoveryResponse<FollowDiscoveryPlayerItem>;

export type UseDiscoveryEntitiesResult<T extends DiscoveryItem> = {
  resolvedItems: T[];
  remoteItems: T[];
  meta: FollowDiscoveryResponse<T>['meta'];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  hasRemoteData: boolean;
  usedLastGood: boolean;
  usedSeedFallback: boolean;
  dataUpdatedAt: number;
  refetch: ReturnType<
    typeof useQuery<FollowDiscoveryResponse<T>>
  >['refetch'];
};

const DISCOVERY_DYNAMIC_STALE_TIME_MS = 6 * 60 * 60 * 1000;
const DISCOVERY_LEGACY_STALE_TIME_MS = 5 * 60 * 1000;
const DISCOVERY_HYBRID_STALE_TIME_MS = 30 * 1000;

function toResolvedLimit(tab: FollowEntityTab, limit?: number): number {
  if (typeof limit === 'number' && Number.isFinite(limit)) {
    return Math.max(1, Math.trunc(limit));
  }

  return tab === 'teams'
    ? appEnv.followsTrendsTeamsLimit
    : appEnv.followsTrendsPlayersLimit;
}

function getDiscoveryStaleTime(meta: DiscoveryResponse['meta'] | undefined): number {
  if (!meta) {
    return 0;
  }

  if (meta.source === 'dynamic' && meta.complete) {
    return DISCOVERY_DYNAMIC_STALE_TIME_MS;
  }

  if (meta.source === 'legacy_fill' && meta.complete) {
    return DISCOVERY_LEGACY_STALE_TIME_MS;
  }

  if (meta.source === 'hybrid' && meta.seedCount > 0) {
    return DISCOVERY_HYBRID_STALE_TIME_MS;
  }

  if (meta.source === 'static_seed') {
    return 0;
  }

  if (meta.refreshAfterMs !== null) {
    return 0;
  }

  return DISCOVERY_HYBRID_STALE_TIME_MS;
}

function buildEmptyMeta(): DiscoveryResponse['meta'] {
  return {
    source: 'static_seed',
    complete: false,
    seedCount: 0,
    generatedAt: new Date().toISOString(),
    refreshAfterMs: DISCOVERY_SEED_REFRESH_AFTER_MS,
  };
}

function matchesDiscoveryTab(tab: FollowEntityTab, data: DiscoveryResponse): boolean {
  if (data.items.length === 0) {
    return false;
  }

  const firstItem = data.items[0] as Partial<FollowDiscoveryTeamItem & FollowDiscoveryPlayerItem>;
  return tab === 'teams' ? typeof firstItem.teamId === 'string' : typeof firstItem.playerId === 'string';
}

function createTelemetryKey(params: {
  surface: DiscoverySurface;
  tab: FollowEntityTab;
  source: string;
  itemCount: number;
  complete: boolean;
  seedCount: number;
  dataUpdatedAt: number;
}): string {
  const {
    surface,
    tab,
    source,
    itemCount,
    complete,
    seedCount,
    dataUpdatedAt,
  } = params;

  return `${surface}|${tab}|${source}|${itemCount}|${complete ? 'complete' : 'partial'}|${seedCount}|${dataUpdatedAt}`;
}

export function useDiscoveryEntities<TTab extends FollowEntityTab>({
  tab,
  surface,
  hidden = false,
  enabled = true,
  limit,
}: UseDiscoveryEntitiesParams & { tab: TTab }): UseDiscoveryEntitiesResult<
  TTab extends 'teams' ? FollowDiscoveryTeamItem : FollowDiscoveryPlayerItem
> {
  const resolvedLimit = toResolvedLimit(tab, limit);
  const discoveryIdentity = `${tab}|${resolvedLimit}`;
  const seedData = useMemo(
    () => buildFollowDiscoveryPlaceholderResponse(tab, resolvedLimit),
    [resolvedLimit, tab],
  );

  const query = useQuery<DiscoveryResponse>({
    queryKey: queryKeys.follows.discovery(tab, resolvedLimit),
    enabled: enabled && !hidden,
    staleTime: currentQuery =>
      getDiscoveryStaleTime(
        (currentQuery.state.data as DiscoveryResponse | undefined)?.meta,
      ),
    refetchInterval: currentQuery => {
      if (!enabled || hidden) {
        return false;
      }

      if (currentQuery.state.error) {
        return false;
      }

      const data = currentQuery.state.data as DiscoveryResponse | undefined;
      return data?.meta.refreshAfterMs ?? false;
    },
    refetchIntervalInBackground: false,
    retry: false,
    placeholderData: previousData => {
      if (!previousData) {
        return seedData;
      }

      return matchesDiscoveryTab(tab, previousData) ? previousData : seedData;
    },
    queryFn: ({ signal }) => {
      if (tab === 'teams') {
        return fetchDiscoveryTeams(resolvedLimit, signal);
      }

      return fetchDiscoveryPlayers(resolvedLimit, signal);
    },
  });

  const lastGoodDataMapRef = useRef<Map<string, DiscoveryResponse>>(new Map());
  const mountedAtRef = useRef(Date.now());
  const lastTelemetryKeyRef = useRef<string | null>(null);
  const lastErrorKeyRef = useRef<string | null>(null);
  const ttiTrackedRef = useRef(false);
  const pendingSeedReplacementRef = useRef(false);

  useEffect(() => {
    lastTelemetryKeyRef.current = null;
    lastErrorKeyRef.current = null;
    ttiTrackedRef.current = false;
    pendingSeedReplacementRef.current = false;
    mountedAtRef.current = Date.now();
  }, [discoveryIdentity, surface]);

  const remoteData =
    query.data && !query.isPlaceholderData && matchesDiscoveryTab(tab, query.data)
      ? query.data
      : null;
  const remoteUsableData = remoteData && remoteData.items.length > 0 ? remoteData : null;
  const lastGoodDataForIdentity = lastGoodDataMapRef.current.get(discoveryIdentity) ?? null;
  const lastGoodData =
    lastGoodDataForIdentity && lastGoodDataForIdentity.items.length > 0
      ? lastGoodDataForIdentity
      : null;
  const resolvedData =
    enabled && !hidden
      ? remoteUsableData ?? lastGoodData ?? seedData
      : null;
  const resolvedItems = useMemo(
    () => (resolvedData?.items ?? []) as DiscoveryItem[],
    [resolvedData],
  );
  const remoteItems = useMemo(
    () => (remoteUsableData?.items ?? []) as DiscoveryItem[],
    [remoteUsableData],
  );
  const hasRemoteData = remoteUsableData !== null;
  const usedLastGood = !hasRemoteData && lastGoodData !== null;
  const usedSeedFallback =
    !hasRemoteData &&
    lastGoodData === null &&
    enabled &&
    !hidden &&
    resolvedItems.length > 0;
  const meta = (resolvedData?.meta ?? buildEmptyMeta()) as DiscoveryResponse['meta'];
  const isLoading = query.isLoading && resolvedItems.length === 0;
  const isError = query.isError && resolvedItems.length === 0;

  useEffect(() => {
    if (remoteUsableData) {
      lastGoodDataMapRef.current.set(discoveryIdentity, remoteUsableData);
    }
  }, [discoveryIdentity, remoteUsableData]);

  useEffect(() => {
    if (!enabled || hidden || resolvedItems.length === 0) {
      return;
    }

    if (!ttiTrackedRef.current) {
      ttiTrackedRef.current = true;
      getMobileTelemetry().trackEvent('follows.discovery_tti', {
        screen: surface,
        tab,
        source: meta.source,
        complete: meta.complete,
        seedCount: meta.seedCount,
        latencyMs: Date.now() - mountedAtRef.current,
        usedLastGood,
        usedSeedFallback,
      });
    }

    const telemetryKey = createTelemetryKey({
      surface,
      tab,
      source: meta.source,
      itemCount: resolvedItems.length,
      complete: meta.complete,
      seedCount: meta.seedCount,
      dataUpdatedAt: query.dataUpdatedAt,
    });
    if (lastTelemetryKeyRef.current === telemetryKey) {
      return;
    }
    lastTelemetryKeyRef.current = telemetryKey;

    getMobileTelemetry().trackEvent('follows.discovery_source', {
      screen: surface,
      tab,
      source: meta.source,
      itemCount: resolvedItems.length,
    });

    if (usedLastGood || usedSeedFallback || !meta.complete) {
      getMobileTelemetry().trackEvent('follows.discovery_fallback_served', {
        screen: surface,
        tab,
        source: meta.source,
        complete: meta.complete,
        seedCount: meta.seedCount,
        usedLastGood,
        usedSeedFallback,
      });
    }

    if (usedSeedFallback && meta.source === 'static_seed') {
      pendingSeedReplacementRef.current = true;
      getMobileTelemetry().trackEvent('follows.discovery_seed_rendered', {
        screen: surface,
        tab,
        source: meta.source,
        itemCount: resolvedItems.length,
      });
      return;
    }

    if (pendingSeedReplacementRef.current && hasRemoteData && meta.source !== 'static_seed') {
      pendingSeedReplacementRef.current = false;
      getMobileTelemetry().trackEvent('follows.discovery_remote_replaced', {
        screen: surface,
        tab,
        source: meta.source,
        itemCount: resolvedItems.length,
      });
    }

    if (meta.complete) {
      getMobileTelemetry().trackEvent('follows.discovery_complete', {
        screen: surface,
        tab,
        source: meta.source,
        complete: meta.complete,
        seedCount: meta.seedCount,
        itemCount: resolvedItems.length,
      });
    }
  }, [
    enabled,
    hasRemoteData,
    hidden,
    meta.complete,
    meta.seedCount,
    meta.source,
    query.dataUpdatedAt,
    resolvedItems,
    surface,
    tab,
    usedLastGood,
    usedSeedFallback,
  ]);

  useEffect(() => {
    if (!query.isError) {
      return;
    }

    const errorKey = `${surface}|${tab}|${query.errorUpdatedAt}`;
    if (lastErrorKeyRef.current === errorKey) {
      return;
    }
    lastErrorKeyRef.current = errorKey;

    getMobileTelemetry().trackEvent('follows.discovery_fetch_error', {
      screen: surface,
      tab,
      source: meta.source,
      complete: meta.complete,
      seedCount: meta.seedCount,
      usedLastGood,
      usedSeedFallback,
    });
  }, [
    meta.complete,
    meta.seedCount,
    meta.source,
    query.errorUpdatedAt,
    query.isError,
    surface,
    tab,
    usedLastGood,
    usedSeedFallback,
  ]);

  return {
    resolvedItems,
    remoteItems,
    meta,
    isLoading,
    isFetching: query.isFetching,
    isError,
    hasRemoteData,
    usedLastGood,
    usedSeedFallback,
    dataUpdatedAt: query.dataUpdatedAt,
    refetch: query.refetch,
  } as UseDiscoveryEntitiesResult<
    TTab extends 'teams' ? FollowDiscoveryTeamItem : FollowDiscoveryPlayerItem
  >;
}
