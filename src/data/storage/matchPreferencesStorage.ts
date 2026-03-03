import type { MatchNotificationPrefs } from '@domain/contracts/matches.types';
import { appEnv } from '@data/config/env';
import { getJsonValue, setJsonValue } from '@data/storage/asyncStorage';
import {
  getNotificationSubscriptions,
  upsertNotificationSubscriptions,
  type NotificationAlertType,
  type NotificationSubscriptionInput,
  type NotificationSubscriptionRecord,
} from '@data/endpoints/notificationsApi';

export const DEFAULT_MATCH_NOTIFICATION_PREFS: MatchNotificationPrefs = {
  goal: true,
  redCard: true,
  start: true,
  end: true,
};

const MATCH_PREF_ALERT_MAP: Array<{
  key: keyof MatchNotificationPrefs;
  alertType: NotificationAlertType;
}> = [
  { key: 'start', alertType: 'match_start' },
  { key: 'end', alertType: 'match_end' },
  { key: 'goal', alertType: 'goal' },
  { key: 'redCard', alertType: 'red_card' },
];

function getPreferencesKey(fixtureId: string): string {
  return `match_notifications_${fixtureId}`;
}

export async function loadMatchNotificationPrefs(
  fixtureId: string,
): Promise<MatchNotificationPrefs> {
  const key = getPreferencesKey(fixtureId);
  if (appEnv.notificationsMatchBackendEnabled) {
    try {
      const subscriptions = await getNotificationSubscriptions({
        scopeKind: 'match',
        scopeId: fixtureId,
      });
      const prefs = mapSubscriptionsToPrefs(subscriptions);
      await setJsonValue<MatchNotificationPrefs>(key, prefs);
      return prefs;
    } catch {
      // Fallback to local cache when offline or backend unavailable.
    }
  }

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

  if (appEnv.notificationsMatchBackendEnabled) {
    try {
      await upsertNotificationSubscriptions({
        scopeKind: 'match',
        scopeId: fixtureId,
        subscriptions: mapPrefsToSubscriptions(prefs),
      });
    } catch {
      // Keep local cache as source of truth until sync succeeds.
    }
  }
}

function mapPrefsToSubscriptions(
  prefs: MatchNotificationPrefs,
): NotificationSubscriptionInput[] {
  return MATCH_PREF_ALERT_MAP.map(entry => ({
    alertType: entry.alertType,
    enabled: prefs[entry.key],
  }));
}

function mapSubscriptionsToPrefs(
  subscriptions: NotificationSubscriptionRecord[],
): MatchNotificationPrefs {
  const byAlertType = new Map(
    subscriptions.map(subscription => [subscription.alertType, subscription.enabled] as const),
  );

  return {
    ...DEFAULT_MATCH_NOTIFICATION_PREFS,
    start: byAlertType.get('match_start') ?? DEFAULT_MATCH_NOTIFICATION_PREFS.start,
    end: byAlertType.get('match_end') ?? DEFAULT_MATCH_NOTIFICATION_PREFS.end,
    goal: byAlertType.get('goal') ?? DEFAULT_MATCH_NOTIFICATION_PREFS.goal,
    redCard: byAlertType.get('red_card') ?? DEFAULT_MATCH_NOTIFICATION_PREFS.redCard,
  };
}
