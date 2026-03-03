import Config from 'react-native-config';
import { Platform } from 'react-native';

import { getAppVersion } from '@data/config/appMeta';
import { isNetworkRequestFailedError } from '@data/api/http/client';
import {
  registerPushToken,
  revokePushToken,
  trackNotificationOpened,
  type PushTokenPayload,
} from '@data/endpoints/notificationsApi';
import type {
  PushTokenPlatform,
  PushTokenProvider,
} from '@data/notifications/pushTokenTypes';
import {
  clearPushRegistrationSnapshot,
  getOrCreatePushDeviceId,
  getPushRegistrationSnapshot,
  savePushRegistrationSnapshot,
} from '@data/storage/pushTokenStorage';
import { isSecureStorageUnavailableError } from '@data/storage/secureStorage';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import type { AppLanguage } from '@/shared/types/preferences.types';

type FirebaseMessagingClient = {
  getToken?: () => Promise<string>;
  onTokenRefresh?: (listener: (token: string) => void) => () => void;
  onNotificationOpenedApp?: (
    listener: (message: { data?: Record<string, unknown> | null | undefined }) => void,
  ) => () => void;
  getInitialNotification?: () => Promise<{ data?: Record<string, unknown> | null | undefined } | null>;
};

let pushRuntimeStarted = false;
const pushRuntimeUnsubscribers: Array<() => void> = [];

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
  const firebaseToken = await resolveFirebasePushToken();
  if (firebaseToken) {
    return firebaseToken;
  }

  const configuredToken = resolveConfiguredPushToken();
  if (configuredToken) {
    return configuredToken;
  }

  if (isDevRuntime()) {
    return resolveSyntheticPushToken(platform, deviceId);
  }

  return null;
}

async function getFirebaseMessagingClient(): Promise<FirebaseMessagingClient | null> {
  const moduleName = '@react-native-firebase/messaging';

  try {
    const imported = await import(moduleName);
    const factory = (imported as { default?: (() => FirebaseMessagingClient) }).default;
    if (typeof factory !== 'function') {
      return null;
    }
    return factory();
  } catch {
    return null;
  }
}

async function resolveFirebasePushToken(): Promise<string | null> {
  const messagingClient = await getFirebaseMessagingClient();
  if (!messagingClient?.getToken) {
    return null;
  }

  try {
    const token = await messagingClient.getToken();
    if (typeof token !== 'string' || token.trim().length === 0) {
      return null;
    }
    return token.trim();
  } catch {
    return null;
  }
}

function extractEventIdFromNotificationData(data: unknown): string | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const eventId = (data as Record<string, unknown>).eventId;
  if (typeof eventId !== 'string' || eventId.trim().length === 0) {
    return null;
  }

  return eventId.trim();
}

async function trackOpenedEventIfPresent(data: unknown): Promise<void> {
  const eventId = extractEventIdFromNotificationData(data);
  if (!eventId) {
    return;
  }

  try {
    const openedCount = await trackNotificationOpened({ eventId });
    getMobileTelemetry().addBreadcrumb('notifications.push.opened_tracked', {
      eventId,
      openedCount,
    });
  } catch (error) {
    if (isNetworkRequestFailedError(error)) {
      getMobileTelemetry().addBreadcrumb('notifications.push.opened_deferred', {
        eventId,
        reason: 'network_unavailable',
      });
      return;
    }

    getMobileTelemetry().trackError(error, {
      feature: 'notifications.opened',
      details: {
        eventId,
      },
    });
  }
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

export async function startPushNotificationRuntime(options: {
  notificationsEnabled: boolean;
  locale: AppLanguage;
}): Promise<void> {
  if (!options.notificationsEnabled) {
    stopPushNotificationRuntime();
    return;
  }

  if (pushRuntimeStarted) {
    return;
  }
  pushRuntimeStarted = true;

  const messagingClient = await getFirebaseMessagingClient();
  if (messagingClient?.onTokenRefresh) {
    const unsubscribeTokenRefresh = messagingClient.onTokenRefresh(() => {
      void syncPushTokenRegistration({
        notificationsEnabled: true,
        locale: options.locale,
      }).catch(error => {
        if (isNetworkRequestFailedError(error)) {
          getMobileTelemetry().addBreadcrumb('notifications.push.refresh_deferred', {
            reason: 'network_unavailable',
          });
          return;
        }

        getMobileTelemetry().trackError(error, {
          feature: 'notifications.refresh',
        });
      });
    });
    pushRuntimeUnsubscribers.push(unsubscribeTokenRefresh);
  }

  if (messagingClient?.onNotificationOpenedApp) {
    const unsubscribeOpened = messagingClient.onNotificationOpenedApp(remoteMessage => {
      void trackOpenedEventIfPresent(remoteMessage?.data);
    });
    pushRuntimeUnsubscribers.push(unsubscribeOpened);
  }

  if (messagingClient?.getInitialNotification) {
    const initialNotification = await messagingClient.getInitialNotification().catch(() => null);
    if (initialNotification) {
      await trackOpenedEventIfPresent(initialNotification.data);
    }
  }

  const notifeeModuleName = '@notifee/react-native';
  try {
    const imported = await import(notifeeModuleName);
    const notifee = (imported as { default?: { onForegroundEvent?: (listener: (event: {
      type: number;
      detail?: { notification?: { data?: Record<string, unknown> | null } };
    }) => void) => () => void } }).default;
    const eventType = (imported as { EventType?: { PRESS?: number } }).EventType;
    if (notifee?.onForegroundEvent && typeof eventType?.PRESS === 'number') {
      const unsubscribeNotifee = notifee.onForegroundEvent(event => {
        if (event.type !== eventType.PRESS) {
          return;
        }

        void trackOpenedEventIfPresent(event.detail?.notification?.data);
      });
      pushRuntimeUnsubscribers.push(unsubscribeNotifee);
    }
  } catch {
    // Optional dependency; silently ignore when not installed.
  }
}

export function stopPushNotificationRuntime(): void {
  while (pushRuntimeUnsubscribers.length > 0) {
    const unsubscribe = pushRuntimeUnsubscribers.pop();
    if (unsubscribe) {
      try {
        unsubscribe();
      } catch {
        // Ignore unsubscribe errors to keep shutdown resilient.
      }
    }
  }

  pushRuntimeStarted = false;
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
