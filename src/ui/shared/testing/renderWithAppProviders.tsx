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
  language: 'en',
  currencyCode: 'EUR',
  measurementSystem: 'metric',
  notificationsEnabled: false,
  updatedAt: '1970-01-01T00:00:00.000Z',
};

type RenderWithAppProvidersOptions = Omit<RenderOptions, 'wrapper'> & {
  preferences?: Partial<AppPreferences>;
};

function AppTestProviders({
  children,
  preferences,
}: PropsWithChildren<{ preferences?: Partial<AppPreferences> }>) {
  const hydratedPreferences = {
    ...TEST_HYDRATED_PREFERENCES,
    ...preferences,
  };

  return (
    <SafeAreaProvider initialMetrics={TEST_INITIAL_METRICS}>
      <AppPreferencesProvider testHydratedPreferences={hydratedPreferences}>
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
  options?: RenderWithAppProvidersOptions,
) {
  const { preferences, ...renderOptions } = options ?? {};

  return render(ui, {
    wrapper: props => <AppTestProviders {...props} preferences={preferences} />,
    ...renderOptions,
  });
}
