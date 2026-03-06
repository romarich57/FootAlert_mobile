import { useCallback, useRef } from 'react';
import { useNavigationContainerRef } from '@react-navigation/native';

import {
  buildRouteTransitionKey,
  shouldTrackRouteChangeEvent,
} from '@ui/app/navigation/navigationTelemetry';
import type { RootStackParamList } from '@ui/app/navigation/types';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

export function useNavigationTelemetry() {
  const navigationRef = useNavigationContainerRef<RootStackParamList>();
  const currentRouteNameRef = useRef<string | undefined>(undefined);
  const lastTrackedNavigationEventRef = useRef<{
    lastTrackedAtMs: number;
    lastTransitionKey: string | null;
  }>({
    lastTrackedAtMs: 0,
    lastTransitionKey: null,
  });

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

  return {
    navigationRef,
    handleNavigationReady,
    handleNavigationStateChange,
  };
}
