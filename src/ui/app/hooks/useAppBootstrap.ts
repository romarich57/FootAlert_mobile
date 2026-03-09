import { useNetInfo } from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { usePowerState } from 'react-native-device-info';

import { registerBackgroundRefresh } from '@data/background/backgroundRefresh';
import { getAppVersion } from '@data/config/appMeta';
import { appEnv, isMobileValidationMode } from '@data/config/env';
import { requestMobileConsentIfNeeded } from '@data/privacy/mobileConsent';
import { requestInAppReviewWithFallback } from '@data/reviews/inAppReview';
import { evaluateDeviceIntegrity } from '@data/security/deviceIntegrity';
import { verifyMobileAttestationStartupHealth } from '@data/security/mobileSessionAuth';
import {
  incrementAppLaunchCount,
  isReviewPromptEligible,
  markReviewPrompted,
} from '@data/storage/reviewPromptStorage';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import { useAppPreferences } from '@ui/app/providers/AppPreferencesProvider';

export type AppBootstrapPhase = 'blocking' | 'deferred' | 'opportunistic';

export type AppBootstrapResult = {
  isReady: boolean;
  bootError: Error | null;
  phase: AppBootstrapPhase;
};

export function useAppBootstrap(): AppBootstrapResult {
  const {
    isHydrated,
  } = useAppPreferences();
  const netInfo = useNetInfo();
  const powerState = usePowerState();
  const isDevRuntime = typeof __DEV__ === 'boolean' && __DEV__;
  const [bootError, setBootError] = useState<Error | null>(null);
  const [phase, setPhase] = useState<AppBootstrapPhase>('blocking');
  const [hasCheckedStartupHealth, setHasCheckedStartupHealth] = useState(false);
  const hasRunDeferredRef = useRef(false);
  const hasRunOpportunisticRef = useRef(false);
  const isPerfValidationMode = isMobileValidationMode('perf');

  useEffect(() => {
    if (isDevRuntime) {
      // Helpful when switching ENVFILE (.env / .env.staging) to confirm active API target.
      console.info(`[FootAlert] MOBILE_API_BASE_URL=${appEnv.mobileApiBaseUrl}`);
    }
  }, [isDevRuntime]);

  useEffect(() => {
    if (hasCheckedStartupHealth) {
      return;
    }

    try {
      verifyMobileAttestationStartupHealth();
    } catch (error) {
      const normalizedError =
        error instanceof Error
          ? error
          : new Error('Unknown mobile attestation startup error.');

      if (isDevRuntime) {
        // Keep dev sessions usable when native attestation bridge modules are not linked yet.
        console.info(`[FootAlert] ${normalizedError.message}`);
        setHasCheckedStartupHealth(true);
        return;
      }

      setBootError(normalizedError);
    } finally {
      setHasCheckedStartupHealth(true);
    }
  }, [hasCheckedStartupHealth, isDevRuntime]);

  useEffect(() => {
    if (phase !== 'blocking' || bootError || !hasCheckedStartupHealth || !isHydrated) {
      return;
    }

    setPhase('deferred');
  }, [bootError, hasCheckedStartupHealth, isHydrated, phase]);

  useEffect(() => {
    getMobileTelemetry().addBreadcrumb('bootstrap.phase', {
      phase,
      isHydrated,
    });
  }, [isHydrated, phase]);

  useEffect(() => {
    if (phase !== 'deferred' || hasRunDeferredRef.current) {
      return;
    }

    hasRunDeferredRef.current = true;
    getMobileTelemetry().setUserContext({
      appVersion: getAppVersion(),
    });

    if (isPerfValidationMode) {
      getMobileTelemetry().addBreadcrumb('bootstrap.validation_mode_skipped', {
        mode: appEnv.mobileValidationMode,
        stage: 'deferred',
      });
      setPhase('opportunistic');
      return;
    }

    requestMobileConsentIfNeeded()
      .then(snapshot => {
        getMobileTelemetry().addBreadcrumb('privacy.mobile_consent.synced', {
          status: snapshot.status,
          source: snapshot.source,
        });
      })
      .catch(error => {
        getMobileTelemetry().trackError(error, {
          feature: 'privacy.mobile_consent.sync',
        });
      })
      .finally(() => {
        setPhase('opportunistic');
      });
  }, [isPerfValidationMode, phase]);

  const isOnline =
    netInfo.isInternetReachable ??
    netInfo.isConnected ??
    true;

  useEffect(() => {
    if (phase !== 'opportunistic') {
      return;
    }

    if (isPerfValidationMode) {
      getMobileTelemetry().addBreadcrumb('bootstrap.validation_mode_skipped', {
        mode: appEnv.mobileValidationMode,
        stage: 'background_refresh',
      });
      return;
    }

    registerBackgroundRefresh({
      isHydrated,
      isOnline,
      lowPowerMode: Boolean(powerState.lowPowerMode),
    }).catch(() => undefined);
  }, [isHydrated, isOnline, isPerfValidationMode, phase, powerState.lowPowerMode]);

  useEffect(() => {
    if (phase !== 'opportunistic' || hasRunOpportunisticRef.current) {
      return;
    }

    hasRunOpportunisticRef.current = true;

    if (isPerfValidationMode) {
      getMobileTelemetry().addBreadcrumb('bootstrap.validation_mode_skipped', {
        mode: appEnv.mobileValidationMode,
        stage: 'opportunistic',
      });
      return;
    }

    evaluateDeviceIntegrity().catch(() => undefined);

    const appStateSubscription = AppState.addEventListener('change', nextState => {
      if (nextState === 'active') {
        evaluateDeviceIntegrity(true).catch(() => undefined);
      }
    });

    const appVersion = getAppVersion();
    incrementAppLaunchCount()
      .then(async state => {
        const isEligible = isReviewPromptEligible(state, {
          isDevRuntime,
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

    return () => {
      appStateSubscription.remove();
    };
  }, [isDevRuntime, isPerfValidationMode, phase]);

  return {
    isReady: phase !== 'blocking' && !bootError,
    bootError,
    phase,
  };
}
