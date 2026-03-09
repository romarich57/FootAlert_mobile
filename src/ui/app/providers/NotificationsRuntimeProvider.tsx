import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';

import { isNetworkRequestFailedError } from '@data/api/http/client';
import { appEnv, isMobileValidationMode } from '@data/config/env';
import {
  startPushNotificationRuntime,
  stopPushNotificationRuntime,
  syncPushTokenRegistration,
} from '@data/notifications/pushTokenLifecycle';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import { useAppPreferences } from '@ui/app/providers/AppPreferencesProvider';

export function NotificationsRuntimeProvider({ children }: PropsWithChildren) {
  const {
    preferences: { language, notificationsEnabled },
    isHydrated,
  } = useAppPreferences();
  const shouldSkipNotificationsRuntime =
    isMobileValidationMode('maestro')
    || isMobileValidationMode('perf');

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (shouldSkipNotificationsRuntime) {
      getMobileTelemetry().addBreadcrumb('notifications.validation_mode_skipped', {
        mode: appEnv.mobileValidationMode,
        stage: 'sync',
      });
      return;
    }

    syncPushTokenRegistration({
      notificationsEnabled,
      locale: language,
    }).catch(error => {
      if (isNetworkRequestFailedError(error)) {
        getMobileTelemetry().addBreadcrumb('notifications.sync.deferred', {
          reason: 'network_unavailable',
        });
        return;
      }

      getMobileTelemetry().trackError(error, {
        feature: 'notifications.sync',
      });
    });
  }, [isHydrated, language, notificationsEnabled, shouldSkipNotificationsRuntime]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (shouldSkipNotificationsRuntime) {
      getMobileTelemetry().addBreadcrumb('notifications.validation_mode_skipped', {
        mode: appEnv.mobileValidationMode,
        stage: 'runtime',
      });
      return;
    }

    startPushNotificationRuntime({
      notificationsEnabled,
      locale: language,
    }).catch(error => {
      getMobileTelemetry().trackError(error, {
        feature: 'notifications.runtime',
      });
    });

    return () => {
      stopPushNotificationRuntime();
    };
  }, [isHydrated, language, notificationsEnabled, shouldSkipNotificationsRuntime]);

  return <>{children}</>;
}
