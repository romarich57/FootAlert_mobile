import React from 'react';
import { render, type RenderOptions } from '@testing-library/react-native';
import type { PropsWithChildren, ReactElement } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppPreferencesProvider } from '@ui/app/providers/AppPreferencesProvider';
import { QueryProvider } from '@ui/app/providers/QueryProvider';
import { AppThemeProvider } from '@ui/app/providers/ThemeProvider';
import type { AppPreferences } from '@/shared/types/preferences.types';

const TEST_INITIAL_METRICS = {
  frame: { x: 0, y: 0, width: 375, height: 812 },
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
};

const TEST_HYDRATED_PREFERENCES: AppPreferences = {
  theme: 'system',
  language: 'fr',
  currencyCode: 'EUR',
  measurementSystem: 'metric',
  notificationsEnabled: false,
  updatedAt: '1970-01-01T00:00:00.000Z',
};

function AppTestProviders({ children }: PropsWithChildren) {
  return (
    <SafeAreaProvider initialMetrics={TEST_INITIAL_METRICS}>
      <AppPreferencesProvider testHydratedPreferences={TEST_HYDRATED_PREFERENCES}>
        <AppThemeProvider>
          <QueryProvider
            enablePersistence={false}
            queryOptionsOverrides={{ gcTime: Infinity }}
          >
            {children}
          </QueryProvider>
        </AppThemeProvider>
      </AppPreferencesProvider>
    </SafeAreaProvider>
  );
}

export function renderWithAppProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, {
    wrapper: AppTestProviders,
    ...options,
  });
}
