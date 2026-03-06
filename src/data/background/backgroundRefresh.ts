import { Platform } from 'react-native';
import BackgroundFetch from 'react-native-background-fetch';

import { appEnv } from '@data/config/env';
import { fetchAllLeagues } from '@data/endpoints/competitionsApi';
import { fetchFixturesByDate } from '@data/endpoints/matchesApi';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

const BG_REFRESH_TASK_ID = 'com.footalert.app.refresh';
const BG_MIN_FETCH_INTERVAL_MINUTES = 15;

let hasRegisteredBackgroundRefresh = false;
let lastBackgroundRefreshRunAtMs = 0;

export type BackgroundRefreshPolicy = 'ios-only';
export const BACKGROUND_REFRESH_POLICY: BackgroundRefreshPolicy = 'ios-only';

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
};

export type BackgroundRefreshEligibilityResult = {
  allowed: boolean;
  reason: BackgroundRefreshEligibilityReason;
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

async function runBackgroundRefresh(): Promise<void> {
  const today = toApiDateString(new Date());
  const timezone = resolveTimezone();

  await Promise.allSettled([
    fetchAllLeagues(),
    fetchFixturesByDate({
      date: today,
      timezone,
    }),
  ]);

  lastBackgroundRefreshRunAtMs = Date.now();
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

  if (Platform.OS !== 'ios') {
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
          await runBackgroundRefresh();
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

export function resetBackgroundRefreshStateForTests(): void {
  hasRegisteredBackgroundRefresh = false;
  lastBackgroundRefreshRunAtMs = 0;
}
