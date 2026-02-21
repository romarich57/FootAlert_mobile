import { getJsonValue, setJsonValue } from '@data/storage/asyncStorage';
import type {
  CachedPlayerCards,
  CachedTeamCards,
  FollowedPlayerCard,
  FollowedTeamCard,
} from '@ui/features/follows/types/follows.types';

function buildCacheKey(prefix: string, ids: string[]): string {
  const normalized = [...ids].map(String).sort().join(',');
  return `${prefix}_${normalized}`;
}

function isFresh(fetchedAt: string, ttlMs: number): boolean {
  const fetchedAtMs = new Date(fetchedAt).getTime();
  if (!Number.isFinite(fetchedAtMs)) {
    return false;
  }

  return Date.now() - fetchedAtMs < ttlMs;
}

export async function loadCachedTeamCards(
  teamIds: string[],
  ttlMs: number,
): Promise<FollowedTeamCard[] | null> {
  if (teamIds.length === 0) {
    return [];
  }

  const key = buildCacheKey('follows_team_cards', teamIds);
  const payload = await getJsonValue<CachedTeamCards>(key);

  if (!payload || !isFresh(payload.fetchedAt, ttlMs)) {
    return null;
  }

  return payload.cards;
}

export async function saveCachedTeamCards(
  teamIds: string[],
  cards: FollowedTeamCard[],
): Promise<void> {
  if (teamIds.length === 0) {
    return;
  }

  const key = buildCacheKey('follows_team_cards', teamIds);
  const payload: CachedTeamCards = {
    fetchedAt: new Date().toISOString(),
    cards,
  };

  await setJsonValue(key, payload);
}

export async function loadCachedPlayerCards(
  playerIds: string[],
  ttlMs: number,
): Promise<FollowedPlayerCard[] | null> {
  if (playerIds.length === 0) {
    return [];
  }

  const key = buildCacheKey('follows_player_cards', playerIds);
  const payload = await getJsonValue<CachedPlayerCards>(key);

  if (!payload || !isFresh(payload.fetchedAt, ttlMs)) {
    return null;
  }

  return payload.cards;
}

export async function saveCachedPlayerCards(
  playerIds: string[],
  cards: FollowedPlayerCard[],
): Promise<void> {
  if (playerIds.length === 0) {
    return;
  }

  const key = buildCacheKey('follows_player_cards', playerIds);
  const payload: CachedPlayerCards = {
    fetchedAt: new Date().toISOString(),
    cards,
  };

  await setJsonValue(key, payload);
}
