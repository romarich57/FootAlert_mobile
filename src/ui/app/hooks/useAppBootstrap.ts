import { useNetInfo } from '@react-native-community/netinfo';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { usePowerState } from 'react-native-device-info';

import {
  ApiError,
  isNetworkRequestFailedError,
} from '@data/api/http/client';
import {
  buildBootstrapSnapshotKey,
  hydrateBootstrapIntoQueryCache,
  prefetchWarmEntityRefs,
  readBootstrapSnapshot,
  writeBootstrapSnapshot,
} from '@data/bootstrap/bootstrapHydration';
import {
  registerBackgroundRefresh,
  registerBackgroundRefreshDebugMenuItem,
} from '@data/background/backgroundRefresh';
import { getAppVersion } from '@data/config/appMeta';
import { appEnv, isMobileValidationMode } from '@data/config/env';
import { getCurrentSeasonYear } from '@data/mappers/followsMapper';
import { fetchBootstrapPayload } from '@data/endpoints/bootstrapApi';
import { requestMobileConsentIfNeeded } from '@data/privacy/mobileConsent';
import { requestInAppReviewWithFallback } from '@data/reviews/inAppReview';
import { evaluateDeviceIntegrity } from '@data/security/deviceIntegrity';
import { verifyMobileAttestationStartupHealth } from '@data/security/mobileSessionAuth';
import {
  loadFollowedPlayerIds,
  loadFollowedTeamIds,
} from '@data/storage/followsStorage';
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

const DEFAULT_BOOTSTRAP_DISCOVERY_LIMIT = 8;

function trackBootstrapWarmupFailure(error: unknown): void {
  const telemetry = getMobileTelemetry();

  if (error instanceof ApiError) {
    telemetry.addBreadcrumb('bootstrap.snapshot.remote_failed', {
      status: error.status,
      kind: 'http',
    });
    return;
  }

  if (isNetworkRequestFailedError(error)) {
    telemetry.addBreadcrumb('bootstrap.snapshot.remote_failed', {
      kind: 'transport',
    });
    return;
  }

  telemetry.trackError(error, {
    feature: 'bootstrap.snapshot_warmup',
  });
}

function resolveTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
}

function toApiDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function useAppBootstrap(): AppBootstrapResult {
  const queryClient = useQueryClient();
  const {
    isHydrated,
  } = useAppPreferences();
  const netInfo = useNetInfo();
  const powerState = usePowerState();
  const isDevRuntime = typeof __DEV__ === 'boolean' && __DEV__;
  const [bootError, setBootError] = useState<Error | null>(null);
  const [phase, setPhase] = useState<AppBootstrapPhase>('blocking');
  const [hasCheckedStartupHealth, setHasCheckedStartupHealth] = useState(false);
  const [hasCompletedBootstrapWarmup, setHasCompletedBootstrapWarmup] = useState(false);
  const hasRunDeferredRef = useRef(false);
  const hasRunOpportunisticRef = useRef(false);
  const hasRunBootstrapWarmupRef = useRef(false);
  const isPerfValidationMode = isMobileValidationMode('perf');
  const isOnline =
    netInfo.isInternetReachable ??
    netInfo.isConnected ??
    true;

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
    if (
      phase !== 'blocking' ||
      bootError ||
      !hasCheckedStartupHealth ||
      !isHydrated ||
      !hasCompletedBootstrapWarmup
    ) {
      return;
    }

    setPhase('deferred');
  }, [bootError, hasCheckedStartupHealth, hasCompletedBootstrapWarmup, isHydrated, phase]);

  useEffect(() => {
    if (bootError || !hasCheckedStartupHealth || !isHydrated || hasRunBootstrapWarmupRef.current) {
      return;
    }

    if (isPerfValidationMode) {
      getMobileTelemetry().addBreadcrumb('bootstrap.validation_mode_skipped', {
        mode: appEnv.mobileValidationMode,
        stage: 'bootstrap_warmup',
      });
      setHasCompletedBootstrapWarmup(true);
      hasRunBootstrapWarmupRef.current = true;
      return;
    }

    hasRunBootstrapWarmupRef.current = true;
    const telemetry = getMobileTelemetry();
    const abortController = new AbortController();
    let cancelled = false;

    const runBootstrapWarmup = async () => {
      const timezone = resolveTimezone();
      const today = toApiDateString(new Date());
      const season = getCurrentSeasonYear();
      const [followedTeamIds, followedPlayerIds] = await Promise.all([
        loadFollowedTeamIds(),
        loadFollowedPlayerIds(),
      ]);
      const snapshotKey = buildBootstrapSnapshotKey({
        date: today,
        timezone,
        season,
        followedTeamIds,
        followedPlayerIds,
        discoveryLimit: DEFAULT_BOOTSTRAP_DISCOVERY_LIMIT,
      });

      const localSnapshot = readBootstrapSnapshot(snapshotKey);
      if (localSnapshot) {
        hydrateBootstrapIntoQueryCache({
          queryClient,
          payload: localSnapshot,
          followedTeamIds,
          followedPlayerIds,
        });
        telemetry.trackEvent('bootstrap.snapshot.local_hit', {
          date: today,
          timezone,
        });
      } else {
        telemetry.trackEvent('bootstrap.snapshot.local_miss', {
          date: today,
          timezone,
        });
      }

      if (!isOnline) {
        return;
      }

      const remotePayload = await fetchBootstrapPayload({
        date: today,
        timezone,
        season,
        followedTeamIds,
        followedPlayerIds,
        discoveryLimit: DEFAULT_BOOTSTRAP_DISCOVERY_LIMIT,
        signal: abortController.signal,
      });

      hydrateBootstrapIntoQueryCache({
        queryClient,
        payload: remotePayload,
        followedTeamIds,
        followedPlayerIds,
      });
      writeBootstrapSnapshot(snapshotKey, remotePayload);

      // Prefetch entités chaudes en idle priority (ne bloque pas le boot)
      if (remotePayload.warmEntityRefs.length > 0) {
        prefetchWarmEntityRefs({
          queryClient,
          refs: remotePayload.warmEntityRefs,
          timezone,
          season,
          signal: abortController.signal,
        });
      }

      telemetry.trackEvent('bootstrap.snapshot.remote_applied', {
        date: remotePayload.date,
        timezone: remotePayload.timezone,
        warmRefsCount: remotePayload.warmEntityRefs.length,
      });
    };

    runBootstrapWarmup()
      .catch(error => {
        trackBootstrapWarmupFailure(error);
      })
      .finally(() => {
        if (!cancelled) {
          setHasCompletedBootstrapWarmup(true);
        }
      });

    return () => {
      cancelled = true;
      abortController.abort();
    };
  }, [
    bootError,
    hasCheckedStartupHealth,
    isHydrated,
    isOnline,
    isPerfValidationMode,
    queryClient,
  ]);

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
      queryClient,
    }).catch(() => undefined);
  }, [isHydrated, isOnline, isPerfValidationMode, phase, powerState.lowPowerMode, queryClient]);

  useEffect(() => {
    if (phase !== 'opportunistic' || !isDevRuntime) {
      return;
    }

    registerBackgroundRefreshDebugMenuItem({
      queryClient,
    });
  }, [isDevRuntime, phase, queryClient]);

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
