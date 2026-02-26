import { useCallback, useEffect, useRef } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { getAppVersion } from '@data/config/appMeta';
import { appEnv } from '@data/config/env';
import { requestInAppReviewWithFallback } from '@data/reviews/inAppReview';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import {
  incrementAppLaunchCount,
  isReviewPromptEligible,
  markReviewPrompted,
} from '@data/storage/reviewPromptStorage';
import { linking } from '@ui/app/navigation/linking';
import {
  buildRouteTransitionKey,
  shouldTrackRouteChangeEvent,
} from '@ui/app/navigation/navigationTelemetry';
import { RootNavigator } from '@ui/app/navigation/RootNavigator';
import type { RootStackParamList } from '@ui/app/navigation/types';
import { AppPreferencesProvider } from '@ui/app/providers/AppPreferencesProvider';
import { MobileTelemetryProvider } from '@ui/app/providers/MobileTelemetryProvider';
import { QueryProvider } from '@ui/app/providers/QueryProvider';
import { AppThemeProvider, useAppTheme } from '@ui/app/providers/ThemeProvider';
import '@ui/shared/i18n';

function AppContent() {
  const { navigationTheme, statusBarStyle } = useAppTheme();
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const currentRouteNameRef = useRef<string | undefined>(undefined);
  const lastTrackedNavigationEventRef = useRef<{
    lastTrackedAtMs: number;
    lastTransitionKey: string | null;
  }>({
    lastTrackedAtMs: 0,
    lastTransitionKey: null,
  });

  useEffect(() => {
    if (typeof __DEV__ === 'boolean' && __DEV__) {
      // Helpful when switching ENVFILE (.env / .env.staging) to confirm active API target.
      console.info(`[FootAlert] MOBILE_API_BASE_URL=${appEnv.mobileApiBaseUrl}`);
    }
  }, []);

  useEffect(() => {
    getMobileTelemetry().setUserContext({
      appVersion: getAppVersion(),
    });
  }, []);

  const handleNavigationReady = useCallback(() => {
    const currentRoute = navigationRef.getCurrentRoute()?.name;
    if (!currentRoute) {
      return;
    }

    currentRouteNameRef.current = currentRoute;
    getMobileTelemetry().addBreadcrumb('navigation.ready', {
      route: currentRoute,
    });
  }, [navigationRef]);

  const handleNavigationStateChange = useCallback(() => {
    const previousRoute = currentRouteNameRef.current;
    const currentRoute = navigationRef.getCurrentRoute()?.name;

    if (!currentRoute || previousRoute === currentRoute) {
      return;
    }

    getMobileTelemetry().addBreadcrumb('navigation.route_change', {
      from: previousRoute ?? null,
      to: currentRoute,
    });
    const nowMs = Date.now();
    const transitionKey = buildRouteTransitionKey(previousRoute, currentRoute);
    const shouldTrack = shouldTrackRouteChangeEvent(
      lastTrackedNavigationEventRef.current,
      transitionKey,
      nowMs,
    );

    if (shouldTrack) {
      getMobileTelemetry().trackEvent('navigation.route_change', {
        from: previousRoute ?? null,
        to: currentRoute,
      });
      lastTrackedNavigationEventRef.current = {
        lastTrackedAtMs: nowMs,
        lastTransitionKey: transitionKey,
      };
    }

    currentRouteNameRef.current = currentRoute;
  }, [navigationRef]);

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
          <AppThemeProvider>
            <QueryProvider>
              <AppContent />
            </QueryProvider>
          </AppThemeProvider>
        </AppPreferencesProvider>
      </MobileTelemetryProvider>
    </SafeAreaProvider>
  );
}
