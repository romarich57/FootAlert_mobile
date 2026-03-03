export const notificationScopeKinds = [
  'match',
  'team',
  'player',
  'competition',
] as const;

export type NotificationScopeKind = (typeof notificationScopeKinds)[number];

export const notificationAlertTypes = [
  'match_start',
  'halftime',
  'match_end',
  'goal',
  'red_card',
  'yellow_card',
  'assist',
  'missed_penalty',
  'transfer',
  'lineup',
  'starting_lineup',
  'substitution',
  'match_rating',
  'match_reminder',
] as const;

export type NotificationAlertType = (typeof notificationAlertTypes)[number];

export const notificationDeviceStatuses = [
  'active',
  'revoked',
  'invalid',
] as const;

export type NotificationDeviceStatus = (typeof notificationDeviceStatuses)[number];

export const notificationDeliveryStatuses = [
  'pending',
  'deferred',
  'sent',
  'failed',
  'invalid_token',
  'opened',
] as const;

export type NotificationDeliveryStatus = (typeof notificationDeliveryStatuses)[number];

export const notificationEventStatuses = [
  'received',
  'queued',
  'processed',
  'failed',
] as const;

export type NotificationEventStatus = (typeof notificationEventStatuses)[number];

export type StoredNotificationDevice = {
  id: string;
  authSubject: string;
  deviceId: string;
  tokenHash: string;
  tokenCiphertext: string;
  platform: 'ios' | 'android';
  provider: 'apns' | 'fcm';
  locale: 'fr' | 'en';
  timezone: string;
  appVersion: string;
  status: NotificationDeviceStatus;
  lastSeenAt: string;
  createdAt: string;
  updatedAt: string;
};

export type NotificationEventPayload = {
  source: string;
  externalEventId: string;
  alertType: NotificationAlertType;
  occurredAt: string;
  fixtureId: string | null;
  competitionId: string | null;
  teamIds: string[];
  playerIds: string[];
  title: string;
  body: string;
  payload: Record<string, unknown>;
};

export type StoredNotificationEvent = NotificationEventPayload & {
  id: string;
  status: NotificationEventStatus;
  createdAt: string;
  updatedAt: string;
};

export type NotificationSubscriptionRecord = {
  id: string;
  deviceId: string;
  scopeKind: NotificationScopeKind;
  scopeId: string;
  alertType: NotificationAlertType;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type NotificationDeliveryRecord = {
  id: string;
  eventId: string;
  deviceId: string;
  alertType: NotificationAlertType;
  status: NotificationDeliveryStatus;
  attempts: number;
  providerMessageId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  sentAt: string | null;
  openedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationSubscriptionUpsert = {
  authSubject: string;
  deviceId: string;
  scopeKind: NotificationScopeKind;
  scopeId: string;
  subscriptions: Array<{
    alertType: NotificationAlertType;
    enabled: boolean;
  }>;
};
