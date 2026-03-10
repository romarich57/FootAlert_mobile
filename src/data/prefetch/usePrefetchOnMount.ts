import { useEffect, useMemo, useRef } from 'react';
import { useNetInfo } from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { usePowerState } from 'react-native-device-info';

import { resolvePrefetchGuardState } from '@data/prefetch/prefetchGuard';
import type { PrefetchStrategy } from '@data/prefetch/entityPrefetchOrchestrator';

type IdleRequestHandle = number;
type IdleRequestDeadline = {
  readonly didTimeout: boolean;
  timeRemaining: () => number;
};
type IdleRequestCallback = (deadline: IdleRequestDeadline) => void;
type GlobalWithIdleCallbacks = typeof globalThis & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: { timeout?: number },
  ) => IdleRequestHandle;
  cancelIdleCallback?: (handle: IdleRequestHandle) => void;
};

function scheduleIdleTask(task: () => void): () => void {
  const globalScope = globalThis as GlobalWithIdleCallbacks;
  if (typeof globalScope.requestIdleCallback === 'function') {
    const handle = globalScope.requestIdleCallback(() => task(), { timeout: 250 });
    return () => {
      if (typeof globalScope.cancelIdleCallback === 'function') {
        globalScope.cancelIdleCallback(handle);
      }
    };
  }

  const timeoutHandle = setTimeout(task, 0);
  return () => clearTimeout(timeoutHandle);
}

async function executePrefetchStrategy(
  queryClient: ReturnType<typeof useQueryClient>,
  strategy: PrefetchStrategy,
): Promise<void> {
  if (strategy.kind === 'infinite') {
    const infiniteOptions = {
      queryKey: strategy.queryKey,
      queryFn: ({ signal, pageParam }: { signal: AbortSignal; pageParam: unknown }) =>
        strategy.queryFn(signal, pageParam),
      initialPageParam: strategy.initialPageParam,
      ...strategy.queryOptions,
    } as const;

    await queryClient.prefetchInfiniteQuery({
      ...infiniteOptions,
      getNextPageParam:
        strategy.getNextPageParam ?? (() => undefined),
    });
    return;
  }

  await queryClient.prefetchQuery({
    queryKey: strategy.queryKey,
    queryFn: ({ signal }) => strategy.queryFn(signal),
    ...strategy.queryOptions,
  });
}

function buildStrategiesFingerprint(strategies: PrefetchStrategy[]): string {
  return JSON.stringify(
    strategies.map(strategy => ({
      key: strategy.queryKey,
      enabled: strategy.enabled ?? true,
      priority: strategy.priority ?? 'immediate',
      kind: strategy.kind,
    })),
  );
}

function isLiveOnlyIdleStrategy(strategy: PrefetchStrategy): boolean {
  const [domain, _id, dataset] = strategy.queryKey;
  return (
    domain === 'match_details' &&
    (dataset === 'events' || dataset === 'statistics' || dataset === 'team_players_stats')
  );
}

export function usePrefetchOnMount(strategies: PrefetchStrategy[]): void {
  const queryClient = useQueryClient();
  const netInfo = useNetInfo();
  const powerState = usePowerState();
  const fingerprint = useMemo(
    () => buildStrategiesFingerprint(strategies),
    [strategies],
  );
  const lastExecutedFingerprintRef = useRef<string | null>(null);

  useEffect(() => {
    const guardState = resolvePrefetchGuardState({
      isConnected: netInfo.isConnected,
      isInternetReachable: netInfo.isInternetReachable,
      isConnectionExpensive: netInfo.details?.isConnectionExpensive,
      lowPowerMode: powerState.lowPowerMode,
    });

    if (!guardState.allowImmediate && !guardState.allowIdle) {
      return;
    }

    if (lastExecutedFingerprintRef.current === fingerprint) {
      return;
    }
    lastExecutedFingerprintRef.current = fingerprint;

    const enabledStrategies = strategies.filter(strategy => strategy.enabled ?? true);
    const immediateStrategies = enabledStrategies.filter(
      strategy => (strategy.priority ?? 'immediate') === 'immediate',
    );
    const idleStrategies = enabledStrategies.filter(
      strategy =>
        (strategy.priority ?? 'immediate') === 'idle' && !isLiveOnlyIdleStrategy(strategy),
    );

    if (guardState.allowImmediate) {
      immediateStrategies.forEach(strategy => {
        void executePrefetchStrategy(queryClient, strategy).catch(() => undefined);
      });
    }

    if (!guardState.allowIdle || idleStrategies.length === 0) {
      return;
    }

    const cancelIdleTask = scheduleIdleTask(() => {
      idleStrategies.forEach(strategy => {
        void executePrefetchStrategy(queryClient, strategy).catch(() => undefined);
      });
    });

    return () => {
      cancelIdleTask();
    };
  }, [
    fingerprint,
    netInfo.details?.isConnectionExpensive,
    netInfo.isConnected,
    netInfo.isInternetReachable,
    powerState.lowPowerMode,
    queryClient,
    strategies,
  ]);
}
