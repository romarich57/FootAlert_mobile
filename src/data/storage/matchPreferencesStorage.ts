import type { MatchNotificationPrefs } from '@ui/features/matches/types/matches.types';
import { getJsonValue, setJsonValue } from '@data/storage/asyncStorage';

export const DEFAULT_MATCH_NOTIFICATION_PREFS: MatchNotificationPrefs = {
  goal: true,
  redCard: true,
  start: true,
  end: true,
};

function getPreferencesKey(fixtureId: string): string {
  return `match_notifications_${fixtureId}`;
}

export async function loadMatchNotificationPrefs(
  fixtureId: string,
): Promise<MatchNotificationPrefs> {
  const key = getPreferencesKey(fixtureId);
  const payload = await getJsonValue<MatchNotificationPrefs>(key);

  if (!payload) {
    return DEFAULT_MATCH_NOTIFICATION_PREFS;
  }

  return {
    ...DEFAULT_MATCH_NOTIFICATION_PREFS,
    ...payload,
  };
}

export async function saveMatchNotificationPrefs(
  fixtureId: string,
  prefs: MatchNotificationPrefs,
): Promise<void> {
  const key = getPreferencesKey(fixtureId);
  await setJsonValue<MatchNotificationPrefs>(key, prefs);
}
