import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationLightTheme,
  type Theme as NavigationTheme,
} from '@react-navigation/native';
import type { PropsWithChildren } from 'react';
import { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { useAppPreferences } from '@ui/app/providers/AppPreferencesProvider';
import { darkThemeColors, lightThemeColors, type ThemeColors } from '@ui/shared/theme/theme';
import type { ThemePreference } from '@/shared/types/preferences.types';

type ThemeMode = 'light' | 'dark';

type AppThemeContextValue = {
  preference: ThemePreference;
  mode: ThemeMode;
  colors: ThemeColors;
  navigationTheme: NavigationTheme;
  statusBarStyle: 'light-content' | 'dark-content';
};

const AppThemeContext = createContext<AppThemeContextValue | null>(null);

function buildNavigationTheme(mode: ThemeMode, colors: ThemeColors): NavigationTheme {
  const baseTheme = mode === 'dark' ? NavigationDarkTheme : NavigationLightTheme;

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };
}

export function AppThemeProvider({ children }: PropsWithChildren) {
  const { preferences } = useAppPreferences();
  const colorScheme = useColorScheme();

  const mode: ThemeMode = useMemo(() => {
    if (preferences.theme === 'system') {
      return colorScheme === 'dark' ? 'dark' : 'light';
    }

    return preferences.theme;
  }, [colorScheme, preferences.theme]);

  const value = useMemo<AppThemeContextValue>(() => {
    const colors = mode === 'dark' ? darkThemeColors : lightThemeColors;

    return {
      preference: preferences.theme,
      mode,
      colors,
      navigationTheme: buildNavigationTheme(mode, colors),
      statusBarStyle: mode === 'dark' ? 'light-content' : 'dark-content',
    };
  }, [mode, preferences.theme]);

  return <AppThemeContext.Provider value={value}>{children}</AppThemeContext.Provider>;
}

export function useAppTheme(): AppThemeContextValue {
  const context = useContext(AppThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used inside AppThemeProvider');
  }
  return context;
}
