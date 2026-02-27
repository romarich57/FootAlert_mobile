import Config from 'react-native-config';
import { Platform } from 'react-native';

import { getAppVersion } from '@data/config/appMeta';
import { isNetworkRequestFailedError } from '@data/api/http/client';
import {
  registerPushToken,
  revokePushToken,
  type PushTokenPayload,
  type PushTokenPlatform,
  type PushTokenProvider,
} from '@data/endpoints/notificationsApi';
import {
  clearPushRegistrationSnapshot,
  getOrCreatePushDeviceId,
  getPushRegistrationSnapshot,
  savePushRegistrationSnapshot,
} from '@data/storage/pushTokenStorage';
import { isSecureStorageUnavailableError } from '@data/storage/secureStorage';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import type { AppLanguage } from '@/shared/types/preferences.types';

function resolvePushPlatform(): PushTokenPlatform {
  return Platform.OS === 'ios' ? 'ios' : 'android';
}

function resolvePushProvider(platform: PushTokenPlatform): PushTokenProvider {
  return platform === 'ios' ? 'apns' : 'fcm';
}

function resolveTimezone(): string {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return timezone || 'UTC';
}

function resolveSyntheticPushToken(platform: PushTokenPlatform, deviceId: string): string {
  return `footalert-${platform}-${deviceId}`;
}

function resolveConfiguredPushToken(): string | null {
  const configuredToken = Config.MOBILE_PUSH_TOKEN?.trim();
  if (!configuredToken) {
    return null;
  }

  if (!isConfiguredPushTokenAllowed()) {
    getMobileTelemetry().addBreadcrumb('notifications.push.config_token_ignored', {
      runtimeEnv: resolveRuntimeAppEnv() ?? 'unknown',
    });
    return null;
  }

  return configuredToken;
}

function isDevRuntime(): boolean {
  return typeof __DEV__ === 'boolean' ? __DEV__ : false;
}

function resolveRuntimeAppEnv(): string | null {
  const appEnv = Config.APP_ENV?.trim();
  if (!appEnv) {
    return null;
  }

  return appEnv.toLowerCase();
}

export function isConfiguredPushTokenAllowed(
  runtimeAppEnv: string | null = resolveRuntimeAppEnv(),
  devRuntime: boolean = isDevRuntime(),
): boolean {
  if (devRuntime) {
    return true;
  }

  return runtimeAppEnv === 'staging' || runtimeAppEnv === 'qa';
}

function handleSecureStorageAvailabilityError(
  stage: string,
  error: unknown,
): boolean {
  if (!isSecureStorageUnavailableError(error)) {
    return false;
  }

  const telemetry = getMobileTelemetry();
  telemetry.trackError(error, {
    feature: 'notifications.secure_storage',
    details: {
      stage,
    },
  });
  telemetry.addBreadcrumb('notifications.push.secure_storage_unavailable', {
    stage,
  });
  telemetry.addBreadcrumb('notifications.push.sync_disabled', {
    reason: 'secure_storage_unavailable',
  });
  return true;
}

async function resolveCurrentPushToken(
  platform: PushTokenPlatform,
  deviceId: string,
): Promise<string | null> {
  const configuredToken = resolveConfiguredPushToken();
  if (configuredToken) {
    return configuredToken;
  }

  if (isDevRuntime()) {
    return resolveSyntheticPushToken(platform, deviceId);
  }

  return null;
}

function isRegistrationUpToDate(
  snapshot: Awaited<ReturnType<typeof getPushRegistrationSnapshot>>,
  payload: PushTokenPayload,
): boolean {
  if (!snapshot) {
    return false;
  }

  return (
    snapshot.token === payload.token &&
    snapshot.deviceId === payload.deviceId &&
    snapshot.platform === payload.platform &&
    snapshot.provider === payload.provider &&
    snapshot.locale === payload.locale &&
    snapshot.timezone === payload.timezone &&
    snapshot.appVersion === payload.appVersion
  );
}

export async function syncPushTokenRegistration(options: {
  notificationsEnabled: boolean;
  locale: AppLanguage;
}): Promise<void> {
  const { notificationsEnabled, locale } = options;
  let currentSnapshot: Awaited<ReturnType<typeof getPushRegistrationSnapshot>>;
  try {
    currentSnapshot = await getPushRegistrationSnapshot();
  } catch (error) {
    if (handleSecureStorageAvailabilityError('read_snapshot', error)) {
      return;
    }
    throw error;
  }

  if (!notificationsEnabled) {
    if (currentSnapshot?.token) {
      await revokePushToken(currentSnapshot.token).catch(error => {
        if (isNetworkRequestFailedError(error)) {
          getMobileTelemetry().addBreadcrumb('notifications.push.revoke_deferred', {
            reason: 'network_unavailable',
          });
          return;
        }

        getMobileTelemetry().trackError(error, {
          feature: 'notifications.revoke',
        });
      });
    }

    try {
      await clearPushRegistrationSnapshot();
    } catch (error) {
      if (!handleSecureStorageAvailabilityError('clear_snapshot', error)) {
        throw error;
      }
      return;
    }
    getMobileTelemetry().addBreadcrumb('notifications.push.unsynced');
    return;
  }

  const deviceId =
    currentSnapshot?.deviceId ??
    (await (async () => {
      try {
        return await getOrCreatePushDeviceId();
      } catch (error) {
        if (handleSecureStorageAvailabilityError('resolve_device_id', error)) {
          return null;
        }
        throw error;
      }
    })());
  if (!deviceId) {
    return;
  }
  const platform = resolvePushPlatform();
  const provider = resolvePushProvider(platform);
  const token = await resolveCurrentPushToken(platform, deviceId);
  if (!token) {
    getMobileTelemetry().addBreadcrumb('notifications.push.token_unavailable', {
      platform,
    });
    return;
  }

  const payload: PushTokenPayload = {
    token,
    deviceId,
    platform,
    provider,
    appVersion: getAppVersion(),
    locale,
    timezone: resolveTimezone(),
  };

  if (isRegistrationUpToDate(currentSnapshot, payload)) {
    return;
  }

  await registerPushToken(payload);
  try {
    await savePushRegistrationSnapshot(payload);
  } catch (error) {
    if (!handleSecureStorageAvailabilityError('save_snapshot', error)) {
      throw error;
    }
    return;
  }

  getMobileTelemetry().trackEvent('notifications.push.synced', {
    platform,
    provider,
  });
}

export async function revokeRegisteredPushToken(): Promise<void> {
  let currentSnapshot: Awaited<ReturnType<typeof getPushRegistrationSnapshot>>;
  try {
    currentSnapshot = await getPushRegistrationSnapshot();
  } catch (error) {
    if (handleSecureStorageAvailabilityError('read_snapshot', error)) {
      return;
    }
    throw error;
  }

  if (!currentSnapshot?.token) {
    return;
  }

  await revokePushToken(currentSnapshot.token);
  try {
    await clearPushRegistrationSnapshot();
  } catch (error) {
    if (!handleSecureStorageAvailabilityError('clear_snapshot', error)) {
      throw error;
    }
  }
}
