import { Platform } from 'react-native';
import BackgroundFetch from 'react-native-background-fetch';

import { appEnv } from '@data/config/env';
import { fetchAllLeagues } from '@data/endpoints/competitionsApi';
import { fetchFixturesByDate } from '@data/endpoints/matchesApi';
import { getMobileTelemetry } from '@data/telemetry/mobileTelemetry';

const BG_REFRESH_TASK_ID = 'com.footalert.app.refresh';
const BG_MIN_FETCH_INTERVAL_MINUTES = 15;

let hasRegisteredBackgroundRefresh = false;

export type BackgroundRefreshPolicy = 'ios-only';
export const BACKGROUND_REFRESH_POLICY: BackgroundRefreshPolicy = 'ios-only';

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

  getMobileTelemetry().addBreadcrumb('background.refresh.completed', {
    date: today,
    timezone,
  });
}

export async function registerBackgroundRefresh(): Promise<void> {
  if (Platform.OS !== 'ios') {
    getMobileTelemetry().addBreadcrumb('background.refresh.skipped', {
      policy: BACKGROUND_REFRESH_POLICY,
      platform: Platform.OS,
    });
    return;
  }

  if (hasRegisteredBackgroundRefresh) {
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
