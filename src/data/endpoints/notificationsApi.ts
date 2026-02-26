import { bffDelete, bffPost } from '@data/endpoints/bffClient';

import type { AppLanguage } from '@/shared/types/preferences.types';

export type PushTokenPlatform = 'ios' | 'android';
export type PushTokenProvider = 'apns' | 'fcm';

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

export async function registerPushToken(payload: PushTokenPayload): Promise<void> {
  await bffPost<PushTokenRegistrationResponse, PushTokenPayload>(
    '/notifications/tokens',
    payload,
  );
}

export async function revokePushToken(token: string): Promise<void> {
  await bffDelete(`/notifications/tokens/${encodeURIComponent(token)}`);
}
