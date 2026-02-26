import { useEffect, useRef } from 'react';

import { appEnv } from '@data/config/env';

type UseMatchesRefreshParams = {
  enabled: boolean;
  hasLiveMatches: boolean;
  isSlowNetwork: boolean;
  networkLiteMode?: boolean;
  refetch: () => Promise<{ isError?: boolean } | unknown>;
};

export function useMatchesRefresh({
  enabled,
  hasLiveMatches,
  isSlowNetwork,
  networkLiteMode = false,
  refetch,
}: UseMatchesRefreshParams): void {
  const liveRefreshIntervalMs = appEnv.matchesLiveRefreshIntervalMs;
  const slowRefreshIntervalMs = appEnv.matchesSlowRefreshIntervalMs;
  const maxRefreshBackoffMs = appEnv.matchesMaxRefreshBackoffMs;
  const networkLiteRefreshIntervalMs = Math.max(
    slowRefreshIntervalMs,
    liveRefreshIntervalMs * 3,
  );

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshDelayRef = useRef<number>(liveRefreshIntervalMs);

  useEffect(() => {
    refreshDelayRef.current = networkLiteMode
      ? networkLiteRefreshIntervalMs
      : isSlowNetwork
        ? slowRefreshIntervalMs
        : liveRefreshIntervalMs;
  }, [
    isSlowNetwork,
    liveRefreshIntervalMs,
    networkLiteMode,
    networkLiteRefreshIntervalMs,
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
            refreshDelayRef.current = networkLiteMode
              ? networkLiteRefreshIntervalMs
              : isSlowNetwork
                ? slowRefreshIntervalMs
                : liveRefreshIntervalMs;
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
    enabled,
    hasLiveMatches,
    isSlowNetwork,
    liveRefreshIntervalMs,
    maxRefreshBackoffMs,
    networkLiteMode,
    networkLiteRefreshIntervalMs,
    refetch,
    slowRefreshIntervalMs,
  ]);
}
