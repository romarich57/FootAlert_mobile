import { getJsonValue, setJsonValue } from '@data/storage/asyncStorage';
import type { FollowEntityTab } from '@ui/features/follows/types/follows.types';

export const FOLLOWED_TEAM_IDS_KEY = 'followed_team_ids';
export const FOLLOWED_PLAYER_IDS_KEY = 'followed_player_ids';
export const FOLLOWED_LEAGUE_IDS_KEY = 'followed_league_ids';
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

function normalizeAddedId(ids: string[], id: string): string[] {
  const cleanId = String(id);
  const withoutId = ids.filter(value => value !== cleanId);
  return [cleanId, ...withoutId];
}

async function loadIds(key: string): Promise<string[]> {
  const payload = await getJsonValue<unknown>(key);
  return sanitizeIds(payload);
}

async function saveIds(key: string, ids: string[]): Promise<void> {
  await setJsonValue<string[]>(key, ids);
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
  return loadIds(FOLLOWED_PLAYER_IDS_KEY);
}

export async function saveFollowedPlayerIds(ids: string[]): Promise<void> {
  await saveIds(FOLLOWED_PLAYER_IDS_KEY, ids);
}

export async function toggleFollowedPlayer(
  playerId: string,
  maxAllowed: number,
): Promise<ToggleFollowResult> {
  return toggleFollow(FOLLOWED_PLAYER_IDS_KEY, playerId, maxAllowed);
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
