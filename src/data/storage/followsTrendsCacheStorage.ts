import { getJsonValue, setJsonValue } from '@data/storage/asyncStorage';
import type {
  CachedWithFetchedAt,
  TrendPlayerItem,
  TrendTeamItem,
} from '@ui/features/follows/types/follows.types';

const TEAM_TRENDS_CACHE_KEY = 'follows_trends_teams';
const PLAYER_TRENDS_CACHE_KEY = 'follows_trends_players';

function isFresh(fetchedAt: string, ttlMs: number): boolean {
  const fetchedAtMs = new Date(fetchedAt).getTime();
  if (!Number.isFinite(fetchedAtMs)) {
    return false;
  }

  return Date.now() - fetchedAtMs < ttlMs;
}

export async function loadCachedTeamTrends(ttlMs: number): Promise<TrendTeamItem[] | null> {
  const payload = await getJsonValue<CachedWithFetchedAt<TrendTeamItem>>(TEAM_TRENDS_CACHE_KEY);

  if (!payload || !isFresh(payload.fetchedAt, ttlMs)) {
    return null;
  }

  return payload.items;
}

export async function saveCachedTeamTrends(items: TrendTeamItem[]): Promise<void> {
  const payload: CachedWithFetchedAt<TrendTeamItem> = {
    fetchedAt: new Date().toISOString(),
    items,
  };

  await setJsonValue(TEAM_TRENDS_CACHE_KEY, payload);
}

export async function loadCachedPlayerTrends(ttlMs: number): Promise<TrendPlayerItem[] | null> {
  const payload = await getJsonValue<CachedWithFetchedAt<TrendPlayerItem>>(
    PLAYER_TRENDS_CACHE_KEY,
  );

  if (!payload || !isFresh(payload.fetchedAt, ttlMs)) {
    return null;
  }

  return payload.items;
}

export async function saveCachedPlayerTrends(items: TrendPlayerItem[]): Promise<void> {
  const payload: CachedWithFetchedAt<TrendPlayerItem> = {
    fetchedAt: new Date().toISOString(),
    items,
  };

  await setJsonValue(PLAYER_TRENDS_CACHE_KEY, payload);
}
