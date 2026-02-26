import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  AppPreferencesProvider,
  useAppPreferences,
} from '@ui/app/providers/AppPreferencesProvider';
import i18n from '@ui/shared/i18n';
import { syncPushTokenRegistration } from '@data/notifications/pushTokenLifecycle';
import { loadAppPreferences, updateAppPreferences } from '@data/storage/appPreferencesStorage';
import type { AppPreferences } from '@/shared/types/preferences.types';

jest.mock('@data/notifications/pushTokenLifecycle', () => ({
  syncPushTokenRegistration: jest.fn(async () => undefined),
}));

jest.mock('@data/storage/appPreferencesStorage', () => ({
  loadAppPreferences: jest.fn(),
  updateAppPreferences: jest.fn(),
}));

const mockedSyncPushTokenRegistration = jest.mocked(syncPushTokenRegistration);
const mockedLoadAppPreferences = jest.mocked(loadAppPreferences);
const mockedUpdateAppPreferences = jest.mocked(updateAppPreferences);

const initialPreferences: AppPreferences = {
  theme: 'system',
  language: 'fr',
  currencyCode: 'EUR',
  measurementSystem: 'metric',
  notificationsEnabled: true,
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function wrapper({ children }: React.PropsWithChildren) {
  return <AppPreferencesProvider>{children}</AppPreferencesProvider>;
}

describe('AppPreferencesProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedSyncPushTokenRegistration.mockResolvedValue(undefined);
    mockedLoadAppPreferences.mockResolvedValue(initialPreferences);
    mockedUpdateAppPreferences.mockImplementation(async partial => ({
      ...initialPreferences,
      ...partial,
      updatedAt: '2026-01-01T00:00:01.000Z',
    }));
  });

  it('hydrates preferences and marks provider as ready', async () => {
    const { result } = renderHook(() => useAppPreferences(), { wrapper });

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });

    expect(result.current.preferences.language).toBe('fr');
  });

  it('applies language changes via storage update', async () => {
    const changeLanguageSpy = jest
      .spyOn(i18n, 'changeLanguage')
      .mockResolvedValue(undefined as never);

    const { result } = renderHook(() => useAppPreferences(), { wrapper });

    await waitFor(() => {
      expect(result.current.isHydrated).toBe(true);
    });
    changeLanguageSpy.mockClear();

    await act(async () => {
      await result.current.setLanguagePreference('en');
    });

    expect(mockedUpdateAppPreferences).toHaveBeenCalledWith({ language: 'en' });
    await waitFor(() => {
      expect(changeLanguageSpy).toHaveBeenCalledWith('en');
    });
  });

  it('supports synchronous hydrated mode for tests', () => {
    function syncWrapper({ children }: React.PropsWithChildren) {
      return (
        <AppPreferencesProvider testHydratedPreferences={initialPreferences}>
          {children}
        </AppPreferencesProvider>
      );
    }

    const { result } = renderHook(() => useAppPreferences(), { wrapper: syncWrapper });
    expect(result.current.isHydrated).toBe(true);
    expect(result.current.preferences.language).toBe('fr');
  });
});
