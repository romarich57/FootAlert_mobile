import { normalizeFollowDiscoveryPlayerId } from '@app-core';
import { appEnv } from '@data/config/env';
import { getDatabase } from '@data/db/database';
import {
  listFollowedEntityIds,
  replaceFollowedEntities,
  type FollowedEntityType,
} from '@data/db/followedEntitiesStore';
import { getJsonValue, setJsonValue } from '@data/storage/asyncStorage';
import type { FollowEntityTab } from '@domain/contracts/follows.types';

export const FOLLOWED_TEAM_IDS_KEY = 'followed_team_ids';
export const FOLLOWED_PLAYER_IDS_KEY = 'followed_player_ids';
export const FOLLOWED_LEAGUE_IDS_KEY = 'followed_league_ids';
export const FOLLOWED_MATCH_IDS_KEY = 'followed_match_ids';
export const FOLLOWS_HIDE_TRENDS_TEAMS_KEY = 'follows_hide_trends_teams';
export const FOLLOWS_HIDE_TRENDS_PLAYERS_KEY = 'follows_hide_trends_players';

type ToggleFollowResult = {
  ids: string[];
  changed: boolean;
  reason?: 'limit_reached';
};

function sanitizeIds(payload: unknown): string[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload.map(value => String(value)).filter(Boolean);
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

function normalizeStoredPlayerIds(ids: string[]): string[] {
  return uniqueIds(
    ids
      .map(id => normalizeFollowDiscoveryPlayerId(id))
      .filter(Boolean),
  );
}

function normalizeAddedId(ids: string[], id: string): string[] {
  const cleanId = String(id);
  const withoutId = ids.filter(value => value !== cleanId);
  return [cleanId, ...withoutId];
}

async function loadIds(key: string): Promise<string[]> {
  const entityType = mapFollowStorageKeyToEntityType(key);

  // SQLite = source de vérité quand local-first est activé.
  if (appEnv.mobileEnableSqliteLocalFirst && entityType) {
    try {
      await getDatabase();
      const sqliteIds = listFollowedEntityIds(entityType);
      if (sqliteIds.length > 0) {
        return sqliteIds;
      }

      // Migration one-shot : importer depuis AsyncStorage si SQLite est vide.
      const legacyPayload = await getJsonValue<unknown>(key);
      const legacyIds = sanitizeIds(legacyPayload);
      if (legacyIds.length > 0) {
        replaceFollowedEntities(entityType, legacyIds);
        return legacyIds;
      }

      return [];
    } catch {
      // Fallback AsyncStorage si SQLite indisponible (migration sûre).
    }
  }

  const payload = await getJsonValue<unknown>(key);
  return sanitizeIds(payload);
}

async function saveIds(key: string, ids: string[]): Promise<void> {
  const entityType = mapFollowStorageKeyToEntityType(key);

  // SQLite = destination primaire quand local-first est activé.
  if (appEnv.mobileEnableSqliteLocalFirst && entityType) {
    try {
      await getDatabase();
      replaceFollowedEntities(entityType, ids);
    } catch {
      // Fallback AsyncStorage si SQLite échoue.
    }
  }

  // AsyncStorage reste écrit pour backward compat (suppression future).
  await setJsonValue<string[]>(key, ids);
}

function mapFollowStorageKeyToEntityType(key: string): FollowedEntityType | null {
  switch (key) {
    case FOLLOWED_TEAM_IDS_KEY:
      return 'team';
    case FOLLOWED_PLAYER_IDS_KEY:
      return 'player';
    case FOLLOWED_LEAGUE_IDS_KEY:
      return 'competition';
    case FOLLOWED_MATCH_IDS_KEY:
      return 'match';
    default:
      return null;
  }
}

async function toggleFollow(
  key: string,
  id: string,
  maxAllowed: number,
): Promise<ToggleFollowResult> {
  const ids = await loadIds(key);
  const cleanId = String(id);
  const isFollowing = ids.includes(cleanId);

  if (isFollowing) {
    const nextIds = ids.filter(value => value !== cleanId);
    await saveIds(key, nextIds);
    return {
      ids: nextIds,
      changed: true,
    };
  }

  if (ids.length >= maxAllowed) {
    return {
      ids,
      changed: false,
      reason: 'limit_reached',
    };
  }

  const nextIds = normalizeAddedId(ids, cleanId);
  await saveIds(key, nextIds);

  return {
    ids: nextIds,
    changed: true,
  };
}

export async function loadFollowedTeamIds(): Promise<string[]> {
  return loadIds(FOLLOWED_TEAM_IDS_KEY);
}

export async function saveFollowedTeamIds(ids: string[]): Promise<void> {
  await saveIds(FOLLOWED_TEAM_IDS_KEY, ids);
}

export async function toggleFollowedTeam(
  teamId: string,
  maxAllowed: number,
): Promise<ToggleFollowResult> {
  return toggleFollow(FOLLOWED_TEAM_IDS_KEY, teamId, maxAllowed);
}

export async function loadFollowedPlayerIds(): Promise<string[]> {
  const ids = await loadIds(FOLLOWED_PLAYER_IDS_KEY);
  const normalizedIds = normalizeStoredPlayerIds(ids);

  if (normalizedIds.length !== ids.length || normalizedIds.some((id, index) => id !== ids[index])) {
    await saveIds(FOLLOWED_PLAYER_IDS_KEY, normalizedIds);
  }

  return normalizedIds;
}

export async function saveFollowedPlayerIds(ids: string[]): Promise<void> {
  await saveIds(FOLLOWED_PLAYER_IDS_KEY, normalizeStoredPlayerIds(ids));
}

export async function toggleFollowedPlayer(
  playerId: string,
  maxAllowed: number,
): Promise<ToggleFollowResult> {
  return toggleFollow(
    FOLLOWED_PLAYER_IDS_KEY,
    normalizeFollowDiscoveryPlayerId(playerId),
    maxAllowed,
  );
}

export async function loadFollowedLeagueIds(): Promise<string[]> {
  return loadIds(FOLLOWED_LEAGUE_IDS_KEY);
}

export async function saveFollowedLeagueIds(ids: string[]): Promise<void> {
  await saveIds(FOLLOWED_LEAGUE_IDS_KEY, ids);
}

export async function toggleFollowedLeague(
  leagueId: string,
  maxAllowed: number,
): Promise<ToggleFollowResult> {
  return toggleFollow(FOLLOWED_LEAGUE_IDS_KEY, leagueId, maxAllowed);
}

export async function loadFollowedMatchIds(): Promise<string[]> {
  return loadIds(FOLLOWED_MATCH_IDS_KEY);
}

export async function saveFollowedMatchIds(ids: string[]): Promise<void> {
  await saveIds(FOLLOWED_MATCH_IDS_KEY, ids);
}

export async function toggleFollowedMatch(matchId: string): Promise<string[]> {
  const ids = await loadIds(FOLLOWED_MATCH_IDS_KEY);
  const cleanId = String(matchId);
  const exists = ids.includes(cleanId);
  const nextIds = exists ? ids.filter(value => value !== cleanId) : normalizeAddedId(ids, cleanId);
  await saveIds(FOLLOWED_MATCH_IDS_KEY, nextIds);
  return nextIds;
}

function getHideTrendsKey(tab: FollowEntityTab): string {
  return tab === 'teams' ? FOLLOWS_HIDE_TRENDS_TEAMS_KEY : FOLLOWS_HIDE_TRENDS_PLAYERS_KEY;
}

export async function loadHideTrends(tab: FollowEntityTab): Promise<boolean> {
  const key = getHideTrendsKey(tab);
  const payload = await getJsonValue<boolean>(key);
  return Boolean(payload);
}

export async function saveHideTrends(tab: FollowEntityTab, value: boolean): Promise<void> {
  const key = getHideTrendsKey(tab);
  await setJsonValue<boolean>(key, value);
}
