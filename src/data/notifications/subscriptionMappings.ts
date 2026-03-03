import type {
  NotificationAlertType,
  NotificationSubscriptionInput,
  NotificationSubscriptionRecord,
} from '@data/endpoints/notificationsApi';

export type AlertTypeMap<TPrefKeys extends string> = Record<TPrefKeys, NotificationAlertType>;

export function buildNotificationSubscriptions<TPrefKeys extends string>(
  toggles: Record<TPrefKeys, boolean>,
  alertTypeMap: AlertTypeMap<TPrefKeys>,
  options: {
    disableAll?: boolean;
  } = {},
): NotificationSubscriptionInput[] {
  return (Object.keys(alertTypeMap) as TPrefKeys[]).map(prefKey => ({
    alertType: alertTypeMap[prefKey],
    enabled: options.disableAll ? false : Boolean(toggles[prefKey]),
  }));
}

export function hydrateNotificationToggles<TPrefKeys extends string>(
  defaults: Record<TPrefKeys, boolean>,
  alertTypeMap: AlertTypeMap<TPrefKeys>,
  subscriptions: NotificationSubscriptionRecord[],
): Record<TPrefKeys, boolean> {
  const enabledByAlertType = new Map(
    subscriptions.map(subscription => [subscription.alertType, subscription.enabled] as const),
  );
  const next = { ...defaults };

  (Object.keys(alertTypeMap) as TPrefKeys[]).forEach(prefKey => {
    const alertType = alertTypeMap[prefKey];
    const isEnabled = enabledByAlertType.get(alertType);
    if (typeof isEnabled === 'boolean') {
      next[prefKey] = isEnabled;
    }
  });

  return next;
}
