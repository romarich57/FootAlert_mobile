import React from 'react';
import * as ReactNative from 'react-native';
import { renderHook } from '@testing-library/react-native';

import { AppThemeProvider, useAppTheme } from '@ui/app/providers/ThemeProvider';
import { useAppPreferences } from '@ui/app/providers/AppPreferencesProvider';

jest.mock('@ui/app/providers/AppPreferencesProvider', () => ({
  useAppPreferences: jest.fn(),
}));

const mockedUseAppPreferences = jest.mocked(useAppPreferences);

function createPreferencesContext(theme: 'system' | 'light' | 'dark') {
  return {
    preferences: {
      theme,
      language: 'fr' as any,
      currencyCode: 'EUR',
      measurementSystem: 'metric' as any,
      notificationsEnabled: true,
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
    isHydrated: true,
    setThemePreference: jest.fn(async () => undefined),
    setLanguagePreference: jest.fn(async () => undefined),
    setCurrencyCode: jest.fn(async () => undefined),
    setMeasurementSystem: jest.fn(async () => undefined),
    setNotificationsEnabled: jest.fn(async () => undefined),
  };
}

function wrapper({ children }: React.PropsWithChildren) {
  return <AppThemeProvider>{children}</AppThemeProvider>;
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses system light mode when preference is system and scheme is light', () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    mockedUseAppPreferences.mockReturnValue(createPreferencesContext('system'));

    const { result } = renderHook(() => useAppTheme(), { wrapper });

    expect(result.current.mode).toBe('light');
    expect(result.current.preference).toBe('system');
  });

  it('uses explicit dark mode when preference is dark', () => {
    jest.spyOn(ReactNative, 'useColorScheme').mockReturnValue('light');
    mockedUseAppPreferences.mockReturnValue(createPreferencesContext('dark'));

    const { result } = renderHook(() => useAppTheme(), { wrapper });

    expect(result.current.mode).toBe('dark');
    expect(result.current.preference).toBe('dark');
  });
});
