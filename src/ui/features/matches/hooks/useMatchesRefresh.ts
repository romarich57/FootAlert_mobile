import { useCallback, useEffect, useRef } from 'react';

import { appEnv } from '@data/config/env';

type UseMatchesRefreshParams = {
  enabled: boolean;
  hasLiveMatches: boolean;
  isSlowNetwork: boolean;
  networkLiteMode?: boolean;
  batteryLiteMode?: boolean;
  refetch: () => Promise<{ isError?: boolean } | unknown>;
};

export function useMatchesRefresh({
  enabled,
  hasLiveMatches,
  isSlowNetwork,
  networkLiteMode = false,
  batteryLiteMode = false,
  refetch,
}: UseMatchesRefreshParams): void {
  const liveRefreshIntervalMs = appEnv.matchesLiveRefreshIntervalMs;
  const slowRefreshIntervalMs = appEnv.matchesSlowRefreshIntervalMs;
  const maxRefreshBackoffMs = appEnv.matchesMaxRefreshBackoffMs;
  const batterySaverRefreshIntervalMs = appEnv.matchesBatterySaverRefreshIntervalMs;
  const networkLiteRefreshIntervalMs = Math.max(
    slowRefreshIntervalMs,
    liveRefreshIntervalMs * 3,
  );

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshDelayRef = useRef<number>(liveRefreshIntervalMs);

  const resolveBaseRefreshIntervalMs = useCallback(() => {
    const networkIntervalMs = networkLiteMode
      ? networkLiteRefreshIntervalMs
      : isSlowNetwork
        ? slowRefreshIntervalMs
        : liveRefreshIntervalMs;

    return batteryLiteMode
      ? Math.max(networkIntervalMs, batterySaverRefreshIntervalMs)
      : networkIntervalMs;
  }, [
    batteryLiteMode,
    batterySaverRefreshIntervalMs,
    isSlowNetwork,
    liveRefreshIntervalMs,
    networkLiteMode,
    networkLiteRefreshIntervalMs,
    slowRefreshIntervalMs,
  ]);

  useEffect(() => {
    refreshDelayRef.current = resolveBaseRefreshIntervalMs();
  }, [
    batteryLiteMode,
    batterySaverRefreshIntervalMs,
    isSlowNetwork,
    liveRefreshIntervalMs,
    networkLiteMode,
    networkLiteRefreshIntervalMs,
    resolveBaseRefreshIntervalMs,
    slowRefreshIntervalMs,
  ]);

  useEffect(() => {
    if (!enabled || !hasLiveMatches) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      return;
    }

    let disposed = false;

    const scheduleRefetch = () => {
      timeoutRef.current = setTimeout(async () => {
        try {
          const result = await refetch();
          const didFail =
            typeof result === 'object' && result !== null && 'isError' in result
              ? Boolean(result.isError)
              : false;

          if (didFail) {
            refreshDelayRef.current = Math.min(
              refreshDelayRef.current * 2,
              maxRefreshBackoffMs,
            );
          } else {
            refreshDelayRef.current = resolveBaseRefreshIntervalMs();
          }
        } catch {
          refreshDelayRef.current = Math.min(
            refreshDelayRef.current * 2,
            maxRefreshBackoffMs,
          );
        }

        if (!disposed) {
          scheduleRefetch();
        }
      }, refreshDelayRef.current);
    };

    scheduleRefetch();

    return () => {
      disposed = true;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [
    batteryLiteMode,
    batterySaverRefreshIntervalMs,
    enabled,
    hasLiveMatches,
    isSlowNetwork,
    liveRefreshIntervalMs,
    maxRefreshBackoffMs,
    networkLiteMode,
    networkLiteRefreshIntervalMs,
    refetch,
    resolveBaseRefreshIntervalMs,
    slowRefreshIntervalMs,
  ]);
}
