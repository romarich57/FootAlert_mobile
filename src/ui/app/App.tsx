import { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getAppVersion } from '@data/config/appMeta';
import { appEnv } from '@data/config/env';
import { requestInAppReviewWithFallback } from '@data/reviews/inAppReview';
import {
  incrementAppLaunchCount,
  isReviewPromptEligible,
  markReviewPrompted,
} from '@data/storage/reviewPromptStorage';
import { linking } from '@ui/app/navigation/linking';
import { RootNavigator } from '@ui/app/navigation/RootNavigator';
import { AppPreferencesProvider } from '@ui/app/providers/AppPreferencesProvider';
import { QueryProvider } from '@ui/app/providers/QueryProvider';
import { AppThemeProvider, useAppTheme } from '@ui/app/providers/ThemeProvider';
import '@ui/shared/i18n';

function AppContent() {
  const { navigationTheme, statusBarStyle } = useAppTheme();

  useEffect(() => {
    if (typeof __DEV__ === 'boolean' && __DEV__) {
      // Helpful when switching ENVFILE (.env / .env.staging) to confirm active API target.
      console.info(`[FootAlert] MOBILE_API_BASE_URL=${appEnv.mobileApiBaseUrl}`);
    }
  }, []);

  useEffect(() => {
    const appVersion = getAppVersion();
    incrementAppLaunchCount()
      .then(async state => {
        const isEligible = isReviewPromptEligible(state, {
          isDevRuntime: typeof __DEV__ === 'boolean' ? __DEV__ : false,
          appVersion,
        });
        if (!isEligible) {
          return;
        }

        const result = await requestInAppReviewWithFallback({
          appStoreUrl: appEnv.appStoreUrl,
          playStoreUrl: appEnv.playStoreUrl,
        });
        if (result === 'prompted' || result === 'fallback_store') {
          await markReviewPrompted(appVersion);
        }
      })
      .catch(() => undefined);
  }, []);

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
