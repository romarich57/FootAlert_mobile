import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { linking } from '@ui/app/navigation/linking';
import { RootNavigator } from '@ui/app/navigation/RootNavigator';
import { AppPreferencesProvider } from '@ui/app/providers/AppPreferencesProvider';
import { QueryProvider } from '@ui/app/providers/QueryProvider';
import { AppThemeProvider, useAppTheme } from '@ui/app/providers/ThemeProvider';
import '@ui/shared/i18n';

function AppContent() {
  const { navigationTheme, statusBarStyle } = useAppTheme();

  return (
    <NavigationContainer linking={linking} theme={navigationTheme}>
      <StatusBar
        barStyle={statusBarStyle}
        backgroundColor={navigationTheme.colors.background}
        translucent={false}
      />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppPreferencesProvider>
        <AppThemeProvider>
          <QueryProvider>
            <AppContent />
          </QueryProvider>
        </AppThemeProvider>
      </AppPreferencesProvider>
    </SafeAreaProvider>
  );
}
