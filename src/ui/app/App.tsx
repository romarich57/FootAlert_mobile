import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { linking } from '@ui/app/navigation/linking';
import { RootNavigator } from '@ui/app/navigation/RootNavigator';
import { useAppBootstrap } from '@ui/app/hooks/useAppBootstrap';
import { useNavigationTelemetry } from '@ui/app/hooks/useNavigationTelemetry';
import { AppPreferencesProvider } from '@ui/app/providers/AppPreferencesProvider';
import { MobileTelemetryProvider } from '@ui/app/providers/MobileTelemetryProvider';
import { NotificationsRuntimeProvider } from '@ui/app/providers/NotificationsRuntimeProvider';
import { QueryProvider } from '@ui/app/providers/QueryProvider';
import { AppThemeProvider, useAppTheme } from '@ui/app/providers/ThemeProvider';
import '@ui/shared/i18n';

function AppContent() {
  const { navigationTheme, statusBarStyle } = useAppTheme();
  const { bootError, isReady } = useAppBootstrap();
  const {
    navigationRef,
    handleNavigationReady,
    handleNavigationStateChange,
  } = useNavigationTelemetry();

  if (bootError) {
    throw bootError;
  }

  if (!isReady) {
    return null;
  }

  return (
    <NavigationContainer
      linking={linking}
      theme={navigationTheme}
      ref={navigationRef}
      onReady={handleNavigationReady}
      onStateChange={handleNavigationStateChange}
    >
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
      <MobileTelemetryProvider>
        <AppPreferencesProvider>
          <NotificationsRuntimeProvider>
            <AppThemeProvider>
              <QueryProvider>
                <AppContent />
              </QueryProvider>
            </AppThemeProvider>
          </NotificationsRuntimeProvider>
        </AppPreferencesProvider>
      </MobileTelemetryProvider>
    </SafeAreaProvider>
  );
}
