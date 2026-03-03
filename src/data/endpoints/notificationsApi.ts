import {
  bffDelete,
  bffGetSensitive,
  bffPost,
} from '@data/endpoints/bffClient';
import { getOrCreatePushDeviceId } from '@data/storage/pushTokenStorage';
import type {
  PushTokenPlatform,
  PushTokenProvider,
} from '@data/notifications/pushTokenTypes';
export type { PushTokenPlatform, PushTokenProvider } from '@data/notifications/pushTokenTypes';

import type { AppLanguage } from '@/shared/types/preferences.types';

export type NotificationScopeKind = 'match' | 'team' | 'player' | 'competition';
export type NotificationAlertType =
  | 'match_start'
  | 'halftime'
  | 'match_end'
  | 'goal'
  | 'red_card'
  | 'yellow_card'
  | 'assist'
  | 'missed_penalty'
  | 'transfer'
  | 'lineup'
  | 'starting_lineup'
  | 'substitution'
  | 'match_rating'
  | 'match_reminder';

export type PushTokenPayload = {
  token: string;
  deviceId: string;
  platform: PushTokenPlatform;
  provider: PushTokenProvider;
  appVersion: string;
  locale: AppLanguage;
  timezone: string;
};

type PushTokenRegistrationResponse = {
  status: 'registered';
  token: string;
};

export type NotificationSubscriptionInput = {
  alertType: NotificationAlertType;
  enabled: boolean;
};

export type NotificationSubscriptionRecord = NotificationSubscriptionInput & {
  id: string;
  deviceId: string;
  scopeKind: NotificationScopeKind;
  scopeId: string;
  createdAt: string;
  updatedAt: string;
};

type NotificationSubscriptionUpsertPayload = {
  deviceId: string;
  scopeKind: NotificationScopeKind;
  scopeId: string;
  subscriptions: NotificationSubscriptionInput[];
};

type NotificationSubscriptionUpsertResponse = {
  status: 'ok';
  subscriptions: NotificationSubscriptionRecord[];
};

type NotificationSubscriptionListResponse = {
  subscriptions: NotificationSubscriptionRecord[];
};

type NotificationOpenedPayload = {
  eventId: string;
  deviceId: string;
};

type NotificationOpenedResponse = {
  status: 'ok';
  openedCount: number;
};

async function resolveNotificationDeviceId(deviceId?: string): Promise<string> {
  if (deviceId) {
    return deviceId;
  }

  return getOrCreatePushDeviceId();
}

export async function registerPushToken(payload: PushTokenPayload): Promise<void> {
  await bffPost<PushTokenRegistrationResponse, PushTokenPayload>(
    '/notifications/tokens',
    payload,
  );
}

export async function revokePushToken(token: string): Promise<void> {
  await bffDelete(`/notifications/tokens/${encodeURIComponent(token)}`);
}

export async function upsertNotificationSubscriptions(input: {
  scopeKind: NotificationScopeKind;
  scopeId: string;
  subscriptions: NotificationSubscriptionInput[];
  deviceId?: string;
}): Promise<NotificationSubscriptionRecord[]> {
  const deviceId = await resolveNotificationDeviceId(input.deviceId);
  const payload: NotificationSubscriptionUpsertPayload = {
    deviceId,
    scopeKind: input.scopeKind,
    scopeId: input.scopeId,
    subscriptions: input.subscriptions,
  };

  const response = await bffPost<
    NotificationSubscriptionUpsertResponse,
    NotificationSubscriptionUpsertPayload
  >('/notifications/subscriptions', payload);

  return response.subscriptions;
}

export async function getNotificationSubscriptions(input: {
  scopeKind: NotificationScopeKind;
  scopeId: string;
  deviceId?: string;
}): Promise<NotificationSubscriptionRecord[]> {
  const deviceId = await resolveNotificationDeviceId(input.deviceId);
  const response = await bffGetSensitive<NotificationSubscriptionListResponse>(
    '/notifications/subscriptions',
    {
      deviceId,
      scopeKind: input.scopeKind,
      scopeId: input.scopeId,
    },
    {
      scope: 'notifications:write',
    },
  );

  return response.subscriptions;
}

export async function trackNotificationOpened(input: {
  eventId: string;
  deviceId?: string;
}): Promise<number> {
  const payload: NotificationOpenedPayload = {
    eventId: input.eventId,
    deviceId: await resolveNotificationDeviceId(input.deviceId),
  };

  const response = await bffPost<NotificationOpenedResponse, NotificationOpenedPayload>(
    '/notifications/opened',
    payload,
  );

  return response.openedCount;
}
