import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CompetitionSection } from '@ui/features/matches/types/matches.types';
import { getJsonValue, setJsonValue } from '@data/storage/asyncStorage';

export type CachedMatchesPayload = {
  sections: CompetitionSection[];
  lastUpdatedAt: string;
};

type UseMatchesOfflineCacheResult = {
  cacheKey: string;
  cachedPayload: CachedMatchesPayload | null;
  isLoadingCache: boolean;
  lastUpdatedAt: string | null;
  saveCache: (payload: CachedMatchesPayload) => Promise<void>;
};

function getCacheKey(date: string): string {
  return `matches_cache_${date}`;
}

export function useMatchesOfflineCache(date: string): UseMatchesOfflineCacheResult {
  const cacheKey = useMemo(() => getCacheKey(date), [date]);
  const [cachedPayload, setCachedPayload] = useState<CachedMatchesPayload | null>(null);
  const [isLoadingCache, setIsLoadingCache] = useState(true);

  useEffect(() => {
    let mounted = true;
    setIsLoadingCache(true);

    getJsonValue<CachedMatchesPayload>(cacheKey)
      .then(payload => {
        if (mounted) {
          setCachedPayload(payload);
        }
      })
      .finally(() => {
        if (mounted) {
          setIsLoadingCache(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [cacheKey]);

  const saveCache = useCallback(
    async (payload: CachedMatchesPayload) => {
      await setJsonValue(cacheKey, payload);
      setCachedPayload(payload);
    },
    [cacheKey],
  );

  return {
    cacheKey,
    cachedPayload,
    isLoadingCache,
    lastUpdatedAt: cachedPayload?.lastUpdatedAt ?? null,
    saveCache,
  };
}
