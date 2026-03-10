import { DevSettings, Platform } from 'react-native';
import type { QueryClient } from '@tanstack/react-query';
import BackgroundFetch from 'react-native-background-fetch';

import { appEnv } from '@data/config/env';
import { runGarbageCollection } from '@data/db/garbageCollector';
import { fetchAllLeagues } from '@data/endpoints/competitionsApi';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';
import {
  buildMatchesQueryResult,
  MATCHES_QUERY_STALE_TIME_MS,
  shouldRetryMatchesQuery,
} from '@data/matches/matchesQueryData';
import { queryKeys } from '@data/query/queryKeys';

const BG_REFRESH_TASK_ID = 'com.footalert.app.refresh';
const BG_MIN_FETCH_INTERVAL_MINUTES = 15;

let hasRegisteredBackgroundRefresh = false;
let hasRegisteredBackgroundRefreshDebugMenuItem = false;
let lastBackgroundRefreshRunAtMs = 0;

export type BackgroundRefreshPolicy = 'shared-package';
export const BACKGROUND_REFRESH_POLICY: BackgroundRefreshPolicy = 'shared-package';

export type BackgroundRefreshEligibilityReason =
  | 'allowed'
  | 'unsupported_platform'
  | 'already_registered'
  | 'not_hydrated'
  | 'offline'
  | 'low_power_mode'
  | 'recent_run';

export type BackgroundRefreshEligibilityInput = {
  isHydrated?: boolean;
  isOnline?: boolean;
  lowPowerMode?: boolean;
  nowMs?: number;
  minIntervalMs?: number;
  queryClient?: QueryClient;
};

export type BackgroundRefreshEligibilityResult = {
  allowed: boolean;
  reason: BackgroundRefreshEligibilityReason;
};

export type BackgroundRefreshDebugInput = {
  queryClient?: QueryClient;
  source?: 'dev_menu' | 'debug_helper';
};

function toApiDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function resolveTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
}

function isDevRuntime(): boolean {
  return typeof __DEV__ === 'boolean' && __DEV__;
}

async function runBackgroundRefresh(params: {
  queryClient?: QueryClient;
  source: 'scheduled' | 'dev_menu' | 'debug_helper';
}): Promise<void> {
  const { queryClient, source } = params;
  const today = toApiDateString(new Date());
  const timezone = resolveTimezone();
  const startedAt = Date.now();

  if (queryClient) {
    await Promise.allSettled([
      queryClient.prefetchQuery({
        queryKey: queryKeys.competitions.catalog(),
        staleTime: 10 * 60_000,
        queryFn: ({ signal }) => fetchAllLeagues(signal),
      }),
      queryClient.prefetchQuery({
        queryKey: queryKeys.matches(today, timezone),
        staleTime: MATCHES_QUERY_STALE_TIME_MS,
        retry: shouldRetryMatchesQuery,
        queryFn: ({ signal }) => buildMatchesQueryResult({ date: today, timezone, signal }),
      }),
    ]);
  } else {
    await Promise.allSettled([
      fetchAllLeagues(),
      buildMatchesQueryResult({
        date: today,
        timezone,
      }),
    ]);
  }

  const garbageCollectionResult = runGarbageCollection();
  lastBackgroundRefreshRunAtMs = Date.now();
  getMobileTelemetry().trackEvent('background.refresh.completed', {
    date: today,
    timezone,
    source,
    durationMs: Date.now() - startedAt,
    gcDeletedTeams: garbageCollectionResult.deletedByType.team,
    gcDeletedPlayers: garbageCollectionResult.deletedByType.player,
    gcDeletedCompetitions: garbageCollectionResult.deletedByType.competition,
    gcDeletedMatches: garbageCollectionResult.deletedByType.match,
    gcDeletedMatchesByDate: garbageCollectionResult.matchesByDateDeleted,
    dbSizeBytes: garbageCollectionResult.dbSizeBytes,
  });
  getMobileTelemetry().addBreadcrumb('background.refresh.completed', {
    date: today,
    timezone,
  });
}

export function isBackgroundRefreshEligible(
  input: BackgroundRefreshEligibilityInput = {},
): BackgroundRefreshEligibilityResult {
  const nowMs = input.nowMs ?? Date.now();
  const minIntervalMs = input.minIntervalMs ?? appEnv.matchesBatterySaverRefreshIntervalMs;

  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return {
      allowed: false,
      reason: 'unsupported_platform',
    };
  }

  if (hasRegisteredBackgroundRefresh) {
    return {
      allowed: false,
      reason: 'already_registered',
    };
  }

  if (input.isHydrated === false) {
    return {
      allowed: false,
      reason: 'not_hydrated',
    };
  }

  if (input.isOnline === false) {
    return {
      allowed: false,
      reason: 'offline',
    };
  }

  if (input.lowPowerMode === true) {
    return {
      allowed: false,
      reason: 'low_power_mode',
    };
  }

  if (
    lastBackgroundRefreshRunAtMs > 0 &&
    nowMs - lastBackgroundRefreshRunAtMs < minIntervalMs
  ) {
    return {
      allowed: false,
      reason: 'recent_run',
    };
  }

  return {
    allowed: true,
    reason: 'allowed',
  };
}

export async function registerBackgroundRefresh(
  input: BackgroundRefreshEligibilityInput = {},
): Promise<void> {
  const eligibility = isBackgroundRefreshEligible(input);
  if (!eligibility.allowed) {
    getMobileTelemetry().trackEvent('background.refresh.skipped', {
      policy: BACKGROUND_REFRESH_POLICY,
      platform: Platform.OS,
      reason: eligibility.reason,
    });
    getMobileTelemetry().addBreadcrumb('background.refresh.skipped', {
      policy: BACKGROUND_REFRESH_POLICY,
      platform: Platform.OS,
      reason: eligibility.reason,
    });
    return;
  }

  try {
    const status = await BackgroundFetch.configure(
      {
        minimumFetchInterval: BG_MIN_FETCH_INTERVAL_MINUTES,
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,
        requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
      },
      async taskId => {
        try {
          await runBackgroundRefresh({
            queryClient: input.queryClient,
            source: 'scheduled',
          });
        } catch (error) {
          getMobileTelemetry().trackError(error, {
            feature: 'background.refresh',
          });
        } finally {
          BackgroundFetch.finish(taskId);
        }
      },
      taskId => {
        BackgroundFetch.finish(taskId);
      },
    );

    await BackgroundFetch.scheduleTask({
      taskId: BG_REFRESH_TASK_ID,
      delay: appEnv.matchesBatterySaverRefreshIntervalMs,
      periodic: true,
      stopOnTerminate: false,
      enableHeadless: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
      forceAlarmManager: false,
    });

    hasRegisteredBackgroundRefresh = true;
    getMobileTelemetry().trackEvent('background.refresh.registered', {
      status,
      taskId: BG_REFRESH_TASK_ID,
      policy: BACKGROUND_REFRESH_POLICY,
    });
    getMobileTelemetry().addBreadcrumb('background.refresh.registered', {
      status,
      taskId: BG_REFRESH_TASK_ID,
      policy: BACKGROUND_REFRESH_POLICY,
    });
  } catch (error) {
    getMobileTelemetry().trackError(error, {
      feature: 'background.refresh.register',
    });
  }
}

export function registerBackgroundRefreshDebugMenuItem(
  input: Pick<BackgroundRefreshDebugInput, 'queryClient'> = {},
): void {
  if (!isDevRuntime() || hasRegisteredBackgroundRefreshDebugMenuItem) {
    return;
  }

  DevSettings.addMenuItem('Run SQLite Background Refresh', () => {
    triggerDebugBackgroundRefresh({
      queryClient: input.queryClient,
      source: 'dev_menu',
    }).catch(error => {
      getMobileTelemetry().trackError(error, {
        feature: 'background.refresh.debug',
      });
    });
  });

  hasRegisteredBackgroundRefreshDebugMenuItem = true;
  getMobileTelemetry().addBreadcrumb('background.refresh.debug_menu_registered', {
    policy: BACKGROUND_REFRESH_POLICY,
  });
}

export async function triggerDebugBackgroundRefresh(
  input: BackgroundRefreshDebugInput = {},
): Promise<boolean> {
  if (!isDevRuntime()) {
    return false;
  }

  const source = input.source ?? 'debug_helper';
  getMobileTelemetry().trackEvent('background.refresh.debug_triggered', {
    source,
    policy: BACKGROUND_REFRESH_POLICY,
  });

  await runBackgroundRefresh({
    queryClient: input.queryClient,
    source,
  });
  return true;
}

export function resetBackgroundRefreshStateForTests(): void {
  hasRegisteredBackgroundRefresh = false;
  hasRegisteredBackgroundRefreshDebugMenuItem = false;
  lastBackgroundRefreshRunAtMs = 0;
}
