import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

import { AppPreferencesProvider } from '@ui/app/providers/AppPreferencesProvider';
import { NotificationsRuntimeProvider } from '@ui/app/providers/NotificationsRuntimeProvider';
import {
  startPushNotificationRuntime,
  stopPushNotificationRuntime,
  syncPushTokenRegistration,
} from '@data/notifications/pushTokenLifecycle';
import type { AppPreferences } from '@/shared/types/preferences.types';

const mockTelemetry = {
  addBreadcrumb: jest.fn(),
  flush: jest.fn(async () => undefined),
  setUserContext: jest.fn(),
  trackBatch: jest.fn(),
  trackError: jest.fn(),
  trackEvent: jest.fn(),
};

jest.mock('@data/notifications/pushTokenLifecycle', () => ({
  startPushNotificationRuntime: jest.fn(async () => undefined),
  stopPushNotificationRuntime: jest.fn(() => undefined),
  syncPushTokenRegistration: jest.fn(async () => undefined),
}));

jest.mock('@data/telemetry/mobileTelemetry', () => ({
  getMobileTelemetry: () => mockTelemetry,
}));

const mockedStartPushNotificationRuntime = jest.mocked(startPushNotificationRuntime);
const mockedStopPushNotificationRuntime = jest.mocked(stopPushNotificationRuntime);
const mockedSyncPushTokenRegistration = jest.mocked(syncPushTokenRegistration);

const hydratedPreferences: AppPreferences = {
  theme: 'system',
  language: 'fr',
  currencyCode: 'EUR',
  measurementSystem: 'metric',
  notificationsEnabled: true,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderProvider(
  preferences: AppPreferences = hydratedPreferences,
) {
  return render(
    <AppPreferencesProvider testHydratedPreferences={preferences}>
      <NotificationsRuntimeProvider>
        <></>
      </NotificationsRuntimeProvider>
    </AppPreferencesProvider>,
  );
}

describe('NotificationsRuntimeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedStartPushNotificationRuntime.mockResolvedValue(undefined);
    mockedStopPushNotificationRuntime.mockImplementation(() => undefined);
    mockedSyncPushTokenRegistration.mockResolvedValue(undefined);
  });

  it('syncs push registration and starts runtime once hydrated', async () => {
    renderProvider();

    await waitFor(() => {
      expect(mockedSyncPushTokenRegistration).toHaveBeenCalledWith({
        notificationsEnabled: true,
        locale: 'fr',
      });
    });

    expect(mockedStartPushNotificationRuntime).toHaveBeenCalledWith({
      notificationsEnabled: true,
      locale: 'fr',
    });
  });

  it('stops runtime on unmount', async () => {
    const view = renderProvider();

    await waitFor(() => {
      expect(mockedStartPushNotificationRuntime).toHaveBeenCalled();
    });

    view.unmount();
    expect(mockedStopPushNotificationRuntime).toHaveBeenCalled();
  });

  it('records deferred sync when the network is unavailable', async () => {
    mockedSyncPushTokenRegistration.mockRejectedValueOnce(
      new TypeError('Network request failed'),
    );

    renderProvider();

    await waitFor(() => {
      expect(mockTelemetry.addBreadcrumb).toHaveBeenCalledWith(
        'notifications.sync.deferred',
        {
          reason: 'network_unavailable',
        },
      );
    });

    expect(mockTelemetry.trackError).not.toHaveBeenCalled();
  });
});
