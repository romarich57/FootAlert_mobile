import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import type { Preview } from '@storybook/react-native';

import { AppPreferencesProvider } from '@ui/app/providers/AppPreferencesProvider';
import { QueryProvider } from '@ui/app/providers/QueryProvider';
import { AppThemeProvider } from '@ui/app/providers/ThemeProvider';
import '@ui/shared/i18n';

const preview: Preview = {
  decorators: [
    Story => (
      <SafeAreaProvider>
        <AppPreferencesProvider>
          <AppThemeProvider>
            <QueryProvider enablePersistence={false}>
              <Story />
            </QueryProvider>
          </AppThemeProvider>
        </AppPreferencesProvider>
      </SafeAreaProvider>
    ),
  ],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
  },
};

export default preview;
