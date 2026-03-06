import type { PropsWithChildren } from 'react';
import { useEffect } from 'react';

import { isNetworkRequestFailedError } from '@data/api/http/client';
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

  useEffect(() => {
    if (!isHydrated) {
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
  }, [isHydrated, language, notificationsEnabled]);

  useEffect(() => {
    if (!isHydrated) {
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
  }, [isHydrated, language, notificationsEnabled]);

  return <>{children}</>;
}
